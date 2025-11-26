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
    permission_classes = [AllowAny] 

class UserProfileAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class LoyaltyProgramViewSet(viewsets.ModelViewSet):
    queryset = LoyaltyProgram.objects.all()
    serializer_class = LoyaltyProgramSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return LoyaltyProgram.objects.filter(
                Q(is_user_created=False) | Q(created_by=user)
            ).distinct().order_by('name')
        return LoyaltyProgram.objects.filter(is_user_created=False).order_by('name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_user_created=True)

    @action(detail=True, methods=['patch'], url_path='toggle-active')
    def toggle_active_status(self, request, pk=None):
        program = self.get_object()
        if program.is_user_created and program.created_by == request.user:
            program.is_active = not program.is_active
            program.save()
            LoyaltyAccount.objects.filter(program=program).update(is_active=program.is_active)
            serializer = self.get_serializer(program)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(
            {"detail": "Você não tem permissão para alterar o status deste programa."},
            status=status.HTTP_403_FORBIDDEN
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        can_delete = instance.is_user_created and instance.created_by == request.user
        if not can_delete:
            return Response(
                {"detail": "Você não tem permissão para deletar este programa."},
                status=status.HTTP_403_FORBIDDEN
            )
        if instance.loyalty_accounts.exists():
            return Response(
                {"detail": f"Não é possível excluir o programa '{instance.name}' pois existem contas de fidelidade associadas a ele."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


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
            get_object_or_404(UserWallet, pk=wallet_pk, user=user)
            return LoyaltyAccount.objects.filter(wallet_id=wallet_pk, wallet__user=user,is_active=True).select_related('program', 'wallet').order_by('name')
        return LoyaltyAccount.objects.filter(wallet__user=user,is_active=True).select_related('program', 'wallet').order_by('wallet__wallet_name', 'name')

    def perform_create(self, serializer):
        user = self.request.user
        if 'wallet_pk' in self.kwargs:
            wallet_pk = self.kwargs['wallet_pk']
            wallet = get_object_or_404(UserWallet, pk=wallet_pk, user=user)
            serializer.save(wallet=wallet, last_updated=serializer.validated_data.get('last_updated', timezone.now()))
        else:
            serializer.save(last_updated=serializer.validated_data.get('last_updated', timezone.now()))

    def perform_update(self, serializer):
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
        original_instance = self.get_object()
        self._ensure_transaction_ownership(original_instance, self.request.user)
        old_transaction_state = PointsTransaction.objects.get(pk=original_instance.pk)
        self._reverse_transaction_effects(old_transaction_state)
        updated_transaction = serializer.save()
        self._apply_transaction_effects(updated_transaction)

    @db_transaction.atomic
    def perform_destroy(self, instance):
        self._ensure_transaction_ownership(instance, self.request.user)
        self._reverse_transaction_effects(instance)
        instance.delete()

    def _ensure_transaction_ownership(self, transaction_instance, user):
        is_owner = False
        if transaction_instance.origin_account and transaction_instance.origin_account.wallet.user == user:
            is_owner = True
        if not is_owner and transaction_instance.destination_account and transaction_instance.destination_account.wallet.user == user:
            is_owner = True
        if not is_owner:
            self.permission_denied(self.request, message="Você não tem permissão para modificar esta transação.")

    def _apply_transaction_effects(self, transaction: PointsTransaction):
        ttype = transaction.transaction_type
        amount = abs(transaction.amount)
        cost = transaction.cost if transaction.cost is not None else Decimal('0.00')

        if ttype == 1:  # Inclusão Manual
            self._apply_manual_inclusion(transaction, amount, cost)
        elif ttype == 2:  # Transferência
            self._apply_transfer(transaction, amount, cost)
        elif ttype in [3, 4, 5]:  # Resgate, Venda, Expiração
            self._apply_debit_transaction(transaction, amount)
        elif ttype == 6:  # Ajuste de Saldo
            self._apply_balance_adjustment(transaction, amount, cost)

    def _calculate_new_average_cost(self, current_balance, current_avg_cost, added_amount, added_cost):
        """Calcula o novo custo médio ponderado após uma adição de pontos."""
        if added_amount <= 0:
            return current_avg_cost
            
        old_total_cost = (current_balance / Decimal('1000.0')) * current_avg_cost
        new_total_cost = old_total_cost + added_cost
        new_total_balance = current_balance + added_amount

        if new_total_balance > 0:
            new_avg = (new_total_cost / new_total_balance) * Decimal('1000.0')
            return new_avg.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return Decimal('0.00')

    def _apply_manual_inclusion(self, transaction, amount, cost):
        if not transaction.destination_account:
            return
            
        acc = transaction.destination_account
        old_avg_cost = acc.average_cost if acc.average_cost is not None else Decimal('0.00')
        
        acc.average_cost = self._calculate_new_average_cost(acc.current_balance, old_avg_cost, amount, cost)
        acc.current_balance += amount
        acc.last_updated = timezone.now()
        acc.save()

    def _apply_transfer(self, transaction, amount, cost):
        if not transaction.origin_account or not transaction.destination_account:
            return

        origin = transaction.origin_account
        dest = transaction.destination_account
        bonus_perc = transaction.bonus_percentage if transaction.bonus_percentage is not None else Decimal('0.00')
        
        # 1. Debita da Origem
        origin.current_balance -= amount
        origin.last_updated = timezone.now()
        origin.save()

        # 2. Calcula valores para o Destino
        amount_credited = amount * (Decimal('1.00') + (bonus_perc / Decimal('100.00')))
        amount_credited = amount_credited.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        origin_avg_cost = origin.average_cost if origin.average_cost is not None else Decimal('0.00')
        cost_of_transferred_points = (amount / Decimal('1000.0')) * origin_avg_cost
        total_cost_added_to_dest = cost_of_transferred_points + cost

        # 3. Credita no Destino
        dest_avg_cost = dest.average_cost if dest.average_cost is not None else Decimal('0.00')
        dest.average_cost = self._calculate_new_average_cost(dest.current_balance, dest_avg_cost, amount_credited, total_cost_added_to_dest)
        dest.current_balance += amount_credited
        dest.last_updated = timezone.now()
        dest.save()

    def _apply_debit_transaction(self, transaction, amount):
        """Aplica Resgate, Venda ou Expiração (apenas debita saldo)."""
        if transaction.origin_account:
            acc = transaction.origin_account
            acc.current_balance -= amount
            acc.last_updated = timezone.now()
            acc.save()

    def _apply_balance_adjustment(self, transaction, amount, cost):
        if transaction.destination_account: # Ajuste de Crédito
            acc = transaction.destination_account
            old_avg_cost = acc.average_cost if acc.average_cost is not None else Decimal('0.00')
            
            # Se houver custo, recaucula o médio. Se não, mantém ou dilui.
            # Para simplificar: se custo > 0, agrega valor. Se custo == 0, dilui o preço médio (entra saldo a custo zero).
            acc.average_cost = self._calculate_new_average_cost(acc.current_balance, old_avg_cost, amount, cost)
            acc.current_balance += amount
            acc.last_updated = timezone.now()
            acc.save()
            
        elif transaction.origin_account: # Ajuste de Débito
            acc = transaction.origin_account
            acc.current_balance -= amount
            acc.last_updated = timezone.now()
            acc.save()

    def _reverse_transaction_effects(self, transaction: PointsTransaction):
        ttype = transaction.transaction_type
        amount = abs(transaction.amount)

        if ttype == 1 and transaction.destination_account:
            try:
                acc = LoyaltyAccount.objects.get(pk=transaction.destination_account.pk)
                acc.current_balance -= amount
                acc.last_updated = timezone.now()
                acc.save()
            except LoyaltyAccount.DoesNotExist: pass

        elif ttype == 2 and transaction.origin_account and transaction.destination_account:
            bonus_perc = transaction.bonus_percentage if transaction.bonus_percentage is not None else Decimal('0.00')
            amount_credited_to_dest = amount * (Decimal('1.00') + (bonus_perc / Decimal('100.00')))
            amount_credited_to_dest = amount_credited_to_dest.quantize(Decimal('0.01'))

            try:
                if transaction.origin_account:
                    origin_acc = LoyaltyAccount.objects.get(pk=transaction.origin_account.pk)
                    origin_acc.current_balance += amount
                    origin_acc.last_updated = timezone.now()
                    origin_acc.save()
            except LoyaltyAccount.DoesNotExist: pass

            try:
                if transaction.destination_account:
                    dest_acc = LoyaltyAccount.objects.get(pk=transaction.destination_account.pk)
                    dest_acc.current_balance -= amount_credited_to_dest
                    dest_acc.last_updated = timezone.now()
                    dest_acc.save()
            except LoyaltyAccount.DoesNotExist: pass

        elif ttype in [3, 4, 5] and transaction.origin_account:
             try:
                acc = LoyaltyAccount.objects.get(pk=transaction.origin_account.pk)
                acc.current_balance += amount
                acc.last_updated = timezone.now()
                acc.save()
             except LoyaltyAccount.DoesNotExist: pass

        elif ttype == 6:
            if transaction.destination_account:
                 try:
                    acc = LoyaltyAccount.objects.get(pk=transaction.destination_account.pk)
                    acc.current_balance -= amount
                    acc.last_updated = timezone.now()
                    acc.save()
                 except LoyaltyAccount.DoesNotExist: pass
            elif transaction.origin_account:
                 try:
                    acc = LoyaltyAccount.objects.get(pk=transaction.origin_account.pk)
                    acc.current_balance += amount
                    acc.last_updated = timezone.now()
                    acc.save()
                 except LoyaltyAccount.DoesNotExist: pass

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
                to_account = LoyaltyAccount.objects.get(pk=data['to_account_id'], wallet__user=user)
            except LoyaltyAccount.DoesNotExist:
                return Response({"error": "Conta de origem ou destino não encontrada ou não pertence ao usuário."}, status=status.HTTP_404_NOT_FOUND)

            amount_to_transfer = data['amount']
            bonus_percentage = data.get('bonus_percentage', Decimal('0.00'))
            amount_to_receive_at_destination = amount_to_transfer * (Decimal('1.00') + (bonus_percentage / Decimal('100.00')))
            amount_to_receive_at_destination = amount_to_receive_at_destination.quantize(Decimal('0.01'))

            estimated_cost_per_thousand_at_destination_val = None # Use None for "N/A" representation
            origin_avg_cost_per_thousand = from_account.average_cost if from_account.average_cost is not None else Decimal('0.00')

            if origin_avg_cost_per_thousand > 0 and amount_to_receive_at_destination > 0:
                total_cost_of_points_from_origin = (amount_to_transfer / Decimal('1000.0')) * origin_avg_cost_per_thousand
                cost_per_unit_at_destination = total_cost_of_points_from_origin / amount_to_receive_at_destination
                estimated_cost_per_thousand_at_destination_val = (cost_per_unit_at_destination * Decimal('1000.0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            response_data = {
                "from_account_name": from_account.name,
                "from_account_program": from_account.program.name,
                "to_account_name": to_account.name,
                "to_account_program": to_account.program.name,
                "amount_to_transfer": amount_to_transfer,
                "origin_account_avg_cost_per_thousand": origin_avg_cost_per_thousand.quantize(Decimal('0.01')),
                "bonus_percentage": bonus_percentage,
                "amount_to_receive_at_destination": amount_to_receive_at_destination,
                "estimated_cost_per_thousand_at_destination": estimated_cost_per_thousand_at_destination_val
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

            amount_to_sell = data['amount_to_sell']
            if amount_to_sell <= 0:
                return Response({"error": "Quantidade a vender deve ser positiva."}, status=status.HTTP_400_BAD_REQUEST)
            if amount_to_sell > account.current_balance:
                 return Response({"error": "Saldo insuficiente para a venda simulada."}, status=status.HTTP_400_BAD_REQUEST)

            sale_price_per_1000 = data['sale_price_per_1000_miles']
            if sale_price_per_1000 <=0:
                return Response({"error": "Preço de venda por milheiro deve ser positivo."}, status=status.HTTP_400_BAD_REQUEST)

            total_sale_value = (amount_to_sell / Decimal('1000.00')) * sale_price_per_1000
            total_cost_value = (amount_to_sell / Decimal('1000.0')) * account.average_cost # average_cost é por milheiro
            estimated_profit = total_sale_value - total_cost_value

            response_data = {
                "loyalty_account_name": account.name,
                "current_balance": account.current_balance,
                "current_average_cost_per_thousand": account.average_cost.quantize(Decimal('0.01')),
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
        
        # cálculo do programa patrimônio total
        total_estimated_value = Decimal('0.00')
        programs_data = []

        if active_accounts_qs.exists():
            annotated_accounts = active_accounts_qs.annotate(
                account_value=Case(
                    When(program__custom_rate__isnull=False, program__custom_rate__gt=0, 
                         then=(F('current_balance') / Decimal('1000.0')) * F('program__custom_rate')),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
            
            # Soma total
            aggregation = annotated_accounts.aggregate(total_value_sum=Sum('account_value'))
            total_estimated_value = aggregation['total_value_sum'] or Decimal('0.00')

            # Agrupa por programa para somar saldos e valores de contas diferentes do mesmo programa (ex: 2 contas Smiles)
            programs_summary_qs = annotated_accounts.values(
                'program__name', 'program__currency_type', 'program__custom_rate'
            ).annotate(
                total_balance=Sum('current_balance'),
                total_value=Sum('account_value')
            ).order_by('-total_value') 

            for item in programs_summary_qs:
                programs_data.append({
                    "name": item['program__name'],
                    "currency_type": item['program__currency_type'], 
                    "total_balance": item['total_balance'],
                    "total_value": item['total_value']
                })

        # Resumo por Tipo (Milhas vs Pontos) 
        currency_map = dict(LoyaltyProgram.CURRENCY_TYPE_CHOICES)
        balances_by_currency_type = active_accounts_qs.values(
            'program__currency_type' 
        ).annotate(
            total_balance=Sum('current_balance'),
            program_count=Count('program', distinct=True) 
        ).order_by('program__currency_type')

        processed_balances = []
        for item in balances_by_currency_type:
            currency_type_id = item['program__currency_type']
            processed_balances.append({
                "currency_name": currency_map.get(currency_type_id, f"ID {currency_type_id}"),
                "total_balance": item['total_balance'] or Decimal('0.00'),
                "distinct_programs_count": item['program_count']
            })
        
        #  Custos e Vendas
        total_acquisition_cost = PointsTransaction.objects.filter(
            (Q(destination_account__wallet__user=user) & Q(transaction_type=1) & Q(cost__isnull=False) & Q(cost__gt=0)) |
            (Q(destination_account__wallet__user=user) & Q(transaction_type=2) & Q(cost__isnull=False) & Q(cost__gt=0)) 
        ).aggregate(total_cost_sum=Sum('cost'))['total_cost_sum'] or Decimal('0.00')
        
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
            "programs_summary": programs_data,
            "balances_by_currency_type": processed_balances,
            "total_acquisition_cost_tracked": total_acquisition_cost.quantize(Decimal('0.01')),
            "total_points_milhas_sold": sales_summary['total_points_sold'] or Decimal('0.00'),
            "total_revenue_from_sales": sales_summary['total_revenue_from_sales'] or Decimal('0.00'),
        }
        
        return Response(summary_data)