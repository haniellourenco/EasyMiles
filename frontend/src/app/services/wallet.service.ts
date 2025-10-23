import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- Interfaces (Tipos de Dados da API) ---

// Interface para a resposta do endpoint de contas de fidelidade
export interface LoyaltyAccount {
  id: number;
  name: string;
  account_number: string;
  wallet: number;
  wallet_name: string;
  program: number;
  program_name: string;
  program_currency_type: string;
  current_balance: string;
  average_cost: string;
}

export interface LoyaltyProgram {
  id: number;
  name: string;
}

// Interface para o CORPO da requisição de criação de conta
export interface LoyaltyAccountPayload {
  program: number;
  account_number: string;
  name: string;
  current_balance: number;
  average_cost: number;
}

// Interface para a resposta do endpoint de uma única carteira (sem as contas)
export interface Wallet {
  id: number;
  wallet_name: string;
  user: number;
}

// O que a API espera para criar/atualizar uma carteira
export interface WalletPayload {
  wallet_name: string;
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // GET /api/wallets/
  getWallets(): Observable<Wallet[]> {
    return this.http.get<Wallet[]>(`${this.apiUrl}/wallets/`);
  }

  // GET /api/wallets/{id}/
  getWalletById(id: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiUrl}/wallets/${id}/`);
  }

  // GET /api/loyalty-accounts/
  getAllLoyaltyAccounts(): Observable<LoyaltyAccount[]> {
    return this.http.get<LoyaltyAccount[]>(`${this.apiUrl}/loyalty-accounts/`);
  }

  // GET /api/wallets/{wallet_id}/loyalty-accounts/
  getLoyaltyAccounts(walletId: number): Observable<LoyaltyAccount[]> {
    return this.http.get<LoyaltyAccount[]>(
      `${this.apiUrl}/wallets/${walletId}/loyalty-accounts/`
    );
  }

  // POST /api/wallets/
  createWallet(wallet: WalletPayload): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.apiUrl}/wallets/`, wallet);
  }

  // PUT /api/wallets/{id}/
  updateWallet(id: number, wallet: WalletPayload): Observable<Wallet> {
    return this.http.put<Wallet>(`${this.apiUrl}/wallets/${id}/`, wallet);
  }

  // DELETE /api/wallets/{id}/
  deleteWallet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/wallets/${id}/`);
  }

  // POST /api/wallets/{walletId}/loyalty-accounts/
  createLoyaltyAccount(
    walletId: number,
    payload: LoyaltyAccountPayload
  ): Observable<LoyaltyAccount> {
    return this.http.post<LoyaltyAccount>(
      `${this.apiUrl}/wallets/${walletId}/loyalty-accounts/`,
      payload
    );
  }
}
