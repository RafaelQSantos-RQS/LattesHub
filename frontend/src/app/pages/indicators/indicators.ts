import { Component, inject, signal } from '@angular/core';
import { ExportService } from '../../services/export';

@Component({
  selector: 'app-indicators',
  imports: [],
  templateUrl: './indicators.html',
  styleUrl: './indicators.scss',
})
export class Indicators {
  private readonly exportService = inject(ExportService);

  exportingCsv = signal(false);
  exportError = signal<string | null>(null);

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
}
