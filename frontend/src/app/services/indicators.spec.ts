import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_BASE_URL } from './search';
import { IndicatorsService } from './indicators';

describe('IndicatorsService', () => {
  let service: IndicatorsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/api/v1' },
      ],
    });

    service = TestBed.inject(IndicatorsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('sends multi-select filters as repeated query params', () => {
    service.getResumo({
      anoInicio: 2020,
      anoFim: 2024,
      grandeArea: ['Ciências Exatas', 'Engenharias'],
      instituicao: ['UFBA', 'UFRJ'],
      tipoProducao: 'ARTIGO PUBLICADO',
      qualis: ['A1', 'Sem Qualis'],
    }).subscribe();

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/indicadores/resumo'
      && req.params.get('ano_inicio') === '2020'
      && req.params.get('ano_fim') === '2024'
      && (req.params.getAll('grande_area') ?? []).join(',') === 'Ciências Exatas,Engenharias'
      && (req.params.getAll('instituicao') ?? []).join(',') === 'UFBA,UFRJ'
      && req.params.get('tipo_producao') === 'ARTIGO PUBLICADO'
      && (req.params.getAll('qualis') ?? []).join(',') === 'A1,Sem Qualis'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      total_producoes: 0,
      total_pesquisadores: 0,
      producoes_por_ano: [],
      top_areas: [],
      por_tipo: [],
      qualis_distribuicao: [],
      top_instituicoes: [],
    });
  });
});
