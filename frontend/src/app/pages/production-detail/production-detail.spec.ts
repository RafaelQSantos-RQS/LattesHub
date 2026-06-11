import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';

import { ProductionDetail } from './production-detail';
import { SearchService } from '../../services/search';

describe('ProductionDetail', () => {
  let component: ProductionDetail;
  let fixture: ComponentFixture<ProductionDetail>;

  const searchServiceStub = {
    getInstitutions: () => of([]),
    getAreaOptions: () => of([]),
    getProduction: () => of({
      id: 10,
      tipo_producao: 'ARTIGO PUBLICADO',
      titulo: 'Redes neurais aplicadas a saude',
      ano: 2024,
      idioma: 'Portugues',
      natureza: null,
      doi: '10.0000/teste',
      revista: 'Revista Brasileira de IA',
      evento: null,
      issn: '1234-5678',
      pesquisador_id: 7,
      pesquisador_nome: 'Ana Souza',
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '10' })),
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: Location, useValue: { back: vi.fn() } },
        { provide: SearchService, useValue: searchServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders production data from the service', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Redes neurais aplicadas a saude');
    expect(compiled.textContent).toContain('Ana Souza');
    expect(compiled.textContent).toContain('Revista Brasileira de IA');
  });

  it('goBack navigates to /explorar when there is no in-app navigation history', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(window.history, 'state', 'get').mockReturnValue({ navigationId: 1 });

    component.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/explorar']);
  });
});
