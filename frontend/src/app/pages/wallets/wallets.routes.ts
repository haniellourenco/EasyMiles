import { Routes } from '@angular/router';
import { WalletListComponent } from './wallet-list/wallet-list.component';
import { WalletDetailComponent } from './wallet-detail/wallet-detail.component';

export const WALLETS_ROUTES: Routes = [
  {
    path: '',
    component: WalletListComponent,
  },
  {
    path: ':id',
    component: WalletDetailComponent,
  },
];
