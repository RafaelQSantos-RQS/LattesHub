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

export interface ProducaoPorTipo {
  tipo: string;
  total: number;
}

export interface QualisEstrato {
  estrato: string;
  total: number;
}

export interface TopInstituicao {
  instituicao: string;
  total: number;
}

export interface IndicadoresResumo {
  total_producoes: number;
  total_pesquisadores: number;
  producoes_por_ano: ProducaoPorAno[];
  top_areas: TopArea[];
  por_tipo: ProducaoPorTipo[];
  qualis_distribuicao: QualisEstrato[];
  top_instituicoes: TopInstituicao[];
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
