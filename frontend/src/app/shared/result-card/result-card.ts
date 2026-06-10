import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';

export interface SearchResult {
  id: string;
  title: string;
  author: string;
  institution?: string;
  year?: number | null;
  language?: string | null;
  doi?: string | null;
  tag?: string;
  abstract?: string;
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
  imports: [DecimalPipe],
  templateUrl: './result-card.html',
  styleUrl: './result-card.scss',
  host: { class: 'block' }
})
export class ResultCard {
  result = input.required<SearchResult>();
}
