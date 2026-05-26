import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stats-card',
  imports: [],
  templateUrl: './stats-card.html',
  styleUrl: './stats-card.scss',
})
export class StatsCard {
  icon = input.required<string>();
  title = input.required<string>();
  value = input.required<string>();
  description = input.required<string>();
}
