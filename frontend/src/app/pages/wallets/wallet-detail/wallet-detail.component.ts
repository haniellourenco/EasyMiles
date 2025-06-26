import { Component } from '@angular/core';

@Component({
  selector: 'app-wallet-detail',
  standalone: false,
  templateUrl: './wallet-detail.component.html',
  styleUrl: './wallet-detail.component.css',
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
