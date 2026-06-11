import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Sidebar } from '../../layout/sidebar/sidebar';
import { ResultCard } from '../../shared/result-card/result-card';
import { ExportService } from '../../services/export';
import { SearchCategory, SearchFilters, SearchService } from '../../services/search';

@Component({
  selector: 'app-results',
  imports: [Sidebar, ResultCard],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results {
  private searchService = inject(SearchService);
  private exportService = inject(ExportService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  results = this.searchService.results;
  loading = this.searchService.loading;
  error = this.searchService.error;
  total = this.searchService.total;
  lastQuery = this.searchService.lastQuery;

  readonly pageSize = 20;
  currentPage = signal(1);
  activeCategory = signal<SearchCategory>('tudo');
  exportingCsv = signal(false);
  exportError = signal<string | null>(null);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  pageNumbers = computed(() => this.buildPageNumbers(this.currentPage(), this.totalPages()));
  readonly categoryTabs: { label: string; value: SearchCategory }[] = [
    { label: 'Tudo', value: 'tudo' },
    { label: 'Pesquisadores', value: 'pesquisadores' },
    { label: 'Artigos', value: 'artigos' },
    { label: 'Eventos', value: 'eventos' },
  ];

  private lastFilters: SearchFilters = { pergunta: '', areas: [] };

  resultSummary = computed(() => {
    if (this.loading()) {
      return 'Carregando resultados';
    }

    const total = this.total();
    const query = this.lastQuery();
    const label = total === 1 ? 'resultado encontrado' : 'resultados encontrados';

    return query ? `${total} ${label} para "${query}"` : `${total} ${label}`;
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        this.currentPage.set(1);
        this.lastFilters = this.buildFilters(params);
        this.activeCategory.set(this.lastFilters.categoria ?? 'tudo');
        this.searchService.search(this.lastFilters);
      });
  }

  changeCategory(category: SearchCategory) {
    if (category === this.activeCategory()) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoria: category === 'tudo' ? null : category,
        tipo_producao: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.searchService.loadPage(page, this.lastFilters);
  }

  exportCsv() {
    if (this.exportingCsv()) {
      return;
    }

    this.exportingCsv.set(true);
    this.exportError.set(null);
    this.exportService.downloadProductionsCsv(
      this.lastFilters,
      'latteshub_producoes_resultados.csv',
    ).subscribe({
      next: () => this.exportingCsv.set(false),
      error: () => {
        this.exportingCsv.set(false);
        this.exportError.set('Nao foi possivel exportar os dados.');
      },
    });
  }

  private buildPageNumbers(current: number, total: number): (number | null)[] {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | null)[] = [1];

    if (current > 3) {
      pages.push(null);
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }

    if (current < total - 2) {
      pages.push(null);
    }

    pages.push(total);
    return pages;
  }

  private buildFilters(params: ParamMap): SearchFilters {
    return {
      pergunta: params.get('q') ?? '',
      tipoProducao: params.get('tipo_producao') ?? undefined,
      ano: this.toNumber(params.get('ano')),
      anoInicio: this.toNumber(params.get('ano_inicio')),
      anoFim: this.toNumber(params.get('ano_fim')),
      instituicaoId: this.toNumber(params.get('instituicao_id')),
      areas: params.getAll('areas').map(Number).filter(Number.isFinite),
      categoria: this.toCategory(params.get('categoria')),
    };
  }

  private toCategory(value: string | null): SearchCategory {
    return this.categoryTabs.some(tab => tab.value === value)
      ? value as SearchCategory
      : 'tudo';
  }

  private toNumber(value: string | null) {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
