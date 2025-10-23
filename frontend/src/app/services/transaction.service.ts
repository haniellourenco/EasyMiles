import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // POST /api/transactions/
  createTransaction(payload: TransactionPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transactions/`, payload);
  }
}
