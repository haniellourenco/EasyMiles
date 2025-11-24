import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  LoyaltyProgram,
  LoyaltyProgramService,
} from '../../services/loyalty-program.service';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';

@Component({
  selector: 'app-loyalty-programs',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzTableModule,
    NzPageHeaderModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzTagModule,
    NzMessageModule,
    NzDividerModule,
  ],
  templateUrl: './loyalty-programs.component.html',
  styleUrls: ['./loyalty-programs.component.css'],
})
export class LoyaltyProgramsComponent implements OnInit {
  programs: LoyaltyProgram[] = [];
  isLoading = true;

  isModalVisible = false;
  isModalLoading = false;
  programForm!: FormGroup;

  currencyTypes = [
    { label: 'Pontos', value: 1 },
    { label: 'Milhas', value: 2 },
  ];

  constructor(
    private loyaltyProgramService: LoyaltyProgramService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {}
  formatterDollar = (value: number): string => `R$ ${value}`;
  parserDollar = (value: string): number =>
    parseFloat(value.replace('R$ ', ''));

  ngOnInit(): void {
    this.loadPrograms();
    this.programForm = this.fb.group({
      name: [null, [Validators.required]],
      currency_type: [null, [Validators.required]],
      custom_rate: [0, [Validators.required, Validators.min(0)]],
    });
  }

  loadPrograms(): void {
    this.isLoading = true;
    this.loyaltyProgramService.getLoyaltyPrograms().subscribe({
      next: (data) => {
        this.programs = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.message.error('Não foi possível carregar os programas.');
        this.isLoading = false;
      },
    });
  }

  showModal(): void {
    this.programForm.reset();
    this.isModalVisible = true;
  }

  handleOk(): void {
    if (this.programForm.valid) {
      this.isModalLoading = true;
      const payload = {
        ...this.programForm.value,
        is_active: true,
        is_user_created: true,
      };
      this.loyaltyProgramService.createLoyaltyProgram(payload).subscribe({
        next: () => {
          this.message.success('Programa criado com sucesso!');
          this.isModalVisible = false;
          this.isModalLoading = false;
          this.loadPrograms();
        },
        error: (err) => {
          this.message.error(
            err.error?.name?.[0] || 'Não foi possível criar o programa.'
          );
          this.isModalLoading = false;
        },
      });
    } else {
      Object.values(this.programForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
    }
  }

  handleCancel(): void {
    this.isModalVisible = false;
  }

  toggleStatus(program: LoyaltyProgram): void {
    this.loyaltyProgramService.toggleProgramStatus(program.id).subscribe({
      next: () => {
        const action = program.is_active ? 'desativado' : 'reativado';
        this.message.success(`Programa ${action} com sucesso!`);
        this.loadPrograms();
      },
      error: () => {
        this.message.error('Não foi possível alterar o status do programa.');
      },
    });
  }

  deleteProgram(program: LoyaltyProgram): void {
    if (!program.is_user_created) {
      this.message.warning(
        'Não é possível excluir programas padrão do sistema.'
      );
      return;
    }
    this.loyaltyProgramService.deleteLoyaltyProgram(program.id).subscribe({
      next: () => {
        this.message.success('Programa excluído com sucesso!');
        this.loadPrograms();
      },
      error: (err: any) => {
        const errorMessage =
          err.error?.detail || 'Não foi possível excluir o programa.';
        this.message.error(errorMessage);
      },
    });
  }
}
