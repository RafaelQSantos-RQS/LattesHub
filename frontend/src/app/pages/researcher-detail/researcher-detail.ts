import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ResearcherArea,
  ResearcherProduction,
  ResearcherProfile,
  SearchService,
} from '../../services/search';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-researcher-detail',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './researcher-detail.html',
  styleUrl: './researcher-detail.scss',
})
export class ResearcherDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);
  private readonly i18n = inject(TranslationService);

  readonly profile = signal<ResearcherProfile | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly researcher = computed(() => this.profile()?.pesquisador ?? null);
  readonly productions = computed(() => this.profile()?.producoes ?? []);
  readonly latestYear = computed(() => {
    const years = this.productions()
      .map((production) => production.ano)
      .filter((year): year is number => year !== null);

    return years.length > 0 ? Math.max(...years) : null;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const pesquisadorId = Number(params.get('id'));

      if (!Number.isInteger(pesquisadorId) || pesquisadorId <= 0) {
        this.profile.set(null);
        this.loading.set(false);
        this.error.set(this.i18n.translate('researcher.invalido'));
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
    return (
      production.revista ||
      production.evento ||
      production.natureza ||
      this.i18n.translate('researcher.semVeiculo')
    );
  }

  private loadProfile(pesquisadorId: number) {
    this.loading.set(true);
    this.error.set(null);
    this.profile.set(null);

    this.searchService.getResearcherProfile(pesquisadorId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(
          error.status === 404
            ? this.i18n.translate('researcher.naoEncontrado')
            : this.i18n.translate('researcher.erroCarregar'),
        );
      },
    });
  }
}
