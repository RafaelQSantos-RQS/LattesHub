import { Component, OnInit, inject, signal } from '@angular/core';
import { SearchBox } from '../../shared/search-box/search-box';
import { StatsCard } from '../../shared/stats-card/stats-card';
import { IndicatorsService } from '../../services/indicators';

@Component({
  selector: 'app-home',
  imports: [SearchBox, StatsCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly indicatorsService = inject(IndicatorsService);

  totalProducoes = signal<string>('—');
  totalPesquisadores = signal<string>('—');
  totalInstituicoes = signal<string>('—');

  ngOnInit() {
    this.indicatorsService.getResumo().subscribe({
      next: (data) => {
        this.totalProducoes.set(this.formatStat(data.total_producoes));
        this.totalPesquisadores.set(this.formatStat(data.total_pesquisadores));
      },
      error: () => {},
    });

    this.indicatorsService.getFiltros().subscribe({
      next: (data) => {
        this.totalInstituicoes.set(this.formatStat(data.instituicoes.length));
      },
      error: () => {},
    });
  }

  private formatStat(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }
}
