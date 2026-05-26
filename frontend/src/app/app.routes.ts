import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home)
  },
  {
    path: 'explorar',
    loadComponent: () => import('./pages/results/results').then(m => m.Results)
  },
  {
    path: 'indicadores',
    loadComponent: () => import('./pages/indicators/indicators').then(m => m.Indicators)
  },
  {
    path: 'sobre',
    loadComponent: () => import('./pages/about/about').then(m => m.About)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
