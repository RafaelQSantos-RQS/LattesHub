import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
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
}
