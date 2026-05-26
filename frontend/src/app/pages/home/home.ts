import { Component } from '@angular/core';
import { SearchBox } from '../../shared/search-box/search-box';
import { StatsCard } from '../../shared/stats-card/stats-card';

@Component({
  selector: 'app-home',
  imports: [SearchBox, StatsCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
