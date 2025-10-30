import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';

import { WalletListComponent } from './wallet-list.component';
import {
  WalletService,
  Wallet,
  WalletPayload,
} from '../../../services/wallet.service';
import { NzMessageService } from 'ng-zorro-antd/message';

import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

class MockNzMessageService {
  success(message: string): void {}
  error(message: string): void {}
}

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('WalletListComponent', () => {
  let component: WalletListComponent;
  let fixture: ComponentFixture<WalletListComponent>;
  let mockWalletService: jasmine.SpyObj<WalletService>;
  let mockMessageService: jasmine.SpyObj<NzMessageService>;
  let router: Router;

  const mockWallets: Wallet[] = [
    { id: 1, wallet_name: 'Carteira Principal', user: 1 },
    { id: 2, wallet_name: 'Carteira Viagem', user: 1 },
  ];

  beforeEach(waitForAsync(async () => {
    mockWalletService = jasmine.createSpyObj('WalletService', [
      'getWallets',
      'createWallet',
      'updateWallet',
      'deleteWallet',
    ]);
    const messageSpy = jasmine.createSpyObj('NzMessageService', [
      'success',
      'error',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        WalletListComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'wallets/:id', component: DummyComponent },
        ]),
        NoopAnimationsModule,
        NzPageHeaderModule,
        NzButtonModule,
        NzIconModule,
        NzCardModule,
        NzGridModule,
        NzDropDownModule,
        NzPopconfirmModule,
        NzMessageModule,
        NzModalModule,
        NzFormModule,
        NzInputModule,
        DummyComponent,
      ],
      providers: [
        FormBuilder,
        { provide: WalletService, useValue: mockWalletService },
        { provide: NzMessageService, useValue: messageSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletListComponent);
    component = fixture.componentInstance;
    mockMessageService = TestBed.inject(
      NzMessageService
    ) as jasmine.SpyObj<NzMessageService>;
    router = TestBed.inject(Router);
  }));

  it('should create', () => {
    mockWalletService.getWallets.and.returnValue(of([...mockWallets]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('deve inicializar o formulário e carregar carteiras no ngOnInit', () => {
    mockWalletService.getWallets.and.returnValue(of([...mockWallets]));
    fixture.detectChanges();

    expect(component.walletForm).toBeDefined();
    expect(
      component.walletForm.get('wallet_name')?.hasValidator(Validators.required)
    ).toBeTrue();
    const nameControl = component.walletForm.get('wallet_name');
    nameControl?.setValue('ab');
    expect(nameControl?.hasError('minlength')).toBeTrue();
    nameControl?.setValue('abc');
    expect(nameControl?.hasError('minlength')).toBeFalse();

    expect(mockWalletService.getWallets).toHaveBeenCalledTimes(1);
    expect(component.wallets.length).toBe(2);
  });

  it('deve mostrar mensagem de erro se falhar ao carregar carteiras', () => {
    mockWalletService.getWallets.and.returnValue(
      throwError(() => new Error('Falha ao buscar'))
    );
    fixture.detectChanges();

    expect(mockWalletService.getWallets).toHaveBeenCalledTimes(1);
    expect(component.wallets.length).toBe(0);
    expect(mockMessageService.error).toHaveBeenCalledWith(
      'Não foi possível carregar as carteiras.'
    );
  });

  describe('Modal Handling', () => {
    beforeEach(() => {
      mockWalletService.getWallets.and.returnValue(of([...mockWallets]));
      fixture.detectChanges();
    });

    it('showModal: deve abrir modal para CRIAR...', () => {
      component.showModal();
      expect(component.isModalVisible).toBeTrue();
      expect(component.modalTitle).toBe('Criar Nova Carteira');
      expect(component.editingWalletId).toBeNull();
    });

    it('showModal: deve abrir modal para EDITAR...', () => {
      component.showModal(mockWallets[0]);
      expect(component.isModalVisible).toBeTrue();
      expect(component.modalTitle).toBe('Editar Carteira');
      expect(component.editingWalletId).toBe(mockWallets[0].id);
    });

    it('handleCancel: deve fechar modal...', () => {
      component.showModal(mockWallets[0]);
      component.handleCancel();
      expect(component.isModalVisible).toBeFalse();
      expect(component.isModalLoading).toBeFalse();
    });

    it('handleOk: deve marcar campos como inválidos...', () => {
      spyOn(component as any, 'validateForm').and.callThrough();
      component.showModal();
      component.walletForm.get('wallet_name')?.setValue('');
      component.handleOk();
      expect(component.isModalLoading).toBeFalse();
      expect(mockWalletService.createWallet).not.toHaveBeenCalled();
    });
  });

  describe('Async Operations', () => {
    let loadWalletsSpy: jasmine.Spy;

    beforeEach(() => {
      mockWalletService.getWallets.and.returnValue(of([...mockWallets]));
      fixture.detectChanges();

      loadWalletsSpy = spyOn(component, 'loadWallets').and.callFake(() => {
        mockWalletService.getWallets.and.returnValue(of([]));
      });
    });

    describe('Wallet Creation', () => {
      beforeEach(() => {
        component.showModal();
        component.walletForm.get('wallet_name')?.setValue('Nova Carteira');
      });

      it('handleOk (Criação): deve chamar createWallet, mostrar sucesso, recarregar e fechar modal', fakeAsync(() => {
        const createdWallet: Wallet = {
          id: 3,
          wallet_name: 'Nova Carteira',
          user: 1,
        };
        mockWalletService.createWallet.and.returnValue(
          of(createdWallet).pipe(delay(0))
        );

        component.handleOk();
        expect(component.isModalLoading).toBeTrue();
        expect(mockWalletService.createWallet).toHaveBeenCalledWith({
          wallet_name: 'Nova Carteira',
        });

        tick();
        fixture.detectChanges();

        expect(mockMessageService.success).toHaveBeenCalledWith(
          'Carteira criada com sucesso!'
        );
        expect(loadWalletsSpy).toHaveBeenCalledTimes(1);
        expect(component.isModalVisible).toBeFalse();
        expect(component.isModalLoading).toBeFalse();
      }));

      // it('handleOk (Criação): deve mostrar erro se createWallet falhar', fakeAsync(() => {
      //   mockWalletService.createWallet.and.returnValue(
      //     throwError(() => new Error('Erro na API')).pipe(delay(0))
      //   );

      //   component.handleOk();
      //   expect(component.isModalLoading).toBeTrue();

      //   tick();
      //   fixture.detectChanges();

      //   expect(component.isModalLoading).toBeFalse();
      //   expect(mockMessageService.error).toHaveBeenCalledWith(
      //     'Erro ao salvar carteira.'
      //   );
      //   expect(loadWalletsSpy).not.toHaveBeenCalled();
      //   expect(component.isModalVisible).toBeTrue();
      // }));
    });

    describe('Wallet Update', () => {
      const walletToEdit = mockWallets[0];
      const updatedName = 'Carteira Principal Editada';

      beforeEach(() => {
        component.showModal(walletToEdit);
        component.walletForm.get('wallet_name')?.setValue(updatedName);
      });

      it('handleOk (Edição): deve chamar updateWallet, mostrar sucesso, recarregar e fechar modal', fakeAsync(() => {
        const updatedWallet: Wallet = {
          ...walletToEdit,
          wallet_name: updatedName,
        };
        mockWalletService.updateWallet.and.returnValue(
          of(updatedWallet).pipe(delay(0))
        );

        component.handleOk();
        expect(component.isModalLoading).toBeTrue();
        expect(mockWalletService.updateWallet).toHaveBeenCalledWith(
          walletToEdit.id,
          { wallet_name: updatedName }
        );

        tick();
        fixture.detectChanges();

        expect(mockMessageService.success).toHaveBeenCalledWith(
          'Carteira atualizada com sucesso!'
        );
        expect(loadWalletsSpy).toHaveBeenCalledTimes(1);
        expect(component.isModalVisible).toBeFalse();
        expect(component.isModalLoading).toBeFalse();
      }));

      // it('handleOk (Edição): deve mostrar erro se updateWallet falhar', fakeAsync(() => {
      //   mockWalletService.updateWallet.and.returnValue(
      //     throwError(() => new Error('Erro na API')).pipe(delay(0))
      //   );

      //   component.handleOk();
      //   expect(component.isModalLoading).toBeTrue();

      //   tick();
      //   fixture.detectChanges();

      //   expect(component.isModalLoading).toBeFalse();
      //   expect(mockMessageService.error).toHaveBeenCalledWith(
      //     'Erro ao salvar carteira.'
      //   );
      //   expect(loadWalletsSpy).not.toHaveBeenCalled();
      //   expect(component.isModalVisible).toBeTrue();
      // }));
    });

    describe('Wallet Deletion', () => {
      const walletIdToDelete = mockWallets[0].id;

      it('deleteWallet: deve chamar deleteWallet, mostrar sucesso e recarregar lista', fakeAsync(() => {
        mockWalletService.deleteWallet.and.returnValue(
          of(undefined).pipe(delay(0))
        );

        component.deleteWallet(walletIdToDelete);
        expect(mockWalletService.deleteWallet).toHaveBeenCalledWith(
          walletIdToDelete
        );

        tick();
        fixture.detectChanges();

        expect(mockMessageService.success).toHaveBeenCalledWith(
          'Carteira excluída com sucesso!'
        );
        expect(loadWalletsSpy).toHaveBeenCalledTimes(1);
      }));

      it('deleteWallet: deve mostrar erro se deleteWallet falhar', fakeAsync(() => {
        mockWalletService.deleteWallet.and.returnValue(
          throwError(() => new Error('Erro na API')).pipe(delay(0))
        );

        component.deleteWallet(walletIdToDelete);
        tick();
        fixture.detectChanges();

        expect(mockMessageService.error).toHaveBeenCalledWith(
          'Erro ao excluir a carteira.'
        );
        expect(loadWalletsSpy).not.toHaveBeenCalled();
      }));
    });
  });
});
