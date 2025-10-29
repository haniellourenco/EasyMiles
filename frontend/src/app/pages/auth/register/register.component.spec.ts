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

import { RegisterComponent } from './register.component';
import { AuthService, RegisterPayload } from '../../../services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzGridModule } from 'ng-zorro-antd/grid';

class MockNzMessageService {
  success(message: string): void {}
  error(message: string): void {}
}

@Component({ template: '', standalone: true })
class DummyLoginComponent {}

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMessageService: NzMessageService;
  let router: Router;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'login', component: DummyLoginComponent },
        ]),
        NoopAnimationsModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzCardModule,
        NzIconModule,
        NzMessageModule,
        NzGridModule,
        DummyLoginComponent,
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NzMessageService, useClass: MockNzMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    mockMessageService = TestBed.inject(NzMessageService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve inicializar o formulário com campos vazios e validadores', () => {
    expect(component.registerForm).toBeDefined();
    expect(component.registerForm.get('first_name')?.value).toBe('');
    expect(component.registerForm.get('last_name')?.value).toBe('');
    expect(component.registerForm.get('username')?.value).toBe('');
    expect(component.registerForm.get('email')?.value).toBe('');
    expect(component.registerForm.get('password')?.value).toBe('');
    expect(component.registerForm.get('confirmPassword')?.value).toBe('');

    expect(
      component.registerForm
        .get('first_name')
        ?.hasValidator(Validators.required)
    ).toBeTrue();
    expect(
      component.registerForm.get('last_name')?.hasValidator(Validators.required)
    ).toBeTrue();
    expect(
      component.registerForm.get('username')?.hasValidator(Validators.required)
    ).toBeTrue();
    expect(
      component.registerForm.get('email')?.hasValidator(Validators.required)
    ).toBeTrue();
    expect(
      component.registerForm.get('email')?.hasValidator(Validators.email)
    ).toBeTrue();
    expect(
      component.registerForm.get('password')?.hasValidator(Validators.required)
    ).toBeTrue();
    expect(
      component.registerForm
        .get('confirmPassword')
        ?.hasValidator(Validators.required)
    ).toBeTrue();

    const passwordControl = component.registerForm.get('password');
    passwordControl?.setValue('123');
    expect(passwordControl?.hasError('minlength'))
      .withContext('Senha com menos de 6 caracteres deve ter erro minlength')
      .toBeTrue();

    passwordControl?.setValue('123456');
    expect(passwordControl?.hasError('minlength'))
      .withContext('Senha com 6 caracteres não deve ter erro minlength')
      .toBeFalse();
    passwordControl?.setValue('');

    component.registerForm.get('password')?.setValue('senha123');
    component.registerForm.get('confirmPassword')?.setValue('senhaDiferente');
    expect(component.registerForm.hasError('passwordMismatch'))
      .withContext('Senhas diferentes devem gerar erro passwordMismatch')
      .toBeTrue();
    component.registerForm.get('password')?.setValue('');
    component.registerForm.get('confirmPassword')?.setValue('');
  });

  it('deve marcar formulário como inválido se senhas não conferem', () => {
    component.registerForm.get('password')?.setValue('senha123');
    component.registerForm.get('confirmPassword')?.setValue('senhaDiferente');
    fixture.detectChanges();

    expect(component.registerForm.valid).toBeFalse();
    expect(component.registerForm.hasError('passwordMismatch')).toBeTrue();
  });

  it('deve marcar formulário como válido se senhas conferem e outros campos obrigatórios preenchidos', () => {
    component.registerForm.get('first_name')?.setValue('Teste');
    component.registerForm.get('last_name')?.setValue('User');
    component.registerForm.get('username')?.setValue('testeuser');
    component.registerForm.get('email')?.setValue('teste@email.com');
    component.registerForm.get('password')?.setValue('senha123');
    component.registerForm.get('confirmPassword')?.setValue('senha123');
    fixture.detectChanges();

    expect(component.registerForm.valid).toBeTrue();
    expect(component.registerForm.hasError('passwordMismatch')).toBeFalse();
  });

  it('deve marcar os campos como inválidos se o formulário for submetido inválido', () => {
    component.submitForm();

    expect(component.registerForm.valid).toBeFalse();
    expect(component.registerForm.get('first_name')?.dirty).toBeTrue();
    expect(component.registerForm.get('last_name')?.dirty).toBeTrue();
    expect(component.registerForm.get('username')?.dirty).toBeTrue();
    expect(component.registerForm.get('email')?.dirty).toBeTrue();
    expect(component.registerForm.get('password')?.dirty).toBeTrue();
    expect(component.registerForm.get('confirmPassword')?.dirty).toBeTrue();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('deve chamar authService.register com o payload correto quando o formulário for válido', () => {
    mockAuthService.register.and.returnValue(of({ success: true }));
    spyOn(mockMessageService, 'success');
    spyOn(router, 'navigate');

    component.registerForm.get('first_name')?.setValue('Nome');
    component.registerForm.get('last_name')?.setValue('Sobrenome');
    component.registerForm.get('username')?.setValue('novo_user');
    component.registerForm.get('email')?.setValue('novo@email.com');
    component.registerForm.get('password')?.setValue('senhaforte');
    component.registerForm.get('confirmPassword')?.setValue('senhaforte');

    component.submitForm();

    const expectedPayload: RegisterPayload = {
      username: 'novo_user',
      email: 'novo@email.com',
      first_name: 'Nome',
      last_name: 'Sobrenome',
      password: 'senhaforte',
      password2: 'senhaforte',
    };

    expect(component.isLoading).toBeTrue();
    expect(mockAuthService.register).toHaveBeenCalledWith(expectedPayload);
  });

  it('deve navegar para /login e mostrar mensagem de sucesso em caso de registro bem-sucedido', fakeAsync(() => {
    mockAuthService.register.and.returnValue(of({ success: true }));
    spyOn(mockMessageService, 'success');
    spyOn(router, 'navigate');

    component.registerForm.patchValue({
      first_name: 'Nome',
      last_name: 'Sobrenome',
      username: 'novo_user',
      email: 'novo@email.com',
      password: 'senhaforte',
      confirmPassword: 'senhaforte',
    });

    component.submitForm();
    tick();

    expect(mockMessageService.success).toHaveBeenCalledWith(
      'Conta criada com sucesso! Por favor, faça o login.'
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('deve mostrar mensagem de erro específica (email) se o registro falhar', fakeAsync(() => {
    const errorResponse = {
      status: 400,
      error: { email: ['Este email já está em uso.'] },
    };
    mockAuthService.register.and.returnValue(throwError(() => errorResponse));
    spyOn(mockMessageService, 'error');
    spyOn(router, 'navigate');

    component.registerForm.patchValue({
      first_name: 'Nome',
      last_name: 'Sobrenome',
      username: 'outro_user',
      email: 'existente@email.com',
      password: 'senhaforte',
      confirmPassword: 'senhaforte',
    });
    component.submitForm();
    tick();

    expect(component.isLoading).toBeFalse();
    expect(mockMessageService.error).toHaveBeenCalledWith(
      'Este email já está em uso.'
    );
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('deve mostrar mensagem de erro específica (username) se o registro falhar', fakeAsync(() => {
    const errorResponse = {
      status: 400,
      error: { username: ['Este usuário já existe.'] },
    };
    mockAuthService.register.and.returnValue(throwError(() => errorResponse));
    spyOn(mockMessageService, 'error');
    spyOn(router, 'navigate');

    component.registerForm.patchValue({
      first_name: 'Nome',
      last_name: 'Sobrenome',
      username: 'usuario_existente',
      email: 'unico@email.com',
      password: 'senhaforte',
      confirmPassword: 'senhaforte',
    });
    component.submitForm();
    tick();

    expect(component.isLoading).toBeFalse();
    expect(mockMessageService.error).toHaveBeenCalledWith(
      'Este usuário já existe.'
    );
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('deve mostrar mensagem de erro genérica se a falha não tiver detalhe específico', fakeAsync(() => {
    const errorResponse = { status: 500, error: { detail: 'Erro interno' } };
    mockAuthService.register.and.returnValue(throwError(() => errorResponse));
    spyOn(mockMessageService, 'error');
    spyOn(router, 'navigate');

    component.registerForm.patchValue({
      first_name: 'Nome',
      last_name: 'Sobrenome',
      username: 'user_erro',
      email: 'erro@email.com',
      password: 'senhaforte',
      confirmPassword: 'senhaforte',
    });
    component.submitForm();
    tick();

    expect(component.isLoading).toBeFalse();
    expect(mockMessageService.error).toHaveBeenCalledWith(
      'Não foi possível criar a conta.'
    );
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('deve ativar o estado de loading durante a submissão', () => {
    mockAuthService.register.and.returnValue(of({ success: true }));
    component.registerForm.patchValue({
      first_name: 'Nome',
      last_name: 'Sobrenome',
      username: 'loading_user',
      email: 'loading@email.com',
      password: 'senhaforte',
      confirmPassword: 'senhaforte',
    });

    expect(component.isLoading).toBeFalse();
    component.submitForm();
    expect(component.isLoading).toBeTrue();
  });
});
