'use client';

import type React from 'react';
import { createContext, useContext, useTransition, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { Language } from '@/constants/languages';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, values?: Record<string, string | number | boolean | null | undefined>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as Language;
  const tHook = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLanguage = useCallback(
    (lang: Language) => {
      startTransition(() => {
        document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
        router.refresh();
      });
    },
    [router],
  );

  const t = useCallback(
    (key: string, values?: Record<string, string | number | boolean | null | undefined>): string => {
      return values ? tHook(key as never, values as never) : tHook(key as never);
    },
    [tHook],
  );

  return (
    <LanguageContext.Provider value={{ language: locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useOptionalLanguage() {
  return useContext(LanguageContext);
}

