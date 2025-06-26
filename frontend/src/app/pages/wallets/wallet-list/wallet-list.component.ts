import { Component } from '@angular/core';

@Component({
  selector: 'app-wallet-list',
  templateUrl: './wallet-list.component.html',
  standalone: false,
  styleUrl: './wallet-list.component.css',
})
export class WalletListComponent {
  wallets = [
    {
      id: 1,
      name: 'Carteira Principal',
      totalValue: 1250.75,
      accountCount: 3,
      lastUpdate: new Date('2025-06-23T14:00:00Z'),
    },
    {
      id: 2,
      name: 'Viagem para Europa',
      totalValue: 3800.0,
      accountCount: 2,
      lastUpdate: new Date('2025-06-24T10:30:00Z'),
    },
    {
      id: 3,
      name: 'Projetos Futuros',
      totalValue: 540.2,
      accountCount: 1,
      lastUpdate: new Date('2025-06-22T18:45:00Z'),
    },
  ];
}
