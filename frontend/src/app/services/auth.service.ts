import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  Observable,
  BehaviorSubject,
  tap,
  switchMap,
  of,
  throwError,
  filter,
  take,
  catchError,
} from 'rxjs';
import { Router } from '@angular/router';

export interface AuthResponse {
  refresh: string;
  access: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  cpf: string;
}

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
  private apiUrl = environment.apiUrl;
  private readonly ACCESS_TOKEN_KEY = 'auth_access_token';
  private readonly REFRESH_TOKEN_KEY = 'auth_refresh_token';

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(
    null
  );

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: any): Observable<UserProfile> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/token/`, credentials)
      .pipe(
        tap((response) => this.saveTokens(response)),
        switchMap((authResponse) =>
          this.fetchAndStoreUserProfile(authResponse.access)
        )
      );
  }

  register(payload: RegisterPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/register/`, payload);
  }

  refreshToken(): Observable<any> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1)
      );
    } else {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        this.isRefreshing = false;
        this.logout();
        return throwError(() => new Error('Refresh token não encontrado.'));
      }

      return this.http
        .post<any>(`${this.apiUrl}/auth/token/refresh/`, {
          refresh: refreshToken,
        })
        .pipe(
          tap((tokens) => {
            this.isRefreshing = false;
            this.saveAccessToken(tokens.access);
            this.refreshTokenSubject.next(tokens.access);
          }),
          catchError((error: any) => {
            this.isRefreshing = false;
            this.logout();
            return throwError(() => error);
          })
        );
    }
  }

  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private saveTokens(tokens: AuthResponse): void {
    this.saveAccessToken(tokens.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh);
  }

  private saveAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  fetchAndStoreUserProfile(tokenOverride?: string): Observable<UserProfile> {
    const token = tokenOverride ?? this.getAccessToken();
    if (!token) {
      this.currentUserSubject.next(null);
      return of({} as UserProfile);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<UserProfile>(`${this.apiUrl}/users/me/`, { headers })
      .pipe(
        tap((user) => this.currentUserSubject.next(user)),
        catchError((error) => {
          this.currentUserSubject.next(null);
          return throwError(() => error);
        })
      );
  }
}
