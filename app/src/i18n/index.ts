import { useEffect } from 'react';
import { useLocale } from '../store/locale';
import { translations, type TKey } from './translations';

// useT() returns a translation function. Missing keys fall back to English,
// then to the raw key, so we never crash if a string isn't translated yet.
export function useT() {
  const locale = useLocale((s) => s.locale);
  return (key: TKey, params?: Record<string, string | number>): string => {
    let val = translations[locale][key] ?? translations.en[key] ?? (key as unknown as string);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return val;
  };
}

// Keeps <html lang> and <html dir> in sync with the active locale. Mount once
// at the top of the app.
export function useDocumentDirection() {
  const locale = useLocale((s) => s.locale);
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
}
