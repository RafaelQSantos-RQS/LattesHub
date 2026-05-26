import { Injectable, signal } from '@angular/core';
import { SearchResult } from '../shared/result-card/result-card';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private mockResults: SearchResult[] = [
    {
      id: '1',
      title: 'Architecting Resilient Data Pipelines for Global Open Science: A Systematic Review',
      author: 'Smith, J.',
      institution: 'Massachusetts Institute of Technology (MIT)',
      year: 2023,
      language: 'Português',
      doi: '10.1038/nature.2023.456',
      tag: 'Big Data',
      abstract: 'This research investigates the integration of international research profiles with global open data repositories, focusing on the interoperability and provenance of scientific data within the global ecosystem...',
      citations: 24,
      relevance: 'Alta',
      highRelevance: true
    },
    {
      id: '2',
      title: 'Deep Learning Frameworks for Multi-Omics Data Integration',
      author: 'Tanaka, Y.',
      institution: 'Oxford University',
      year: 2022,
      language: 'Inglês',
      doi: '10.1016/j.cell.2022.123',
      abstract: 'Analysis of heterogeneous biological datasets using generative adversarial networks to predict phenotypic outcomes in complex chronic diseases...',
      citations: 112,
      relevance: 'Alta'
    },
    {
      id: '3',
      title: 'Open Source Research Tools for Academic Transparency',
      author: 'Garcia, M.',
      institution: 'Stanford University',
      year: 2024,
      language: 'Português',
      doi: '10.1126/science.2024.001',
      abstract: 'New frameworks for scientific evidence management and reproducibility in large-scale international studies within the global public sector...',
      citations: 4,
      relevance: 'Média'
    }
  ];

  private resultsSignal = signal<SearchResult[]>(this.mockResults);

  getResults() {
    return this.resultsSignal.asReadonly();
  }
}
