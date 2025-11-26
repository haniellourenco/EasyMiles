import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';

import {
  TransactionService,
  Transaction,
} from '../../services/transaction.service';
import { WalletService, LoyaltyAccount } from '../../services/wallet.service';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzPageHeaderModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzPopconfirmModule,
    NzDatePickerModule,
    NzSelectModule,
    NzToolTipModule,
    NzCardModule,
    NzGridModule,
  ],
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.css'],
})
export class TransactionHistoryComponent implements OnInit {
  allTransactions: Transaction[] = [];
  displayTransactions: Transaction[] = [];
  accounts: LoyaltyAccount[] = [];
  isLoading = true;

  filterDateRange: Date[] = [];
  filterType: number | null = null;
  filterAccount: number | null = null;

  typeMap: { [key: number]: { color: string; icon: string } } = {
    1: { color: 'green', icon: 'plus-circle' }, // Inclusão
    2: { color: 'blue', icon: 'swap' }, // Transferência
    3: { color: 'red', icon: 'gift' }, // Resgate
    4: { color: 'gold', icon: 'dollar' }, // Venda
    5: { color: 'magenta', icon: 'clock-circle' }, // Expiração
    6: { color: 'cyan', icon: 'edit' }, // Ajuste
  };

  transactionTypes = [
    { value: 1, label: 'Inclusão Manual' },
    { value: 2, label: 'Transferência' },
    { value: 3, label: 'Resgate' },
    { value: 4, label: 'Venda' },
    { value: 5, label: 'Expiração' },
    { value: 6, label: 'Ajuste' },
  ];

  constructor(
    private transactionService: TransactionService,
    private walletService: WalletService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.transactionService.getTransactions().subscribe({
      next: (data) => {
        this.allTransactions = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar transações.');
        this.isLoading = false;
      },
    });

    this.walletService
      .getAllLoyaltyAccounts()
      .subscribe((data) => (this.accounts = data));
  }

  applyFilters(): void {
    let data = [...this.allTransactions];

    // Filtro de Tipo
    if (this.filterType) {
      data = data.filter((t) => t.transaction_type === this.filterType);
    }

    // Filtro de Conta
    if (this.filterAccount) {
      data = data.filter(
        (t) =>
          t.origin_account === this.filterAccount ||
          t.destination_account === this.filterAccount
      );
    }

    // Filtro de Data
    if (this.filterDateRange && this.filterDateRange.length === 2) {
      const start = this.filterDateRange[0];
      const end = this.filterDateRange[1];
      // Ajusta o fim para o final do dia
      end.setHours(23, 59, 59, 999);

      data = data.filter((t) => {
        const tDate = new Date(t.transaction_date);
        return tDate >= start && tDate <= end;
      });
    }

    this.displayTransactions = data;
  }

  resetFilters(): void {
    this.filterType = null;
    this.filterAccount = null;
    this.filterDateRange = [];
    this.applyFilters();
  }

  deleteTransaction(id: number): void {
    this.transactionService.deleteTransaction(id).subscribe({
      next: () => {
        this.message.success('Transação excluída e saldos revertidos.');
        this.allTransactions = this.allTransactions.filter((t) => t.id !== id);
        this.applyFilters();
      },
      error: () => this.message.error('Erro ao excluir transação.'),
    });
  }

  getTypeColor(type: number): string {
    return this.typeMap[type]?.color || 'default';
  }

  getTypeIcon(type: number): string {
    return this.typeMap[type]?.icon || 'question';
  }

  getTransactionDetails(t: Transaction): string {
    if (t.transaction_type === 1)
      return `Crédito em ${t.destination_account_name}`;
    if (t.transaction_type === 2)
      return `${t.origin_account_name} → ${t.destination_account_name}`;
    if ([3, 4, 5].includes(t.transaction_type))
      return `Saída de ${t.origin_account_name}`;
    if (t.transaction_type === 6) {
      if (t.destination_account)
        return `Ajuste em ${t.destination_account_name}`;
      return `Ajuste em ${t.origin_account_name}`;
    }
    return '-';
  }

  isPositive(t: Transaction): boolean {
    return (
      [1].includes(t.transaction_type) ||
      (t.transaction_type === 6 && !!t.destination_account)
    );
  }
}
