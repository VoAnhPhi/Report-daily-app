'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import { FestiveThemeProvider } from '@/components/providers/festive-theme-context';
import { LanguageProvider } from '@/components/sites/home/common/language-context';
import { UserProfileModalProvider } from '@/hooks/use-user-profile-modal';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <AuthProvider>
            <NextThemesProvider attribute='class' defaultTheme='system' enableSystem>
              <FestiveThemeProvider>
                <UserProfileModalProvider>
                  <LanguageProvider>{children}</LanguageProvider>
                </UserProfileModalProvider>
              </FestiveThemeProvider>
            </NextThemesProvider>
          </AuthProvider>
        </SessionProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
