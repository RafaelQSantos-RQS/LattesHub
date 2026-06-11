import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Sidebar } from '../../layout/sidebar/sidebar';
import { ProductionDetail as ProductionDetailData, SearchService } from '../../services/search';

@Component({
  selector: 'app-production-detail',
  imports: [Sidebar, RouterLink],
  templateUrl: './production-detail.html',
  styleUrl: './production-detail.scss',
})
export class ProductionDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);

  readonly production = signal<ProductionDetailData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly venue = computed(() => {
    const p = this.production();
    return p?.revista || p?.evento || null;
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        const id = Number(params.get('id'));
        if (!Number.isInteger(id) || id <= 0) {
          this.production.set(null);
          this.loading.set(false);
          this.error.set('Producao invalida.');
          return;
        }
        this.loadProduction(id);
      });
  }

  goBack() {
    if (((window.history.state as { navigationId?: number })?.navigationId ?? 0) > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/explorar']);
    }
  }

  private loadProduction(id: number) {
    this.loading.set(true);
    this.error.set(null);
    this.production.set(null);

    this.searchService.getProduction(id).subscribe({
      next: production => {
        this.production.set(production);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.status === 404 ? 'Producao nao encontrada.' : 'Nao foi possivel carregar a producao.');
      },
    });
  }
}
