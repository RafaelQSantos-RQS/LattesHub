import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ResultCard } from './result-card';

describe('ResultCard', () => {
  let component: ResultCard;
  let fixture: ComponentFixture<ResultCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultCard);
    fixture.componentRef.setInput('result', {
      id: '1',
      title: 'Resultado de teste',
      author: 'Pesquisador Teste',
      researcherId: 2,
      year: 2024,
      productionType: 'ARTIGO PUBLICADO',
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
