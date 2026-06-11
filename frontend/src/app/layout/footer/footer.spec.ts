import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not render placeholder links', () => {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('a'),
    );

    expect(links.length).toBeGreaterThan(0);
    expect(links.some(link => link.getAttribute('href') === '#')).toBe(false);
  });

  it('opens the GitHub link in a new tab safely', () => {
    const element = fixture.nativeElement as HTMLElement;
    const githubLink = element.querySelector<HTMLAnchorElement>(
      'a[href="https://github.com/RafaelQSantos-RQS/LattesHub"]',
    );

    expect(githubLink).not.toBeNull();
    expect(githubLink?.target).toBe('_blank');
    expect(githubLink?.rel).toContain('noopener');
    expect(githubLink?.rel).toContain('noreferrer');
  });
});
