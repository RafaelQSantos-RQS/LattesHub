import { DecimalPipe } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface SearchResult {
  id: string;
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
    const url = `${window.location.origin}/producoes/${this.result().id}`;
    navigator.clipboard?.writeText(url).then(() => {
      this.copiedField.set('share');
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }
}
