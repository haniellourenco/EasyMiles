import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthResponse {
  refresh: string;
  access: string;
}

// resposta de /api/users/me/
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  cpf: string;
}
// corpo da requisição de registro
export interface RegisterPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
  password2?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api';
  private readonly TOKEN_KEY = 'auth_token';

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  register(payload: RegisterPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/register/`, payload);
  }
  login(credentials: any): Observable<UserProfile> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/token/`, credentials)
      .pipe(
        tap((response) => this.saveToken(response.access)),
        switchMap(() => this.fetchAndStoreUserProfile())
      );
  }

  fetchAndStoreUserProfile(): Observable<UserProfile> {
    if (!this.getToken()) {
      return of({} as UserProfile);
    }

    return this.http
      .get<UserProfile>(`${this.apiUrl}/users/me/`)
      .pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
