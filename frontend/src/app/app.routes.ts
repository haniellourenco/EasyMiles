import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/welcome' },
  {
    path: 'wallets',
    loadChildren: () =>
      import('./pages/wallets/wallets.module').then((m) => m.WalletsModule),
  },
];
