import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResearcherArea, ResearcherProduction, ResearcherProfile, SearchService } from '../../services/search';

@Component({
  selector: 'app-researcher-detail',
  imports: [RouterLink],
  templateUrl: './researcher-detail.html',
  styleUrl: './researcher-detail.scss',
})
export class ResearcherDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);

  readonly profile = signal<ResearcherProfile | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly researcher = computed(() => this.profile()?.pesquisador ?? null);
  readonly productions = computed(() => this.profile()?.producoes ?? []);
  readonly latestYear = computed(() => {
    const years = this.productions()
      .map(production => production.ano)
      .filter((year): year is number => year !== null);

    return years.length > 0 ? Math.max(...years) : null;
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        const pesquisadorId = Number(params.get('id'));

        if (!Number.isInteger(pesquisadorId) || pesquisadorId <= 0) {
          this.profile.set(null);
          this.loading.set(false);
          this.error.set('Pesquisador invalido.');
          return;
        }

        this.loadProfile(pesquisadorId);
      });
  }

  goBack() {
    if (((window.history.state as { navigationId?: number })?.navigationId ?? 0) > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/explorar']);
    }
  }

  areaLabel(area: ResearcherArea) {
    return [area.grande_area, area.area, area.sub_area, area.especialidade]
      .filter(Boolean)
      .join(' / ');
  }

  productionSource(production: ResearcherProduction) {
    return production.revista || production.evento || production.natureza || 'Sem veiculo informado';
  }

  private loadProfile(pesquisadorId: number) {
    this.loading.set(true);
    this.error.set(null);
    this.profile.set(null);

    this.searchService.getResearcherProfile(pesquisadorId).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(error.status === 404 ? 'Pesquisador nao encontrado.' : 'Nao foi possivel carregar o pesquisador.');
      },
    });
  }
}
