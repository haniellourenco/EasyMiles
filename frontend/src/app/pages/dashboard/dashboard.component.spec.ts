import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../../../environments/environment';

import { DashboardComponent } from './dashboard.component';

const mockDashboardData = {
  overall_estimated_value: 15000, // Patrimônio
  total_acquisition_cost_tracked: 10000, // Custo
  total_revenue_from_sales: 5000, // Vendas
  total_points_milhas_sold: 200000,
  programs_summary: [
    {
      name: 'Smiles',
      currency_type: 2,
      total_balance: 100000,
      total_value: 2000,
    },
  ],
  balances_by_currency_type: [],
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        DashboardComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve criar o componente', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/summary/overall/`);
    req.flush(mockDashboardData);

    expect(component).toBeTruthy();
  });

  it('deve carregar dados e calcular KPIs corretamente no ngOnInit', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/summary/overall/`);
    expect(req.request.method).toBe('GET');

    req.flush(mockDashboardData);

    expect(component.data).toEqual(mockDashboardData);
    expect(component.isLoading).toBeFalse();

    // Verifica Cálculos de KPI
    // Lucro = (Patrimônio + Vendas) - Custo
    // Lucro = (15000 + 5000) - 10000 = 10000
    expect(component.estimatedProfit).toBe(10000);

    // Margem = (Lucro / Custo) * 100
    // Margem = (10000 / 10000) * 100 = 100%
    expect(component.profitMargin).toBe(100);
  });

  it('deve tratar margem de lucro quando custo é zero (divisão por zero)', () => {
    const dataZeroCost = {
      ...mockDashboardData,
      total_acquisition_cost_tracked: 0,
    };

    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/summary/overall/`);
    req.flush(dataZeroCost);

    // Lucro = (15000 + 5000) - 0 = 20000
    expect(component.estimatedProfit).toBe(20000);

    // Margem deve ser 100% quando o custo é zero
    expect(component.profitMargin).toBe(100);
  });

  it('deve lidar com erro na API graciosamente', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/summary/overall/`);

    // Simula erro
    req.flush('Erro interno', { status: 500, statusText: 'Server Error' });

    expect(component.isLoading).toBeFalse();
    expect(component.data).toBeNull();
    // Lucro e Margem devem permanecer 0 (valores iniciais)
    expect(component.estimatedProfit).toBe(0);
  });
});
