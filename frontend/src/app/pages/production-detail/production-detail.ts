import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductionDetail as ProductionDetailData, SearchService } from '../../services/search';

@Component({
  selector: 'app-production-detail',
  imports: [RouterLink],
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
    if (!p) return null;
    const v = p.revista || p.evento || null;
    return v === 'NÃO INFORMADO' ? null : v;
  });

  readonly keywords = computed(() => {
    const pk = this.production()?.palavras_chave;
    if (!pk) return [];
    return pk.split(';').map(k => k.trim()).filter(Boolean);
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

  qualisBadgeClass(): string {
    const map: Record<string, string> = {
      'A1': 'bg-green-700 text-white',
      'A2': 'bg-green-600 text-white',
      'A3': 'bg-green-500 text-white',
      'A4': 'bg-green-400 text-green-950',
      'B1': 'bg-yellow-400 text-yellow-950',
      'B2': 'bg-amber-500 text-white',
      'B3': 'bg-orange-500 text-white',
      'B4': 'bg-orange-400 text-orange-950',
      'C':  'bg-red-600 text-white',
    };
    return map[this.production()?.qualis_estrato ?? ''] ?? 'bg-slate-200 text-slate-700';
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
