import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';

import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageModule } from 'ng-zorro-antd/message';

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
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzDropDownModule,
    NzPopconfirmModule,
    NzMessageModule,
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

  constructor(private fb: FormBuilder, private message: NzMessageService) {}

  ngOnInit(): void {
    this.walletForm = this.fb.group({
      name: [null, [Validators.required, Validators.minLength(3)]],
    });
  }

  showModal(wallet?: any): void {
    if (wallet) {
      this.modalTitle = 'Editar Carteira';
      this.editingWalletId = wallet.id;
      this.walletForm.setValue({ name: wallet.name });
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
      const walletData = { name: this.walletForm.value.name };

      setTimeout(() => {
        if (this.editingWalletId) {
          this.wallets = this.wallets.map((w) =>
            w.id === this.editingWalletId ? { ...w, ...walletData } : w
          );
          this.message.success('Carteira atualizada com sucesso!');
        } else {
          const newWallet = {
            ...walletData,
            id: Date.now(),
            totalValue: 0,
            accountCount: 0,
            lastUpdate: new Date(),
          };
          this.wallets = [...this.wallets, newWallet];
          this.message.success('Carteira criada com sucesso!');
        }

        this.closeModal();
      }, 1000);
    } else {
      this.validateForm();
    }
  }

  handleCancel(): void {
    this.closeModal();
  }

  deleteWallet(walletId: number): void {
    this.wallets = this.wallets.filter((w) => w.id !== walletId);
    this.message.success('Carteira excluída com sucesso!');
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
