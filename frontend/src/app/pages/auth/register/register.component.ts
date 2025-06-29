import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterPayload } from '../../../services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';

// Imports Standalone
import { CommonModule } from '@angular/common';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzGridModule } from 'ng-zorro-antd/grid';

export const confirmPasswordValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  return password && confirmPassword && password.value !== confirmPassword.value
    ? { passwordMismatch: true }
    : null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzMessageModule,
    NzGridModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        first_name: ['', [Validators.required]],
        last_name: ['', [Validators.required]],
        username: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: confirmPasswordValidator }
    );
  }

  submitForm(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;

      const formValue = this.registerForm.value;
      const payload: RegisterPayload = {
        username: formValue.username,
        email: formValue.email,
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        password: formValue.password,
        password2: formValue.confirmPassword,
      };

      this.authService.register(payload).subscribe({
        next: () => {
          this.message.success(
            'Conta criada com sucesso! Por favor, faça o login.'
          );
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Erro no registro', err);
          const errorMessage =
            err.error?.email?.[0] ||
            err.error?.username?.[0] ||
            'Não foi possível criar a conta.';
          this.message.error(errorMessage);
          this.isLoading = false;
        },
      });
    } else {
      Object.values(this.registerForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
    }
  }
}
