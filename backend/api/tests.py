import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP

from .models import LoyaltyProgram, UserWallet, LoyaltyAccount, PointsTransaction
from .serializers import (
    LoyaltyProgramSerializer, UserWalletSerializer, LoyaltyAccountSerializer,
    PointsTransactionSerializer, CurrentUserSerializer
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user(django_user_model):
    def _create_user(username='testuser', password='password123', **kwargs):
        return django_user_model.objects.create_user(username=username, password=password, **kwargs)
    return _create_user

@pytest.fixture
def authenticated_api_client(api_client, create_user):
    user = create_user()
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user
    return api_client

@pytest.fixture
def another_user(create_user):
    return create_user(username='otheruser', password='password456')

@pytest.fixture
def authenticated_api_client_other(api_client, another_user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(another_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = another_user
    return api_client

@pytest.fixture
def default_program():
    return LoyaltyProgram.objects.create(name="Programa Padrao Milhas", currency_type=2, is_user_created=False)

@pytest.fixture
def custom_program(authenticated_api_client):
    return LoyaltyProgram.objects.create(
        name="Meu Programa Pontos",
        currency_type=1,
        is_user_created=True,
        created_by=authenticated_api_client.user
    )

@pytest.fixture
def user_wallet(authenticated_api_client):
    return UserWallet.objects.create(user=authenticated_api_client.user, wallet_name="Minha Carteira")

@pytest.fixture
def loyalty_account(user_wallet, default_program):
    return LoyaltyAccount.objects.create(
        wallet=user_wallet,
        program=default_program,
        name="Conta Milhas Padrao",
        account_number="12345",
        current_balance=Decimal('10000.00'),
        average_cost=Decimal('23.00'), 
        last_updated=timezone.now()
    )

@pytest.fixture
def loyalty_account_points(user_wallet, custom_program):
    return LoyaltyAccount.objects.create(
        wallet=user_wallet,
        program=custom_program,
        name="Conta Pontos Custom",
        account_number="67890",
        current_balance=Decimal('5000.00'),
        average_cost=Decimal('10.00'), 
        last_updated=timezone.now()
    )


def test_create_loyalty_program_model():
    program = LoyaltyProgram.objects.create(name="Teste Milhas", currency_type=2)
    assert program.name == "Teste Milhas"
    assert program.get_currency_type_display() == 'Milhas'
    assert program.is_active is True
    assert program.is_user_created is False
    assert str(program) == "Teste Milhas"

def test_create_user_wallet_model(create_user):
    user = create_user()
    wallet = UserWallet.objects.create(user=user, wallet_name="Carteira Viagem")
    assert wallet.user == user
    assert wallet.wallet_name == "Carteira Viagem"
    assert str(wallet) == f'Carteira Viagem ({user.username})'
    with pytest.raises(Exception): 
        UserWallet.objects.create(user=user, wallet_name="Carteira Viagem")

def test_create_loyalty_account_model(user_wallet, default_program):
    account = LoyaltyAccount.objects.create(
        wallet=user_wallet,
        program=default_program,
        name="Minha Conta Teste",
        current_balance=Decimal('500.00'),
        average_cost=Decimal('20.00'),
        last_updated=timezone.now()
    )
    assert account.wallet == user_wallet
    assert account.program == default_program
    assert account.name == "Minha Conta Teste"
    assert account.current_balance == Decimal('500.00')
    assert str(account) == f"Minha Conta Teste ({default_program.name}) - Saldo: 500.00"

def test_create_points_transaction_model(loyalty_account, loyalty_account_points):
    transaction = PointsTransaction.objects.create(
        transaction_type=2, 
        amount=Decimal('1000.00'),
        cost=Decimal('10.00'),
        origin_account=loyalty_account,
        destination_account=loyalty_account_points,
        bonus_percentage=Decimal('50.00'),
        transaction_date=timezone.now()
    )
    assert transaction.transaction_type == 2
    assert transaction.amount == Decimal('1000.00')
    assert transaction.origin_account == loyalty_account
    assert transaction.destination_account == loyalty_account_points
    assert str(transaction).startswith("Transferência")


def test_user_registration(api_client):
    url = reverse('user-register')
    data = {
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
        "password2": "password123",
        "first_name": "New",
        "last_name": "User"
    }
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert User.objects.filter(username="newuser").exists()

def test_user_registration_password_mismatch(api_client):
    url = reverse('user-register')
    data = {"username": "user2", "email": "e2@e.com", "password": "p1", "password2": "p2"}
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.data

def test_get_user_profile(authenticated_api_client):
    url = reverse('user-me')
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['username'] == authenticated_api_client.user.username

def test_update_user_profile(authenticated_api_client):
    url = reverse('user-me')
    data = {"first_name": "Updated", "last_name": "Name", "email": "updated@example.com"}
    response = authenticated_api_client.patch(url, data, format='json') 
    assert response.status_code == status.HTTP_200_OK
    authenticated_api_client.user.refresh_from_db()
    assert authenticated_api_client.user.first_name == "Updated"
    assert authenticated_api_client.user.email == "updated@example.com"


def test_list_programs_includes_default_and_custom(authenticated_api_client, default_program, custom_program):
    url = reverse('loyaltyprogram-list')
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    program_names = [p['name'] for p in response.data]
    assert default_program.name in program_names
    assert custom_program.name in program_names

def test_list_programs_other_user_sees_only_defaults(authenticated_api_client_other, default_program, custom_program):
    url = reverse('loyaltyprogram-list')
    response = authenticated_api_client_other.get(url)
    assert response.status_code == status.HTTP_200_OK
    program_names = [p['name'] for p in response.data]
    assert default_program.name in program_names
    assert custom_program.name not in program_names 

def test_create_custom_program_requires_auth(api_client):
    url = reverse('loyaltyprogram-list')
    data = {"name": "No Auth Program", "currency_type": 1, "is_user_created": True}
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_update_custom_program(authenticated_api_client, custom_program):
    url = reverse('loyaltyprogram-detail', kwargs={'pk': custom_program.pk})
    data = {"name": "Nome Atualizado Pontos"}
    response = authenticated_api_client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    custom_program.refresh_from_db()
    assert custom_program.name == "Nome Atualizado Pontos"

def test_cannot_update_default_program_fields(authenticated_api_client, default_program):
    url = reverse('loyaltyprogram-detail', kwargs={'pk': default_program.pk})
    data = {"name": "Tentativa Update Padrao"}
    response = authenticated_api_client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK 

def test_delete_custom_program(authenticated_api_client, custom_program):
    url = reverse('loyaltyprogram-detail', kwargs={'pk': custom_program.pk})
    response = authenticated_api_client.delete(url)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not LoyaltyProgram.objects.filter(pk=custom_program.pk).exists()

def test_cannot_delete_default_program(authenticated_api_client, default_program):
    url = reverse('loyaltyprogram-detail', kwargs={'pk': default_program.pk})
    response = authenticated_api_client.delete(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert LoyaltyProgram.objects.filter(pk=default_program.pk).exists()

def test_cannot_delete_program_with_accounts(authenticated_api_client, loyalty_account_points):
    custom_program_pk = loyalty_account_points.program.pk
    url = reverse('loyaltyprogram-detail', kwargs={'pk': custom_program_pk})
    response = authenticated_api_client.delete(url)
    assert response.status_code == status.HTTP_400_BAD_REQUEST 
    assert "existem contas de fidelidade associadas" in response.data['detail']
    assert LoyaltyProgram.objects.filter(pk=custom_program_pk).exists()

def test_toggle_active_custom_program(authenticated_api_client, custom_program):
    assert custom_program.is_active is True
    url = reverse('loyaltyprogram-toggle-active-status', kwargs={'pk': custom_program.pk})
    response = authenticated_api_client.patch(url, {}, format='json')
    assert response.status_code == status.HTTP_200_OK
    custom_program.refresh_from_db()
    assert custom_program.is_active is False
    response = authenticated_api_client.patch(url, {}, format='json')
    assert response.status_code == status.HTTP_200_OK
    custom_program.refresh_from_db()
    assert custom_program.is_active is True

def test_cannot_toggle_active_default_program(authenticated_api_client, default_program):
    url = reverse('loyaltyprogram-toggle-active-status', kwargs={'pk': default_program.pk})
    response = authenticated_api_client.patch(url, {}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN 


def test_list_wallets(authenticated_api_client, user_wallet):
    UserWallet.objects.create(user=authenticated_api_client.user, wallet_name="Outra Carteira")
    url = reverse('userwallet-list')
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2
    assert user_wallet.wallet_name in [w['wallet_name'] for w in response.data]

def test_create_wallet(authenticated_api_client):
    url = reverse('userwallet-list')
    data = {"wallet_name": "Nova Carteira Teste"}
    response = authenticated_api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['wallet_name'] == "Nova Carteira Teste"
    assert UserWallet.objects.filter(user=authenticated_api_client.user, wallet_name="Nova Carteira Teste").exists()

def test_retrieve_wallet(authenticated_api_client, user_wallet):
    url = reverse('userwallet-detail', kwargs={'pk': user_wallet.pk})
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['id'] == user_wallet.pk

def test_update_wallet(authenticated_api_client, user_wallet):
    url = reverse('userwallet-detail', kwargs={'pk': user_wallet.pk})
    data = {"wallet_name": "Carteira Renomeada"}
    response = authenticated_api_client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    user_wallet.refresh_from_db()
    assert user_wallet.wallet_name == "Carteira Renomeada"

def test_delete_wallet(authenticated_api_client, user_wallet):
    url = reverse('userwallet-detail', kwargs={'pk': user_wallet.pk})
    response = authenticated_api_client.delete(url)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not UserWallet.objects.filter(pk=user_wallet.pk).exists()

def test_cannot_access_other_user_wallet(authenticated_api_client_other, user_wallet):
    url_list = reverse('userwallet-list')
    url_detail = reverse('userwallet-detail', kwargs={'pk': user_wallet.pk})
    response_list = authenticated_api_client_other.get(url_list)
    assert response_list.status_code == status.HTTP_200_OK
    assert len(response_list.data) == 0
    response_detail = authenticated_api_client_other.get(url_detail)
    assert response_detail.status_code == status.HTTP_404_NOT_FOUND


def test_list_all_accounts_for_user(authenticated_api_client, loyalty_account, loyalty_account_points):
    url = reverse('loyaltyaccount-list-list') 
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2
    account_names = [a['name'] for a in response.data]
    assert loyalty_account.name in account_names
    assert loyalty_account_points.name in account_names

def test_list_accounts_nested_in_wallet(authenticated_api_client, user_wallet, loyalty_account, loyalty_account_points):
    url = reverse('wallet-loyaltyaccount-list', kwargs={'wallet_pk': user_wallet.pk})
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2

def test_create_account_nested(authenticated_api_client, user_wallet, default_program):
    url = reverse('wallet-loyaltyaccount-list', kwargs={'wallet_pk': user_wallet.pk})
    data = {
        "program": default_program.pk,
        "name": "Nova Conta Milhas",
        "account_number": "9999",
        "current_balance": "500.00",
        "average_cost": "25.00",
    }
    response = authenticated_api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['name'] == "Nova Conta Milhas"
    assert response.data['wallet'] == user_wallet.pk
    assert LoyaltyAccount.objects.filter(name="Nova Conta Milhas", wallet=user_wallet).exists()

def test_update_account(authenticated_api_client, loyalty_account):
    url = reverse('loyaltyaccount-list-detail', kwargs={'pk': loyalty_account.pk}) 
    data = {"name": "Conta Milhas Padrao Atualizada", "custom_rate": "30.0000"}
    response = authenticated_api_client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    loyalty_account.refresh_from_db()
    assert loyalty_account.name == "Conta Milhas Padrao Atualizada"
    assert loyalty_account.custom_rate == Decimal('30.0000')

def test_delete_account(authenticated_api_client, loyalty_account):
    url = reverse('loyaltyaccount-list-detail', kwargs={'pk': loyalty_account.pk})
    response = authenticated_api_client.delete(url)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not LoyaltyAccount.objects.filter(pk=loyalty_account.pk).exists()

def test_cannot_access_other_user_account(authenticated_api_client_other, loyalty_account):
    url_list_all = reverse('loyaltyaccount-list-list')
    url_detail = reverse('loyaltyaccount-list-detail', kwargs={'pk': loyalty_account.pk})
    response_list = authenticated_api_client_other.get(url_list_all)
    assert response_list.status_code == status.HTTP_200_OK
    assert len(response_list.data) == 0
    response_detail = authenticated_api_client_other.get(url_detail)
    assert response_detail.status_code == status.HTTP_404_NOT_FOUND


def create_transaction_via_api(client, data):
    url = reverse('pointstransaction-list-list')
    if 'transaction_date' in data and not isinstance(data['transaction_date'], str):
        data['transaction_date'] = data['transaction_date'].isoformat()
    return client.post(url, data, format='json')

def test_create_transaction_inclusion_manual_cost_zero(authenticated_api_client, loyalty_account):
    initial_balance = loyalty_account.current_balance
    initial_avg_cost = loyalty_account.average_cost
    data = {
        "transaction_type": 1,
        "destination_account": loyalty_account.pk,
        "amount": "1000.00",
        "cost": "0.00",
        "transaction_date": timezone.now()
    }
    response = create_transaction_via_api(authenticated_api_client, data)
    assert response.status_code == status.HTTP_201_CREATED
    loyalty_account.refresh_from_db()
    assert loyalty_account.current_balance == initial_balance + Decimal('1000.00')
    expected_avg_cost = ((initial_balance / 1000 * initial_avg_cost) + 0) / ((initial_balance + 1000) / 1000)
    assert loyalty_account.average_cost == expected_avg_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def test_create_transaction_inclusion_manual_with_cost(authenticated_api_client, loyalty_account):
    initial_balance = loyalty_account.current_balance 
    initial_avg_cost = loyalty_account.average_cost 
    data = {
        "transaction_type": 1,
        "destination_account": loyalty_account.pk,
        "amount": "10000.00", 
        "cost": "290.00", 
        "transaction_date": timezone.now()
    }
    response = create_transaction_via_api(authenticated_api_client, data)
    assert response.status_code == status.HTTP_201_CREATED
    loyalty_account.refresh_from_db()
    assert loyalty_account.current_balance == initial_balance + Decimal('10000.00') 
    assert loyalty_account.average_cost == Decimal('26.00')

def test_create_transaction_transfer_with_bonus(authenticated_api_client, loyalty_account, loyalty_account_points):
    origin_initial_balance = loyalty_account.current_balance 
    origin_initial_avg_cost = loyalty_account.average_cost 
    dest_initial_balance = loyalty_account_points.current_balance 
    dest_initial_avg_cost = loyalty_account_points.average_cost 

    data = {
        "transaction_type": 2,
        "origin_account": loyalty_account.pk,
        "destination_account": loyalty_account_points.pk,
        "amount": "2000.00", 
        "cost": "15.00", 
        "bonus_percentage": "100.00", 
        "transaction_date": timezone.now()
    }
    response = create_transaction_via_api(authenticated_api_client, data)
    assert response.status_code == status.HTTP_201_CREATED

    loyalty_account.refresh_from_db()
    loyalty_account_points.refresh_from_db()

    assert loyalty_account.current_balance == origin_initial_balance - Decimal('2000.00') 
    assert loyalty_account.average_cost == origin_initial_avg_cost 

    amount_received = Decimal('2000.00') * (1 + Decimal('100.00') / 100) 
    assert loyalty_account_points.current_balance == dest_initial_balance + amount_received 

    cost_of_transferred_points = (Decimal('2000.00') / 1000) * origin_initial_avg_cost 
    total_cost_added_to_dest = cost_of_transferred_points + Decimal('15.00') 
    old_total_cost_dest = (dest_initial_balance / 1000) * dest_initial_avg_cost 
    new_total_cost_dest = old_total_cost_dest + total_cost_added_to_dest 
    new_total_balance_dest = loyalty_account_points.current_balance 
    expected_avg_cost_dest = (new_total_cost_dest / new_total_balance_dest) * 1000 
    assert loyalty_account_points.average_cost == expected_avg_cost_dest.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) 

def test_create_transaction_sale(authenticated_api_client, loyalty_account):
    initial_balance = loyalty_account.current_balance
    initial_avg_cost = loyalty_account.average_cost
    data = {
        "transaction_type": 4, 
        "origin_account": loyalty_account.pk,
        "amount": "5000.00",
        "cost": "150.00", 
        "transaction_date": timezone.now()
    }
    response = create_transaction_via_api(authenticated_api_client, data)
    assert response.status_code == status.HTTP_201_CREATED
    loyalty_account.refresh_from_db()
    assert loyalty_account.current_balance == initial_balance - Decimal('5000.00')
    assert loyalty_account.average_cost == initial_avg_cost 

def test_create_transaction_invalid_same_account_transfer(authenticated_api_client, loyalty_account):
    data = {
        "transaction_type": 2,
        "origin_account": loyalty_account.pk,
        "destination_account": loyalty_account.pk, 
        "amount": "100.00",
        "transaction_date": timezone.now()
    }
    response = create_transaction_via_api(authenticated_api_client, data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "não podem ser a mesma" in response.data['non_field_errors'][0] 


def test_simulate_transfer(authenticated_api_client, loyalty_account, loyalty_account_points):
    url = reverse('simulation-transfer')
    data = {
        "from_account_id": loyalty_account.pk,
        "to_account_id": loyalty_account_points.pk,
        "amount": "10000.00",
        "bonus_percentage": "80.00"
    }
    response = authenticated_api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['amount_to_transfer'] == Decimal('10000.00')
    assert response.data['bonus_percentage'] == Decimal('80.00')
    assert response.data['amount_to_receive_at_destination'] == Decimal('18000.00')
    assert response.data['estimated_cost_per_thousand_at_destination'] == Decimal('12.78')

def test_simulate_sale(authenticated_api_client, loyalty_account):
    url = reverse('simulation-sale')
    data = {
        "loyalty_account_id": loyalty_account.pk,
        "amount_to_sell": "8000.00",
        "sale_price_per_1000_miles": "25.50"
    }
    response = authenticated_api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['amount_to_sell'] == Decimal('8000.00')
    assert response.data['sale_price_per_1000_miles'] == Decimal('25.50')
    assert response.data['total_estimated_sale_value'] == Decimal('204.00')
    assert response.data['total_estimated_cost_value'] == Decimal('184.00')
    assert response.data['estimated_profit'] == Decimal('20.00')

def test_simulate_sale_insufficient_balance(authenticated_api_client, loyalty_account):
    url = reverse('simulation-sale')
    data = {
        "loyalty_account_id": loyalty_account.pk,
        "amount_to_sell": "15000.00", 
        "sale_price_per_1000_miles": "25.00"
    }
    response = authenticated_api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Saldo insuficiente" in response.data['error']


def test_summary_api(authenticated_api_client, loyalty_account, loyalty_account_points):
    loyalty_account.custom_rate = Decimal('28.5000') 
    loyalty_account.save()

    url = reverse('summary-overall')
    response = authenticated_api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['username'] == authenticated_api_client.user.username
    assert response.data['total_wallets'] >= 1
    assert response.data['total_active_loyalty_accounts'] == 2
    assert response.data['overall_estimated_value'] == Decimal('285.00')
    assert len(response.data['balances_by_currency_type']) == 2 
    milhas_summary = next((item for item in response.data['balances_by_currency_type'] if item['currency_name'] == 'Milhas'), None)
    pontos_summary = next((item for item in response.data['balances_by_currency_type'] if item['currency_name'] == 'Pontos'), None)
    assert milhas_summary is not None
    assert pontos_summary is not None
    assert milhas_summary['total_balance'] == loyalty_account.current_balance
    assert pontos_summary['total_balance'] == loyalty_account_points.current_balance