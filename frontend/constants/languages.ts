/**
 * Single Source of Truth cho cấu hình ngôn ngữ của ACTA.
 * Đồng bộ với `messages/` (next-intl) và các Language Switcher.
 */

export const SUPPORTED_LOCALES = ['vi', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type Language = SupportedLocale;

export const DEFAULT_LOCALE: Language = 'vi';

export const LANGUAGE_NAMES: Record<Language, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
} as const;

export const LANGUAGE_META: Record<
  Language,
  { label: string; code: Language; flagUrl?: string }
> = {
  vi: {
    label: 'Tiếng Việt',
    code: 'vi',
    flagUrl: 'https://tuyendung.topcv.vn/images/flags/thumbnails/vi.jpg',
  },
  en: {
    label: 'English',
    code: 'en',
    flagUrl: 'https://tuyendung.topcv.vn/images/flags/thumbnails/en.jpg',
  },
};
