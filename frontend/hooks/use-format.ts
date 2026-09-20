'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/sites/home/common/language-context';
import {
  formatDate as formatWithDate,
  formatRelativeDate as formatWithRelativeDate,
  formatCurrency as formatWithCurrency,
  formatCompactCurrency as formatWithCompactCurrency,
  formatCurrencyFromDecimal as formatWithCurrencyFromDecimal,
  formatPercentage,
} from '@/lib/format';
import {
  formatCompactNumber as formatWithCompactNumber,
  formatCompactEngagement as formatWithCompactEngagement,
  type NumberFormatOptions,
} from '@/lib/format-numbers';

/**
 * Hook providing locale-aware formatting utilities pre-bound to the active user language.
 */
export function useFormat() {
  const { language } = useLanguage();

  return useMemo(() => {
    return {
      language,
      formatDate: (date: Date | string, formatStr?: string) =>
        formatWithDate(date, formatStr, language),
      formatRelativeDate: (date: Date | string) =>
        formatWithRelativeDate(date, language),
      formatCurrency: (amount: number, currency?: string) =>
        formatWithCurrency(amount, currency, language),
      formatCompactCurrency: (amount: number, currency?: string) =>
        formatWithCompactCurrency(amount, currency, language),
      formatCurrencyFromDecimal: (decimal: any, currency?: string) =>
        formatWithCurrencyFromDecimal(decimal, currency, language),
      formatCompactNumber: (value: number, options?: NumberFormatOptions) =>
        formatWithCompactNumber(value, { locale: language, ...options }),
      formatCompactEngagement: (value: number, options?: NumberFormatOptions) =>
        formatWithCompactEngagement(value, { locale: language, ...options }),
      formatPercentage,
    };
  }, [language]);
}
