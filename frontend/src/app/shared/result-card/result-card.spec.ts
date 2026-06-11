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

  it('title links to /producoes/:id', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('h3 a') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('/producoes/1');
  });

  describe('cite', () => {
    it('copies citation text to clipboard and sets copiedField', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextMock }, configurable: true });

      component.cite();
      await Promise.resolve();

      expect(writeTextMock).toHaveBeenCalledWith('Pesquisador Teste. Resultado de teste. 2024.');
      expect(component.copiedField()).toBe('cite');
    });
  });

  describe('share', () => {
    it('copies production URL to clipboard and sets copiedField', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextMock }, configurable: true });

      component.share();
      await Promise.resolve();

      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/producoes/1'));
      expect(component.copiedField()).toBe('share');
    });
  });
});
