import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TransactionPayload {
  transaction_type: number;
  amount: number;
  cost?: number | null;
  origin_account?: number | null;
  destination_account?: number | null;
  bonus_percentage?: number | null;
  description?: string | null;
  transaction_date: string;
}

export interface Transaction {
  id: number;
  transaction_type: number;
  transaction_type_display: string;
  amount: string;
  cost: string | null;
  origin_account: number | null;
  origin_account_name: string | null;
  destination_account: number | null;
  destination_account_name: string | null;
  bonus_percentage: string | null;
  description: string;
  transaction_date: string;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // GET /api/transactions/
  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions/`);
  }

  // POST /api/transactions/
  createTransaction(payload: TransactionPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transactions/`, payload);
  }

  // DELETE /api/transactions/{id}/
  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transactions/${id}/`);
  }
}
