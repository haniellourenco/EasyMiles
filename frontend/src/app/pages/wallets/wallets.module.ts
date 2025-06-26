import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { WALLETS_ROUTES } from './wallets.routes';
import { WalletListComponent } from './wallet-list/wallet-list.component';
import { WalletDetailComponent } from './wallet-detail/wallet-detail.component';
@NgModule({
  declarations: [WalletDetailComponent, WalletListComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(WALLETS_ROUTES),

    NzPageHeaderModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzGridModule,
    NzDescriptionsModule,
    NzTableModule,
    NzDividerModule,
    NzTagModule,
  ],
})
export class WalletsModule {}
