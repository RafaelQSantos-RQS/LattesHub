import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Indicators } from './indicators';
import { ExportService } from '../../services/export';
import {
  IndicatorsService,
  IndicadoresResumo,
  FiltroOpcoes,
} from '../../services/indicators';

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
  por_tipo: [
    { tipo: 'ARTIGO PUBLICADO', total: 100 },
    { tipo: 'TRABALHO EM EVENTOS', total: 50 },
  ],
  qualis_distribuicao: [
    { estrato: 'A1', total: 20 },
    { estrato: 'B1', total: 40 },
    { estrato: 'Sem Qualis', total: 90 },
  ],
  top_instituicoes: [
    { instituicao: 'UFBA', total: 120 },
    { instituicao: 'UFRJ', total: 30 },
  ],
};

const MOCK_FILTROS: FiltroOpcoes = {
  grandes_areas: ['Ciências Exatas', 'Engenharias'],
  instituicoes: ['UFBA', 'UFRJ'],
  tipos_producao: ['ARTIGO PUBLICADO', 'TRABALHO EM EVENTOS'],
  anos: [2020, 2021, 2022, 2023, 2024],
};

describe('Indicators', () => {
  let component: Indicators;
  let fixture: ComponentFixture<Indicators>;

  const exportServiceStub = {
    downloadProductionsCsv: vi.fn(() => of(undefined)),
  };

  const indicatorsServiceStub = {
    getResumo: vi.fn(() => of(MOCK_RESUMO)),
    getFiltros: vi.fn(() => of(MOCK_FILTROS)),
  };

  beforeEach(async () => {
    exportServiceStub.downloadProductionsCsv.mockReset();
    exportServiceStub.downloadProductionsCsv.mockReturnValue(of(undefined));
    indicatorsServiceStub.getResumo.mockReset();
    indicatorsServiceStub.getResumo.mockReturnValue(of(MOCK_RESUMO));
    indicatorsServiceStub.getFiltros.mockReset();
    indicatorsServiceStub.getFiltros.mockReturnValue(of(MOCK_FILTROS));

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

  it('loads filtro options on init', () => {
    expect(component.filtroOpcoes()).toEqual(MOCK_FILTROS);
    expect(component.filtrosLoading()).toBe(false);
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

  it('computes tipoBarWidthPct relative to max type total', () => {
    expect(component.tipoBarWidthPct(100)).toBe('100%');
    expect(component.tipoBarWidthPct(50)).toBe('50%');
  });

  it('computes qualisBarHeightPct relative to max qualis total', () => {
    expect(component.qualisBarHeightPct(90)).toBe('100%');
    expect(component.qualisBarHeightPct(45)).toBe('50%');
  });

  it('qualisColor returns correct color for known strata and fallback for unknown', () => {
    expect(component.qualisColor('A1')).toBe('#065f46');
    expect(component.qualisColor('B1')).toBe('#1e3a8a');
    expect(component.qualisColor('C')).toBe('#d97706');
    expect(component.qualisColor('Sem Qualis')).toBe('#cbd5e1');
  });

  it('computes instBarWidthPct relative to max institution total', () => {
    expect(component.instBarWidthPct(120)).toBe('100%');
    expect(component.instBarWidthPct(60)).toBe('50%');
  });

  it('shortYear returns last 2 digits zero-padded', () => {
    expect(component.shortYear(1999)).toBe('99');
    expect(component.shortYear(2000)).toBe('00');
    expect(component.shortYear(2024)).toBe('24');
    expect(component.shortYear(2005)).toBe('05');
  });

  // ── Cross-filter toggles ────────────────────────────────────────────────

  it('toggleAno sets year range filter; second click clears it', () => {
    component.toggleAno(2023);
    expect(component.anoInicio()).toBe(2023);
    expect(component.anoFim()).toBe(2023);
    expect(component.isAnoActive(2023)).toBe(true);

    component.toggleAno(2023);
    expect(component.anoInicio()).toBeNull();
    expect(component.anoFim()).toBeNull();
  });

  it('toggleTipo sets/clears tipo filter', () => {
    component.toggleTipo('ARTIGO PUBLICADO');
    expect(component.tipoProducao()).toBe('ARTIGO PUBLICADO');
    component.toggleTipo('ARTIGO PUBLICADO');
    expect(component.tipoProducao()).toBeNull();
  });

  it('toggleQualis sets/clears qualis filter', () => {
    component.toggleQualis('A1');
    expect(component.qualis()).toBe('A1');
    component.toggleQualis('A1');
    expect(component.qualis()).toBeNull();
  });

  it('toggleArea sets/clears grandeArea filter', () => {
    component.toggleArea('Engenharias');
    expect(component.grandeArea()).toBe('Engenharias');
    component.toggleArea('Engenharias');
    expect(component.grandeArea()).toBeNull();
  });

  it('toggleInstituicao sets/clears instituicao filter', () => {
    component.toggleInstituicao('UFBA');
    expect(component.instituicao()).toBe('UFBA');
    component.toggleInstituicao('UFBA');
    expect(component.instituicao()).toBeNull();
  });

  it('activeChips reflects active filters', () => {
    expect(component.activeChips()).toHaveLength(0);
    component.toggleTipo('ARTIGO PUBLICADO');
    component.toggleQualis('B1');
    expect(component.activeChips()).toHaveLength(2);
    expect(component.hasActiveFilters()).toBe(true);
  });

  it('clearAllFilters resets all filter signals', () => {
    component.toggleTipo('ARTIGO PUBLICADO');
    component.toggleQualis('A1');
    component.clearAllFilters();
    expect(component.tipoProducao()).toBeNull();
    expect(component.qualis()).toBeNull();
    expect(component.hasActiveFilters()).toBe(false);
  });

  it('removeChip clears the matching filter', () => {
    component.toggleTipo('ARTIGO PUBLICADO');
    const chip = component.activeChips().find(c => c.key === 'tipoProducao')!;
    component.removeChip(chip);
    expect(component.tipoProducao()).toBeNull();
  });

  it('minAno and maxAno derive from filtroOpcoes', () => {
    expect(component.minAno()).toBe(2020);
    expect(component.maxAno()).toBe(2024);
  });

  // ── Export ──────────────────────────────────────────────────────────────

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
