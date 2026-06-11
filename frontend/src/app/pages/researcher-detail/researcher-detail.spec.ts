import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';

import { ResearcherDetail } from './researcher-detail';
import { SearchService } from '../../services/search';

describe('ResearcherDetail', () => {
  let component: ResearcherDetail;
  let fixture: ComponentFixture<ResearcherDetail>;

  const searchServiceStub = {
    getInstitutions: () => of([]),
    getAreaOptions: () => of([]),
    getProductionTypes: () => of([]),
    getResearcherProfile: () => of({
      pesquisador: {
        id: 7,
        lattes_id: '123',
        nome: 'Ana Souza',
        resumo: 'Resumo do pesquisador',
        instituicao_nome: 'UNEB',
        areas: [
          {
            id: 3,
            grande_area: 'Ciencias Exatas',
            area: 'Computacao',
            sub_area: 'Inteligencia Artificial',
            especialidade: null,
          },
        ],
      },
      producoes: [
        {
          id: 10,
          tipo_producao: 'ARTIGO PUBLICADO',
          titulo: 'Redes neurais aplicadas a saude',
          ano: 2024,
          revista: 'Revista Brasileira de IA',
          evento: null,
          natureza: null,
          doi: '10.0000/teste',
        },
      ],
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResearcherDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '7' })),
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: Router, useValue: { navigate: () => undefined } },
        { provide: Location, useValue: { back: () => undefined } },
        { provide: SearchService, useValue: searchServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResearcherDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders researcher data from the service', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Ana Souza');
    expect(compiled.textContent).toContain('UNEB');
    expect(compiled.textContent).toContain('Redes neurais aplicadas a saude');
  });

  it('goBack navigates to /explorar when there is no in-app navigation history', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    vi.spyOn(window.history, 'state', 'get').mockReturnValue({ navigationId: 1 });

    component.goBack();

    expect(navigateSpy).toHaveBeenCalledWith(['/explorar']);
  });

  it('goBack calls location.back when in-app navigation exists', () => {
    const location = TestBed.inject(Location);
    const backSpy = vi.spyOn(location, 'back').mockImplementation(() => undefined);
    vi.spyOn(window.history, 'state', 'get').mockReturnValue({ navigationId: 3 });

    component.goBack();

    expect(backSpy).toHaveBeenCalled();
  });
});
