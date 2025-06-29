// src/app/pages/wallets/wallet-detail/wallet-detail.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  Wallet,
  LoyaltyAccount,
  WalletService,
  LoyaltyProgram,
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
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-wallet-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzPageHeaderModule,
    NzButtonModule,
    NzIconModule,
    NzDescriptionsModule,
    NzTableModule,
    NzCardModule,
    NzSpinModule,
    NzTagModule,
    NzSelectModule,
    NzInputNumberModule,
    NzFormModule,
    NzModalModule,
    NzInputModule,
  ],
  templateUrl: './wallet-detail.component.html',
  styleUrls: ['./wallet-detail.component.css'],
})
export class WalletDetailComponent implements OnInit {
  wallet: Wallet | null = null;
  loyaltyAccounts: LoyaltyAccount[] = [];
  isLoading = true;

  isAddAccountModalVisible = false;
  isAddAccountModalLoading = false;
  addAccountForm!: FormGroup;
  availablePrograms: LoyaltyProgram[] = [];

  constructor(
    private route: ActivatedRoute,
    private walletService: WalletService,
    private message: NzMessageService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.addAccountForm = this.fb.group({
      program: [null, [Validators.required]],
      account_number: [null, [Validators.required]],
      name: [null, [Validators.required]],
      current_balance: [0, [Validators.required, Validators.min(0)]],
      average_cost: [0, [Validators.required, Validators.min(0)]],
    });

    const walletId = Number(this.route.snapshot.paramMap.get('id'));
    if (walletId) {
      this.loadDetails(walletId);
    }
  }

  loadDetails(id: number): void {
    this.isLoading = true;
    forkJoin({
      wallet: this.walletService.getWalletById(id),
      accounts: this.walletService.getLoyaltyAccounts(id),
      programs: this.walletService.getLoyaltyPrograms(),
    }).subscribe({
      next: (result) => {
        this.wallet = result.wallet;
        this.loyaltyAccounts = result.accounts;
        this.availablePrograms = result.programs;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        this.message.error('Erro ao carregar os detalhes da carteira.');
      },
    });
  }

  showAddAccountModal(): void {
    this.addAccountForm.reset();
    this.isAddAccountModalVisible = true;
  }

  handleAddAccountOk(): void {
    if (this.addAccountForm.valid) {
      this.isAddAccountModalLoading = true;
      if (this.wallet?.id) {
        this.walletService
          .createLoyaltyAccount(this.wallet.id, this.addAccountForm.value)
          .subscribe({
            next: () => {
              this.message.success(
                'Conta de fidelidade adicionada com sucesso!'
              );
              this.isAddAccountModalVisible = false;
              this.isAddAccountModalLoading = false;
              this.loadDetails(this.wallet!.id);
            },
            error: (err) => {
              console.error('Erro ao adicionar conta', err);
              this.message.error('Não foi possível adicionar a conta.');
              this.isAddAccountModalLoading = false;
            },
          });
      }
    } else {
      Object.values(this.addAccountForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  handleAddAccountCancel(): void {
    this.isAddAccountModalVisible = false;
  }
}
