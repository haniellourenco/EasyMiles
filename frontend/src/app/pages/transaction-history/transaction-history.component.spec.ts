import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { TransactionHistoryComponent } from './transaction-history.component';
import { TransactionService } from '../../services/transaction.service';
import { WalletService } from '../../services/wallet.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

const mockTransactions = [
  {
    id: 1,
    transaction_type: 1, // Inclusão
    transaction_type_display: 'Inclusão Manual',
    amount: '10000',
    cost: '350.00',
    origin_account: null,
    origin_account_name: null,
    destination_account: 1,
    destination_account_name: 'Smiles',
    bonus_percentage: null,
    description: 'Compra de pontos',
    transaction_date: '2025-11-25T10:00:00Z',
  },
  {
    id: 2,
    transaction_type: 2, // Transferência
    transaction_type_display: 'Transferência',
    amount: '5000',
    cost: '0.00',
    origin_account: 2,
    origin_account_name: 'Livelo',
    destination_account: 1,
    destination_account_name: 'Smiles',
    bonus_percentage: '100',
    description: 'Transf Bonificada',
    transaction_date: '2025-11-26T14:00:00Z',
  },
];

const mockAccounts = [{ id: 1, name: 'Conta Smiles', program_name: 'Smiles' }];

describe('TransactionHistoryComponent', () => {
  let component: TransactionHistoryComponent;
  let fixture: ComponentFixture<TransactionHistoryComponent>;

  let transactionServiceSpy: jasmine.SpyObj<TransactionService>;
  let walletServiceSpy: jasmine.SpyObj<WalletService>;
  let messageServiceSpy: jasmine.SpyObj<NzMessageService>;

  beforeEach(async () => {
    transactionServiceSpy = jasmine.createSpyObj('TransactionService', [
      'getTransactions',
      'deleteTransaction',
    ]);
    walletServiceSpy = jasmine.createSpyObj('WalletService', [
      'getAllLoyaltyAccounts',
    ]);
    messageServiceSpy = jasmine.createSpyObj('NzMessageService', [
      'success',
      'error',
    ]);

    transactionServiceSpy.getTransactions.and.returnValue(of(mockTransactions));
    walletServiceSpy.getAllLoyaltyAccounts.and.returnValue(
      of(mockAccounts as any)
    );

    await TestBed.configureTestingModule({
      imports: [
        TransactionHistoryComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: TransactionService, useValue: transactionServiceSpy },
        { provide: WalletService, useValue: walletServiceSpy },
        { provide: NzMessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente e carregar dados iniciais', () => {
    expect(component).toBeTruthy();
    expect(transactionServiceSpy.getTransactions).toHaveBeenCalled();
    expect(walletServiceSpy.getAllLoyaltyAccounts).toHaveBeenCalled();

    expect(component.allTransactions.length).toBe(2);
    expect(component.displayTransactions.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('deve filtrar por Tipo de Transação', () => {
    component.filterType = 2;
    component.applyFilters();

    expect(component.displayTransactions.length).toBe(1);
    expect(component.displayTransactions[0].id).toBe(2);
  });

  it('deve filtrar por Conta (Origem ou Destino)', () => {
    component.filterAccount = 2;
    component.applyFilters();

    expect(component.displayTransactions.length).toBe(1);
    expect(component.displayTransactions[0].origin_account).toBe(2);
  });

  it('deve excluir transação com sucesso e atualizar a lista', () => {
    transactionServiceSpy.deleteTransaction.and.returnValue(of(void 0));

    component.deleteTransaction(1);

    expect(transactionServiceSpy.deleteTransaction).toHaveBeenCalledWith(1);

    expect(messageServiceSpy.success).toHaveBeenCalled();

    expect(component.allTransactions.length).toBe(1);
    expect(component.allTransactions.find((t) => t.id === 1)).toBeUndefined();
  });

  it('deve exibir erro ao falhar exclusão', () => {
    transactionServiceSpy.deleteTransaction.and.returnValue(
      throwError(() => new Error('Erro'))
    );

    component.deleteTransaction(99);

    expect(messageServiceSpy.error).toHaveBeenCalled();
    expect(component.allTransactions.length).toBe(2);
  });

  it('deve limpar filtros corretamente', () => {
    component.filterType = 1;
    component.filterAccount = 1;
    component.applyFilters();
    expect(component.displayTransactions.length).toBeLessThan(2);

    component.resetFilters();

    expect(component.filterType).toBeNull();
    expect(component.filterAccount).toBeNull();
    expect(component.displayTransactions.length).toBe(2);
  });
});
