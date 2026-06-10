import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Sidebar } from '../../layout/sidebar/sidebar';
import { ResultCard } from '../../shared/result-card/result-card';
import { SearchService } from '../../services/search';

@Component({
  selector: 'app-results',
  imports: [Sidebar, ResultCard],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results {
  private searchService = inject(SearchService);
  private route = inject(ActivatedRoute);

  results = this.searchService.results;
  loading = this.searchService.loading;
  error = this.searchService.error;
  total = this.searchService.total;
  lastQuery = this.searchService.lastQuery;

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
      .subscribe(params => this.searchService.search(this.buildFilters(params)));
  }

  private buildFilters(params: ParamMap) {
    return {
      pergunta: params.get('q') ?? '',
      tipoProducao: params.get('tipo_producao') ?? undefined,
      ano: this.toNumber(params.get('ano')),
      instituicaoId: this.toNumber(params.get('instituicao_id')),
      areas: params.getAll('areas').map(Number).filter(Number.isFinite),
    };
  }

  private toNumber(value: string | null) {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
