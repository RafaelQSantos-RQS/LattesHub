import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_BASE_URL, SearchService } from './search';

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
      year: 2024,
      language: 'pt',
      doi: '10.0000/teste',
      productionType: 'ARTIGO PUBLICADO',
      abstract: 'Revista Brasileira de IA',
    });
  });

  it('runs semantic search against the API for valid queries', () => {
    service.search('inteligencia artificial na saude');

    const request = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ pergunta: 'inteligencia artificial na saude' });

    request.flush({
      resultados: [
        {
          id: 20,
          titulo: 'IA clinica',
          tipo_producao: 'ARTIGO PUBLICADO',
          ano: 2023,
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

  it('falls back to textual production search when semantic search fails', () => {
    service.search('dengue');

    const semanticRequest = http.expectOne('http://api.test/api/v1/busca/semantica');
    expect(semanticRequest.request.method).toBe('POST');
    semanticRequest.flush({ detail: 'Erro na busca semantica' }, { status: 500, statusText: 'Server Error' });

    const fallbackRequest = http.expectOne('http://api.test/api/v1/producoes/?pagina=1&tamanho_pagina=20&termo=dengue');
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
  });
});
