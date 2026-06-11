import { Component, OnInit, inject, signal } from '@angular/core';

import { ExportService } from '../../services/export';
import { IndicatorsService, IndicadoresResumo } from '../../services/indicators';

@Component({
  selector: 'app-indicators',
  imports: [],
  templateUrl: './indicators.html',
  styleUrl: './indicators.scss',
})
export class Indicators implements OnInit {
  private readonly exportService = inject(ExportService);
  private readonly indicatorsService = inject(IndicatorsService);

  exportingCsv = signal(false);
  exportError = signal<string | null>(null);

  loading = signal(true);
  loadError = signal(false);
  resumo = signal<IndicadoresResumo | null>(null);

  ngOnInit() {
    this.indicatorsService.getResumo().subscribe({
      next: (data) => {
        this.resumo.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  exportCsv() {
    if (this.exportingCsv()) {
      return;
    }

    this.exportingCsv.set(true);
    this.exportError.set(null);
    this.exportService.downloadProductionsCsv(
      undefined,
      'latteshub_producoes_indicadores.csv',
    ).subscribe({
      next: () => this.exportingCsv.set(false),
      error: () => {
        this.exportingCsv.set(false);
        this.exportError.set('Nao foi possivel exportar o CSV.');
      },
    });
  }

  get mediaProducoes(): string {
    const r = this.resumo();
    if (!r || r.total_pesquisadores === 0) return '—';
    return (r.total_producoes / r.total_pesquisadores).toFixed(1);
  }

  get chartMax(): number {
    const data = this.resumo()?.producoes_por_ano ?? [];
    return data.length ? Math.max(...data.map(p => p.total)) : 1;
  }

  chartBarHeightPct(total: number): string {
    return `${Math.round((total / this.chartMax) * 100)}%`;
  }

  get topAreasMax(): number {
    const data = this.resumo()?.top_areas ?? [];
    return data.length ? Math.max(...data.map(a => a.total)) : 1;
  }

  areaBarWidthPct(total: number): string {
    return `${Math.round((total / this.topAreasMax) * 100)}%`;
  }

  formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }
}
