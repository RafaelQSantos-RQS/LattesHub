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
    path: 'producoes/:id',
    loadComponent: () => import('./pages/production-detail/production-detail').then(m => m.ProductionDetail)
  },
  {
    path: 'pesquisadores/:id',
    loadComponent: () => import('./pages/researcher-detail/researcher-detail').then(m => m.ResearcherDetail)
  },
  {
    path: 'indicadores',
    loadComponent: () => import('./pages/indicators/indicators').then(m => m.Indicators)
  },
  {
    path: 'agente',
    loadComponent: () => import('./pages/agente/agente').then(m => m.Agente)
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
