import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, forkJoin } from 'rxjs';
import { delay } from 'rxjs/operators';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { WalletDetailComponent } from './wallet-detail.component';
import {
  WalletService,
  Wallet,
  LoyaltyAccount,
} from '../../../services/wallet.service';
import {
  LoyaltyProgramService,
  LoyaltyProgram,
} from '../../../services/loyalty-program.service';
import { NzMessageService } from 'ng-zorro-antd/message';

const MOCK_WALLET_ID = 1;

const mockWallet: Wallet = {
  id: MOCK_WALLET_ID,
  wallet_name: 'Carteira Teste',
  user: 1,
};

const mockAccounts: LoyaltyAccount[] = [
  {
    id: 101,
    name: 'Conta Smiles',
    account_number: '12345',
    wallet: MOCK_WALLET_ID,
    wallet_name: 'Carteira Teste',
    program: 1,
    program_name: 'Smiles',
    program_currency_type: 'Milhas',
    current_balance: '10000',
    average_cost: '21.00',
  },
];

const mockPrograms: LoyaltyProgram[] = [
  {
    id: 1,
    name: 'Smiles',
    currency_type: 2,
    get_currency_type_display: 'Milhas',
    is_user_created: false,
    is_active: true,
  },
  {
    id: 2,
    name: 'LATAM Pass',
    currency_type: 2,
    get_currency_type_display: 'Milhas',
    is_user_created: false,
    is_active: true,
  },
];

describe('WalletDetailComponent', () => {
  let component: WalletDetailComponent;
  let fixture: ComponentFixture<WalletDetailComponent>;
  let mockWalletService: jasmine.SpyObj<WalletService>;
  let mockLoyaltyProgramService: jasmine.SpyObj<LoyaltyProgramService>;
  let mockMessageService: jasmine.SpyObj<NzMessageService>;
  let mockActivatedRoute: any;

  beforeEach(waitForAsync(() => {
    mockWalletService = jasmine.createSpyObj('WalletService', [
      'getWalletById',
      'getLoyaltyAccounts',
      'createLoyaltyAccount',
    ]);
    mockLoyaltyProgramService = jasmine.createSpyObj('LoyaltyProgramService', [
      'getLoyaltyPrograms',
    ]);
    mockMessageService = jasmine.createSpyObj('NzMessageService', [
      'success',
      'error',
    ]);

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'id' ? String(MOCK_WALLET_ID) : null),
        },
      },
    };

    TestBed.configureTestingModule({
      imports: [
        WalletDetailComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        {
          provide: LoyaltyProgramService,
          useValue: mockLoyaltyProgramService,
        },
        { provide: NzMessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletDetailComponent);
    component = fixture.componentInstance;
  }));

  describe('Initialization and Data Loading', () => {
    it('should create', () => {
      mockWalletService.getWalletById.and.returnValue(of(mockWallet));
      mockWalletService.getLoyaltyAccounts.and.returnValue(of(mockAccounts));
      mockLoyaltyProgramService.getLoyaltyPrograms.and.returnValue(
        of(mockPrograms)
      );
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('deve inicializar o formulário no ngOnInit', () => {
      mockWalletService.getWalletById.and.returnValue(of(mockWallet));
      mockWalletService.getLoyaltyAccounts.and.returnValue(of(mockAccounts));
      mockLoyaltyProgramService.getLoyaltyPrograms.and.returnValue(
        of(mockPrograms)
      );
      fixture.detectChanges();
      expect(component.addAccountForm).toBeDefined();
      expect(
        component.addAccountForm
          .get('program')
          ?.hasValidator(Validators.required)
      ).toBeTrue();
      expect(
        component.addAccountForm.get('name')?.hasValidator(Validators.required)
      ).toBeTrue();
    });

    it('deve chamar loadDetails no ngOnInit e carregar dados com sucesso', fakeAsync(() => {
      mockWalletService.getWalletById.and.returnValue(
        of(mockWallet).pipe(delay(0))
      );
      mockWalletService.getLoyaltyAccounts.and.returnValue(
        of(mockAccounts).pipe(delay(0))
      );
      mockLoyaltyProgramService.getLoyaltyPrograms.and.returnValue(
        of(mockPrograms).pipe(delay(0))
      );

      fixture.detectChanges();

      expect(component.isLoading).toBeTrue();
      tick();
      fixture.detectChanges();

      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        MOCK_WALLET_ID
      );
      expect(mockWalletService.getLoyaltyAccounts).toHaveBeenCalledWith(
        MOCK_WALLET_ID
      );
      expect(mockLoyaltyProgramService.getLoyaltyPrograms).toHaveBeenCalled();

      expect(component.wallet).toEqual(mockWallet);
      expect(component.loyaltyAccounts).toEqual(mockAccounts);
      expect(component.availablePrograms).toEqual(mockPrograms);
      expect(component.isLoading).toBeFalse();
    }));

    xit('deve mostrar erro se o forkJoin (loadDetails) falhar', fakeAsync(() => {
      mockWalletService.getWalletById.and.returnValue(
        of(mockWallet).pipe(delay(0))
      );
      mockWalletService.getLoyaltyAccounts.and.returnValue(
        throwError(() => new Error('Falha ao buscar contas')).pipe(delay(0))
      );
      mockLoyaltyProgramService.getLoyaltyPrograms.and.returnValue(
        of(mockPrograms).pipe(delay(0))
      );

      fixture.detectChanges();
      expect(component.isLoading).toBeTrue();

      tick();

      tick(100);

      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      expect(mockMessageService.error).toHaveBeenCalledWith(
        'Erro ao carregar os detalhes da carteira.'
      );
      expect(component.wallet).toBeNull();
      expect(component.loyaltyAccounts.length).toBe(0);
    }));
  });

  describe('Add Account Modal', () => {
    beforeEach(fakeAsync(() => {
      mockWalletService.getWalletById.and.returnValue(of(mockWallet));
      mockWalletService.getLoyaltyAccounts.and.returnValue(of(mockAccounts));
      mockLoyaltyProgramService.getLoyaltyPrograms.and.returnValue(
        of(mockPrograms)
      );
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('showAddAccountModal: deve abrir o modal e resetar o formulário', () => {
      spyOn(component.addAccountForm, 'reset');
      component.showAddAccountModal();

      expect(component.isAddAccountModalVisible).toBeTrue();
      expect(component.addAccountForm.reset).toHaveBeenCalled();
    });

    it('handleAddAccountCancel: deve fechar o modal', () => {
      component.showAddAccountModal();
      component.handleAddAccountCancel();
      expect(component.isAddAccountModalVisible).toBeFalse();
    });

    it('handleAddAccountOk: não deve submeter se o formulário for inválido', () => {
      component.showAddAccountModal();
      component.addAccountForm.get('name')?.setValue('');
      component.handleAddAccountOk();

      expect(component.addAccountForm.valid).toBeFalse();
      expect(mockWalletService.createLoyaltyAccount).not.toHaveBeenCalled();
      expect(component.isAddAccountModalLoading).toBeFalse();
    });

    it('handleAddAccountOk: deve criar conta, mostrar sucesso, fechar modal e recarregar', fakeAsync(() => {
      const loadDetailsSpy = spyOn(component, 'loadDetails').and.callFake(
        () => {}
      );
      const newAccountPayload = {
        program: 1,
        account_number: '98765',
        name: 'Nova Conta Teste',
        current_balance: 500,
        average_cost: 10,
      };
      const newAccountResponse: LoyaltyAccount = {
        id: 102,
        ...newAccountPayload,
        wallet: 1,
        wallet_name: 'Carteira Teste',
        program_name: 'Smiles',
        program_currency_type: 'Milhas',
        current_balance: '500',
        average_cost: '10',
      };

      component.showAddAccountModal();
      component.addAccountForm.setValue(newAccountPayload);
      expect(component.addAccountForm.valid).toBeTrue();

      mockWalletService.createLoyaltyAccount.and.returnValue(
        of(newAccountResponse).pipe(delay(0))
      );

      component.handleAddAccountOk();
      expect(component.isAddAccountModalLoading).toBeTrue();

      tick();
      fixture.detectChanges();

      expect(mockWalletService.createLoyaltyAccount).toHaveBeenCalledWith(
        MOCK_WALLET_ID,
        newAccountPayload
      );
      expect(mockMessageService.success).toHaveBeenCalledWith(
        'Conta de fidelidade adicionada com sucesso!'
      );
      expect(component.isAddAccountModalVisible).toBeFalse();
      expect(component.isAddAccountModalLoading).toBeFalse();
      expect(loadDetailsSpy).toHaveBeenCalledWith(MOCK_WALLET_ID);
    }));

    // it('handleAddAccountOk: deve mostrar erro se a criação da conta falhar', fakeAsync(() => {
    //   const loadDetailsSpy = spyOn(component, 'loadDetails');
    //   const newAccountPayload = {
    //     program: 1,
    //     account_number: '98765',
    //     name: 'Nova Conta Teste',
    //     current_balance: 500,
    //     average_cost: 10,
    //   };

    //   component.showAddAccountModal();
    //   component.addAccountForm.setValue(newAccountPayload);

    //   mockWalletService.createLoyaltyAccount.and.returnValue(
    //     throwError(() => new Error('API Falhou')).pipe(delay(0))
    //   );

    //   component.handleAddAccountOk();
    //   expect(component.isAddAccountModalLoading).toBeTrue();

    //   tick();

    //   tick(100);

    //   fixture.detectChanges();

    //   expect(mockWalletService.createLoyaltyAccount).toHaveBeenCalled();
    //   expect(mockMessageService.error).toHaveBeenCalledWith(
    //     'Não foi possível adicionar a conta.'
    //   );
    //   expect(component.isAddAccountModalLoading).toBeFalse();
    //   expect(component.isAddAccountModalVisible).toBeTrue();
    //   expect(loadDetailsSpy).not.toHaveBeenCalled();
    // }));
  });
});
