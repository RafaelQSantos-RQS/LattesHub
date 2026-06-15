import { Injectable, signal } from '@angular/core';
import { translations, SupportedLang, TranslationMap } from './translations';

const STORAGE_KEY = 'latteshub_lang';
const DEFAULT_LANG: SupportedLang = 'pt-BR';

function detectInitialLang(): SupportedLang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'pt-BR' || stored === 'en-US') {
    return stored;
  }
  const browser = navigator.language?.slice(0, 2);
  if (browser === 'en') return 'en-US';
  return DEFAULT_LANG;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly currentLang = signal<SupportedLang>(detectInitialLang());
  readonly lang = this.currentLang.asReadonly();

  constructor() {
    this.applyLang(this.currentLang());
  }

  setLanguage(lang: SupportedLang) {
    this.currentLang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.applyLang(lang);
  }

  toggleLanguage() {
    const next: SupportedLang = this.currentLang() === 'pt-BR' ? 'en-US' : 'pt-BR';
    this.setLanguage(next);
  }

  translate(key: string): string {
    const keys = key.split('.');
    let value: TranslationMap | string | undefined = translations[this.currentLang()];

    for (const k of keys) {
      if (value == null || typeof value !== 'object') {
        return key;
      }
      value = (value as Record<string, unknown>)[k] as TranslationMap | string | undefined;
    }

    return typeof value === 'string' ? value : key;
  }

  private applyLang(lang: SupportedLang) {
    document.documentElement.lang = lang;
  }
}
