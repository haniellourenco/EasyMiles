import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoyaltyProgram {
  id: number;
  name: string;
  currency_type: number;
  get_currency_type_display: string;
  is_user_created: boolean;
}

export interface LoyaltyProgramPayload {
  name: string;
  currency_type: number;
  is_active: boolean;
  is_user_created: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LoyaltyProgramService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // GET /api/loyalty-programs/
  getLoyaltyPrograms(): Observable<LoyaltyProgram[]> {
    return this.http.get<LoyaltyProgram[]>(`${this.apiUrl}/loyalty-programs/`);
  }

  // POST /api/loyalty-programs/
  createLoyaltyProgram(
    payload: LoyaltyProgramPayload
  ): Observable<LoyaltyProgram> {
    return this.http.post<LoyaltyProgram>(
      `${this.apiUrl}/loyalty-programs/`,
      payload
    );
  }

  // DELETE /api/loyalty-programs/{id}/
  deleteLoyaltyProgram(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/loyalty-programs/${id}/`);
  }
}
