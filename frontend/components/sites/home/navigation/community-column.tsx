'use client';

import { useSocial } from '@/components/providers/social-provider';
import { useLanguage } from '@/components/sites/home/common/language-context';
import { useAvatar } from '@/hooks/use-avatar';
import { useAdminNavigation } from '@/hooks/use-navigation-loading';
import { useAuthPermissions } from '@/hooks/auth/use-auth-permissions';
import { canAccessAdminPanel } from '@/lib/permission-rbac';
import { useUserProfileModal } from '@/hooks/use-user-profile-modal';
import { useNotificationCountV2 } from '@/hooks/use-notifications-v2';
import { useTrainingUnviewedTodayCount } from '@/hooks/queries/use-training-videos';
import { useIsFeatureEnabled } from '@/hooks/use-feature-flags';
import { OffersSheet } from '@/components/sites/home/notifications/offers-sheet';
import {
  Bell,
  Bookmark,
  BookOpen,
  Building2,
  CalendarDays,
  DollarSign,
  FileText,
  Gift,
  Handshake,
  MessageSquare,
  PlusCircle,
  ShoppingCart,
  Sparkles,
  Video,
} from 'lucide-react';
import { Session } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import React from 'react';
import { toast } from 'sonner';

/**
 * Left rail — Complete navigation panel with independent scrolling.
 * Organized into clear, high-contrast functional sections:
 * - PROFILE (+ Tạo bài viết)
 * - BẢNG TIN
 * - KHÁM PHÁ
 * - TÀI NGUYÊN
 * - ỨNG DỤNG
 */
function NavRow({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] leading-snug transition-all cursor-pointer min-h-[40px] text-left disabled:opacity-60 disabled:cursor-not-allowed ${
        active
          ? 'bg-[#FFF1D6] dark:bg-orange-950/50 text-[#FF6B00] dark:text-orange-400 font-semibold shadow-2xs ring-1 ring-[#FF6B00]/15'
          : 'font-medium text-[#2B2118] dark:text-foreground/90 hover:bg-[#FFF1D6]/40 dark:hover:bg-surface-muted hover:text-[#2B2118]'
      }`}
    >
      <Icon
        className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-[#FF6B00] dark:text-orange-400' : 'text-[#756B61] dark:text-muted-foreground'}`}
      />
      <span className='flex-1'>{label}</span>
      {!!badge && badge > 0 && (
        <span className='flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[#FF6B00] text-[11px] font-bold text-white tabular-nums shrink-0'>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function NavSection({
  title,
  children,
  showDivider = true,
}: {
  title: string;
  children: React.ReactNode;
  showDivider?: boolean;
}) {
  return (
    <div
      className={
        showDivider
          ? 'pt-3 mt-1.5 border-t border-[#F0E6D3]/80 dark:border-token/40'
          : 'pt-1'
      }
    >
      <h4 className='px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#B5A090] dark:text-muted-foreground'>
        {title}
      </h4>
      <div className='space-y-0.5'>{children}</div>
    </div>
  );
}

export const CommunityColumn = ({ session }: { session: Session }) => {
  const { onOpen } = useUserProfileModal();
  const { t } = useLanguage();
  const { isNavigating, navigateToAdmin } = useAdminNavigation();
  const { permissions, adminRoles } = useAuthPermissions();
  const { filters, updateFilters } = useSocial();
  const { avatarUrl: currentUserAvatarUrl } = useAvatar();
  const router = useRouter();
  const [offersSheetOpen, setOffersSheetOpen] = React.useState(false);

  const userRole = session.user?.role;
  const hasAdminRoleFromUserAdminRoles =
    Array.isArray(adminRoles) && adminRoles.length > 0;
  const isModerator =
    (permissions && permissions.length > 0) ||
    (adminRoles && adminRoles.length > 0);
  const isAdmin =
    isModerator ||
    canAccessAdminPanel(permissions, userRole) ||
    hasAdminRoleFromUserAdminRoles;

  const handleAdminClick = React.useCallback(async () => {
    const success = await navigateToAdmin();
    if (!success) {
      const rawBase =
        process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.acta.vn';
      const baseUrl = rawBase.replace(/\/+$/, '');
      if (typeof window !== 'undefined') {
        if (typeof window.location.assign === 'function') {
          window.location.assign(baseUrl);
        } else {
          window.location.href = baseUrl;
        }
      }
    }
  }, [navigateToAdmin]);

  const [selectedFeature, setSelectedFeature] = useQueryState('feature', {
    defaultValue: 'community',
    history: 'push',
    scroll: false,
  });

  const openOwnProfile = () => onOpen(session.user.id);

  // Quick actions: Thông báo + Giỏ hàng (mobile drawer)
  const { data: unreadCount } = useNotificationCountV2(session?.accessToken);
  const trainingEnabled = useIsFeatureEnabled('TRAINING_VIDEOS');
  const trainingUnviewedCount = useTrainingUnviewedTodayCount(trainingEnabled);

  const isFeedActive = !selectedFeature || selectedFeature === 'community';

  const feedNav = React.useMemo(
    () => [
      {
        icon: Sparkles,
        label: t('community.navigation.items.for_you'),
        active:
          isFeedActive && !filters.myPosts && !filters.pendingVerification,
        onClick: () => {
          setSelectedFeature('community');
          updateFilters({
            myPosts: false,
            userId: undefined,
            pendingVerification: false,
          });
        },
      },
      {
        icon: FileText,
        label: t('community.navigation.items.my_posts'),
        active: isFeedActive && !!filters.myPosts,
        onClick: () => {
          setSelectedFeature('community');
          updateFilters({
            myPosts: true,
            userId: session?.user?.id,
            pendingVerification: false,
          });
        },
      },
      {
        icon: Bookmark,
        label: t('community.navigation.items.saved'),
        active: false,
        onClick: () => {
          toast.info(t('community.navigation.saved_toast_title'), {
            description: t('community.navigation.saved_toast_desc'),
          });
        },
      },
    ],
    [
      filters.myPosts,
      filters.pendingVerification,
      isFeedActive,
      session.user.id,
      setSelectedFeature,
      t,
      updateFilters,
    ],
  );

  const discoverNav = React.useMemo(
    () => [
      {
        icon: CalendarDays,
        label: t('community.navigation.items.events_news'),
        active: selectedFeature === 'event_news',
        onClick: () => setSelectedFeature('event_news'),
      },
      {
        icon: Gift,
        label: t('community.navigation.items.offers'),
        active: false,
        onClick: () => setOffersSheetOpen(true),
      },
      {
        icon: Video,
        label: t('community.navigation.items.training_videos'),
        active: false,
        onClick: () => router.push('/videos'),
        badge: trainingUnviewedCount,
      },
      {
        icon: MessageSquare,
        label: t('community.navigation.items.qa_forum'),
        active: selectedFeature === 'forum',
        onClick: () => setSelectedFeature('forum'),
      },
    ],
    [router, selectedFeature, setSelectedFeature, t, trainingUnviewedCount],
  );

  const resourceNav = React.useMemo(
    () => [
      {
        icon: BookOpen,
        label: t('community.navigation.items.documents'),
        active: selectedFeature === 'documents',
        onClick: () => setSelectedFeature('documents'),
      },
    ],
    [selectedFeature, setSelectedFeature, t],
  );

  const appNav = React.useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              icon: Building2,
              label: isNavigating
                ? t('community.navigation.items.redirecting')
                : t('community.navigation.items.management'),
              onClick: handleAdminClick,
              disabled: isNavigating,
            },
          ]
        : []),
      {
        icon: DollarSign,
        label: t('community.navigation.items.discount'),
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.open('https://hoahong.acta.vn', '_blank');
          }
        },
      },
      {
        icon: Video,
        label: t('community.navigation.items.meetings'),
        onClick: () => router.push('/link-meetings'),
      },
      {
        icon: Handshake,
        label: t('community.navigation.items.partners'),
        onClick: () => router.push('/tasks'),
      },
    ],
    [handleAdminClick, isAdmin, isNavigating, router, t],
  );

  return (
    <div className='w-full flex flex-col gap-3 pb-[max(2.5rem,env(safe-area-inset-bottom))]'>
      {/* Profile / Primary Action */}
      <div className='bg-white dark:bg-surface border border-[#E8DDCC] dark:border-token rounded-2xl px-3.5 py-3 shadow-[0_2px_8px_rgba(43,33,24,0.05)]'>
        <button
          onClick={openOwnProfile}
          className='w-full flex items-center gap-2.5 mb-2.5 hover:opacity-85 transition-opacity text-left cursor-pointer min-h-[44px]'
        >
          <div className='w-10 h-10 rounded-full overflow-hidden bg-surface-muted shrink-0 ring-2 ring-[#FF6B00]/40'>
            <img
              src={currentUserAvatarUrl || '/placeholder.svg'}
              alt={session.user.fullName || 'Avatar'}
              width={40}
              height={40}
              className='w-full h-full object-cover'
            />
          </div>
          <span className='text-[15px] font-bold text-[#2B2118] dark:text-foreground truncate'>
            {session.user.fullName}
          </span>
        </button>
        <button
          onClick={() => {
            if (selectedFeature && selectedFeature !== 'community') {
              setSelectedFeature('community');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-create-post'));
              }, 120);
            } else {
              window.dispatchEvent(new CustomEvent('open-create-post'));
            }
          }}
          className='w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-linear-to-r from-[#FF6B00] to-[#E05A00] hover:from-[#E05A00] hover:to-[#C84E00] text-white text-[15px] font-semibold transition-all shadow-xs cursor-pointer min-h-[44px]'
        >
          <PlusCircle className='w-5 h-5' />
          {t('community.navigation.create_post')}
        </button>
      </div>

      {/* Quick Actions: Thông báo + Giỏ hàng (mobile/tablet drawer only — desktop navbar owns these) */}
      <div className='grid w-full grid-cols-2 gap-3 py-2.5 lg:hidden'>
        <button
          type='button'
          onClick={() =>
            window.dispatchEvent(new CustomEvent('open-notifications'))
          }
          className='relative w-full h-11 flex items-center justify-center gap-2 px-3 rounded-xl bg-white dark:bg-surface border border-[#E8DDCC] dark:border-token cursor-pointer hover:bg-[#FFF1D6]/40 dark:hover:bg-surface-muted transition-colors'
        >
          <Bell className='w-5 h-5 shrink-0 text-[#756B61] dark:text-muted-foreground' />
          <span className='text-[15px] font-medium text-[#2B2118] dark:text-foreground truncate'>
            {t('notifications.title')}
          </span>
          {unreadCount > 0 && (
            <span className='absolute -top-1.5 -right-1.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[#FF6B00] text-[11px] font-bold text-white tabular-nums ring-2 ring-white dark:ring-surface shadow-xs pointer-events-none'>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <a
          href='https://e-commerce.acta.vn'
          target='_blank'
          rel='noopener noreferrer'
          className='w-full h-11 flex items-center justify-center gap-2 px-3 rounded-xl bg-white dark:bg-surface border border-[#E8DDCC] dark:border-token cursor-pointer hover:bg-[#FFF1D6]/40 dark:hover:bg-surface-muted transition-colors'
        >
          <ShoppingCart className='w-5 h-5 shrink-0 text-[#756B61] dark:text-muted-foreground' />
          <span className='text-[15px] font-medium text-[#2B2118] dark:text-foreground truncate'>
            {t('buttons.shop')}
          </span>
        </a>
      </div>

      {/* Main Navigation Card Surface */}
      <nav
        aria-label={t('community.navigation.aria_label')}
        className='bg-white dark:bg-surface border border-[#E8DDCC] dark:border-token rounded-2xl px-3.5 py-3 shadow-[0_2px_10px_rgba(43,33,24,0.05)] flex flex-col gap-2'
      >
        <NavSection
          title={t('community.navigation.sections.feed')}
          showDivider={false}
        >
          {feedNav.map((item) => (
            <NavRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={item.active}
              onClick={item.onClick}
            />
          ))}
        </NavSection>

        <NavSection title={t('community.navigation.sections.discover')}>
          {discoverNav.map((item) => (
            <NavRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={item.active}
              onClick={item.onClick}
              badge={'badge' in item ? item.badge : undefined}
            />
          ))}
        </NavSection>

        <NavSection title={t('community.navigation.sections.resources')}>
          {resourceNav.map((item) => (
            <NavRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={item.active}
              onClick={item.onClick}
            />
          ))}
        </NavSection>

        <NavSection title={t('community.navigation.sections.apps')}>
          {appNav.map((item) => (
            <NavRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              onClick={item.onClick}
              disabled={item.disabled}
            />
          ))}
        </NavSection>
      </nav>

      <OffersSheet open={offersSheetOpen} onOpenChange={setOffersSheetOpen} />
    </div>
  );
};
