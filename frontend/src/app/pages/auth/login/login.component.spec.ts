import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';

import { LoginComponent } from './login.component';
import { AuthService, UserProfile } from '../../../services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message';

class MockNzMessageService {
  success(message: string): void {}
  error(message: string): void {}
}

@Component({ template: '', standalone: true })
class DummyWalletsComponent {}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMessageService: NzMessageService;
  let router: Router;

  const mockUserProfile: UserProfile = {
    id: 1,
    username: 'teste',
    email: 't@t.com',
    first_name: 'T',
    last_name: 'U',
    cpf: '',
  };

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'wallets', component: DummyWalletsComponent },
        ]),
        NoopAnimationsModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzCardModule,
        NzCheckboxModule,
        NzIconModule,
        NzMessageModule,
        DummyWalletsComponent,
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NzMessageService, useClass: MockNzMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    mockMessageService = TestBed.inject(NzMessageService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve inicializar o formulário com valores padrão e validadores', () => {
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.get('username')?.value).toBe('teste');
    expect(component.loginForm.get('password')?.value).toBe('1234');
    expect(component.loginForm.get('remember')?.value).toBe(true);
    expect(
      component.loginForm.get('username')?.hasValidator(Validators.required)
    ).toBeTrue();
    expect(
      component.loginForm.get('password')?.hasValidator(Validators.required)
    ).toBeTrue();
  });

  it('deve marcar os campos como inválidos se o formulário for submetido vazio', () => {
    component.loginForm.get('username')?.setValue('');
    component.loginForm.get('password')?.setValue('');
    component.submitForm();

    expect(component.loginForm.valid).toBeFalse();
    expect(component.loginForm.get('username')?.dirty).toBeTrue();
    expect(component.loginForm.get('password')?.dirty).toBeTrue();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('deve chamar authService.login com as credenciais corretas quando o formulário for válido', () => {
    mockAuthService.login.and.returnValue(of(mockUserProfile));
    spyOn(mockMessageService, 'success');
    spyOn(router, 'navigate');

    component.loginForm.get('username')?.setValue('usuario');
    component.loginForm.get('password')?.setValue('senha123');

    component.submitForm();

    expect(component.isLoading).toBeTrue();
    expect(mockAuthService.login).toHaveBeenCalledWith({
      username: 'usuario',
      password: 'senha123',
    });
  });

  it('deve navegar para /wallets e mostrar mensagem de sucesso em caso de login bem-sucedido', fakeAsync(() => {
    mockAuthService.login.and.returnValue(of(mockUserProfile));
    spyOn(mockMessageService, 'success');
    spyOn(router, 'navigate');

    component.loginForm.get('username')?.setValue('usuario');
    component.loginForm.get('password')?.setValue('senha123');
    component.submitForm();

    tick();

    expect(mockMessageService.success).toHaveBeenCalledWith(
      'Login realizado com sucesso!'
    );
    expect(router.navigate).toHaveBeenCalledWith(['/wallets']);
  }));

  it('deve mostrar mensagem de erro e não navegar se o login falhar', fakeAsync(() => {
    const errorResponse = {
      status: 401,
      error: { detail: 'Credenciais inválidas' },
    };
    mockAuthService.login.and.returnValue(throwError(() => errorResponse));
    spyOn(mockMessageService, 'error');
    spyOn(router, 'navigate');

    component.loginForm.get('username')?.setValue('usuario');
    component.loginForm.get('password')?.setValue('senhaErrada');
    component.submitForm();

    tick();

    expect(component.isLoading).toBeFalse();
    expect(mockMessageService.error).toHaveBeenCalledWith(
      'Usuário ou senha inválidos. Tente novamente.'
    );
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('deve ativar o estado de loading durante a submissão', () => {
    mockAuthService.login.and.returnValue(of(mockUserProfile));
    component.loginForm.get('username')?.setValue('usuario');
    component.loginForm.get('password')?.setValue('senha123');

    expect(component.isLoading).toBeFalse();
    component.submitForm();
    expect(component.isLoading).toBeTrue();
  });
});
