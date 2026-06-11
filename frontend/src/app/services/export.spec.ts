import { HttpHeaders } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from './search';
import { ExportService } from './export';

describe('ExportService', () => {
  let service: ExportService;
  let http: HttpTestingController;
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;
  let clickAnchor: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectUrl = vi.fn(() => 'blob:csv');
    revokeObjectUrl = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
    clickAnchor = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/api/v1' },
      ],
    });

    service = TestBed.inject(ExportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    clickAnchor.mockRestore();
    http.verify();
  });

  it('downloads productions CSV with filters', () => {
    service.downloadProductionsCsv({
      pergunta: 'aprendizagem',
      categoria: 'artigos',
      anoInicio: 2020,
      anoFim: 2024,
      instituicaoId: 3,
      areas: [5, 8],
    }).subscribe();

    const request = http.expectOne(req =>
      req.url === 'http://api.test/api/v1/exportacoes/producoes.csv'
      && req.params.get('termo') === 'aprendizagem'
      && req.params.get('tipo_producao') === 'ARTIGO PUBLICADO'
      && req.params.get('ano_inicio') === '2020'
      && req.params.get('ano_fim') === '2024'
      && req.params.get('instituicao_id') === '3'
      && (req.params.getAll('areas') ?? []).join(',') === '5,8'
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');

    request.flush(new Blob(['a,b\n1,2'], { type: 'text/csv' }), {
      headers: new HttpHeaders({
        'content-disposition': 'attachment; filename="latteshub_producoes.csv"',
      }),
    });

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(clickAnchor).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:csv');
  });
});
