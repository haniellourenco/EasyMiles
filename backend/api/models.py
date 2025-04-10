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
    name = models.CharField(max_length=100)
    currency_type = models.IntegerField(choices=CURRENCY_TYPE_CHOICES)
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

    def __str__(self):
        return f'{self.wallet_name} ({self.user.username})'
    

class LoyaltyAccount(models.Model):
    wallet = models.ForeignKey(UserWallet, on_delete=models.CASCADE, related_name="loyalty_accounts")
    program = models.ForeignKey(LoyaltyProgram, on_delete=models.CASCADE, related_name="loyalty_accounts")
    account_number = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2)
    average_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    custom_rate = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    last_updated = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.account_number})"
    

class PointsTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        (1, 'Inclusao manual'),
        (2, 'Transferencia'),
        (3, 'Resgate'),
        (4, 'Venda'),
        (5, 'Expiracao'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='points_transactions'
    )
    wallet = models.ForeignKey(
        UserWallet,
        on_delete=models.CASCADE,
        related_name='points_transactions'
    )
    transaction_type = models.IntegerField(choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    origin_account = models.ForeignKey(
        LoyaltyAccount,
        on_delete=models.CASCADE,
        related_name='origin_transactions'
    )
    destination_account = models.ForeignKey(
        LoyaltyAccount,
        on_delete=models.CASCADE,
        related_name='destination_transactions'
    )
    bonus_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    observation = models.TextField(null=True, blank=True)
    transaction_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} ({self.transaction_date.date()})"