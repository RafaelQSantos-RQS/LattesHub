import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

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
    search: () => undefined,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Results],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
          },
        },
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
});
