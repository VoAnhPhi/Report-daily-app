import { format, formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import type { SupportedLocale } from '@/constants/languages';

function dateFnsLocale(locale: SupportedLocale | string) {
  return locale === 'en' ? enUS : vi;
}

export function formatDate(
  date: Date | string,
  formatStr: string = 'dd/MM/yyyy HH:mm',
  locale: SupportedLocale | string = 'vi',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: dateFnsLocale(locale) });
}

export function formatRelativeDate(
  date: Date | string,
  locale: SupportedLocale | string = 'vi',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: dateFnsLocale(locale),
  });
}

export function formatCurrency(
  amount: number,
  currency: string = 'VND',
  locale: SupportedLocale | string = 'vi',
): string {
  const intlLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number,
  currency: string = 'VND',
  locale: SupportedLocale | string = 'vi',
): string {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}${locale === 'en' ? 'B' : ' tỷ'} ${currency}`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}${locale === 'en' ? 'M' : ' triệu'} ${currency}`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}${locale === 'en' ? 'K' : ' nghìn'} ${currency}`;
  }
  return `${amount} ${currency}`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Parse Prisma Decimal format to number
 * Prisma Decimal has format: { s: number, e: number, d: number[] }
 */
export function parseDecimal(decimal: any): number {
  if (typeof decimal === 'number') {
    return decimal;
  }

  if (typeof decimal === 'string') {
    return parseFloat(decimal);
  }

  if (
    decimal &&
    typeof decimal === 'object' &&
    decimal.s !== undefined &&
    decimal.e !== undefined &&
    Array.isArray(decimal.d)
  ) {
    // Prisma Decimal format: { s: sign, e: exponent, d: digits }
    const { s, e, d } = decimal;
    if (d.length === 0) return 0;

    // Convert digits array to string
    let digits = d.join('');

    // Handle exponent
    if (e < 0) {
      // Add decimal point
      const pointPos = digits.length + e;
      if (pointPos <= 0) {
        digits = '0.' + '0'.repeat(-pointPos) + digits;
      } else {
        digits = digits.slice(0, pointPos) + '.' + digits.slice(pointPos);
      }
    }

    // Apply sign
    const result = parseFloat(digits);
    return s === -1 ? -result : result;
  }

  return 0;
}

/**
 * Format currency from Prisma Decimal format
 */
export function formatCurrencyFromDecimal(
  decimal: any,
  currency: string = 'VND',
  locale: SupportedLocale | string = 'vi',
): string {
  const amount = parseDecimal(decimal);
  return formatCurrency(amount, currency, locale);
}
