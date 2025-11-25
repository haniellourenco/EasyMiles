import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzDividerModule } from 'ng-zorro-antd/divider';

interface DashboardSummary {
  overall_estimated_value: number;
  total_acquisition_cost_tracked: number;
  total_revenue_from_sales: number;
  total_points_milhas_sold: number;
  programs_summary: {
    name: string;
    currency_type: number;
    total_balance: number;
    total_value: number;
  }[];
  balances_by_currency_type: any[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NzGridModule,
    NzCardModule,
    NzStatisticModule,
    NzIconModule,
    NzProgressModule,
    NzTableModule,
    NzTypographyModule,
    NzSkeletonModule,
    NzDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  isLoading = true;
  data: DashboardSummary | null = null;

  estimatedProfit = 0;
  profitMargin = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http
      .get<DashboardSummary>(`${environment.apiUrl}/summary/overall/`)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.calculateKPIs();
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        },
      });
  }

  calculateKPIs(): void {
    if (!this.data) return;

    const patrimony = Number(this.data.overall_estimated_value);
    const cashIn = Number(this.data.total_revenue_from_sales);
    const cost = Number(this.data.total_acquisition_cost_tracked);

    // Fórmula: (Patrimônio + Vendas) - Custo
    this.estimatedProfit = patrimony + cashIn - cost;

    // Margem de Lucro: Lucro / Custo
    if (cost > 0) {
      this.profitMargin = (this.estimatedProfit / cost) * 100;
    } else {
      this.profitMargin = 100;
    }
  }
}
