import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { AppProviders } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Report Daily App',
  description: 'Công việc và báo cáo hằng ngày',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#f57c00',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>
            {children}
            <Toaster position='top-right' richColors />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
