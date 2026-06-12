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

  get porTipoMax(): number {
    const data = this.resumo()?.por_tipo ?? [];
    return data.length ? Math.max(...data.map(t => t.total)) : 1;
  }

  tipoBarWidthPct(total: number): string {
    return `${Math.round((total / this.porTipoMax) * 100)}%`;
  }

  get qualisMax(): number {
    const data = this.resumo()?.qualis_distribuicao ?? [];
    return data.length ? Math.max(...data.map(q => q.total)) : 1;
  }

  qualisBarHeightPct(total: number): string {
    return `${Math.round((total / this.qualisMax) * 100)}%`;
  }

  qualisColor(estrato: string): string {
    const map: Record<string, string> = {
      'A1': '#065f46', 'A2': '#059669', 'A3': '#34d399', 'A4': '#6ee7b7',
      'B1': '#1e3a8a', 'B2': '#2563eb', 'B3': '#60a5fa', 'B4': '#93c5fd',
      'C': '#d97706',
    };
    return map[estrato] ?? '#cbd5e1';
  }

  get topInstMax(): number {
    const data = this.resumo()?.top_instituicoes ?? [];
    return data.length ? Math.max(...data.map(i => i.total)) : 1;
  }

  instBarWidthPct(total: number): string {
    return `${Math.round((total / this.topInstMax) * 100)}%`;
  }

  formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  shortYear(ano: number): string {
    return String(ano % 100).padStart(2, '0');
  }
}
