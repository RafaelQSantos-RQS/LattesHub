import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Indicators } from './indicators';

describe('Indicators', () => {
  let component: Indicators;
  let fixture: ComponentFixture<Indicators>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Indicators],
    }).compileComponents();

    fixture = TestBed.createComponent(Indicators);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
