import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
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
      ano_inicio: '2020',
      ano_fim: '2025',
      areas: ['5'],
      qualis_estrato: 'A1',
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
      {
        id: 3,
        nome: 'UNEB',
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
    getProductionTypes: () => of([
      {
        tipo_producao: 'ARTIGO PUBLICADO',
        total: 12,
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
    expect(component.institutions().length).toBe(2);
    expect(component.areaOptions().length).toBe(1);
    expect(component.productionTypes().length).toBe(1);
    expect(component.selectedInstitutionId()).toBe(2);
    expect(component.selectedType()).toBe('ARTIGO PUBLICADO');
    expect(component.selectedYear()).toBe(2025);
    expect(component.selectedYearStart()).toBe(2020);
    expect(component.selectedYearEnd()).toBe(2025);
    expect(component.selectedAreas()).toEqual([5]);
    expect(component.selectedQualis()).toBe('A1');
    expect(component.selectedInstitutionName()).toContain('OSWALDO CRUZ');
  });

  it('sets institutionsState to success when institutions load', () => {
    expect(component.institutionsState()).toBe('success');
  });

  it('sets areasState to success when areas load', () => {
    expect(component.areasState()).toBe('success');
  });

  it('updates area query params when an area is toggled', () => {
    component.onAreaToggle(35, true);

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { areas: [5, 35] },
      queryParamsHandling: 'merge',
    });
  });

  it('filters institution options from typed text', () => {
    component.openInstitutionDropdown();
    component.onInstitutionSearch({ target: { value: 'uneb' } } as unknown as Event);

    expect(component.filteredInstitutions().map(institution => institution.nome)).toEqual(['UNEB']);
  });

  it('selects an institution and closes the dropdown', () => {
    component.openInstitutionDropdown();
    component.selectInstitution(component.institutions()[1]);

    expect(component.showInstDropdown()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { instituicao_id: '3' },
      queryParamsHandling: 'merge',
    });
  });

  it('filters and selects Qualis options', () => {
    component.openQualisDropdown();
    component.onQualisSearch({ target: { value: 'sem' } } as unknown as Event);

    expect(component.filteredQualis()).toEqual(['Sem Qualis']);

    component.selectQualis('Sem Qualis');

    expect(component.showQualisDropdown()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { qualis_estrato: 'Sem Qualis' },
      queryParamsHandling: 'merge',
    });
  });

  it('closes combobox dropdowns on outside click', () => {
    component.openInstitutionDropdown();
    component.openQualisDropdown();

    component.closeDropdownsOnOutsideClick({ target: document.body } as unknown as MouseEvent);

    expect(component.showInstDropdown()).toBe(false);
    expect(component.showQualisDropdown()).toBe(false);
  });

  it('updates year range query params and clears exact year', () => {
    component.onYearStartInput({ target: { value: '2021' } } as unknown as Event);
    component.onYearEndInput({ target: { value: '2024' } } as unknown as Event);

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { ano_inicio: '2021', ano: null },
      queryParamsHandling: 'merge',
    });
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { ano_fim: '2024', ano: null },
      queryParamsHandling: 'merge',
    });
  });

  it('clears Qualis with the other filters', () => {
    component.clearFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: {
        instituicao_id: null,
        tipo_producao: null,
        ano: null,
        ano_inicio: null,
        ano_fim: null,
        areas: null,
        qualis_estrato: null,
      },
      queryParamsHandling: 'merge',
    });
  });
});

describe('Sidebar — filter load states', () => {
  const router = { navigate: vi.fn() };
  const route = { queryParamMap: of(convertToParamMap({})) };

  async function createWith(serviceOverrides: Partial<{ getInstitutions: () => unknown; getAreaOptions: () => unknown; getProductionTypes: () => unknown }>) {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: SearchService, useValue: { getInstitutions: () => of([]), getAreaOptions: () => of([]), getProductionTypes: () => of([]), ...serviceOverrides } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(Sidebar);
    await f.whenStable();
    return f.componentInstance;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('sets institutionsState to empty when institutions list is empty', async () => {
    const c = await createWith({});
    expect(c.institutionsState()).toBe('empty');
  });

  it('sets institutionsState to error when institutions request fails', async () => {
    const c = await createWith({ getInstitutions: () => throwError(() => new Error('fail')) });
    expect(c.institutionsState()).toBe('error');
  });

  it('sets areasState to error when areas request fails', async () => {
    const c = await createWith({ getAreaOptions: () => throwError(() => new Error('fail')) });
    expect(c.areasState()).toBe('error');
  });
});
