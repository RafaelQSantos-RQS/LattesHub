import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { SearchBox } from './search-box';

describe('SearchBox', () => {
  let component: SearchBox;
  let fixture: ComponentFixture<SearchBox>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    router = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SearchBox],
      providers: [
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('blocks empty and one-character searches', () => {
    component.query.set('i');

    component.onSearch();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates with two-character searches', () => {
    component.query.set('ia');

    component.onSearch();

    expect(router.navigate).toHaveBeenCalledWith(['/explorar'], { queryParams: { q: 'ia' } });
  });

  it('navigates with four-character searches', () => {
    component.query.set('uxci');

    component.onSearch();

    expect(router.navigate).toHaveBeenCalledWith(['/explorar'], { queryParams: { q: 'uxci' } });
  });

  it('navigates with five-character searches', () => {
    component.query.set('dados');

    component.onSearch();

    expect(router.navigate).toHaveBeenCalledWith(['/explorar'], { queryParams: { q: 'dados' } });
  });

  it('enables the search button from two characters', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    component.query.set('i');
    fixture.detectChanges();
    expect(button.disabled).toBe(true);

    component.query.set('ia');
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });
});
