import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface IndicadoresFiltros {
  anoInicio?: number;
  anoFim?: number;
  grandeArea?: string[];
  instituicao?: string[];
  tipoProducao?: string;
  qualis?: string[];
}

export interface FiltroOpcoes {
  grandes_areas: string[];
  instituicoes: string[];
  tipos_producao: string[];
  anos: number[];
}

@Injectable({
  providedIn: 'root',
})
export class IndicatorsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getResumo(filtros?: IndicadoresFiltros) {
    let params = new HttpParams();
    if (filtros?.anoInicio != null) params = params.set('ano_inicio', filtros.anoInicio);
    if (filtros?.anoFim != null) params = params.set('ano_fim', filtros.anoFim);
    for (const area of filtros?.grandeArea ?? []) params = params.append('grande_area', area);
    for (const instituicao of filtros?.instituicao ?? []) params = params.append('instituicao', instituicao);
    if (filtros?.tipoProducao) params = params.set('tipo_producao', filtros.tipoProducao);
    for (const estrato of filtros?.qualis ?? []) params = params.append('qualis', estrato);
    return this.http.get<IndicadoresResumo>(`${this.apiBaseUrl}/indicadores/resumo`, { params });
  }

  getFiltros() {
    return this.http.get<FiltroOpcoes>(`${this.apiBaseUrl}/indicadores/filtros`);
  }
}
