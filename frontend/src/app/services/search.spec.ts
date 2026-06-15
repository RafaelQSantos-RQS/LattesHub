import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_BASE_URL, ProductionTypeOption, SearchService } from './search';

describe('API_BASE_URL', () => {
  it('uses a relative API path by default', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(API_BASE_URL)).toBe('/api/v1');
  });
});

describe('SearchService', () => {
  let service: SearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/api/v1' },
      ],
    });

    service = TestBed.inject(SearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads latest productions from the API when no semantic query is provided', () => {
    service.search('');

    const request = http.expectOne('http://api.test/api/v1/producoes/?pagina=1&tamanho_pagina=20');
    expect(request.request.method).toBe('GET');

    request.flush({
      total: 1,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [
        {
          id: 10,
          tipo_producao: 'ARTIGO PUBLICADO',
          titulo: 'Redes neurais aplicadas a saude',
          ano: 2024,
          idioma: 'pt',
          natureza: null,
          doi: '10.0000/teste',
          revista: 'Revista Brasileira de IA',
          evento: null,
          pesquisador_id: 7,
          pesquisador_nome: 'Ana Souza',
        },
      ],
    });

    expect(service.total()).toBe(1);
    expect(service.results()[0]).toEqual({
      id: '10',
      title: 'Redes neurais aplicadas a saude',
      author: 'Ana Souza',
      researcherId: 7,
      year: 2024,
      language: 'pt',
      doi: '10.0000/teste',
      productionType: 'ARTIGO PUBLICADO',
      venue: 'Revista Brasileira de IA',
    });
  });

  it('sends production filters to the listing endpoint when no semantic query is provided', () => {
    service.search({
      pergunta: '',
      tipoProducao: 'ARTIGO PUBLICADO',
      ano: 2025,
      anoInicio: 2020,
      anoFim: 2025,
      instituicaoId: 2,
      qualisEstrato: 'Sem Qualis',
      areas: [5, 35],
    });

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('pagina') === '1'
      && req.params.get('tamanho_pagina') === '20'
      && req.params.get('tipo_producao') === 'ARTIGO PUBLICADO'
      && req.params.get('ano') === '2025'
      && req.params.get('ano_inicio') === '2020'
      && req.params.get('ano_fim') === '2025'
      && req.params.get('instituicao_id') === '2'
      && req.params.get('qualis_estrato') === 'Sem Qualis'
      && (req.params.getAll('areas') ?? []).join(',') === '5,35'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      total: 0,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [],
    });

    expect(service.total()).toBe(0);
    expect(service.results()).toEqual([]);
  });

  it('uses textual production search for two-character queries', () => {
    service.search('ia');

    http.expectNone('http://api.test/api/v1/busca/semantica');

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('pagina') === '1'
      && req.params.get('tamanho_pagina') === '20'
      && req.params.get('termo') === 'ia'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      total: 1,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [
        {
          id: 11,
          tipo_producao: 'ARTIGO PUBLICADO',
          titulo: 'IA aplicada ao ensino',
          ano: 2024,
          idioma: 'pt',
          natureza: null,
          doi: null,
          revista: 'Revista de Educacao',
          evento: null,
          pesquisador_id: 6,
          pesquisador_nome: 'Lia Costa',
        },
      ],
    });

    expect(service.error()).toBeNull();
    expect(service.total()).toBe(1);
    expect(service.lastQuery()).toBe('ia');
    expect(service.results()[0].title).toBe('IA aplicada ao ensino');
  });

  it('uses textual production search for four-character queries', () => {
    service.search('uxci');

    http.expectNone('http://api.test/api/v1/busca/semantica');

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('termo') === 'uxci'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      total: 0,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [],
    });

    expect(service.error()).toBeNull();
    expect(service.total()).toBe(0);
    expect(service.lastQuery()).toBe('uxci');
  });

  it('does not send one-character queries as textual terms', () => {
    service.search('i');

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('pagina') === '1'
      && req.params.get('tamanho_pagina') === '20'
      && !req.params.has('termo')
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      total: 0,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [],
    });

    http.expectNone('http://api.test/api/v1/busca/semantica');
    expect(service.total()).toBe(0);
    expect(service.lastQuery()).toBe('i');
  });

  it('runs semantic search against the API for valid queries', () => {
    service.search({
      pergunta: 'inteligencia artificial na saude',
      tipoProducao: 'ARTIGO PUBLICADO',
      ano: 2023,
      instituicaoId: 1,
      qualisEstrato: 'A1',
      areas: [30],
    });

    const request = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      pergunta: 'inteligencia artificial na saude',
      tipo_producao: 'ARTIGO PUBLICADO',
      ano: 2023,
      instituicao_id: 1,
      qualis_estrato: 'A1',
      areas: [30],
    });

    request.flush({
      resultados: [
        {
          id: 20,
          titulo: 'IA clinica',
          tipo_producao: 'ARTIGO PUBLICADO',
          ano: 2023,
          pesquisador_id: 9,
          pesquisador_nome: 'Bruno Lima',
          score: 87.5,
          qualis_estrato: 'A1',
          qualis_area_avaliacao: 'Ciencia da Computacao',
          qualis_titulo: 'Revista A',
        },
      ],
    });

    expect(service.total()).toBe(1);
    expect(service.results()[0]).toEqual({
      id: '20',
      title: 'IA clinica',
      author: 'Bruno Lima',
      researcherId: 9,
      year: 2023,
      productionType: 'ARTIGO PUBLICADO',
      score: 87.5,
      relevance: 'Alta',
      highRelevance: true,
      qualisEstrato: 'A1',
      qualisAreaAvaliacao: 'Ciencia da Computacao',
      tag: 'Qualis A1',
    });
  });

  it('sends year ranges to semantic search', () => {
    service.search({
      pergunta: 'inteligencia artificial na saude',
      anoInicio: 2020,
      anoFim: 2024,
      areas: [],
    });

    const request = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      pergunta: 'inteligencia artificial na saude',
      ano_inicio: 2020,
      ano_fim: 2024,
    });

    request.flush({ resultados: [] });

    const fallbackRequest = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('termo') === 'inteligencia artificial na saude'
      && req.params.get('ano_inicio') === '2020'
      && req.params.get('ano_fim') === '2024'
    );
    fallbackRequest.flush({ total: 0, pagina: 1, tamanho_pagina: 20, resultados: [] });
  });

  it('uses category tabs as production type filters', () => {
    service.search({
      pergunta: '',
      categoria: 'eventos',
      areas: [],
    });

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('tipo_producao') === 'TRABALHO EM EVENTOS'
    );
    expect(request.request.method).toBe('GET');

    request.flush({ total: 0, pagina: 1, tamanho_pagina: 20, resultados: [] });
  });

  it('loads researchers for the researchers category', () => {
    service.search({
      pergunta: 'ana',
      categoria: 'pesquisadores',
      instituicaoId: 2,
      areas: [5],
    });

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/pesquisadores/'
      && req.params.get('pagina') === '1'
      && req.params.get('tamanho_pagina') === '20'
      && req.params.get('instituicao_id') === '2'
      && (req.params.getAll('areas') ?? []).join(',') === '5'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      total: 1,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [
        {
          id: 7,
          lattes_id: '123',
          nome: 'Ana Souza',
          resumo: 'Pesquisa dengue',
          instituicao_nome: 'UNEB',
          areas: [
            {
              id: 5,
              grande_area: 'Ciencias da Saude',
              area: 'Saude Coletiva',
              sub_area: 'Epidemiologia',
              especialidade: null,
            },
          ],
        },
      ],
    });

    expect(service.total()).toBe(1);
    expect(service.results()[0]).toEqual({
      id: '7',
      resourceType: 'researcher',
      title: 'Ana Souza',
      author: 'Researcher',
      researcherId: 7,
      institution: 'UNEB',
      abstract: 'Pesquisa dengue',
      tag: 'Epidemiologia',
    });
  });

  it('cancels older semantic searches when a newer search starts', () => {
    service.search('primeira busca longa');

    const firstRequest = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(firstRequest.request.body.pergunta).toBe('primeira busca longa');

    service.search('segunda busca longa');

    expect(firstRequest.cancelled).toBe(true);

    const secondRequest = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(secondRequest.request.body.pergunta).toBe('segunda busca longa');

    secondRequest.flush({
      resultados: [
        {
          id: 33,
          titulo: 'Resultado mais recente',
          tipo_producao: 'ARTIGO PUBLICADO',
          ano: 2024,
          pesquisador_id: 4,
          pesquisador_nome: 'Carla Rocha',
          score: 91,
          qualis_estrato: null,
          qualis_area_avaliacao: null,
          qualis_titulo: null,
        },
      ],
    });

    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
    expect(service.total()).toBe(1);
    expect(service.lastQuery()).toBe('segunda busca longa');
    expect(service.results()[0].title).toBe('Resultado mais recente');
  });

  it('falls back to textual production search when semantic search fails', () => {
    service.search({
      pergunta: 'dengue',
      tipoProducao: 'ARTIGO PUBLICADO',
      ano: 2025,
      instituicaoId: 2,
      qualisEstrato: 'A1',
      areas: [5],
    });

    const semanticRequest = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(semanticRequest.request.method).toBe('POST');
    semanticRequest.flush({ detail: 'Erro na busca semantica' }, { status: 500, statusText: 'Server Error' });

    const fallbackRequest = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('pagina') === '1'
      && req.params.get('tamanho_pagina') === '20'
      && req.params.get('termo') === 'dengue'
      && req.params.get('tipo_producao') === 'ARTIGO PUBLICADO'
      && req.params.get('ano') === '2025'
      && req.params.get('instituicao_id') === '2'
      && req.params.get('qualis_estrato') === 'A1'
      && (req.params.getAll('areas') ?? []).join(',') === '5'
    );
    expect(fallbackRequest.request.method).toBe('GET');

    fallbackRequest.flush({
      total: 1,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [
        {
          id: 228,
          tipo_producao: 'ARTIGO PUBLICADO',
          titulo: 'Unveiling connections: Mobility and dengue case networks on an intraurban scale',
          ano: 2025,
          idioma: 'Ingles',
          natureza: 'COMPLETO',
          doi: '10.1016/j.physd.2025.134812',
          revista: 'PHYSICA D-NONLINEAR PHENOMENA',
          evento: 'NAO SE APLICA',
          pesquisador_id: 2,
          pesquisador_nome: 'Hugo Saba Pereira Cardoso',
        },
      ],
    });

    expect(service.error()).toBeNull();
    expect(service.total()).toBe(1);
    expect(service.results()[0].title).toContain('dengue');
    expect(service.results()[0].researcherId).toBe(2);
  });

  it('cancels an older textual fallback when a newer search starts', () => {
    service.search('dengue');

    const semanticRequest = http.expectOne('http://api.test/api/v1/busca/semantica');
    semanticRequest.flush({ detail: 'Erro na busca semantica' }, { status: 500, statusText: 'Server Error' });

    const fallbackRequest = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('termo') === 'dengue'
    );

    service.search('malaria');

    expect(fallbackRequest.cancelled).toBe(true);

    const latestRequest = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(latestRequest.request.body.pergunta).toBe('malaria');

    latestRequest.flush({
      resultados: [
        {
          id: 44,
          titulo: 'Pesquisa sobre malaria',
          tipo_producao: 'ARTIGO PUBLICADO',
          ano: 2025,
          pesquisador_id: 8,
          pesquisador_nome: 'Diego Torres',
          score: 84,
          qualis_estrato: 'A2',
          qualis_area_avaliacao: 'Saude Coletiva',
          qualis_titulo: 'Revista B',
        },
      ],
    });

    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
    expect(service.total()).toBe(1);
    expect(service.lastQuery()).toBe('malaria');
    expect(service.results()[0].title).toBe('Pesquisa sobre malaria');
  });

  it('falls back to textual production search when semantic search returns no results', () => {
    service.search('dengue');

    const semanticRequest = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(semanticRequest.request.method).toBe('POST');
    semanticRequest.flush({ resultados: [] });

    const fallbackRequest = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('pagina') === '1'
      && req.params.get('tamanho_pagina') === '20'
      && req.params.get('termo') === 'dengue'
    );
    expect(fallbackRequest.request.method).toBe('GET');

    fallbackRequest.flush({
      total: 1,
      pagina: 1,
      tamanho_pagina: 20,
      resultados: [
        {
          id: 232,
          tipo_producao: 'ARTIGO PUBLICADO',
          titulo: 'Dengue prediction using local data',
          ano: 2024,
          idioma: 'Ingles',
          natureza: 'COMPLETO',
          doi: null,
          revista: 'Journal of Public Health',
          evento: null,
          pesquisador_id: 3,
          pesquisador_nome: 'Maria Silva',
        },
      ],
    });

    expect(service.error()).toBeNull();
    expect(service.total()).toBe(1);
    expect(service.results()[0].title).toContain('Dengue');
  });

  it('loadPage sends the correct page number to the productions endpoint', () => {
    service.loadPage(3, { pergunta: '', areas: [] });

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/producoes/'
      && req.params.get('pagina') === '3'
      && req.params.get('tamanho_pagina') === '20'
    );
    expect(request.request.method).toBe('GET');

    request.flush({ total: 60, pagina: 3, tamanho_pagina: 20, resultados: [] });

    expect(service.total()).toBe(60);
  });

  it('loads dynamic production types from the API', () => {
    let types: ProductionTypeOption[] = [];

    service.getProductionTypes().subscribe(response => {
      types = response;
    });

    const request = http.expectOne('http://api.test/api/v1/producoes/tipos');
    expect(request.request.method).toBe('GET');

    request.flush({
      resultados: [
        { tipo_producao: 'ARTIGO PUBLICADO', total: 10 },
        { tipo_producao: 'TRABALHO EM EVENTOS', total: 5 },
      ],
    });

    expect(types).toEqual([
      { tipo_producao: 'ARTIGO PUBLICADO', total: 10 },
      { tipo_producao: 'TRABALHO EM EVENTOS', total: 5 },
    ]);
  });

  it('loads a researcher profile with productions', () => {
    let profileName = '';

    service.getResearcherProfile(7).subscribe(profile => {
      profileName = profile.pesquisador.nome;
    });

    const request = http.expectOne('http://api.test/api/v1/pesquisadores/7/producoes');
    expect(request.request.method).toBe('GET');

    request.flush({
      pesquisador: {
        id: 7,
        lattes_id: '123',
        nome: 'Ana Souza',
        resumo: 'Resumo',
        instituicao_nome: 'UNEB',
        areas: [
          {
            id: 3,
            grande_area: 'Ciencias Exatas',
            area: 'Computacao',
            sub_area: 'Inteligencia Artificial',
            especialidade: null,
          },
        ],
      },
      producoes: [
        {
          id: 10,
          tipo_producao: 'ARTIGO PUBLICADO',
          titulo: 'Redes neurais aplicadas a saude',
          ano: 2024,
          revista: 'Revista Brasileira de IA',
          evento: null,
          natureza: null,
          doi: '10.0000/teste',
        },
      ],
    });

    expect(profileName).toBe('Ana Souza');
  });
});
