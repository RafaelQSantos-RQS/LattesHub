import { DecimalPipe } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface SearchResult {
  id: string;
  resourceType?: 'production' | 'researcher';
  title: string;
  author: string;
  researcherId?: number;
  institution?: string;
  year?: number | null;
  language?: string | null;
  doi?: string | null;
  tag?: string;
  abstract?: string;
  venue?: string;
  natureza?: string;
  citations?: number;
  relevance?: 'Alta' | 'Media' | 'Baixa';
  highRelevance?: boolean;
  score?: number;
  productionType?: string;
  qualisEstrato?: string | null;
  qualisAreaAvaliacao?: string | null;
}

@Component({
  selector: 'app-result-card',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './result-card.html',
  styleUrl: './result-card.scss',
  host: { class: 'block' }
})
export class ResultCard {
  result = input.required<SearchResult>();
  readonly copiedField = signal<'cite' | 'share' | null>(null);

  cite() {
    const r = this.result();
    const text = `${r.author}. ${r.title}. ${r.year ?? 'S.d.'}.`;
    navigator.clipboard?.writeText(text).then(() => {
      this.copiedField.set('cite');
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }

  share() {
    const url = `${window.location.origin}${this.resultPath()}`;
    navigator.clipboard?.writeText(url).then(() => {
      this.copiedField.set('share');
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }

  resultLink() {
    return this.result().resourceType === 'researcher'
      ? ['/pesquisadores', this.result().id]
      : ['/producoes', this.result().id];
  }

  private resultPath() {
    return this.result().resourceType === 'researcher'
      ? `/pesquisadores/${this.result().id}`
      : `/producoes/${this.result().id}`;
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
    return map[this.result().qualisEstrato ?? ''] ?? 'bg-slate-200 text-slate-700';
  }
}
