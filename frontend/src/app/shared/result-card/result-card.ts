import { Component, input } from '@angular/core';

export interface SearchResult {
  id: string;
  title: string;
  author: string;
  institution: string;
  year: number;
  language: string;
  doi: string;
  tag?: string;
  abstract: string;
  citations: number;
  relevance: 'Alta' | 'Média' | 'Baixa';
  highRelevance?: boolean;
}

@Component({
  selector: 'app-result-card',
  imports: [],
  templateUrl: './result-card.html',
  styleUrl: './result-card.scss',
  host: { class: 'block' }
})
export class ResultCard {
  result = input.required<SearchResult>();
}
