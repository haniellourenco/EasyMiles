import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-wallet-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzPageHeaderModule,
    NzButtonModule,
    NzIconModule,
    NzDescriptionsModule,
    NzTableModule,
    NzDividerModule,
    NzTagModule,
    NzCardModule,
  ],
  templateUrl: './wallet-detail.component.html',
  styleUrls: ['./wallet-detail.component.css'],
})
export class WalletDetailComponent {
  wallet = {
    id: 1,
    name: 'Carteira Principal',
    totalValue: 1250.75,
    owner: 'Haniell Lourenço',
  };
  loyaltyAccounts = [
    {
      program: 'Smiles',
      balance: 15000,
      averageCost: 18.5,
      currencyType: 'MILHA',
    },
    {
      program: 'LATAM Pass',
      balance: 22000,
      averageCost: 21.0,
      currencyType: 'PONTO',
    },
    {
      program: 'Livelo',
      balance: 5000,
      averageCost: 35.0,
      currencyType: 'PONTO',
    },
  ];
}
