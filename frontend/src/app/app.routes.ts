import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { LoyaltyProgramsComponent } from './pages/loyalty-programs/loyalty-programs.component';
import { AddTransactionComponent } from './pages/add-transaction/add-transaction.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TransactionHistoryComponent } from './pages/transaction-history/transaction-history.component';
import { ProfileComponent } from './pages/profile/profile.component';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'wallets',
        loadChildren: () =>
          import('./pages/wallets/wallets.routes').then(
            (m) => m.WALLETS_ROUTES
          ),
      },
      {
        path: 'loyalty-programs',
        component: LoyaltyProgramsComponent,
      },
      {
        path: 'add-transaction',
        component: AddTransactionComponent,
      },
      {
        path: 'transaction-history',
        component: TransactionHistoryComponent,
      },
      {
        path: 'profile',
        component: ProfileComponent,
      },
    ],
  },
  // Redireciona qualquer rota desconhecida para '', que por sua vez redireciona para 'dashboard'
  { path: '**', redirectTo: '' },
];
