import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-box',
  imports: [],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  readonly minSearchLength = 2;
  isFocused = signal(false);
  query = signal('');
  private router = inject(Router);

  onQueryInput(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
  }

  onSearch() {
    const query = this.query().trim();

    if (query.length < this.minSearchLength) {
      return;
    }

    this.router.navigate(['/explorar'], { queryParams: { q: query } });
  }
}
