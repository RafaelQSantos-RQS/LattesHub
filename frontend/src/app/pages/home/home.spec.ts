import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Home } from './home';
import { API_BASE_URL } from '../../services/search';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/api/v1' },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    // ngOnInit triggers HTTP calls — flush them to prevent unhandled errors
    const resumoReq = httpMock.expectOne('http://api.test/api/v1/indicadores/resumo');
    resumoReq.flush({
      total_producoes: 0,
      total_pesquisadores: 0,
      producoes_por_ano: [],
      top_areas: [],
      por_tipo: [],
      qualis_distribuicao: [],
      top_instituicoes: [],
    });

    const filtrosReq = httpMock.expectOne('http://api.test/api/v1/indicadores/filtros');
    filtrosReq.flush({
      grandes_areas: [],
      instituicoes: [],
      tipos_producao: [],
      anos: [],
    });

    expect(component).toBeTruthy();
  });
});
