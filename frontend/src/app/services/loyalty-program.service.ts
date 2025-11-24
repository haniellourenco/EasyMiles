import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoyaltyProgram {
  id: number;
  name: string;
  currency_type: number;
  get_currency_type_display: string;
  is_user_created: boolean;
  is_active: boolean;
  custom_rate: number;
}

export interface LoyaltyProgramPayload {
  name: string;
  currency_type: number;
  is_active: boolean;
  is_user_created: boolean;
  custom_rate: number;
}

@Injectable({
  providedIn: 'root',
})
export class LoyaltyProgramService {
  private apiUrl = environment.apiUrl;

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

  // PUT /api/loyalty-programs/{id}/
  updateLoyaltyProgram(
    id: number,
    payload: LoyaltyProgramPayload
  ): Observable<LoyaltyProgram> {
    return this.http.put<LoyaltyProgram>(
      `${this.apiUrl}/loyalty-programs/${id}/`,
      payload
    );
  }

  // DELETE /api/loyalty-programs/{id}/
  deleteLoyaltyProgram(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/loyalty-programs/${id}/`);
  }

  toggleProgramStatus(id: number): Observable<LoyaltyProgram> {
    return this.http.patch<LoyaltyProgram>(
      `${this.apiUrl}/loyalty-programs/${id}/toggle-active/`,
      {}
    );
  }
}
