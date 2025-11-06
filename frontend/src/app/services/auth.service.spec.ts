import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import { AuthService, AuthResponse, UserProfile } from './auth.service';

@Component({ template: '', standalone: true })
class DummyLoginComponent {}

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;
  let router: Router;
  const apiUrl = environment.apiUrl;

  const mockAuthResponse: AuthResponse = {
    refresh: 'mockRefreshToken',
    access: 'mockAccessToken',
  };
  const mockUserProfile: UserProfile = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    cpf: '12345678900',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'login', component: DummyLoginComponent },
        ]),
        DummyLoginComponent,
      ],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    localStorage.clear();
    (service as any).currentUserSubject.next(null);
    (service as any).isRefreshing = false;
    (service as any).refreshTokenSubject.next(null);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('deve autenticar, salvar tokens, buscar perfil e emitir usuário', () => {
      let loggedInUser: UserProfile | null = null;
      service.currentUser$.subscribe((user) => (loggedInUser = user));

      service
        .login({ username: 'test', password: 'password' })
        .subscribe((profile) => {
          expect(profile).toEqual(mockUserProfile);
        });

      const tokenReq = httpTestingController.expectOne(`${apiUrl}/auth/token/`);
      expect(tokenReq.request.method).toBe('POST');
      tokenReq.flush(mockAuthResponse);

      expect(localStorage.getItem('auth_access_token')).toBe(
        mockAuthResponse.access
      );
      expect(localStorage.getItem('auth_refresh_token')).toBe(
        mockAuthResponse.refresh
      );

      const profileReq = httpTestingController.expectOne(`${apiUrl}/users/me/`);
      expect(profileReq.request.method).toBe('GET');
      expect(profileReq.request.headers.get('Authorization')).toBe(
        `Bearer ${mockAuthResponse.access}`
      );
      profileReq.flush(mockUserProfile);

      expect(loggedInUser!).toEqual(mockUserProfile);
    });

    it('deve retornar erro se a requisição de token falhar', () => {
      service.login({ username: 'test', password: 'password' }).subscribe({
        next: () => fail('Deveria ter falhado'),
        error: (err) => {
          expect(err.status).toBe(401);
        },
      });

      const tokenReq = httpTestingController.expectOne(`${apiUrl}/auth/token/`);
      tokenReq.flush('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
      });

      httpTestingController.expectNone(`${apiUrl}/users/me/`);
      expect(localStorage.getItem('auth_access_token')).toBeNull();
      expect(localStorage.getItem('auth_refresh_token')).toBeNull();
    });

    it('deve retornar erro se a requisição de perfil falhar após obter token', () => {
      service.login({ username: 'test', password: 'password' }).subscribe({
        next: () => fail('Deveria ter falhado'),
        error: (err) => {
          expect(err.status).toBe(500);
        },
      });

      const tokenReq = httpTestingController.expectOne(`${apiUrl}/auth/token/`);
      tokenReq.flush(mockAuthResponse);

      const profileReq = httpTestingController.expectOne(`${apiUrl}/users/me/`);
      profileReq.flush('Server Error', {
        status: 500,
        statusText: 'Server Error',
      });

      expect(localStorage.getItem('auth_access_token')).toBe(
        mockAuthResponse.access
      );
      expect(localStorage.getItem('auth_refresh_token')).toBe(
        mockAuthResponse.refresh
      );
      expect((service as any).currentUserSubject.getValue()).toBeNull();
    });
  });

  describe('register', () => {
    it('deve enviar a requisição POST para /users/register/', () => {
      const payload = {
        username: 'new',
        email: 'new@test.com',
        password: 'pw',
        password2: 'pw',
        first_name: 'f',
        last_name: 'l',
      };
      service.register(payload).subscribe();

      const req = httpTestingController.expectOne(`${apiUrl}/users/register/`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true });
    });
  });

  describe('logout', () => {
    it('deve remover tokens, limpar usuário e navegar para /login', () => {
      localStorage.setItem('auth_access_token', 'token');
      localStorage.setItem('auth_refresh_token', 'refresh');
      (service as any).currentUserSubject.next(mockUserProfile);
      spyOn(router, 'navigate');

      service.logout();

      expect(localStorage.getItem('auth_access_token')).toBeNull();
      expect(localStorage.getItem('auth_refresh_token')).toBeNull();
      expect((service as any).currentUserSubject.getValue()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('isLoggedIn', () => {
    it('deve retornar true se o token de acesso existir', () => {
      localStorage.setItem('auth_access_token', 'token');
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('deve retornar false se o token de acesso não existir', () => {
      localStorage.removeItem('auth_access_token');
      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  describe('getAccessToken / getRefreshToken', () => {
    it('deve retornar o token correto do localStorage', () => {
      localStorage.setItem('auth_access_token', 'access');
      localStorage.setItem('auth_refresh_token', 'refresh');
      expect(service.getAccessToken()).toBe('access');
      expect(service.getRefreshToken()).toBe('refresh');
    });

    it('deve retornar null se o token não existir no localStorage', () => {
      localStorage.removeItem('auth_access_token');
      localStorage.removeItem('auth_refresh_token');
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });
  });

  describe('fetchAndStoreUserProfile', () => {
    it('deve buscar perfil e emitir usuário se houver token de acesso', () => {
      localStorage.setItem('auth_access_token', 'token');
      let fetchedUser: UserProfile | null = null;
      service.currentUser$.subscribe((user) => (fetchedUser = user));

      service.fetchAndStoreUserProfile().subscribe();

      const req = httpTestingController.expectOne(`${apiUrl}/users/me/`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token');
      req.flush(mockUserProfile);

      expect(fetchedUser!).toEqual(mockUserProfile);
    });

    it('não deve fazer requisição e retornar objeto vazio se não houver token', (done) => {
      localStorage.removeItem('auth_access_token');
      let fetchedUser: UserProfile | null = null;
      service.currentUser$.subscribe((user) => (fetchedUser = user));

      service.fetchAndStoreUserProfile().subscribe((profile) => {
        expect(profile).toEqual({} as UserProfile);
        expect(fetchedUser).toBeNull();
        httpTestingController.expectNone(`${apiUrl}/users/me/`);
        done();
      });
    });

    it('deve limpar usuário se a requisição de perfil falhar', () => {
      localStorage.setItem('auth_access_token', 'token');
      (service as any).currentUserSubject.next(mockUserProfile);

      service.fetchAndStoreUserProfile().subscribe({
        next: () => fail('Deveria ter falhado'),
        error: (err) => {
          expect(err.status).toBe(500);
          expect((service as any).currentUserSubject.getValue()).toBeNull();
        },
      });

      const req = httpTestingController.expectOne(`${apiUrl}/users/me/`);
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      localStorage.setItem('auth_refresh_token', 'validRefreshToken');
    });

    it('deve solicitar novo token de acesso usando o refresh token e salvar o novo access token', () => {
      const newAccessToken = 'newMockAccessToken';
      service.refreshToken().subscribe((response) => {
        expect(response.access).toBe(newAccessToken);
      });

      const req = httpTestingController.expectOne(
        `${apiUrl}/auth/token/refresh/`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refresh: 'validRefreshToken' });
      req.flush({ access: newAccessToken });

      expect(localStorage.getItem('auth_access_token')).toBe(newAccessToken);
      expect(localStorage.getItem('auth_refresh_token')).toBe(
        'validRefreshToken'
      );
      expect((service as any).isRefreshing).toBeFalse();
    });

    it('deve deslogar o usuário se o refresh token for inválido (API retorna erro)', () => {
      spyOn(router, 'navigate');
      spyOn(service, 'logout').and.callThrough();

      service.refreshToken().subscribe({
        next: () => fail('Deveria ter falhado'),
        error: (err) => {
          expect(err.status).toBe(401);
        },
      });

      const req = httpTestingController.expectOne(
        `${apiUrl}/auth/token/refresh/`
      );
      req.flush('Token invalid or expired', {
        status: 401,
        statusText: 'Unauthorized',
      });

      expect(service.logout).toHaveBeenCalled();
      expect((service as any).isRefreshing).toBeFalse();
    });

    it('deve deslogar o usuário se não houver refresh token no localStorage', (done) => {
      localStorage.removeItem('auth_refresh_token');
      spyOn(router, 'navigate');
      spyOn(service, 'logout').and.callThrough();

      service.refreshToken().subscribe({
        next: () => fail('Deveria ter falhado'),
        error: (err) => {
          expect(err instanceof Error).toBeTrue();
          expect(err.message).toContain('Refresh token não encontrado');
          expect(service.logout).toHaveBeenCalled();
          expect((service as any).isRefreshing).toBeFalse();
          done();
        },
      });

      httpTestingController.expectNone(`${apiUrl}/auth/token/refresh/`);
    });

    it('deve enfileirar requisições se o refresh já estiver em andamento', (done) => {
      const newAccessToken = 'newAccessTokenFromRefresh';

      service.refreshToken().subscribe((response) => {
        expect(response.access).toBe(newAccessToken);
        expect(localStorage.getItem('auth_access_token')).toBe(newAccessToken);
      });

      expect((service as any).isRefreshing).toBeTrue();

      service.refreshToken().subscribe((tokenString) => {
        expect(tokenString).toBe(newAccessToken);
        done();
      });

      const req = httpTestingController.expectOne(
        `${apiUrl}/auth/token/refresh/`
      );
      req.flush({ access: newAccessToken });

      httpTestingController.verify();
    });
  });
});
