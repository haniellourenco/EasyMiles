import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  ValidatorFn,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LoyaltyAccount, WalletService } from '../../services/wallet.service';
import { TransactionService } from '../../services/transaction.service';

// NG-ZORRO Imports
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpinModule } from 'ng-zorro-antd/spin';

// Validador customizado para garantir que as contas de origem e destino não sejam iguais
export const differentAccountsValidator: ValidatorFn = (
  control: AbstractControl
): { [key: string]: any } | null => {
  const origin = control.get('origin_account');
  const destination = control.get('destination_account');
  return origin &&
    destination &&
    origin.value &&
    origin.value === destination.value
    ? { sameAccount: true }
    : null;
};

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzPageHeaderModule,
    NzCardModule,
    NzFormModule,
    NzSelectModule,
    NzInputNumberModule,
    NzDatePickerModule,
    NzInputModule,
    NzButtonModule,
    NzGridModule,
    NzSpinModule,
  ],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.css'],
})
export class AddTransactionComponent implements OnInit, OnDestroy {
  transactionForm!: FormGroup;
  accounts: LoyaltyAccount[] = [];
  isLoading = false;
  isSubmitting = false;

  transactionTypes = [
    { value: 1, label: 'Inclusão Manual (Crédito)' },
    { value: 2, label: 'Transferência entre Contas' },
    { value: 3, label: 'Resgate (Débito)' },
    { value: 4, label: 'Venda de Milhas (Débito)' },
    { value: 5, label: 'Expiração de Pontos (Débito)' },
    { value: 6, label: 'Ajuste de Saldo' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private walletService: WalletService,
    private transactionService: TransactionService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAccounts();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.transactionForm = this.fb.group(
      {
        transaction_type: [null, [Validators.required]],
        origin_account: [null],
        destination_account: [null],
        amount: [null, [Validators.required, Validators.min(0.01)]],
        cost: [null, [Validators.min(0)]],
        bonus_percentage: [0, [Validators.min(0)]],
        transaction_date: [new Date(), [Validators.required]],
        description: [''],
      },
      { validators: differentAccountsValidator }
    );
  }

  private loadAccounts(): void {
    this.isLoading = true;
    this.walletService.getAllLoyaltyAccounts().subscribe({
      next: (data) => {
        this.accounts = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar contas', err);
        this.message.error(
          'Não foi possível carregar as contas de fidelidade.'
        );
        this.isLoading = false;
      },
    });
  }

  private setupFormListeners(): void {
    this.transactionForm
      .get('transaction_type')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        this.updateValidators(type);
      });
  }

  private updateValidators(type: number): void {
    const origin = this.transactionForm.get('origin_account');
    const destination = this.transactionForm.get('destination_account');

    // Limpa validadores antigos
    origin?.clearValidators();
    destination?.clearValidators();

    if (type === 1) {
      // Inclusão Manual
      destination?.setValidators([Validators.required]);
    } else if (type === 2) {
      // Transferência
      origin?.setValidators([Validators.required]);
      destination?.setValidators([Validators.required]);
    } else if ([3, 4, 5].includes(type)) {
      // Resgate, Venda, Expiração
      origin?.setValidators([Validators.required]);
    } else if (type === 6) {
      // Ajuste
    }

    origin?.updateValueAndValidity();
    destination?.updateValueAndValidity();
  }

  submitForm(): void {
    // Validação para o tipo "Ajuste"
    if (this.transactionForm.get('transaction_type')?.value === 6) {
      const origin = this.transactionForm.get('origin_account')?.value;
      const destination = this.transactionForm.get(
        'destination_account'
      )?.value;
      if (!origin && !destination) {
        this.message.error(
          'Para "Ajuste de Saldo", selecione uma conta de origem ou destino.'
        );
        return;
      }
    }

    if (this.transactionForm.valid) {
      this.isSubmitting = true;
      const formValue = this.transactionForm.value;

      const transactionDate = new Date(formValue.transaction_date);
      const isoDate = transactionDate.toISOString();

      const payload = {
        ...formValue,
        transaction_date: isoDate,
      };

      this.transactionService.createTransaction(payload).subscribe({
        next: () => {
          this.message.success('Transação registrada com sucesso!');
          this.transactionForm.reset({
            transaction_date: new Date(),
            bonus_percentage: 0,
          });
          this.isSubmitting = false;
        },
        error: (err) => {
          console.error('Erro ao criar transação', err);
          this.message.error(
            err.error?.detail || 'Não foi possível registrar a transação.'
          );
          this.isSubmitting = false;
        },
      });
    } else {
      Object.values(this.transactionForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      if (this.transactionForm.hasError('sameAccount')) {
        this.message.error(
          'A conta de origem e destino não podem ser a mesma.'
        );
      }
    }
  }
}
