import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_BASE_URL } from './search';

export interface ProducaoPorAno {
  ano: number;
  total: number;
}

export interface TopArea {
  area: string;
  total: number;
}

export interface IndicadoresResumo {
  total_producoes: number;
  total_pesquisadores: number;
  producoes_por_ano: ProducaoPorAno[];
  top_areas: TopArea[];
}

@Injectable({
  providedIn: 'root',
})
export class IndicatorsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getResumo() {
    return this.http.get<IndicadoresResumo>(`${this.apiBaseUrl}/indicadores/resumo`);
  }
}
