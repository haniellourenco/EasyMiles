import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { LoyaltyProgramsComponent } from './loyalty-programs.component';
import {
  LoyaltyProgramService,
  LoyaltyProgram,
  LoyaltyProgramPayload,
} from '../../services/loyalty-program.service';
import { NzMessageService } from 'ng-zorro-antd/message';

const mockPrograms: LoyaltyProgram[] = [
  {
    id: 1,
    name: 'Programa Padrão',
    currency_type: 2,
    get_currency_type_display: 'Milhas',
    is_user_created: false,
    is_active: true,
    custom_rate: 0,
  },
  {
    id: 2,
    name: 'Meu Programa',
    currency_type: 1,
    get_currency_type_display: 'Pontos',
    is_user_created: true,
    is_active: true,
    custom_rate: 20.0,
  },
  {
    id: 3,
    name: 'Programa Inativo',
    currency_type: 1,
    get_currency_type_display: 'Pontos',
    is_user_created: true,
    is_active: false,
    custom_rate: 0,
  },
];

describe('LoyaltyProgramsComponent', () => {
  let component: LoyaltyProgramsComponent;
  let fixture: ComponentFixture<LoyaltyProgramsComponent>;
  let mockProgramService: jasmine.SpyObj<LoyaltyProgramService>;
  let mockMessageService: jasmine.SpyObj<NzMessageService>;

  beforeEach(waitForAsync(() => {
    mockProgramService = jasmine.createSpyObj('LoyaltyProgramService', [
      'getLoyaltyPrograms',
      'createLoyaltyProgram',
      'toggleProgramStatus',
      'deleteLoyaltyProgram',
    ]);
    mockMessageService = jasmine.createSpyObj('NzMessageService', [
      'success',
      'error',
      'warning',
    ]);

    TestBed.configureTestingModule({
      imports: [
        LoyaltyProgramsComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: LoyaltyProgramService, useValue: mockProgramService },
        { provide: NzMessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoyaltyProgramsComponent);
    component = fixture.componentInstance;
  }));

  describe('Initialization and Data Loading', () => {
    it('should create', () => {
      mockProgramService.getLoyaltyPrograms.and.returnValue(of(mockPrograms));
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('deve inicializar o formulário e carregar programas no ngOnInit', () => {
      mockProgramService.getLoyaltyPrograms.and.returnValue(of(mockPrograms));
      fixture.detectChanges();

      expect(component.programForm).toBeDefined();
      expect(
        component.programForm.get('name')?.hasValidator(Validators.required)
      ).toBeTrue();
      expect(
        component.programForm
          .get('currency_type')
          ?.hasValidator(Validators.required)
      ).toBeTrue();

      expect(mockProgramService.getLoyaltyPrograms).toHaveBeenCalledTimes(1);
      expect(component.programs.length).toBe(3);
      expect(component.isLoading).toBeFalse();
    });

    xit('deve mostrar mensagem de erro se falhar ao carregar programas', fakeAsync(() => {
      mockProgramService.getLoyaltyPrograms.and.returnValue(
        throwError(() => new Error('Falha na API')).pipe(delay(0))
      );
      fixture.detectChanges();
      expect(component.isLoading).toBeTrue();

      tick();
      tick(100);
      fixture.detectChanges();

      expect(mockProgramService.getLoyaltyPrograms).toHaveBeenCalledTimes(1);
      expect(component.isLoading).toBeFalse();
      expect(component.programs.length).toBe(0);
      expect(mockMessageService.error).toHaveBeenCalledWith(
        'Não foi possível carregar os programas.'
      );
    }));
  });

  describe('Program Creation Modal', () => {
    beforeEach(() => {
      mockProgramService.getLoyaltyPrograms.and.returnValue(of(mockPrograms));
      fixture.detectChanges();
    });

    it('showModal: deve abrir o modal e resetar o formulário', () => {
      spyOn(component.programForm, 'reset');
      component.showModal();

      expect(component.isModalVisible).toBeTrue();
      expect(component.programForm.reset).toHaveBeenCalled();
    });

    it('handleCancel: deve fechar o modal', () => {
      component.showModal();
      component.handleCancel();
      expect(component.isModalVisible).toBeFalse();
    });

    it('handleOk: não deve submeter se o formulário for inválido', () => {
      component.showModal();
      component.programForm.get('name')?.setValue('');
      component.handleOk();

      expect(component.programForm.valid).toBeFalse();
      expect(mockProgramService.createLoyaltyProgram).not.toHaveBeenCalled();
      expect(component.isModalLoading).toBeFalse();
    });

    it('handleOk (Sucesso): deve criar programa, mostrar sucesso, recarregar e fechar', fakeAsync(() => {
      const loadProgramsSpy = spyOn(component, 'loadPrograms').and.callFake(
        () => {}
      );
      const newProgramPayload: LoyaltyProgramPayload = {
        name: 'Novo Programa',
        currency_type: 1,
        is_active: true,
        is_user_created: true,
        custom_rate: 25.0,
      };

      component.showModal();
      component.programForm.setValue({
        name: 'Novo Programa',
        currency_type: 1,
        custom_rate: 25.0,
      });

      mockProgramService.createLoyaltyProgram.and.returnValue(
        of({ ...newProgramPayload, id: 4 } as LoyaltyProgram).pipe(delay(0))
      );

      component.handleOk();
      expect(component.isModalLoading).toBeTrue();
      expect(mockProgramService.createLoyaltyProgram).toHaveBeenCalledWith(
        newProgramPayload
      );

      tick();
      tick(100);
      fixture.detectChanges();

      expect(mockMessageService.success).toHaveBeenCalledWith(
        'Programa criado com sucesso!'
      );
      expect(component.isModalVisible).toBeFalse();
      expect(component.isModalLoading).toBeFalse();
      expect(loadProgramsSpy).toHaveBeenCalledTimes(1);
    }));

    xit('handleOk (Erro API): deve mostrar erro e manter modal aberto', fakeAsync(() => {
      const loadProgramsSpy = spyOn(component, 'loadPrograms');
      component.showModal();
      component.programForm.setValue({
        name: 'Programa Ruim',
        currency_type: 1,
      });

      mockProgramService.createLoyaltyProgram.and.returnValue(
        throwError(() => ({ error: { name: ['Programa já existe'] } })).pipe(
          delay(0)
        )
      );

      component.handleOk();
      expect(component.isModalLoading).toBeTrue();

      tick();
      tick(100);
      fixture.detectChanges();

      expect(mockMessageService.error).toHaveBeenCalledWith(
        'Programa já existe'
      );
      expect(component.isModalLoading).toBeFalse();
      expect(component.isModalVisible).toBeTrue();
      expect(loadProgramsSpy).not.toHaveBeenCalled();
    }));
  });

  describe('Program Actions (Toggle/Delete)', () => {
    let loadProgramsSpy: jasmine.Spy;

    beforeEach(() => {
      mockProgramService.getLoyaltyPrograms.and.returnValue(of(mockPrograms));
      fixture.detectChanges();
      loadProgramsSpy = spyOn(component, 'loadPrograms').and.callFake(() => {});
    });

    it('toggleStatus (Sucesso): deve chamar serviço, mostrar sucesso e recarregar', fakeAsync(() => {
      const programToToggle = mockPrograms[0];
      mockProgramService.toggleProgramStatus.and.returnValue(
        of({ ...programToToggle, is_active: false }).pipe(delay(0))
      );

      component.toggleStatus(programToToggle);
      tick();
      tick(100);

      expect(mockProgramService.toggleProgramStatus).toHaveBeenCalledWith(
        programToToggle.id
      );
      expect(mockMessageService.success).toHaveBeenCalledWith(
        'Programa desativado com sucesso!'
      );
      expect(loadProgramsSpy).toHaveBeenCalledTimes(1);
    }));

    it('toggleStatus (Erro): deve chamar serviço e mostrar erro', fakeAsync(() => {
      const programToToggle = mockPrograms[0];
      mockProgramService.toggleProgramStatus.and.returnValue(
        throwError(() => new Error('Falha na API')).pipe(delay(0))
      );

      component.toggleStatus(programToToggle);
      tick();
      tick(100);

      expect(mockProgramService.toggleProgramStatus).toHaveBeenCalledWith(
        programToToggle.id
      );
      expect(mockMessageService.error).toHaveBeenCalledWith(
        'Não foi possível alterar o status do programa.'
      );
      expect(loadProgramsSpy).not.toHaveBeenCalled();
    }));

    it('deleteProgram (Programa Padrão): deve mostrar aviso e NÃO chamar o serviço', () => {
      const programNaoExcluivel = mockPrograms[0];
      component.deleteProgram(programNaoExcluivel);

      expect(mockMessageService.warning).toHaveBeenCalledWith(
        'Não é possível excluir programas padrão do sistema.'
      );
      expect(mockProgramService.deleteLoyaltyProgram).not.toHaveBeenCalled();
    });

    it('deleteProgram (Sucesso): deve chamar serviço, mostrar sucesso e recarregar', fakeAsync(() => {
      const programExcluivel = mockPrograms[1];
      mockProgramService.deleteLoyaltyProgram.and.returnValue(
        of(undefined).pipe(delay(0))
      );

      component.deleteProgram(programExcluivel);
      tick();
      tick(100);

      expect(mockProgramService.deleteLoyaltyProgram).toHaveBeenCalledWith(
        programExcluivel.id
      );
      expect(mockMessageService.success).toHaveBeenCalledWith(
        'Programa excluído com sucesso!'
      );
      expect(loadProgramsSpy).toHaveBeenCalledTimes(1);
    }));

    it('deleteProgram (Erro): deve chamar serviço e mostrar erro (ex: com contas vinculadas)', fakeAsync(() => {
      const programExcluivel = mockPrograms[1];
      const errorResponse = { error: { detail: 'Existem contas vinculadas.' } };
      mockProgramService.deleteLoyaltyProgram.and.returnValue(
        throwError(() => errorResponse).pipe(delay(0))
      );

      component.deleteProgram(programExcluivel);
      tick();
      tick(100);

      expect(mockProgramService.deleteLoyaltyProgram).toHaveBeenCalledWith(
        programExcluivel.id
      );
      expect(mockMessageService.error).toHaveBeenCalledWith(
        errorResponse.error.detail
      );
      expect(loadProgramsSpy).not.toHaveBeenCalled();
    }));
  });
});
