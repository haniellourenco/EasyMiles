import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  LoyaltyProgramService,
  LoyaltyProgram,
  LoyaltyProgramPayload,
} from './loyalty-program.service';

describe('LoyaltyProgramService', () => {
  let service: LoyaltyProgramService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl + '/loyalty-programs';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LoyaltyProgramService],
    });
    service = TestBed.inject(LoyaltyProgramService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve buscar programas de fidelidade (getLoyaltyPrograms)', () => {
    const mockPrograms: LoyaltyProgram[] = [
      {
        id: 1,
        name: 'Smiles',
        currency_type: 2,
        get_currency_type_display: 'Milhas',
        is_user_created: false,
        is_active: true,
        custom_rate: 0,
      },
    ];

    service.getLoyaltyPrograms().subscribe((programs) => {
      expect(programs.length).toBe(1);
      expect(programs).toEqual(mockPrograms);
    });

    const req = httpMock.expectOne(`${apiUrl}/`);
    expect(req.request.method).toBe('GET');

    req.flush(mockPrograms);
  });

  it('deve criar um programa de fidelidade (createLoyaltyProgram)', () => {
    const newProgramPayload: LoyaltyProgramPayload = {
      name: 'Novo Programa',
      currency_type: 1,
      is_active: true,
      is_user_created: true,
      custom_rate: 10,
    };
    const mockResponse: LoyaltyProgram = {
      id: 2,
      ...newProgramPayload,
      get_currency_type_display: 'Pontos',
    };

    service.createLoyaltyProgram(newProgramPayload).subscribe((program) => {
      expect(program).toEqual(mockResponse);
      expect(program.id).toBe(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newProgramPayload);
    req.flush(mockResponse);
  });

  it('deve excluir um programa de fidelidade (deleteLoyaltyProgram)', () => {
    const programId = 1;

    service.deleteLoyaltyProgram(programId).subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/${programId}/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('deve alternar o status do programa (toggleProgramStatus)', () => {
    const programId = 1;
    const mockResponse: LoyaltyProgram = {
      id: 1,
      name: 'Smiles',
      currency_type: 2,
      get_currency_type_display: 'Milhas',
      is_user_created: false,
      is_active: false,
      custom_rate: 0,
    };

    service.toggleProgramStatus(programId).subscribe((program) => {
      expect(program.is_active).toBeFalse();
    });

    const req = httpMock.expectOne(`${apiUrl}/${programId}/toggle-active/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
  });
});
