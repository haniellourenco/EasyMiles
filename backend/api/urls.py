# backend - Copia/api/urls.py
from django.urls import path, include
from rest_framework_nested import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    LoyaltyProgramViewSet,
    UserWalletViewSet,
    LoyaltyAccountViewSet,
    PointsTransactionViewSet,
    UserRegistrationAPIView,
    UserProfileAPIView,
    SimulationViewSet,
    SummaryAPIView
)

router = routers.DefaultRouter()
router.register(r'loyalty-programs', LoyaltyProgramViewSet, basename='loyaltyprogram')
router.register(r'wallets', UserWalletViewSet, basename='userwallet')
# Rotas de nível superior para contas e transações (permitem listar todas do usuário)
router.register(r'loyalty-accounts', LoyaltyAccountViewSet, basename='loyaltyaccount-list')
router.register(r'transactions', PointsTransactionViewSet, basename='pointstransaction-list')
router.register(r'simulations', SimulationViewSet, basename='simulation')


# Rotas aninhadas: /wallets/{wallet_pk}/loyalty-accounts/
wallets_router = routers.NestedSimpleRouter(router, r'wallets', lookup='wallet')
wallets_router.register(r'loyalty-accounts', LoyaltyAccountViewSet, basename='wallet-loyaltyaccount')

# Rotas aninhadas: /loyalty-accounts/{account_pk}/transactions/
# Esta rota aninhada agora usará a lookup 'account' 
accounts_router = routers.NestedSimpleRouter(router, r'loyalty-accounts', lookup='account')
accounts_router.register(r'transactions', PointsTransactionViewSet, basename='account-transaction')


urlpatterns = [
    path('', include(router.urls)),
    path('', include(wallets_router.urls)),
    path('', include(accounts_router.urls)),
    
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('users/register/', UserRegistrationAPIView.as_view(), name='user-register'),
    path('users/me/', UserProfileAPIView.as_view(), name='user-me'),

    path('summary/overall/', SummaryAPIView.as_view(), name='summary-overall'),
]