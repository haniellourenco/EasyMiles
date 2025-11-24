from django.db import models
from django.conf import settings

class LoyaltyProgram(models.Model):
    CURRENCY_TYPE_CHOICES = [
        (1, 'Pontos'),
        (2, 'Milhas'),
    ]

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='loyalty_programs_created'
    )
    name = models.CharField(max_length=100, unique=True)
    currency_type = models.IntegerField(choices=CURRENCY_TYPE_CHOICES)
    custom_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        help_text="Valor de mercado estimado por 1.000 milhas/pontos"
    ) 
    is_active = models.BooleanField(default=True)
    is_user_created = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    

    def __str__(self):
        return self.name

class UserWallet(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallets'
    )
    wallet_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'wallet_name') 

    def __str__(self):
        return f'{self.wallet_name} ({self.user.username})'


class LoyaltyAccount(models.Model):
    wallet = models.ForeignKey(
        UserWallet,
        on_delete=models.CASCADE,
        related_name="loyalty_accounts"
    )
    program = models.ForeignKey(
        LoyaltyProgram,
        on_delete=models.PROTECT,
        related_name="loyalty_accounts"
    )
    account_number = models.CharField(max_length=100, blank=True) 
    name = models.CharField(max_length=100) 
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    average_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Custo médio por milheiro"
    )
    
    last_updated = models.DateTimeField(
        help_text="Data da última atualização de saldo/informações desta conta no programa de fidelidade"
    ) 
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('wallet', 'program', 'name')

    def __str__(self):
        return f"{self.name} ({self.program.name}) - Saldo: {self.current_balance}"


class PointsTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        (1, 'Inclusão Manual'),      # Ex: Adicionar pontos de uma compra não rastreada. Afeta destination_account.
        (2, 'Transferência'),        # Transferência entre duas LoyaltyAccount. Afeta origin_account e destination_account.
        (3, 'Resgate'),             # Ex: Resgate de produtos/serviços. Afeta origin_account.
        (4, 'Venda de Milhas'),     # Venda para terceiros. Afeta origin_account.
        (5, 'Expiração de Pontos'), # Pontos expirados. Afeta origin_account.
        (6, 'Ajuste de Saldo'),     # Ajuste manual. Afeta origin_account ou destination_account.
    ]

    transaction_type = models.IntegerField(choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text="Quantidade de pontos/milhas. Sempre positivo. O tipo da transação define se é crédito ou débito."
    )
    cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Custo monetário associado à transação."
    )

    origin_account = models.ForeignKey(
        LoyaltyAccount,
        on_delete=models.SET_NULL, 
        related_name='outgoing_transactions', 
        null=True,
        blank=True,
        help_text="Conta de onde os pontos/milhas saíram (para Transferência, Resgate, Venda, Expiração, Ajuste de débito)"
    )
    destination_account = models.ForeignKey(
        LoyaltyAccount,
        on_delete=models.SET_NULL, 
        related_name='incoming_transactions', 
        null=True,
        blank=True,
        help_text="Conta para onde os pontos/milhas foram (para Inclusão Manual, Transferência, Ajuste de crédito)"
    )

    bonus_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Percentual de bônus em transferências (ex: 100.00 para 100%)"
    )
    description = models.CharField(
        max_length=255, blank=True,
        help_text="Uma breve descrição ou motivo para a transação"
    ) 
    transaction_date = models.DateTimeField(
        help_text="Data e hora em que a transação efetivamente ocorreu no programa de fidelidade"
    ) 
    created_at = models.DateTimeField(auto_now_add=True, help_text="Data de registro da transação") 

    def __str__(self):
        action = "???"
        account_name = "N/A"
        if self.transaction_type == 1: # Inclusão Manual
            action = "Crédito para"
            if self.destination_account: account_name = self.destination_account.name
        elif self.transaction_type == 2: # Transferência
            action = f"Transferência de {self.origin_account.name if self.origin_account else 'N/A'} para"
            if self.destination_account: account_name = self.destination_account.name
        elif self.transaction_type == 3: # Resgate
            action = "Resgate de"
            if self.origin_account: account_name = self.origin_account.name
        elif self.transaction_type == 4: # Venda
            action = "Venda de"
            if self.origin_account: account_name = self.origin_account.name
        elif self.transaction_type == 5: # Expiração
            action = "Expiração de"
            if self.origin_account: account_name = self.origin_account.name
        elif self.transaction_type == 6: # Ajuste
            action = "Ajuste em"
            if self.origin_account: account_name = self.origin_account.name
            elif self.destination_account: account_name = self.destination_account.name

        return f"{self.get_transaction_type_display()} [{action} {account_name}]: {self.amount} em {self.transaction_date.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ['-transaction_date', '-created_at']