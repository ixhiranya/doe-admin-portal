import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tiny i18n store. Used by useT() to pick translations and by App.tsx to set
// `dir` + `lang` on the document root.

export type Locale = 'en' | 'ar';

interface LocaleStore {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

export const useLocale = create<LocaleStore>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (l) => set({ locale: l }),
      toggle: () => set({ locale: get().locale === 'en' ? 'ar' : 'en' }),
    }),
    { name: 'doe.pps.locale' },
  ),
);

export const isRtl = (l: Locale) => l === 'ar';
