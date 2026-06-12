import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { Subject, switchMap, debounceTime, takeUntil } from 'rxjs';

import { ExportService } from '../../services/export';
import {
  IndicatorsService,
  IndicadoresResumo,
  IndicadoresFiltros,
  FiltroOpcoes,
} from '../../services/indicators';

interface ActiveChip {
  key: keyof IndicadoresFiltros;
  label: string;
  value?: string;
}

@Component({
  selector: 'app-indicators',
  imports: [],
  templateUrl: './indicators.html',
  styleUrl: './indicators.scss',
})
export class Indicators implements OnInit, OnDestroy {
  private readonly exportService = inject(ExportService);
  private readonly indicatorsService = inject(IndicatorsService);
  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new Subject<IndicadoresFiltros>();

  // ── Data state ──────────────────────────────────────────────────────────
  exportingCsv = signal(false);
  exportError = signal<string | null>(null);
  loading = signal(true);
  loadError = signal(false);
  resumo = signal<IndicadoresResumo | null>(null);

  // ── Filter options (sidebar dropdowns) ──────────────────────────────────
  filtroOpcoes = signal<FiltroOpcoes | null>(null);
  filtrosLoading = signal(true);

  // ── Active filter signals ────────────────────────────────────────────────
  anoInicio = signal<number | null>(null);
  anoFim = signal<number | null>(null);
  grandeArea = signal<string[]>([]);
  instituicao = signal<string[]>([]);
  tipoProducao = signal<string | null>(null);
  qualis = signal<string[]>([]);

  // ── Mobile sidebar ──────────────────────────────────────────────────────
  sidebarOpen = signal(false);

  // ── Derived: active filter chips ────────────────────────────────────────
  activeChips = computed<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    if (this.anoInicio() != null || this.anoFim() != null) {
      const from = this.anoInicio() ?? '—';
      const to = this.anoFim() ?? '—';
      chips.push({ key: 'anoInicio', label: `Ano: ${from}–${to}` });
    }
    for (const area of this.grandeArea()) {
      chips.push({ key: 'grandeArea', label: `Área: ${area}`, value: area });
    }
    for (const inst of this.instituicao()) {
      chips.push({ key: 'instituicao', label: `Inst.: ${inst}`, value: inst });
    }
    if (this.tipoProducao()) chips.push({ key: 'tipoProducao', label: `Tipo: ${this.tipoProducao()}` });
    for (const estrato of this.qualis()) {
      chips.push({ key: 'qualis', label: `Qualis: ${estrato}`, value: estrato });
    }
    return chips;
  });

  hasActiveFilters = computed(() => this.activeChips().length > 0);

  // ── Min/max years from options ───────────────────────────────────────────
  minAno = computed(() => {
    const anos = this.filtroOpcoes()?.anos ?? [];
    return anos.length ? anos[0] : 2000;
  });
  maxAno = computed(() => {
    const anos = this.filtroOpcoes()?.anos ?? [];
    return anos.length ? anos[anos.length - 1] : new Date().getFullYear();
  });

  ngOnInit() {
    this.indicatorsService.getFiltros().subscribe({
      next: (opts) => {
        this.filtroOpcoes.set(opts);
        this.filtrosLoading.set(false);
      },
      error: () => this.filtrosLoading.set(false),
    });

    // Debounced pipeline for filter-driven reloads (skips the first tick)
    this.reload$
      .pipe(
        debounceTime(150),
        switchMap((filtros) => {
          this.loading.set(true);
          this.loadError.set(false);
          return this.indicatorsService.getResumo(filtros);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (data) => {
          this.resumo.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });

    // Initial load executes immediately (no debounce)
    this.executeLoad({});
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Filter actions ───────────────────────────────────────────────────────

  private currentFiltros(): IndicadoresFiltros {
    const filtros: IndicadoresFiltros = {};
    if (this.anoInicio() != null) filtros.anoInicio = this.anoInicio()!;
    if (this.anoFim() != null) filtros.anoFim = this.anoFim()!;
    if (this.grandeArea().length) filtros.grandeArea = this.grandeArea();
    if (this.instituicao().length) filtros.instituicao = this.instituicao();
    if (this.tipoProducao()) filtros.tipoProducao = this.tipoProducao()!;
    if (this.qualis().length) filtros.qualis = this.qualis();
    return filtros;
  }

  private triggerReload() {
    this.reload$.next(this.currentFiltros());
  }

  private executeLoad(filtros: IndicadoresFiltros) {
    this.loading.set(true);
    this.loadError.set(false);
    this.indicatorsService.getResumo(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.resumo.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  setAnoInicio(value: string) {
    this.anoInicio.set(value ? +value : null);
    this.triggerReload();
  }

  setAnoFim(value: string) {
    this.anoFim.set(value ? +value : null);
    this.triggerReload();
  }

  setTipoProducao(value: string) {
    this.tipoProducao.set(value || null);
    this.triggerReload();
  }

  addGrandeArea(value: string) {
    const area = value.trim();
    if (!area || this.grandeArea().includes(area)) return;
    this.grandeArea.update((values) => [...values, area]);
    this.triggerReload();
  }

  removeGrandeArea(value: string) {
    const next = this.grandeArea().filter((area) => area !== value);
    if (next.length === this.grandeArea().length) return;
    this.grandeArea.set(next);
    this.triggerReload();
  }

  setGrandeArea(value: string) {
    this.addGrandeArea(value);
  }

  addInstituicao(value: string) {
    const instituicao = value.trim();
    if (!instituicao || this.instituicao().includes(instituicao)) return;
    this.instituicao.update((values) => [...values, instituicao]);
    this.triggerReload();
  }

  removeInstituicao(value: string) {
    const next = this.instituicao().filter((instituicao) => instituicao !== value);
    if (next.length === this.instituicao().length) return;
    this.instituicao.set(next);
    this.triggerReload();
  }

  setInstituicao(value: string) {
    this.addInstituicao(value);
  }

  addQualis(value: string) {
    const estrato = value.trim();
    if (!estrato || this.qualis().includes(estrato)) return;
    this.qualis.update((values) => [...values, estrato]);
    this.triggerReload();
  }

  removeQualis(value: string) {
    const next = this.qualis().filter((estrato) => estrato !== value);
    if (next.length === this.qualis().length) return;
    this.qualis.set(next);
    this.triggerReload();
  }

  setQualis(value: string) {
    this.addQualis(value);
  }

  /** Cross-filter: clicking a year bar toggles that single year. */
  toggleAno(ano: number) {
    if (this.anoInicio() === ano && this.anoFim() === ano) {
      this.anoInicio.set(null);
      this.anoFim.set(null);
    } else {
      this.anoInicio.set(ano);
      this.anoFim.set(ano);
    }
    this.triggerReload();
  }

  /** Cross-filter: clicking a tipo bar toggles that tipo. */
  toggleTipo(tipo: string) {
    this.tipoProducao.set(this.tipoProducao() === tipo ? null : tipo);
    this.triggerReload();
  }

  /** Cross-filter: clicking a Qualis bar toggles that estrato. */
  toggleQualis(estrato: string) {
    if (this.qualis().includes(estrato)) {
      this.removeQualis(estrato);
    } else {
      this.addQualis(estrato);
    }
  }

  /** Cross-filter: clicking a Top Área bar toggles that área. */
  toggleArea(area: string) {
    if (this.grandeArea().includes(area)) {
      this.removeGrandeArea(area);
    } else {
      this.addGrandeArea(area);
    }
  }

  /** Cross-filter: clicking a Top Inst bar toggles that instituição. */
  toggleInstituicao(nome: string) {
    if (this.instituicao().includes(nome)) {
      this.removeInstituicao(nome);
    } else {
      this.addInstituicao(nome);
    }
  }

  removeChip(chip: ActiveChip) {
    if (chip.key === 'anoInicio') {
      this.anoInicio.set(null);
      this.anoFim.set(null);
    } else if (chip.key === 'grandeArea') {
      if (chip.value) this.removeGrandeArea(chip.value);
      return;
    } else if (chip.key === 'instituicao') {
      if (chip.value) this.removeInstituicao(chip.value);
      return;
    } else if (chip.key === 'tipoProducao') {
      this.tipoProducao.set(null);
    } else if (chip.key === 'qualis') {
      if (chip.value) this.removeQualis(chip.value);
      return;
    }
    this.triggerReload();
  }

  clearAllFilters() {
    this.anoInicio.set(null);
    this.anoFim.set(null);
    this.grandeArea.set([]);
    this.instituicao.set([]);
    this.tipoProducao.set(null);
    this.qualis.set([]);
    this.triggerReload();
  }

  // ── Export ───────────────────────────────────────────────────────────────

  exportCsv() {
    if (this.exportingCsv()) return;
    this.exportingCsv.set(true);
    this.exportError.set(null);
    this.exportService
      .downloadProductionsCsv(undefined, 'latteshub_producoes_indicadores.csv')
      .subscribe({
        next: () => this.exportingCsv.set(false),
        error: () => {
          this.exportingCsv.set(false);
          this.exportError.set('Nao foi possivel exportar o CSV.');
        },
      });
  }

  // ── Chart helpers ────────────────────────────────────────────────────────

  get mediaProducoes(): string {
    const r = this.resumo();
    if (!r || r.total_pesquisadores === 0) return '—';
    return (r.total_producoes / r.total_pesquisadores).toFixed(1);
  }

  get chartMax(): number {
    const data = this.resumo()?.producoes_por_ano ?? [];
    return data.length ? Math.max(...data.map((p) => p.total)) : 1;
  }

  chartBarHeightPct(total: number): string {
    return `${Math.round((total / this.chartMax) * 100)}%`;
  }

  isAnoActive(ano: number): boolean {
    return this.anoInicio() === ano && this.anoFim() === ano;
  }

  get topAreasMax(): number {
    const data = this.resumo()?.top_areas ?? [];
    return data.length ? Math.max(...data.map((a) => a.total)) : 1;
  }

  areaBarWidthPct(total: number): string {
    return `${Math.round((total / this.topAreasMax) * 100)}%`;
  }

  get porTipoMax(): number {
    const data = this.resumo()?.por_tipo ?? [];
    return data.length ? Math.max(...data.map((t) => t.total)) : 1;
  }

  tipoBarWidthPct(total: number): string {
    return `${Math.round((total / this.porTipoMax) * 100)}%`;
  }

  get qualisMax(): number {
    const data = this.resumo()?.qualis_distribuicao ?? [];
    return data.length ? Math.max(...data.map((q) => q.total)) : 1;
  }

  qualisBarHeightPct(total: number): string {
    return `${Math.round((total / this.qualisMax) * 100)}%`;
  }

  qualisColor(estrato: string): string {
    const map: Record<string, string> = {
      A1: '#065f46', A2: '#059669', A3: '#34d399', A4: '#6ee7b7',
      B1: '#1e3a8a', B2: '#2563eb', B3: '#60a5fa', B4: '#93c5fd',
      C: '#d97706',
    };
    return map[estrato] ?? '#cbd5e1';
  }

  get topInstMax(): number {
    const data = this.resumo()?.top_instituicoes ?? [];
    return data.length ? Math.max(...data.map((i) => i.total)) : 1;
  }

  instBarWidthPct(total: number): string {
    return `${Math.round((total / this.topInstMax) * 100)}%`;
  }

  formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  shouldShowYearLabel(index: number, total: number): boolean {
    if (total <= 12) return true;
    const step = Math.ceil(total / 12);
    return index === 0 || index === total - 1 || index % step === 0;
  }
}
