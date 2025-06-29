import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Wallet, WalletService } from '../../../services/wallet.service';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-wallet-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzPageHeaderModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzGridModule,
    NzDropDownModule,
    NzPopconfirmModule,
    NzMessageModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
  ],
  templateUrl: './wallet-list.component.html',
  styleUrls: ['./wallet-list.component.css'],
})
export class WalletListComponent implements OnInit {
  isModalVisible = false;
  isModalLoading = false;
  modalTitle = 'Criar Nova Carteira';
  walletForm!: FormGroup;
  editingWalletId: number | null = null;
  wallets: Wallet[] = [];

  constructor(
    private fb: FormBuilder,
    private message: NzMessageService,
    private walletService: WalletService
  ) {}

  ngOnInit(): void {
    this.walletForm = this.fb.group({
      wallet_name: [null, [Validators.required, Validators.minLength(3)]],
    });
    this.loadWallets();
  }

  loadWallets(): void {
    this.walletService.getWallets().subscribe({
      next: (data) => {
        this.wallets = data;
      },
      error: (err) => {
        console.error('Erro ao carregar carteiras', err);
        this.message.error('Não foi possível carregar as carteiras.');
      },
    });
  }

  showModal(wallet?: Wallet): void {
    if (wallet) {
      this.modalTitle = 'Editar Carteira';
      this.editingWalletId = wallet.id;
      this.walletForm.setValue({ wallet_name: wallet.wallet_name });
    } else {
      this.modalTitle = 'Criar Nova Carteira';
      this.editingWalletId = null;
      this.walletForm.reset();
    }
    this.isModalVisible = true;
  }

  handleOk(): void {
    if (this.walletForm.valid) {
      this.isModalLoading = true;
      const walletData = this.walletForm.value;

      const apiCall = this.editingWalletId
        ? this.walletService.updateWallet(this.editingWalletId, walletData)
        : this.walletService.createWallet(walletData);

      apiCall.subscribe({
        next: () => {
          this.message.success(
            `Carteira ${
              this.editingWalletId ? 'atualizada' : 'criada'
            } com sucesso!`
          );
          this.loadWallets();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erro ao salvar carteira', err);
          this.message.error('Erro ao salvar carteira.');
          this.isModalLoading = false;
        },
      });
    } else {
      this.validateForm();
    }
  }

  handleCancel(): void {
    this.closeModal();
  }

  deleteWallet(walletId: number): void {
    this.walletService.deleteWallet(walletId).subscribe({
      next: () => {
        this.message.success('Carteira excluída com sucesso!');
        this.loadWallets();
      },
      error: (err) => {
        console.error('Erro ao excluir carteira', err);
        this.message.error('Erro ao excluir a carteira.');
      },
    });
  }

  private closeModal(): void {
    this.isModalVisible = false;
    this.isModalLoading = false;
    this.editingWalletId = null;
    this.walletForm.reset();
  }

  private validateForm(): void {
    Object.values(this.walletForm.controls).forEach((control) => {
      if (control.invalid) {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      }
    });
  }
}
