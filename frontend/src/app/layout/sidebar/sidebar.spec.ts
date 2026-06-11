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
});

describe('Sidebar — filter load states', () => {
  const router = { navigate: vi.fn() };
  const route = { queryParamMap: of(convertToParamMap({})) };

  async function createWith(serviceOverrides: Partial<{ getInstitutions: () => unknown; getAreaOptions: () => unknown }>) {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: SearchService, useValue: { getInstitutions: () => of([]), getAreaOptions: () => of([]), ...serviceOverrides } },
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
