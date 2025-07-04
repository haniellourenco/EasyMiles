import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { LoyaltyProgramsComponent } from './pages/loyalty-programs/loyalty-programs.component';

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
      { path: '', pathMatch: 'full', redirectTo: 'wallets' },
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
    ],
  },
  // Redireciona qualquer rota desconhecida para o login
  { path: '**', redirectTo: 'login' },
];
