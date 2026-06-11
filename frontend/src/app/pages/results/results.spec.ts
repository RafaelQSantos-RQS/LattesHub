import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Results } from './results';
import { ExportService } from '../../services/export';
import { SearchService } from '../../services/search';

describe('Results', () => {
  let component: Results;
  let fixture: ComponentFixture<Results>;
  const searchServiceStub = {
    results: () => [],
    loading: () => false,
    error: () => null,
    total: () => 0,
    lastQuery: () => '',
    search: vi.fn(),
    loadPage: vi.fn(),
    getInstitutions: () => of([]),
    getAreaOptions: () => of([]),
    getProductionTypes: () => of([]),
  };
  const exportServiceStub = {
    downloadProductionsCsv: vi.fn(() => of(undefined)),
  };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    searchServiceStub.search.mockReset();
    searchServiceStub.loadPage.mockReset();
    exportServiceStub.downloadProductionsCsv.mockReset();
    exportServiceStub.downloadProductionsCsv.mockReturnValue(of(undefined));
    router.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [Results],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: router },
        { provide: SearchService, useValue: searchServiceStub },
        { provide: ExportService, useValue: exportServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Results);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('changes category through query params and clears explicit production type', () => {
    component.changeCategory('eventos');

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        categoria: 'eventos',
        tipo_producao: null,
      },
      queryParamsHandling: 'merge',
    });
  });

  it('exports current result filters as CSV', () => {
    component.exportCsv();

    expect(exportServiceStub.downloadProductionsCsv).toHaveBeenCalledWith(
      expect.objectContaining({ pergunta: '', areas: [] }),
      'latteshub_producoes_resultados.csv',
    );
    expect(component.exportError()).toBeNull();
    expect(component.exportingCsv()).toBe(false);
  });

  it('shows an export error when CSV download fails', () => {
    exportServiceStub.downloadProductionsCsv.mockReturnValue(
      throwError(() => new Error('download failed')),
    );

    component.exportCsv();

    expect(component.exportingCsv()).toBe(false);
    expect(component.exportError()).toBe('Nao foi possivel exportar os dados.');
  });
});
