import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Indicators } from './indicators';
import { ExportService } from '../../services/export';
import { IndicatorsService, IndicadoresResumo } from '../../services/indicators';

const MOCK_RESUMO: IndicadoresResumo = {
  total_producoes: 150,
  total_pesquisadores: 10,
  producoes_por_ano: [
    { ano: 2022, total: 40 },
    { ano: 2023, total: 60 },
    { ano: 2024, total: 50 },
  ],
  top_areas: [
    { area: 'Ciências Exatas', total: 80 },
    { area: 'Engenharias', total: 50 },
  ],
};

describe('Indicators', () => {
  let component: Indicators;
  let fixture: ComponentFixture<Indicators>;

  const exportServiceStub = {
    downloadProductionsCsv: vi.fn(() => of(undefined)),
  };

  const indicatorsServiceStub = {
    getResumo: vi.fn(() => of(MOCK_RESUMO)),
  };

  beforeEach(async () => {
    exportServiceStub.downloadProductionsCsv.mockReset();
    exportServiceStub.downloadProductionsCsv.mockReturnValue(of(undefined));
    indicatorsServiceStub.getResumo.mockReset();
    indicatorsServiceStub.getResumo.mockReturnValue(of(MOCK_RESUMO));

    await TestBed.configureTestingModule({
      imports: [Indicators],
      providers: [
        { provide: ExportService, useValue: exportServiceStub },
        { provide: IndicatorsService, useValue: indicatorsServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Indicators);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads resumo on init and clears loading state', () => {
    expect(component.loading()).toBe(false);
    expect(component.loadError()).toBe(false);
    expect(component.resumo()).toEqual(MOCK_RESUMO);
  });

  it('sets loadError on fetch failure', async () => {
    indicatorsServiceStub.getResumo.mockReturnValue(
      throwError(() => new Error('network error')),
    );

    fixture = TestBed.createComponent(Indicators);
    component = fixture.componentInstance;
    await fixture.whenStable();

    expect(component.loadError()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(component.resumo()).toBeNull();
  });

  it('computes mediaProducoes as productions / researchers', () => {
    expect(component.mediaProducoes).toBe('15.0');
  });

  it('returns em dash for mediaProducoes when no researchers', () => {
    component.resumo.set({ ...MOCK_RESUMO, total_pesquisadores: 0 });
    expect(component.mediaProducoes).toBe('—');
  });

  it('computes chartBarHeightPct relative to max year total', () => {
    expect(component.chartBarHeightPct(60)).toBe('100%');
    expect(component.chartBarHeightPct(30)).toBe('50%');
  });

  it('computes areaBarWidthPct relative to top area total', () => {
    expect(component.areaBarWidthPct(80)).toBe('100%');
    expect(component.areaBarWidthPct(40)).toBe('50%');
  });

  it('formats counts with k/M suffixes', () => {
    expect(component.formatCount(500)).toBe('500');
    expect(component.formatCount(1500)).toBe('1.5k');
    expect(component.formatCount(2_000_000)).toBe('2.0M');
  });

  it('exports the productions CSV', () => {
    component.exportCsv();

    expect(exportServiceStub.downloadProductionsCsv).toHaveBeenCalledWith(
      undefined,
      'latteshub_producoes_indicadores.csv',
    );
    expect(component.exportError()).toBeNull();
    expect(component.exportingCsv()).toBe(false);
  });

  it('shows an export error when download fails', () => {
    exportServiceStub.downloadProductionsCsv.mockReturnValue(
      throwError(() => new Error('download failed')),
    );

    component.exportCsv();

    expect(component.exportingCsv()).toBe(false);
    expect(component.exportError()).toBe('Nao foi possivel exportar o CSV.');
  });
});
