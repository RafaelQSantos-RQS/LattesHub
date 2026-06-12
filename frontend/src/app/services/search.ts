import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Subscription, map } from 'rxjs';
import { SearchResult } from '../shared/result-card/result-card';

export type SearchCategory = 'tudo' | 'pesquisadores' | 'artigos' | 'eventos';

interface BuscaSemanticaApiResult {
  id: number;
  titulo: string;
  tipo_producao: string;
  ano: number | null;
  pesquisador_id: number;
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
  anoInicio?: number;
  anoFim?: number;
  instituicaoId?: number;
  qualisEstrato?: string;
  areas: number[];
  categoria?: SearchCategory;
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

export interface ProductionTypeOption {
  tipo_producao: string;
  total: number;
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
  qualis_estrato: string | null;
  qualis_area_avaliacao: string | null;
}

interface ProducaoListApiResponse {
  total: number;
  pagina: number;
  tamanho_pagina: number;
  resultados: ProducaoApiResult[];
}

interface PesquisadorListApiResponse {
  total: number;
  pagina: number;
  tamanho_pagina: number;
  resultados: ResearcherSummary[];
}

interface ProducaoTiposApiResponse {
  resultados: ProductionTypeOption[];
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

export interface ResearcherArea {
  id: number;
  grande_area: string;
  area: string;
  sub_area: string | null;
  especialidade: string | null;
}

export interface ResearcherSummary {
  id: number;
  lattes_id: string;
  nome: string;
  resumo: string | null;
  instituicao_nome: string | null;
  areas: ResearcherArea[];
}

export interface ResearcherProduction {
  id: number;
  tipo_producao: string;
  titulo: string;
  ano: number | null;
  revista: string | null;
  evento: string | null;
  natureza: string | null;
  doi: string | null;
}

export interface ResearcherProfile {
  pesquisador: ResearcherSummary;
  producoes: ResearcherProduction[];
}

export interface ProductionDetail {
  id: number;
  tipo_producao: string;
  titulo: string;
  ano: number | null;
  idioma: string | null;
  natureza: string | null;
  doi: string | null;
  revista: string | null;
  evento: string | null;
  issn: string | null;
  volume: string | null;
  fasciculo: string | null;
  pagina_inicial: string | null;
  pagina_final: string | null;
  pais_publicacao: string | null;
  titulo_ingles: string | null;
  palavras_chave: string | null;
  coautores: string | null;
  qualis_estrato: string | null;
  qualis_area_avaliacao: string | null;
  pesquisador_id: number;
  pesquisador_nome: string;
}

export interface AgenteChatFonte {
  id: number;
  titulo: string;
  pesquisador_nome: string;
  ano: number | null;
}

export interface AgenteChatResponse {
  resposta: string;
  fontes: AgenteChatFonte[];
}

const MIN_TEXTUAL_SEARCH_LENGTH = 2;
const MIN_SEMANTIC_SEARCH_LENGTH = 5;
const CATEGORY_PRODUCTION_TYPES: Partial<Record<SearchCategory, string>> = {
  artigos: 'ARTIGO PUBLICADO',
  eventos: 'TRABALHO EM EVENTOS',
};

export function getProductionTypeFilter(filters: SearchFilters) {
  return CATEGORY_PRODUCTION_TYPES[filters.categoria ?? 'tudo'] ?? filters.tipoProducao;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/v1',
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
  private activeSearchId = 0;
  private activeSearchSubscription: Subscription | null = null;

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
    const searchId = this.startSearch(perguntaNormalizada);

    if (filters.categoria === 'pesquisadores') {
      this.loadResearchers(filters, searchId);
      return;
    }

    if (perguntaNormalizada.length < MIN_SEMANTIC_SEARCH_LENGTH) {
      const termo = perguntaNormalizada.length >= MIN_TEXTUAL_SEARCH_LENGTH ? perguntaNormalizada : undefined;
      this.loadProductions(termo, filters, searchId);
      return;
    }

    const request = this.http.post<BuscaSemanticaApiResponse>(
      `${this.apiBaseUrl}/busca/semantica`,
      this.buildSemanticPayload(perguntaNormalizada, filters),
    ).subscribe({
      next: response => {
        if (!this.isActiveSearch(searchId)) {
          return;
        }

        const results = response.resultados.map(result => this.mapSemanticResult(result));
        if (results.length === 0) {
          this.loadProductions(perguntaNormalizada, filters, searchId);
          return;
        }

        this.resultsSignal.set(results);
        this.totalSignal.set(results.length);
        this.loadingSignal.set(false);
      },
      error: () => {
        if (this.isActiveSearch(searchId)) {
          this.loadProductions(perguntaNormalizada, filters, searchId);
        }
      },
    });

    this.activeSearchSubscription = request;
  }

  loadLatestProductions(filters = this.buildFilters('')) {
    const searchId = this.startSearch(filters.pergunta.trim());
    this.loadProductions(undefined, filters, searchId);
  }

  loadPage(pagina: number, filters: SearchFilters) {
    const pergunta = filters.pergunta.trim();
    const searchId = this.startSearch(pergunta);
    if (filters.categoria === 'pesquisadores') {
      this.loadResearchers(filters, searchId, pagina);
      return;
    }

    const termo = pergunta.length >= MIN_TEXTUAL_SEARCH_LENGTH ? pergunta : undefined;
    this.loadProductions(termo, filters, searchId, pagina);
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

  getProductionTypes() {
    return this.http
      .get<ProducaoTiposApiResponse>(`${this.apiBaseUrl}/producoes/tipos`)
      .pipe(map(response => response.resultados));
  }

  getResearcherProfile(pesquisadorId: number) {
    return this.http.get<ResearcherProfile>(`${this.apiBaseUrl}/pesquisadores/${pesquisadorId}/producoes`);
  }

  getProduction(id: number) {
    return this.http.get<ProductionDetail>(`${this.apiBaseUrl}/producoes/${id}`);
  }

  perguntarAgente(pergunta: string) {
    return this.http.post<AgenteChatResponse>(`${this.apiBaseUrl}/busca/chat`, { pergunta });
  }

  private buildFilters(pergunta: string): SearchFilters {
    return {
      pergunta,
      areas: [],
      categoria: 'tudo',
    };
  }

  private startSearch(pergunta: string) {
    this.activeSearchSubscription?.unsubscribe();
    this.activeSearchId += 1;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.lastQuerySignal.set(pergunta);
    return this.activeSearchId;
  }

  private isActiveSearch(searchId: number) {
    return searchId === this.activeSearchId;
  }

  private loadProductions(termo?: string, filters = this.buildFilters(''), searchId = this.startSearch(filters.pergunta.trim()), pagina = 1) {
    let params = new HttpParams()
      .set('pagina', String(pagina))
      .set('tamanho_pagina', '20');

    if (termo) {
      params = params.set('termo', termo);
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

    if (filters.instituicaoId) {
      params = params.set('instituicao_id', String(filters.instituicaoId));
    }

    if (filters.qualisEstrato) {
      params = params.set('qualis_estrato', filters.qualisEstrato);
    }

    for (const area of filters.areas) {
      params = params.append('areas', String(area));
    }

    const request = this.http.get<ProducaoListApiResponse>(`${this.apiBaseUrl}/producoes/`, { params }).subscribe({
      next: response => {
        if (!this.isActiveSearch(searchId)) {
          return;
        }

        this.resultsSignal.set(response.resultados.map(result => this.mapProductionResult(result)));
        this.totalSignal.set(response.total);
        this.loadingSignal.set(false);
      },
      error: () => {
        if (!this.isActiveSearch(searchId)) {
          return;
        }

        this.resultsSignal.set([]);
        this.totalSignal.set(0);
        this.errorSignal.set('Nao foi possivel carregar as producoes.');
        this.loadingSignal.set(false);
      },
    });

    this.activeSearchSubscription = request;
  }

  private loadResearchers(filters: SearchFilters, searchId: number, pagina = 1) {
    let params = new HttpParams()
      .set('pagina', String(pagina))
      .set('tamanho_pagina', '20');

    if (filters.instituicaoId) {
      params = params.set('instituicao_id', String(filters.instituicaoId));
    }

    for (const area of filters.areas) {
      params = params.append('areas', String(area));
    }

    const request = this.http.get<PesquisadorListApiResponse>(`${this.apiBaseUrl}/pesquisadores/`, { params }).subscribe({
      next: response => {
        if (!this.isActiveSearch(searchId)) {
          return;
        }

        this.resultsSignal.set(response.resultados.map(result => this.mapResearcherResult(result)));
        this.totalSignal.set(response.total);
        this.loadingSignal.set(false);
      },
      error: () => {
        if (!this.isActiveSearch(searchId)) {
          return;
        }

        this.resultsSignal.set([]);
        this.totalSignal.set(0);
        this.errorSignal.set('Nao foi possivel carregar os pesquisadores.');
        this.loadingSignal.set(false);
      },
    });

    this.activeSearchSubscription = request;
  }

  private mapSemanticResult(result: BuscaSemanticaApiResult): SearchResult {
    return {
      id: String(result.id),
      title: result.titulo,
      author: result.pesquisador_nome,
      researcherId: result.pesquisador_id,
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
    const mapped: SearchResult = {
      id: String(result.id),
      title: result.titulo,
      author: result.pesquisador_nome,
      researcherId: result.pesquisador_id,
      year: result.ano,
      productionType: result.tipo_producao,
    };

    if (result.idioma) {
      mapped.language = result.idioma;
    }

    if (result.doi) {
      mapped.doi = result.doi;
    }

    if (result.revista || result.evento) {
      mapped.venue = result.revista || result.evento || undefined;
    }

    if (result.natureza) {
      mapped.natureza = result.natureza;
    }

    if (result.qualis_estrato) {
      mapped.qualisEstrato = result.qualis_estrato;
      mapped.tag = `Qualis ${result.qualis_estrato}`;
    }

    if (result.qualis_area_avaliacao) {
      mapped.qualisAreaAvaliacao = result.qualis_area_avaliacao;
    }

    return mapped;
  }

  private mapResearcherResult(result: ResearcherSummary): SearchResult {
    return {
      id: String(result.id),
      resourceType: 'researcher',
      title: result.nome,
      author: 'Pesquisador',
      researcherId: result.id,
      institution: result.instituicao_nome ?? undefined,
      abstract: result.resumo ?? undefined,
      tag: result.areas[0]?.sub_area ?? result.areas[0]?.area,
    };
  }

  private buildSemanticPayload(pergunta: string, filters: SearchFilters) {
    const payload: Record<string, string | number | number[]> = { pergunta };
    const tipoProducao = getProductionTypeFilter(filters);

    if (tipoProducao) {
      payload['tipo_producao'] = tipoProducao;
    }

    if (filters.ano !== undefined) {
      payload['ano'] = filters.ano;
    }

    if (filters.anoInicio !== undefined) {
      payload['ano_inicio'] = filters.anoInicio;
    }

    if (filters.anoFim !== undefined) {
      payload['ano_fim'] = filters.anoFim;
    }

    if (filters.instituicaoId !== undefined) {
      payload['instituicao_id'] = filters.instituicaoId;
    }

    if (filters.qualisEstrato) {
      payload['qualis_estrato'] = filters.qualisEstrato;
    }

    if (filters.areas.length > 0) {
      payload['areas'] = filters.areas;
    }

    return payload;
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
