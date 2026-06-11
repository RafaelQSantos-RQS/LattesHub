import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Results } from './results';
import { SearchService } from '../../services/search';

describe('Results', () => {
  let component: Results;
  let fixture: ComponentFixture<Results>;
  const searchServiceStub = {
    results: () => [],
    loading: () => false,
    error: () => null,
    total: () => 0,
    lastQuery: () => '',
    search: vi.fn(),
    loadPage: vi.fn(),
    getInstitutions: () => of([]),
    getAreaOptions: () => of([]),
    getProductionTypes: () => of([]),
  };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    searchServiceStub.search.mockReset();
    searchServiceStub.loadPage.mockReset();
    router.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [Results],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: router },
        { provide: SearchService, useValue: searchServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Results);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('changes category through query params and clears explicit production type', () => {
    component.changeCategory('eventos');

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        categoria: 'eventos',
        tipo_producao: null,
      },
      queryParamsHandling: 'merge',
    });
  });
});
