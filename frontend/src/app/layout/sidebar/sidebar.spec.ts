import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Sidebar } from './sidebar';
import { SearchService } from '../../services/search';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  const router = {
    navigate: vi.fn(),
  };
  const route = {
    queryParamMap: of(convertToParamMap({
      instituicao_id: '2',
      tipo_producao: 'ARTIGO PUBLICADO',
      ano: '2025',
      areas: ['5'],
    })),
  };
  const searchService = {
    getInstitutions: () => of([
      {
        id: 2,
        nome: 'FUNDAÇÃO OSWALDO CRUZ',
        cidade: 'SALVADOR',
        estado: 'BA',
        pais: 'BRASIL',
      },
    ]),
    getAreaOptions: () => of([
      {
        id: 5,
        label: 'EPIDEMIOLOGIA',
        group: 'CIENCIAS DA SAUDE / SAÚDE COLETIVA',
      },
    ]),
  };

  beforeEach(async () => {
    router.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: SearchService, useValue: searchService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads active filters and filter options', () => {
    expect(component.institutions().length).toBe(1);
    expect(component.areaOptions().length).toBe(1);
    expect(component.selectedInstitutionId()).toBe(2);
    expect(component.selectedType()).toBe('ARTIGO PUBLICADO');
    expect(component.selectedYear()).toBe(2025);
    expect(component.selectedAreas()).toEqual([5]);
  });

  it('updates area query params when an area is toggled', () => {
    component.onAreaToggle(35, true);

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { areas: [5, 35] },
      queryParamsHandling: 'merge',
    });
  });
});
