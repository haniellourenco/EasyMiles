import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  Wallet,
  LoyaltyAccount,
  WalletService,
} from '../../../services/wallet.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { forkJoin } from 'rxjs';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

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
    NzCardModule,
    NzSpinModule,
    NzTagModule,
  ],
  templateUrl: './wallet-detail.component.html',
  styleUrls: ['./wallet-detail.component.css'],
})
export class WalletDetailComponent implements OnInit {
  wallet: Wallet | null = null;
  loyaltyAccounts: LoyaltyAccount[] = [];
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private walletService: WalletService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    const walletId = Number(this.route.snapshot.paramMap.get('id'));
    if (walletId) {
      this.loadDetails(walletId);
    }
  }

  loadDetails(id: number): void {
    this.isLoading = true;

    // forkJoin executa as duas chamadas em paralelo
    forkJoin({
      wallet: this.walletService.getWalletById(id),
      accounts: this.walletService.getLoyaltyAccounts(id),
    }).subscribe({
      next: (result) => {
        this.wallet = result.wallet;
        this.loyaltyAccounts = result.accounts;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes', err);
        this.message.error(
          'Não foi possível carregar os detalhes da carteira.'
        );
        this.isLoading = false;
      },
    });
  }
}
