from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import LoyaltyProgram, UserWallet, LoyaltyAccount, PointsTransaction

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, label='Confirm password', style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'cpf']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            cpf=validated_data.get('cpf')
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'cpf']

class LoyaltyProgramSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username', allow_null=True)
    get_currency_type_display = serializers.CharField(read_only=True)
    class Meta:
        model = LoyaltyProgram
        fields = ['id', 'name', 'currency_type', 'get_currency_type_display','is_active', 'is_user_created', 'created_by', 'created_by_username', 'created_at']
        read_only_fields = ['created_by', 'created_at'] # is_user_created é definido na view/serializer.create

    def create(self, validated_data):
        request = self.context.get('request')
        # Se is_user_created=True é passado no payload e o usuário está autenticado
        if validated_data.get('is_user_created') and request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        else:
            # Programas globais (is_user_created=False) não têm `created_by` de usuário comum,
            # ou são criados por um admin/sistema.
            validated_data['is_user_created'] = False # Garante que seja False se não definido pelo usuário.
            validated_data['created_by'] = None
        return super().create(validated_data)


class UserWalletSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = UserWallet
        fields = ['id', 'user', 'user_username', 'wallet_name', 'created_at']
        read_only_fields = ['user', 'created_at']


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    program_name = serializers.ReadOnlyField(source='program.name')
    wallet_name = serializers.ReadOnlyField(source='wallet.wallet_name')
    program_currency_type = serializers.ReadOnlyField(source='program.get_currency_type_display')

    class Meta:
        model = LoyaltyAccount
        fields = [
            'id', 'wallet', 'wallet_name', 'program', 'program_name', 'program_currency_type',
            'account_number', 'name', 'current_balance', 'average_cost',
            'custom_rate', 'last_updated', 'is_active', 'created_at'
        ]
        read_only_fields = ['created_at','wallet', 'last_updated', 'is_active']
        # 'wallet' será preenchido pela URL em rotas aninhadas ou validado se fornecido diretamente.

    def validate_program(self, value):
        if not value.is_active: # Adicionado para consistência
            raise serializers.ValidationError("Não pode criar uma conta para um programa de fidelidade inativo.")
        return value
    
    def validate_wallet(self, value):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            # Se a carteira está sendo definida explicitamente (não via URL aninhada),
            # garanta que ela pertence ao usuário logado.
            if value.user != request.user:
                raise serializers.ValidationError("A carteira deve pertencer ao usuário atual.")
        return value


class PointsTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.ReadOnlyField(source='get_transaction_type_display')
    # Campos para mostrar nomes das contas, se existirem
    origin_account_name = serializers.CharField(source='origin_account.name', read_only=True, allow_null=True)
    destination_account_name = serializers.CharField(source='destination_account.name', read_only=True, allow_null=True)

    # Para permitir que o frontend envie IDs para as contas
    origin_account = serializers.PrimaryKeyRelatedField(
        queryset=LoyaltyAccount.objects.all(), allow_null=True, required=False
    )
    destination_account = serializers.PrimaryKeyRelatedField(
        queryset=LoyaltyAccount.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = PointsTransaction
        fields = [
            'id', 'transaction_type', 'transaction_type_display', 'amount', 'cost',
            'origin_account', 'origin_account_name',
            'destination_account', 'destination_account_name',
            'bonus_percentage', 'description', 'transaction_date', 'created_at'
        ]
        read_only_fields = ['created_at']

    def validate(self, data):
        ttype = data.get('transaction_type')
        origin_account = data.get('origin_account')
        destination_account = data.get('destination_account')
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None

        # Pelo menos uma conta deve ser especificada
        if not origin_account and not destination_account:
            raise serializers.ValidationError(
                "Pelo menos uma conta deve ser especificada."
            )

        # Validar propriedade das contas
        accounts_to_check = [acc for acc in [origin_account, destination_account] if acc is not None]
        for acc in accounts_to_check:
            if acc.wallet.user != user:
                raise serializers.ValidationError(
                    f"A conta '{acc.name}' não pertece ao usuário atual."
                )

        # Validações específicas por tipo de transação
        if ttype == 1:  # Inclusão Manual
            if not destination_account:
                raise serializers.ValidationError({'destination_account': "A conta de destino deve ser definida para 'Inclusão Manual'."})
            if origin_account:
                raise serializers.ValidationError({'origin_account': "A conta de origem não deve ser definida para 'Inclusão Manual'."})
        elif ttype == 2:  # Transferência
            if not origin_account or not destination_account:
                raise serializers.ValidationError({'origin_account': "A conta de origem e destino devem ser definidas para 'Transferência'.",
                                                 'destination_account': "A conta de origem e destino devem ser definidas para 'Transferência'"})
            if origin_account == destination_account:
                raise serializers.ValidationError("A conta de origem e destino não podem ser a mesma para uma transferência.")
        elif ttype in [3, 4, 5]:  # Resgate, Venda, Expiração
            if not origin_account:
                raise serializers.ValidationError({'origin_account': f"A conta de origem deve ser definida para '{PointsTransaction.TRANSACTION_TYPE_CHOICES[ttype-1][1]}'."})
            if destination_account:
                raise serializers.ValidationError({'destination_account': f"A conta de destino não deve ser definida para '{PointsTransaction.TRANSACTION_TYPE_CHOICES[ttype-1][1]}'."})
        elif ttype == 6: # Ajuste de Saldo
            if not origin_account and not destination_account: # Pelo menos uma deve ser fornecida
                raise serializers.ValidationError("Uma conta de origem ou destino deve ser fornecida para 'Ajuste de Saldo'.")
            if origin_account and destination_account: # Não ambas ao mesmo tempo para um simples ajuste
                 raise serializers.ValidationError("Forneça apenas uma conta (origem ou destino) para 'Ajuste de Saldo'.")
        
        # Adicionar validação para `transaction_date` se necessário (ex: não pode ser no futuro)
        return data

# Serializers para Simulação e Resumo
class SimulateTransferSerializer(serializers.Serializer):
    from_account_id = serializers.IntegerField(required=True)
    to_account_id = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    bonus_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=0.00, required=False)

class SimulateSaleSerializer(serializers.Serializer):
    loyalty_account_id = serializers.IntegerField(required=True)
    amount_to_sell = serializers.DecimalField(max_digits=12, decimal_places=2)
    sale_price_per_1000_miles = serializers.DecimalField(max_digits=10, decimal_places=2)