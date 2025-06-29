import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '' },
  {
    path: 'wallets',

    loadChildren: () =>
      import('./pages/wallets/wallets.routes').then((m) => m.WALLETS_ROUTES),
  },
];
