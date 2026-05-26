import { Component, inject } from '@angular/core';
import { Sidebar } from '../../layout/sidebar/sidebar';
import { ResultCard } from '../../shared/result-card/result-card';
import { SearchService } from '../../services/search';

@Component({
  selector: 'app-results',
  imports: [Sidebar, ResultCard],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results {
  private searchService = inject(SearchService);
  results = this.searchService.getResults();
}
