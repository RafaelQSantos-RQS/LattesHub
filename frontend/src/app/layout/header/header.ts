import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly i18n = inject(TranslationService);

  readonly langs = [
    { code: 'pt-BR' as const, flag: '🇧🇷', key: 'language.pt' },
    { code: 'en-US' as const, flag: '🇺🇸', key: 'language.en' },
  ];

  mobileMenuOpen = signal(false);
  langMenuOpen = signal(false);
  currentLang = this.i18n.lang;

  setLanguage(code: 'pt-BR' | 'en-US') {
    this.i18n.setLanguage(code);
    this.langMenuOpen.set(false);
  }

  toggleLangMenu() {
    this.langMenuOpen.update((v) => !v);
  }

  closeLangMenu() {
    this.langMenuOpen.set(false);
  }
}
