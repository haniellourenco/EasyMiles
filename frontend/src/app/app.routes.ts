import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'wallets' },
      {
        path: 'wallets',
        loadChildren: () =>
          import('./pages/wallets/wallets.routes').then(
            (m) => m.WALLETS_ROUTES
          ),
      },
    ],
  },
  // Redireciona qualquer rota desconhecida para o login
  { path: '**', redirectTo: 'login' },
];
