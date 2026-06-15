import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { TranslationService } from '../i18n/translation.service';
import { API_BASE_URL, SearchFilters, getProductionTypeFilter } from './search';

const MIN_TEXTUAL_EXPORT_LENGTH = 2;

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly i18n = inject(TranslationService);

  downloadProductionsCsv(filters?: SearchFilters, fallbackFilename = 'latteshub_producoes.csv') {
    return this.http.get(`${this.apiBaseUrl}/exportacoes/producoes.csv`, {
      params: this.buildProductionParams(filters),
      responseType: 'blob',
      observe: 'response',
    }).pipe(
      map(response => {
        const filename = this.extractFilename(response.headers.get('content-disposition')) ?? fallbackFilename;
        this.saveBlob(response.body ?? new Blob(), filename);
      }),
    );
  }

  private buildProductionParams(filters?: SearchFilters) {
    let params = new HttpParams();
    if (!filters) {
      return params;
    }

    const pergunta = filters.pergunta.trim();
    if (pergunta.length >= MIN_TEXTUAL_EXPORT_LENGTH) {
      params = params.set('termo', pergunta);
    }

    const tipoProducao = getProductionTypeFilter(filters);
    if (tipoProducao) {
      params = params.set('tipo_producao', tipoProducao);
    }

    if (filters.ano !== undefined) {
      params = params.set('ano', String(filters.ano));
    }

    if (filters.anoInicio !== undefined) {
      params = params.set('ano_inicio', String(filters.anoInicio));
    }

    if (filters.anoFim !== undefined) {
      params = params.set('ano_fim', String(filters.anoFim));
    }

    if (filters.instituicaoId !== undefined) {
      params = params.set('instituicao_id', String(filters.instituicaoId));
    }

    if (filters.qualisEstrato) {
      params = params.set('qualis_estrato', filters.qualisEstrato);
    }

    for (const area of filters.areas) {
      params = params.append('areas', String(area));
    }

    return params;
  }

  private extractFilename(contentDisposition: string | null) {
    if (!contentDisposition) {
      return null;
    }

    const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? null;
  }

  private saveBlob(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    try {
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      URL.revokeObjectURL(objectUrl);
    }
  }
}
