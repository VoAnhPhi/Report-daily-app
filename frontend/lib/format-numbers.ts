/**
 * Utility functions for formatting numbers in a compact, responsive way
 */

import type { SupportedLocale } from '@/constants/languages';

export interface NumberFormatOptions {
  /** Maximum number of decimal places */
  maxDecimals?: number;
  /** Whether to show decimal places for whole numbers */
  showDecimals?: boolean;
  /** Custom suffix for currency */
  currencySuffix?: string;
  /** Locale for number formatting ('vi' or 'en', defaults to 'vi') */
  locale?: SupportedLocale | string;
  /** Deprecated: Whether to use Vietnamese locale formatting. Kept for backward compatibility. */
  useVietnameseLocale?: boolean;
}

/**
 * Formats large numbers in a compact way (e.g., 1.2M, 1.5B)
 */
export function formatCompactNumber(
  value: number,
  options: NumberFormatOptions = {},
): string {
  const {
    maxDecimals = 1,
    showDecimals = false,
    currencySuffix = '',
    locale,
    useVietnameseLocale = true,
  } = options;

  if (value === 0) return '0' + currencySuffix;

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const effectiveLocale = locale ?? (useVietnameseLocale ? 'vi' : 'en');
  const intlLocale = effectiveLocale === 'en' ? 'en-US' : 'vi-VN';

  // Compact abbreviation for >= 1000
  if (absValue >= 1e9) {
    const formatted = (absValue / 1e9).toFixed(
      absValue % 1e9 === 0 && !showDecimals ? 0 : maxDecimals,
    );
    return sign + formatted.replace(/\.0+$/, '') + 'B' + currencySuffix;
  }
  if (absValue >= 1e6) {
    const formatted = (absValue / 1e6).toFixed(
      absValue % 1e6 === 0 && !showDecimals ? 0 : maxDecimals,
    );
    return sign + formatted.replace(/\.0+$/, '') + 'M' + currencySuffix;
  }
  if (absValue >= 1e3) {
    const formatted = (absValue / 1e3).toFixed(
      absValue % 1e3 === 0 && !showDecimals ? 0 : maxDecimals,
    );
    return sign + formatted.replace(/\.0+$/, '') + 'K' + currencySuffix;
  }

  // For numbers less than 1000, use regular formatting with locale
  return sign + absValue.toLocaleString(intlLocale) + currencySuffix;
}

/**
 * Formats currency values with compact notation
 */
export function formatCompactCurrency(
  value: number,
  options: Omit<NumberFormatOptions, 'currencySuffix'> = {},
): string {
  return formatCompactNumber(value, {
    ...options,
    locale: options.locale ?? 'vi',
  });
}

/**
 * Formats engagement values (orders, referrals, posts) with compact notation
 */
export function formatCompactEngagement(
  value: number,
  options: NumberFormatOptions = {},
): string {
  return formatCompactNumber(value, {
    ...options,
    locale: options.locale ?? 'en', // Standard international compact format for engagement
  });
}

/**
 * Gets responsive font size class based on number length
 */
export function getResponsiveNumberClass(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1e9) return 'text-xs'; // 1B+
  if (absValue >= 1e6) return 'text-sm'; // 1M+
  if (absValue >= 1e3) return 'text-sm'; // 1K+
  return 'text-base'; // < 1K
}

/**
 * Gets responsive container width class based on number length
 */
export function getResponsiveContainerClass(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1e9) return 'min-w-[3rem]'; // 1B+
  if (absValue >= 1e6) return 'min-w-[2.5rem]'; // 1M+
  if (absValue >= 1e3) return 'min-w-[2rem]'; // 1K+
  return 'min-w-[1.5rem]'; // < 1K
}
