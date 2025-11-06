import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  WalletService,
  Wallet,
  WalletPayload,
  LoyaltyAccount,
  LoyaltyAccountPayload,
} from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  // --- Mocks ---
  const mockWallets: Wallet[] = [
    { id: 1, wallet_name: 'Carteira 1', user: 1 },
    { id: 2, wallet_name: 'Carteira 2', user: 1 },
  ];

  const mockAccounts: LoyaltyAccount[] = [
    {
      id: 101,
      name: 'Conta Smiles',
      account_number: '12345',
      wallet: 1,
      wallet_name: 'Carteira 1',
      program: 1,
      program_name: 'Smiles',
      program_currency_type: 'Milhas',
      current_balance: '10000',
      average_cost: '21.00',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WalletService],
    });
    service = TestBed.inject(WalletService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Testes de UserWallet ---

  it('deve buscar todas as carteiras (getWallets)', () => {
    service.getWallets().subscribe((wallets) => {
      expect(wallets.length).toBe(2);
      expect(wallets).toEqual(mockWallets);
    });

    const req = httpMock.expectOne(`${apiUrl}/wallets/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockWallets);
  });

  it('deve buscar uma carteira pelo ID (getWalletById)', () => {
    const walletId = 1;
    service.getWalletById(walletId).subscribe((wallet) => {
      expect(wallet).toEqual(mockWallets[0]);
    });

    const req = httpMock.expectOne(`${apiUrl}/wallets/${walletId}/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockWallets[0]);
  });

  it('deve criar uma carteira (createWallet)', () => {
    const newWalletPayload: WalletPayload = { wallet_name: 'Nova Carteira' };
    const mockResponse: Wallet = { id: 3, ...newWalletPayload, user: 1 };

    service.createWallet(newWalletPayload).subscribe((wallet) => {
      expect(wallet).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/wallets/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newWalletPayload);
    req.flush(mockResponse);
  });

  it('deve atualizar uma carteira (updateWallet)', () => {
    const walletId = 1;
    const updatedPayload: WalletPayload = {
      wallet_name: 'Carteira Atualizada',
    };
    const mockResponse: Wallet = { id: 1, ...updatedPayload, user: 1 };

    service.updateWallet(walletId, updatedPayload).subscribe((wallet) => {
      expect(wallet.wallet_name).toBe('Carteira Atualizada');
    });

    const req = httpMock.expectOne(`${apiUrl}/wallets/${walletId}/`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedPayload);
    req.flush(mockResponse);
  });

  it('deve excluir uma carteira (deleteWallet)', () => {
    const walletId = 1;
    service.deleteWallet(walletId).subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/wallets/${walletId}/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  // --- Testes de LoyaltyAccount ---

  it('deve buscar TODAS as contas de fidelidade (getAllLoyaltyAccounts)', () => {
    service.getAllLoyaltyAccounts().subscribe((accounts) => {
      expect(accounts.length).toBe(1);
      expect(accounts).toEqual(mockAccounts);
    });

    const req = httpMock.expectOne(`${apiUrl}/loyalty-accounts/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAccounts);
  });

  it('deve buscar contas de fidelidade de uma carteira (getLoyaltyAccounts)', () => {
    const walletId = 1;
    service.getLoyaltyAccounts(walletId).subscribe((accounts) => {
      expect(accounts.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${apiUrl}/wallets/${walletId}/loyalty-accounts/`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockAccounts);
  });

  it('deve criar uma conta de fidelidade (createLoyaltyAccount)', () => {
    const walletId = 1;
    const newAccountPayload: LoyaltyAccountPayload = {
      program: 1,
      account_number: '98765',
      name: 'Nova Conta',
      current_balance: 100,
      average_cost: 0,
    };
    const mockResponse: LoyaltyAccount = {
      id: 102,
      wallet: 1,
      wallet_name: 'Carteira 1',
      program_name: 'Smiles',
      program_currency_type: 'Milhas',
      ...newAccountPayload,
      current_balance: '100.00',
      average_cost: '0.00',
    };

    service
      .createLoyaltyAccount(walletId, newAccountPayload)
      .subscribe((account) => {
        expect(account).toEqual(mockResponse);
      });

    const req = httpMock.expectOne(
      `${apiUrl}/wallets/${walletId}/loyalty-accounts/`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newAccountPayload);
    req.flush(mockResponse);
  });
});
