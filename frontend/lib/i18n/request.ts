import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from '@/constants/languages';

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get('NEXT_LOCALE')?.value;
  const locale = SUPPORTED_LOCALES.includes(cookieLocale as SupportedLocale)
    ? (cookieLocale as SupportedLocale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}/index.json`)).default,
  };
});
