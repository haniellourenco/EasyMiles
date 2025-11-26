import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService, UserProfile } from '../../services/auth.service';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzPageHeaderModule,
    NzSpinModule,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  user: UserProfile | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserData();
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      username: [{ value: '', disabled: true }],
      email: [
        { value: '', disabled: true },
        [Validators.required, Validators.email],
      ],

      // possivel editar apenas nome e sobrenome
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
    });
  }

  loadUserData(): void {
    this.isLoading = true;
    this.authService.fetchAndStoreUserProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.profileForm.patchValue(user);
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Não foi possível carregar seus dados.');
        this.isLoading = false;
      },
    });
  }

  submitForm(): void {
    if (this.profileForm.valid) {
      this.isSaving = true;
      const formData = {
        first_name: this.profileForm.get('first_name')?.value,
        last_name: this.profileForm.get('last_name')?.value,
      };

      this.authService.updateProfile(formData).subscribe({
        next: () => {
          this.message.success('Perfil atualizado com sucesso!');
          this.isSaving = false;
        },
        error: (err) => {
          console.error(err);
          this.message.error('Erro ao atualizar perfil.');
          this.isSaving = false;
        },
      });
    } else {
      Object.values(this.profileForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }
}
