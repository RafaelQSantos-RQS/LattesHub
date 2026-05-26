import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-box',
  imports: [],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  isFocused = signal(false);
  private router = inject(Router);

  onSearch() {
    this.router.navigate(['/explorar']);
  }
}
