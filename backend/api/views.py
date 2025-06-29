from rest_framework import viewsets, status, generics, views, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction as db_transaction
from django.db.models import Sum, Avg, F, Q, Case, When, Value, DecimalField, Count
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP


from .models import LoyaltyProgram, UserWallet, LoyaltyAccount, PointsTransaction
from .serializers import (
    LoyaltyProgramSerializer,
    UserWalletSerializer,
    LoyaltyAccountSerializer,
    PointsTransactionSerializer,
    UserRegistrationSerializer,
    CurrentUserSerializer,
    SimulateTransferSerializer,
    SimulateSaleSerializer
)

User = get_user_model()

class UserRegistrationAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny] # Qualquer um pode se registrar

class UserProfileAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class LoyaltyProgramViewSet(viewsets.ModelViewSet):
    queryset = LoyaltyProgram.objects.all()
    serializer_class = LoyaltyProgramSerializer
    # permission_classes = [IsAuthenticated] # Default

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'destroy']:
            permission_classes = [IsAuthenticated]
        else: 
            permission_classes = [IsAdminUser] 
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # Programas ativos, ou todos se for admin
        if self.request.user.is_staff:
            return LoyaltyProgram.objects.all().order_by('name')
        
        # Usuários comuns veem programas ativos globais OU os que eles criaram
        return LoyaltyProgram.objects.filter(
            Q(is_user_created=False, is_active=True) | 
            Q(created_by=self.request.user)
        ).distinct().order_by('name')

    def perform_create(self, serializer):
        # Atribui o usuário logado ao criar um programa customizado.
        serializer.save(created_by=self.request.user, is_user_created=True)

    def perform_update(self, serializer):
        instance = serializer.instance
        # Apenas admin ou o criador (se for user_created) pode atualizar
        if not self.request.user.is_staff and \
           (not instance.is_user_created or instance.created_by != self.request.user):
            self.permission_denied(self.request, message="Você não tem permissão para editar este programa.")
        serializer.save()

    def perform_destroy(self, instance):
       
        if not instance.is_user_created or instance.created_by != self.request.user:
            
            raise serializers.ValidationError(
                {"detail": "Você não tem permissão para deletar este programa."}
            )
        
        if instance.loyalty_accounts.exists():
            raise serializers.ValidationError(
                {"detail": f"Não é possível excluir o programa '{instance.name}' pois existem contas de fidelidade associadas a ele."}
            )
        
        instance.delete()


class UserWalletViewSet(viewsets.ModelViewSet):
    serializer_class = UserWalletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserWallet.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class LoyaltyAccountViewSet(viewsets.ModelViewSet):
    serializer_class = LoyaltyAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if 'wallet_pk' in self.kwargs:
            wallet_pk = self.kwargs['wallet_pk']
            # Garante que a carteira (wallet_pk) pertence ao usuário logado
            get_object_or_404(UserWallet, pk=wallet_pk, user=user)
            return LoyaltyAccount.objects.filter(wallet_id=wallet_pk, wallet__user=user).select_related('program', 'wallet').order_by('name')
        # Se não aninhado, lista todas as contas de todas as carteiras do usuário
        return LoyaltyAccount.objects.filter(wallet__user=user).select_related('program', 'wallet').order_by('wallet__wallet_name', 'name')

    def perform_create(self, serializer):
        user = self.request.user
        if 'wallet_pk' in self.kwargs:
            wallet_pk = self.kwargs['wallet_pk']
            wallet = get_object_or_404(UserWallet, pk=wallet_pk, user=user)
            # Define last_updated com a data/hora atual se não for fornecido
            serializer.save(wallet=wallet, last_updated=serializer.validated_data.get('last_updated', timezone.now()))
        else:
            # Se 'wallet' vem no payload, o serializer já valida se pertence ao usuário.
            serializer.save(last_updated=serializer.validated_data.get('last_updated', timezone.now()))
    
    def perform_update(self, serializer):
        # Garante que apenas o dono da conta (via carteira) pode atualizar
        account_instance = serializer.instance
        if account_instance.wallet.user != self.request.user:
            self.permission_denied(self.request, message="Você não tem permissão para editar esta conta.")

        serializer.save(last_updated=serializer.validated_data.get('last_updated', timezone.now()))


class PointsTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = PointsTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_queryset = PointsTransaction.objects.filter(
            Q(origin_account__wallet__user=user) | Q(destination_account__wallet__user=user)
        ).distinct().select_related(
            'origin_account__program', 'origin_account__wallet',
            'destination_account__program', 'destination_account__wallet'
        ).order_by('-transaction_date', '-created_at')

        if 'account_pk' in self.kwargs:
            account_pk = self.kwargs['account_pk']
            # Garante que a conta base da rota aninhada pertence ao usuário
            get_object_or_404(LoyaltyAccount, pk=account_pk, wallet__user=user)
            return base_queryset.filter(
                Q(origin_account_id=account_pk) | Q(destination_account_id=account_pk)
            )
        return base_queryset

    @db_transaction.atomic
    def perform_create(self, serializer):
        transaction = serializer.save()
        self._apply_transaction_effects(transaction)

    @db_transaction.atomic
    def perform_update(self, serializer):
        
        
        # Garante que a transação pertence ao usuário (indiretamente, via contas)
        original_instance = self.get_object() 
        self._ensure_transaction_ownership(original_instance, self.request.user)

        old_transaction_state = PointsTransaction.objects.get(pk=original_instance.pk)
        
        # Reverte efeitos da transação no estado *antes* do save do serializer.
        self._reverse_transaction_effects(old_transaction_state)
        
        # Salva as novas informações da transação
        updated_transaction = serializer.save()
        
        # Aplica os efeitos da transação com os novos dados
        self._apply_transaction_effects(updated_transaction)

    @db_transaction.atomic
    def perform_destroy(self, instance):
        self._ensure_transaction_ownership(instance, self.request.user)
        self._reverse_transaction_effects(instance)
        instance.delete()

    def _ensure_transaction_ownership(self, transaction_instance, user):
        """Verifica se o usuário logado é dono de pelo menos uma das contas da transação."""
        is_owner = False
        if transaction_instance.origin_account and transaction_instance.origin_account.wallet.user == user:
            is_owner = True
        if not is_owner and transaction_instance.destination_account and transaction_instance.destination_account.wallet.user == user:
            is_owner = True
        
        if not is_owner:
            self.permission_denied(self.request, message="Você não tem permissão para modificar esta transação.")

    def _apply_transaction_effects(self, transaction: PointsTransaction):
        ttype = transaction.transaction_type
        amount = abs(transaction.amount) # Garante que o montante é positivo
        transaction_cost = transaction.cost if transaction.cost is not None else Decimal('0.00')

        DECIMAL_CONTEXT = {"prec": 10, "rounding": ROUND_HALF_UP} # Precisão para cálculos intermediários

        # Tipo 1: Inclusão Manual (Crédito)
        if ttype == 1 and transaction.destination_account:
            acc = transaction.destination_account
            old_balance = acc.current_balance
            old_avg_cost = acc.average_cost if acc.average_cost is not None else Decimal('0.00')
            
            acc.current_balance += amount
            
            if transaction_cost > 0 and amount > 0: # Houve um custo para adquirir estes pontos
                current_total_value = old_balance * old_avg_cost
                new_total_value = current_total_value + transaction_cost
                acc.average_cost = (new_total_value / acc.current_balance).quantize(Decimal('0.0001'), context=DECIMAL_CONTEXT) if acc.current_balance > 0 else Decimal('0.0000')
            elif old_balance == 0 and acc.current_balance > 0 and transaction_cost == 0 : # Primeira entrada sem custo, custo médio = 0
                 acc.average_cost = Decimal('0.0000')
            # Se não houver custo e já existir saldo com custo, o custo médio se dilui (mas o valor total não muda)
            # Se transaction_cost == 0 e amount > 0 e old_balance > 0 e old_avg_cost > 0:
            #   current_total_value = old_balance * old_avg_cost
            #   acc.average_cost = (current_total_value / acc.current_balance).quantize(Decimal('0.0001')) if acc.current_balance > 0 else Decimal('0.0000')

            acc.last_updated = timezone.now()
            acc.save()

        # Tipo 2: Transferência
        elif ttype == 2 and transaction.origin_account and transaction.destination_account:
            origin_acc = transaction.origin_account
            dest_acc = transaction.destination_account
            bonus_perc = transaction.bonus_percentage if transaction.bonus_percentage is not None else Decimal('0.00')
            
            amount_credited_to_dest = amount * (Decimal('1.00') + (bonus_perc / Decimal('100.00')))
            amount_credited_to_dest = amount_credited_to_dest.quantize(Decimal('0.01'), context=DECIMAL_CONTEXT)


            # Debita da origem
            cost_of_points_transferred_from_origin = amount * (origin_acc.average_cost if origin_acc.average_cost is not None else Decimal('0.00'))
            origin_acc.current_balance -= amount
            origin_acc.last_updated = timezone.now()
            origin_acc.save()

            # Credita no destino
            old_balance_dest = dest_acc.current_balance
            old_avg_cost_dest = dest_acc.average_cost if dest_acc.average_cost is not None else Decimal('0.00')
            
            dest_acc.current_balance += amount_credited_to_dest
            
            # Custo médio no destino: valor dos pontos transferidos + custo da transação (taxa)
            value_added_to_dest = cost_of_points_transferred_from_origin + transaction_cost # transaction_cost aqui é a taxa de transferência
            current_total_value_dest = old_balance_dest * old_avg_cost_dest
            new_total_value_dest = current_total_value_dest + value_added_to_dest
            
            dest_acc.average_cost = (new_total_value_dest / dest_acc.current_balance).quantize(Decimal('0.0001'), context=DECIMAL_CONTEXT) if dest_acc.current_balance > 0 else Decimal('0.0000')
            dest_acc.last_updated = timezone.now()
            dest_acc.save()

        # Tipo 3, 4, 5: Resgate, Venda, Expiração (Débito)
        elif ttype in [3, 4, 5] and transaction.origin_account:
            acc = transaction.origin_account
            acc.current_balance -= amount
            # Custo médio dos pontos restantes não muda. O "custo" da operação é (amount * avg_cost).
            # Para "Venda" (tipo 4), transaction.cost representa o VALOR DA VENDA. Lucro = transaction.cost - (amount * acc.average_cost).
            acc.last_updated = timezone.now()
            acc.save()
        
        # Tipo 6: Ajuste de Saldo
        elif ttype == 6:
            # O serializer garante que ou origin_account ou destination_account (não ambos) é fornecido.
            # O `amount` é sempre positivo. O `transaction.cost` pode representar um custo para fazer o ajuste.
            if transaction.destination_account: # Ajuste de Crédito
                acc = transaction.destination_account
                old_balance = acc.current_balance
                old_avg_cost = acc.average_cost if acc.average_cost is not None else Decimal('0.00')
                
                acc.current_balance += amount
                if transaction_cost > 0 and amount > 0: # Custo para realizar o ajuste de crédito
                    current_total_value = old_balance * old_avg_cost
                    new_total_value = current_total_value + transaction_cost
                    acc.average_cost = (new_total_value / acc.current_balance).quantize(Decimal('0.0001'), context=DECIMAL_CONTEXT) if acc.current_balance > 0 else Decimal('0.0000')
                # Se não houver custo e já existir saldo com custo, o custo médio se dilui.
                elif old_balance > 0 and old_avg_cost > 0 and transaction_cost == 0:
                     current_total_value = old_balance * old_avg_cost
                     acc.average_cost = (current_total_value / acc.current_balance).quantize(Decimal('0.0001'), context=DECIMAL_CONTEXT) if acc.current_balance > 0 else Decimal('0.0000')

                acc.last_updated = timezone.now()
                acc.save()
            elif transaction.origin_account: # Ajuste de Débito
                acc = transaction.origin_account
                acc.current_balance -= amount
                # Custo médio não muda por um simples ajuste de débito sem valor financeiro associado ao ajuste em si.
                acc.last_updated = timezone.now()
                acc.save()


    def _reverse_transaction_effects(self, transaction: PointsTransaction):
        
        ttype = transaction.transaction_type
        amount = abs(transaction.amount)
        # transaction_cost = transaction.cost if transaction.cost is not None else Decimal('0.00')

        # Tipo 1: Inclusão Manual (Crédito) -> Debitar destination_account
        if ttype == 1 and transaction.destination_account:
            acc = transaction.destination_account
            acc.current_balance -= amount
            acc.last_updated = timezone.now()
            acc.save()

        # Tipo 2: Transferência -> Creditar origin, Debitar destination
        elif ttype == 2 and transaction.origin_account and transaction.destination_account:
            origin_acc = transaction.origin_account
            dest_acc = transaction.destination_account
            bonus_perc = transaction.bonus_percentage if transaction.bonus_percentage is not None else Decimal('0.00')
            amount_credited_to_dest = amount * (Decimal('1.00') + (bonus_perc / Decimal('100.00')))
            amount_credited_to_dest = amount_credited_to_dest.quantize(Decimal('0.01'))


            if origin_acc:
                origin_acc.current_balance += amount
                origin_acc.last_updated = timezone.now()
                origin_acc.save()
            if dest_acc:
                dest_acc.current_balance -= amount_credited_to_dest
                dest_acc.last_updated = timezone.now()
                dest_acc.save()
            # Reverter average_cost é complexo.

        # Tipo 3, 4, 5: Resgate, Venda, Expiração (Débito) -> Creditar origin_account
        elif ttype in [3, 4, 5] and transaction.origin_account:
            acc = transaction.origin_account
            acc.current_balance += amount
            acc.last_updated = timezone.now()
            acc.save()
        
        # Tipo 6: Ajuste de Saldo
        elif ttype == 6:
            if transaction.destination_account: # Foi um Ajuste de Crédito -> Debitar destination
                acc = transaction.destination_account
                acc.current_balance -= amount
                acc.last_updated = timezone.now()
                acc.save()
            elif transaction.origin_account: # Foi um Ajuste de Débito -> Creditar origin
                acc = transaction.origin_account
                acc.current_balance += amount
                acc.last_updated = timezone.now()
                acc.save()


class SimulationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    serializer_action_classes = {
        'transfer': SimulateTransferSerializer,
        'sale': SimulateSaleSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_action_classes.get(self.action, serializers.Serializer)

    @action(detail=False, methods=['post'])
    def transfer(self, request):
        serializer = SimulateTransferSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            user = request.user
            try:
                from_account = LoyaltyAccount.objects.get(pk=data['from_account_id'], wallet__user=user)
                # A conta de destino pode ser de outro programa, mas deve pertencer ao usuário (neste contexto)
                to_account = LoyaltyAccount.objects.get(pk=data['to_account_id'], wallet__user=user)
            except LoyaltyAccount.DoesNotExist:
                return Response({"error": "Conta de origem ou destino não encontrada ou não pertence ao usuário."},
                                status=status.HTTP_404_NOT_FOUND)

            amount_to_transfer = data['amount']
            bonus_percentage = data.get('bonus_percentage', Decimal('0.00'))
            amount_to_receive_at_destination = amount_to_transfer * (Decimal('1.00') + (bonus_percentage / Decimal('100.00')))
            amount_to_receive_at_destination = amount_to_receive_at_destination.quantize(Decimal('0.01'))

            
            estimated_cost_per_thousand_at_destination = "N/A"
            origin_avg_cost_per_unit = from_account.average_cost if from_account.average_cost is not None else Decimal('0.00')

            if origin_avg_cost_per_unit > 0 and amount_to_receive_at_destination > 0:
                # Custo total dos pontos que saíram da origem
                total_cost_of_points_from_origin = amount_to_transfer * origin_avg_cost_per_unit
                # Custo unitário no destino (sem considerar taxas de transferência adicionais)
                cost_unit_at_destination = total_cost_of_points_from_origin / amount_to_receive_at_destination
                estimated_cost_per_thousand_at_destination = round(cost_unit_at_destination * 1000, 2)
            
            response_data = {
                "from_account_name": from_account.name,
                "from_account_program": from_account.program.name,
                "to_account_name": to_account.name,
                "to_account_program": to_account.program.name,
                "amount_to_transfer": amount_to_transfer,
                "origin_account_avg_cost_per_unit": origin_avg_cost_per_unit.quantize(Decimal('0.0001')),
                "bonus_percentage": bonus_percentage,
                "amount_to_receive_at_destination": amount_to_receive_at_destination,
                "estimated_cost_per_thousand_at_destination": estimated_cost_per_thousand_at_destination
            }
            return Response(response_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def sale(self, request):
        serializer = SimulateSaleSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            try:
                account = LoyaltyAccount.objects.get(pk=data['loyalty_account_id'], wallet__user=request.user)
            except LoyaltyAccount.DoesNotExist:
                return Response({"error": "Conta de fidelidade não encontrada ou não pertence ao usuário."}, status=status.HTTP_404_NOT_FOUND)

            if account.average_cost is None:
                return Response({"error": "Custo médio da conta não disponível para simulação (valor nulo)."}, status=status.HTTP_400_BAD_REQUEST)
            
            # average_cost pode ser 0 se os pontos foram adquiridos sem custo.
            # if account.average_cost <= 0:
            #     return Response({"error": "Custo médio da conta é zero ou negativo, simulação de lucro não aplicável da mesma forma."}, status=status.HTTP_400_BAD_REQUEST)


            amount_to_sell = data['amount_to_sell']
            if amount_to_sell <= 0:
                return Response({"error": "Quantidade a vender deve ser positiva."}, status=status.HTTP_400_BAD_REQUEST)
            if amount_to_sell > account.current_balance:
                 return Response({"error": "Saldo insuficiente para a venda simulada."}, status=status.HTTP_400_BAD_REQUEST)

            sale_price_per_1000 = data['sale_price_per_1000_miles']
            if sale_price_per_1000 <=0:
                return Response({"error": "Preço de venda por milheiro deve ser positivo."}, status=status.HTTP_400_BAD_REQUEST)

            total_sale_value = (amount_to_sell / Decimal('1000.00')) * sale_price_per_1000
            total_cost_value = amount_to_sell * account.average_cost # average_cost é por unidade
            estimated_profit = total_sale_value - total_cost_value

            response_data = {
                "loyalty_account_name": account.name,
                "current_balance": account.current_balance,
                "current_average_cost_per_unit": account.average_cost.quantize(Decimal('0.0001')),
                "amount_to_sell": amount_to_sell,
                "sale_price_per_1000_miles": sale_price_per_1000,
                "total_estimated_sale_value": total_sale_value.quantize(Decimal('0.01')),
                "total_estimated_cost_value": total_cost_value.quantize(Decimal('0.01')),
                "estimated_profit": estimated_profit.quantize(Decimal('0.01'))
            }
            return Response(response_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SummaryAPIView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        user = request.user
        
        active_accounts_qs = LoyaltyAccount.objects.filter(wallet__user=user, is_active=True).select_related('program')
        
        total_estimated_value = Decimal('0.00')
        if active_accounts_qs.exists():
            # Calcula o valor estimado apenas se custom_rate for positivo
            annotated_accounts = active_accounts_qs.annotate(
                account_value=Case(
                    When(custom_rate__isnull=False, custom_rate__gt=0, 
                         then=F('current_balance') * F('custom_rate')),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
            aggregation = annotated_accounts.aggregate(total_value_sum=Sum('account_value'))
            total_estimated_value = aggregation['total_value_sum'] or Decimal('0.00')

        currency_map = dict(LoyaltyProgram.CURRENCY_TYPE_CHOICES)
        balances_by_currency_type = active_accounts_qs.values(
            'program__currency_type' # Agrupa pelo ID do tipo de moeda
        ).annotate(
            total_balance=Sum('current_balance'),
            program_count=Count('program', distinct=True) # Conta quantos programas diferentes por tipo de moeda
        ).order_by('program__currency_type')

        processed_balances = []
        for item in balances_by_currency_type:
            currency_type_id = item['program__currency_type']
            processed_balances.append({
                "currency_name": currency_map.get(currency_type_id, f"ID {currency_type_id}"),
                "total_balance": item['total_balance'] or Decimal('0.00'),
                "distinct_programs_count": item['program_count']
            })
        
        # Custo total de aquisição de pontos/milhas (simplificado)
        # Soma o `cost` de transações de "Inclusão Manual" com custo e "Transferência" com custo (taxa).
        total_acquisition_cost = PointsTransaction.objects.filter(
            (Q(destination_account__wallet__user=user) & Q(transaction_type=1) & Q(cost__isnull=False) & Q(cost__gt=0)) |
            (Q(destination_account__wallet__user=user) & Q(transaction_type=2) & Q(cost__isnull=False) & Q(cost__gt=0)) # Custo da taxa de transferência
        ).aggregate(total_cost_sum=Sum('cost'))['total_cost_sum'] or Decimal('0.00')
        
        # Total de milhas/pontos vendidos e valor total recebido
        # (Considera transações do tipo 4 - Venda de Milhas, onde 'cost' é o valor da venda)
        sales_summary = PointsTransaction.objects.filter(
            origin_account__wallet__user=user, transaction_type=4, cost__isnull=False
        ).aggregate(
            total_points_sold=Sum('amount'),
            total_revenue_from_sales=Sum('cost')
        )

        summary_data = {
            "user_id": user.id,
            "username": user.username,
            "total_wallets": UserWallet.objects.filter(user=user).count(),
            "total_active_loyalty_accounts": active_accounts_qs.count(),
            "overall_estimated_value": total_estimated_value.quantize(Decimal('0.01')),
            "balances_by_currency_type": processed_balances,
            "total_acquisition_cost_tracked": total_acquisition_cost.quantize(Decimal('0.01')),
            "total_points_milhas_sold": sales_summary['total_points_sold'] or Decimal('0.00'),
            "total_revenue_from_sales": sales_summary['total_revenue_from_sales'] or Decimal('0.00'),
        }
        
        return Response(summary_data)