import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

const mockUser: UserProfile = {
  id: 1,
  username: 'usuario_teste',
  email: 'teste@easymiles.com',
  first_name: 'João',
  last_name: 'Silva',
  cpf: '000.000.000-00',
};

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let messageServiceSpy: jasmine.SpyObj<NzMessageService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'fetchAndStoreUserProfile',
      'updateProfile',
    ]);
    messageServiceSpy = jasmine.createSpyObj('NzMessageService', [
      'success',
      'error',
    ]);

    authServiceSpy.fetchAndStoreUserProfile.and.returnValue(of(mockUser));

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
        ReactiveFormsModule,
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NzMessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente e carregar dados iniciais', () => {
    expect(component).toBeTruthy();
    expect(authServiceSpy.fetchAndStoreUserProfile).toHaveBeenCalled();

    expect(component.profileForm.get('username')?.value).toBe(
      mockUser.username
    );
    expect(component.profileForm.get('email')?.value).toBe(mockUser.email);
    expect(component.profileForm.get('first_name')?.value).toBe(
      mockUser.first_name
    );
    expect(component.isLoading).toBeFalse();
  });

  it('deve garantir que campos sensíveis (email/username) estão desabilitados', () => {
    const usernameControl = component.profileForm.get('username');
    const emailControl = component.profileForm.get('email');

    expect(usernameControl?.disabled).toBeTrue();
    expect(emailControl?.disabled).toBeTrue();
  });

  it('deve enviar apenas dados editáveis ao salvar com sucesso', () => {
    component.profileForm.patchValue({
      first_name: 'Maria',
      last_name: 'Souza',
    });

    authServiceSpy.updateProfile.and.returnValue(
      of({ ...mockUser, first_name: 'Maria' })
    );

    component.submitForm();

    expect(authServiceSpy.updateProfile).toHaveBeenCalledWith({
      first_name: 'Maria',
      last_name: 'Souza',
    });

    expect(component.isSaving).toBeFalse();
    expect(messageServiceSpy.success).toHaveBeenCalledWith(
      'Perfil atualizado com sucesso!'
    );
  });

  it('não deve submeter se o formulário for inválido', () => {
    component.profileForm.get('first_name')?.setValue('');

    component.submitForm();

    expect(component.profileForm.valid).toBeFalse();
    expect(authServiceSpy.updateProfile).not.toHaveBeenCalled();
  });

  it('deve exibir erro se a atualização falhar', () => {
    component.profileForm.patchValue({ first_name: 'Teste' });

    authServiceSpy.updateProfile.and.returnValue(
      throwError(() => new Error('Erro API'))
    );

    component.submitForm();

    expect(authServiceSpy.updateProfile).toHaveBeenCalled();
    expect(component.isSaving).toBeFalse();
    expect(messageServiceSpy.error).toHaveBeenCalled();
  });
});
