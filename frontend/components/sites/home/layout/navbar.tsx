'use client';

import { FeatureGate } from '@/components/feature-gate';
import { useFestiveTheme } from '@/components/providers/festive-theme-context';
import EcommerceCTAButton from '@/components/sites/e-commerce/shared/EcommerceCTAButton';
import NotificationDropdownV2 from '@/components/sites/home/notifications/notification-dropdown-v2';
import NotificationSheet from '@/components/sites/home/notifications/notification-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTrainingUnviewedTodayCount } from '@/hooks/queries/use-training-videos';
import { useIsFeatureEnabled } from '@/hooks/use-feature-flags';
import { getAllThemes, getThemeLabel } from '@/lib/festive-theme-constants';
import {
  Building2,
  ChevronDown,
  DollarSign,
  GraduationCap,
  Languages,
  LayoutGrid,
  Menu,
  Shield,
  Sparkles,
  Video,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/sites/home/common/language-context';
import { useAdminNavigation } from '@/hooks/use-navigation-loading';
import { useAuthPermissions } from '@/hooks/auth/use-auth-permissions';
import { canAccessAdminPanel } from '@/lib/permission-rbac';
import { cn } from '@/lib/utils';
import { LANGUAGE_NAMES, type Language } from '@/constants/languages';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CommunityColumn } from '@/components/sites/home/navigation/community-column';
import { UserButton } from './user-button';

interface Props {
  session: Session;
}

// Ứng dụng Switcher (Global App & Module Switcher)
function AppsSwitcher() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isNavigating, navigateToAdmin } = useAdminNavigation();
  const { permissions, adminRoles } = useAuthPermissions();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const hasAdminRoleFromUserAdminRoles =
    Array.isArray(adminRoles) && adminRoles.length > 0;
  const isModerator =
    (permissions && permissions.length > 0) ||
    (adminRoles && adminRoles.length > 0);
  const isAdmin =
    isModerator ||
    canAccessAdminPanel(permissions, userRole) ||
    hasAdminRoleFromUserAdminRoles;

  const handleAdminClick = async () => {
    const success = await navigateToAdmin();
    if (!success) {
      console.error('Failed to navigate to admin page');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-10 w-10 xl:w-auto p-0 xl:px-3 rounded-xl border-[#E8DDCC] dark:border-token hidden lg:flex items-center justify-center xl:justify-start gap-1.5 font-medium text-xs sm:text-sm bg-white dark:bg-surface hover:bg-surface-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6B00]'
          aria-label={t('ui.apps')}
          title={t('ui.apps')}
        >
          <LayoutGrid className='h-4 w-4 text-[#FF6B00]' />
          <span className='hidden xl:inline text-foreground'>
            {t('ui.apps')}
          </span>
          <ChevronDown className='h-3.5 w-3.5 text-muted-foreground hidden xl:inline' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='min-w-[200px] rounded-2xl p-1.5 shadow-xl border border-token bg-surface'
      >
        {isAdmin && (
          <DropdownMenuItem
            onClick={handleAdminClick}
            disabled={isNavigating}
            className='rounded-xl cursor-pointer py-2 px-3 text-sm'
          >
            <Shield className='h-4 w-4 mr-2 text-purple-600' />
            {isNavigating ? t('avatar.navigating') : t('avatar.manage')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.open('https://hoahong.acta.vn', '_blank');
            }
          }}
          className='rounded-xl cursor-pointer py-2 px-3 text-sm'
        >
          <DollarSign className='h-4 w-4 mr-2 text-emerald-600' />
          {t('buttons.discount')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/link-meetings')}
          className='rounded-xl cursor-pointer py-2 px-3 text-sm'
        >
          <Video className='h-4 w-4 mr-2 text-blue-600' />
          {t('buttons.meetings')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/tasks')}
          className='rounded-xl cursor-pointer py-2 px-3 text-sm'
        >
          <Building2 className='h-4 w-4 mr-2 text-orange-600' />
          {t('buttons.partners')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Language Switcher Component with clear label
function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          aria-label={t('ui.language')}
          title={t('ui.language')}
          className={cn(
            'h-10 w-10 md:w-auto p-0 md:px-2.5 rounded-xl border-[#E8DDCC] dark:border-token flex items-center justify-center md:justify-start gap-1.5 font-medium text-xs sm:text-sm bg-white dark:bg-surface hover:bg-surface-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6B00]',
            className,
          )}
        >
          <Languages className='h-4 w-4 text-muted-foreground hidden md:inline' />
          <span className='font-semibold text-foreground uppercase text-xs sm:text-sm'>
            {language}
          </span>
          <ChevronDown className='h-3.5 w-3.5 text-muted-foreground hidden md:inline' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='min-w-[150px] rounded-2xl p-1.5 shadow-xl border border-token bg-surface'
      >
        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLanguage(code as Language)}
            className={cn(
              'rounded-xl cursor-pointer py-2 px-3 text-sm',
              language === code
                ? 'bg-surface-muted font-bold text-[#FF6B00]'
                : '',
            )}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Theme Switcher Component with clear label and accessible indicators
function ThemeSwitcher({ className }: { className?: string }) {
  const {
    theme,
    setTheme,
    effectsEnabled,
    setEffectsEnabled,
    bgPhotoEnabled,
    setBgPhotoEnabled,
  } = useFestiveTheme();
  const { t } = useLanguage();
  const themes = getAllThemes();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          aria-label={t('ui.theme')}
          title={`${t('ui.theme')}: ${getThemeLabel(theme)}`}
          className={cn(
            'h-10 w-10 xl:w-auto p-0 xl:px-3 rounded-xl border-[#E8DDCC] dark:border-token flex items-center justify-center xl:justify-start gap-1.5 font-medium text-xs sm:text-sm bg-white dark:bg-surface hover:bg-surface-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6B00]',
            className,
          )}
        >
          <Sparkles className='h-4 w-4 text-amber-500' />
          <span className='hidden xl:inline text-foreground'>
            {t('ui.theme_label')}
          </span>
          <ChevronDown className='h-3.5 w-3.5 text-muted-foreground hidden xl:inline' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='min-w-[220px] rounded-2xl p-1.5 shadow-xl border border-token bg-surface'
      >
        <DropdownMenuLabel className='text-xs font-semibold text-muted-foreground px-2 py-1'>
          {t('ui.festive_themes')}
        </DropdownMenuLabel>
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={cn(
              'rounded-xl cursor-pointer py-2 px-3 text-sm',
              theme === themeOption.value
                ? 'bg-amber-100 dark:bg-amber-900/30 font-bold text-amber-900 dark:text-amber-200'
                : '',
            )}
          >
            {themeOption.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className='text-xs font-semibold text-muted-foreground px-2 py-1'>
          {t('ui.display_options')}
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={bgPhotoEnabled}
          onCheckedChange={(checked) => setBgPhotoEnabled(checked === true)}
          onSelect={(event) => event.preventDefault()}
          className='rounded-xl cursor-pointer py-2 pl-8 pr-3 text-sm font-medium'
        >
          {t('ui.landscape_bg')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={effectsEnabled}
          onCheckedChange={(checked) => setEffectsEnabled(checked === true)}
          onSelect={(event) => event.preventDefault()}
          className='rounded-xl cursor-pointer py-2 pl-8 pr-3 text-sm font-medium'
        >
          {t('ui.screen_effects_hint') || t('ui.screen_effects')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNavDrawer({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('open-notifications', close);
    return () => window.removeEventListener('open-notifications', close);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='lg:hidden h-10 w-10 p-0 rounded-xl border-[#E8DDCC] dark:border-token flex items-center justify-center bg-white dark:bg-surface hover:bg-surface-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6B00] cursor-pointer shrink-0'
          aria-label={t('community.navigation.aria_label')}
        >
          <Menu className='h-5 w-5 text-foreground' />
        </Button>
      </SheetTrigger>
      <SheetContent
        side='left'
        className='w-[86vw] max-w-[340px] p-0 bg-[#FDFAF5] dark:bg-background flex flex-col gap-0'
      >
        <SheetHeader className='px-4 py-2.5 pr-12 border-b border-[#F0E6D3] dark:border-token bg-white dark:bg-surface'>
          <div className='flex items-center gap-2'>
            <Image
              src='/logo.png'
              alt='ACTA Logo'
              width={28}
              height={28}
              className='h-7 w-7 object-contain shrink-0'
            />
            <SheetTitle className='flex-1 min-w-0 truncate text-base font-bold text-[#2B2118] dark:text-foreground text-left'>
              ACTA
            </SheetTitle>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          <SheetDescription className='sr-only'>
            {t('community.navigation.aria_label')}
          </SheetDescription>
        </SheetHeader>
        <div
          className='flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3'
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a')) {
              setOpen(false);
            }
          }}
        >
          <CommunityColumn session={session} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const Navbar = ({ session }: Props) => {
  const { t } = useLanguage();
  const trainingEnabled = useIsFeatureEnabled('TRAINING_VIDEOS');
  const trainingUnviewedCount = useTrainingUnviewedTodayCount(trainingEnabled);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleOpenNotifications = () => setNotificationsOpen(true);
    window.addEventListener('open-notifications', handleOpenNotifications);
    return () =>
      window.removeEventListener('open-notifications', handleOpenNotifications);
  }, []);

  if (!session || !session.user) return null;

  return (
    <>
      {/* Header - Solid white anchor layer with subtle warm border and shadow */}
      <header className='fixed top-0 left-0 right-0 z-50 bg-white dark:bg-surface border-b border-[#E8DDCC] dark:border-token shadow-[0_1px_4px_rgba(43,33,24,0.05)] dark:shadow-none pt-[env(safe-area-inset-top)]'>
        <nav className='max-w-[90rem] mx-auto pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]'>
          <div className='flex justify-between items-center h-16'>
            {/* Left: Mobile Drawer, Logo & Commerce CTA */}
            <div className='shrink-0 flex items-center space-x-2 sm:space-x-3'>
              <MobileNavDrawer session={session} />

              <Link href='/' className='flex items-center'>
                <Image
                  src='/logo.png'
                  alt='ACTA Logo Mobile'
                  width={40}
                  height={40}
                  priority
                  className='h-10 w-10 md:hidden'
                />
                <Image
                  src='/logo-desktop.jpg'
                  alt='ACTA Logo Desktop'
                  width={149}
                  height={56}
                  priority
                  className='hidden h-14 w-auto md:block'
                />
              </Link>
              <EcommerceCTAButton className='hidden lg:flex ml-1 sm:ml-2' />
            </div>

            {/* Right: Unified Utility Group in Clear Hierarchy */}
            {/* Order: [Training Video] -> [Notification (with badge)] -> [Apps] -> [Language] -> [Theme] -> [UserButton] */}
            <div className='flex items-center gap-1.5 sm:gap-2 shrink-0 py-2'>
              {/* Video rèn luyện */}
              <FeatureGate featureKey='TRAINING_VIDEOS'>
                <Link href='/videos' className='shrink-0 hidden lg:block'>
                  <Button
                    variant='outline'
                    title={t('ui.video_training')}
                    aria-label={t('ui.video_training')}
                    className='relative h-10 w-10 p-0 rounded-xl border-[#E8DDCC] dark:border-token bg-white dark:bg-surface text-foreground hover:bg-surface-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6B00]'
                  >
                    <GraduationCap className='h-5 w-5 text-foreground' />
                    {trainingUnviewedCount > 0 && (
                      <span className='absolute -top-1.5 -right-1.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[#FF6B00] text-[11px] font-bold text-white tabular-nums ring-2 ring-white dark:ring-surface shadow-xs pointer-events-none'>
                        {trainingUnviewedCount > 99
                          ? '99+'
                          : trainingUnviewedCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </FeatureGate>

              {/* 1. Thông báo (gắn badge số lượng trực tiếp) */}
              <div className='hidden lg:flex'>
                <NotificationDropdownV2 />
              </div>

              {/* 2. Ứng dụng (App Switcher) */}
              <AppsSwitcher />

              {/* 3. Ngôn ngữ (VI/EN) — mobile nằm trong drawer hamburger */}
              <LanguageSwitcher className='hidden lg:flex' />

              {/* 4. Giao diện (Theme Switcher) — mobile nằm trong drawer hamburger */}
              <ThemeSwitcher className='hidden lg:flex' />

              {/* 5. User Account Avatar & KYC */}
              <UserButton session={session} />
            </div>
          </div>
        </nav>
      </header>
      <NotificationSheet
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
    </>
  );
};
