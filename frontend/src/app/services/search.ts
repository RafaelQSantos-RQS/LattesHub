import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { SearchResult } from '../shared/result-card/result-card';

interface BuscaSemanticaApiResult {
  id: number;
  titulo: string;
  tipo_producao: string;
  ano: number | null;
  pesquisador_nome: string;
  score: number;
  qualis_estrato: string | null;
  qualis_area_avaliacao: string | null;
  qualis_titulo: string | null;
}

interface BuscaSemanticaApiResponse {
  resultados: BuscaSemanticaApiResult[];
}

export interface SearchFilters {
  pergunta: string;
  tipoProducao?: string;
  ano?: number;
  instituicaoId?: number;
  areas: number[];
}

export interface FilterInstitution {
  id: number;
  nome: string;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
}

export interface FilterAreaOption {
  id: number;
  label: string;
  group: string;
}

interface ProducaoApiResult {
  id: number;
  tipo_producao: string;
  titulo: string;
  ano: number | null;
  idioma: string | null;
  natureza: string | null;
  doi: string | null;
  revista: string | null;
  evento: string | null;
  pesquisador_id: number;
  pesquisador_nome: string;
}

interface ProducaoListApiResponse {
  total: number;
  pagina: number;
  tamanho_pagina: number;
  resultados: ProducaoApiResult[];
}

interface InstituicaoListApiResponse {
  total: number;
  pagina: number;
  tamanho_pagina: number;
  resultados: FilterInstitution[];
}

interface GrandeAreaApiResponse {
  grande_area: string;
  areas: {
    nome: string;
    subareas: {
      id: number;
      nome: string;
    }[];
  }[];
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const location = globalThis.location;
    const protocol = location?.protocol || 'http:';
    const hostname = location?.hostname || 'localhost';

    return `${protocol}//${hostname}:8000/api/v1`;
  },
});

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly resultsSignal = signal<SearchResult[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly totalSignal = signal(0);
  private readonly lastQuerySignal = signal('');

  readonly results = this.resultsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();
  readonly lastQuery = this.lastQuerySignal.asReadonly();

  getResults() {
    return this.results;
  }

  search(input: string | SearchFilters) {
    const filters = typeof input === 'string' ? this.buildFilters(input) : input;
    const perguntaNormalizada = filters.pergunta.trim();
    this.lastQuerySignal.set(perguntaNormalizada);

    if (perguntaNormalizada.length < 5) {
      this.loadLatestProductions(filters);
      return;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http.post<BuscaSemanticaApiResponse>(`${this.apiBaseUrl}/busca/semantica`, {
      pergunta: perguntaNormalizada,
      tipo_producao: filters.tipoProducao,
      ano: filters.ano,
      instituicao_id: filters.instituicaoId,
      areas: filters.areas.length > 0 ? filters.areas : undefined,
    }).subscribe({
      next: response => {
        const results = response.resultados.map(result => this.mapSemanticResult(result));
        this.resultsSignal.set(results);
        this.totalSignal.set(results.length);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadProductions(perguntaNormalizada, filters);
      },
    });
  }

  loadLatestProductions(filters = this.buildFilters('')) {
    this.loadProductions(undefined, filters);
  }

  getInstitutions() {
    const params = new HttpParams()
      .set('pagina', '1')
      .set('tamanho_pagina', '100');

    return this.http
      .get<InstituicaoListApiResponse>(`${this.apiBaseUrl}/instituicoes/`, { params })
      .pipe(map(response => response.resultados));
  }

  getAreaOptions() {
    return this.http.get<GrandeAreaApiResponse[]>(`${this.apiBaseUrl}/areas/`).pipe(
      map(groups => groups.flatMap(group =>
        group.areas.flatMap(area =>
          area.subareas.map(subarea => ({
            id: subarea.id,
            label: subarea.nome,
            group: `${group.grande_area} / ${area.nome}`,
          })),
        ),
      )),
    );
  }

  private buildFilters(pergunta: string): SearchFilters {
    return {
      pergunta,
      areas: [],
    };
  }

  private loadProductions(termo?: string, filters = this.buildFilters('')) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let params = new HttpParams()
      .set('pagina', '1')
      .set('tamanho_pagina', '20');

    if (termo) {
      params = params.set('termo', termo);
    }

    if (filters.tipoProducao) {
      params = params.set('tipo_producao', filters.tipoProducao);
    }

    if (filters.ano) {
      params = params.set('ano', String(filters.ano));
    }

    if (filters.instituicaoId) {
      params = params.set('instituicao_id', String(filters.instituicaoId));
    }

    for (const area of filters.areas) {
      params = params.append('areas', String(area));
    }

    this.http.get<ProducaoListApiResponse>(`${this.apiBaseUrl}/producoes/`, { params }).subscribe({
      next: response => {
        this.resultsSignal.set(response.resultados.map(result => this.mapProductionResult(result)));
        this.totalSignal.set(response.total);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.resultsSignal.set([]);
        this.totalSignal.set(0);
        this.errorSignal.set('Nao foi possivel carregar as producoes.');
        this.loadingSignal.set(false);
      },
    });
  }

  private mapSemanticResult(result: BuscaSemanticaApiResult): SearchResult {
    return {
      id: String(result.id),
      title: result.titulo,
      author: result.pesquisador_nome,
      year: result.ano,
      productionType: result.tipo_producao,
      score: result.score,
      relevance: this.toRelevance(result.score),
      highRelevance: result.score >= 80,
      qualisEstrato: result.qualis_estrato,
      qualisAreaAvaliacao: result.qualis_area_avaliacao,
      tag: result.qualis_estrato ? `Qualis ${result.qualis_estrato}` : undefined,
    };
  }

  private mapProductionResult(result: ProducaoApiResult): SearchResult {
    return {
      id: String(result.id),
      title: result.titulo,
      author: result.pesquisador_nome,
      year: result.ano,
      language: result.idioma,
      doi: result.doi,
      productionType: result.tipo_producao,
      abstract: result.revista || result.evento || result.natureza || undefined,
    };
  }

  private toRelevance(score: number): SearchResult['relevance'] {
    if (score >= 80) {
      return 'Alta';
    }

    if (score >= 50) {
      return 'Media';
    }

    return 'Baixa';
  }
}
