import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsCard } from './stats-card';

describe('StatsCard', () => {
  let component: StatsCard;
  let fixture: ComponentFixture<StatsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsCard);
    fixture.componentRef.setInput('icon', 'dataset');
    fixture.componentRef.setInput('title', 'Total');
    fixture.componentRef.setInput('value', '10');
    fixture.componentRef.setInput('description', 'Descricao do indicador');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
