'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useNotificationsV2,
  useMarkNotificationAsReadV2,
  useMarkAllNotificationsAsReadV2,
} from '@/hooks/use-notifications-v2';
import { useNotificationNavigate } from '@/hooks/use-notification-navigate';
import {
  classifyNotification,
  type NotificationDomain,
} from '@/constants/notification-domains';
import { NOTIFICATION_DOMAIN_META } from '@/constants/notification-visuals';
import { NotificationRow } from './notification-row';
import { KycPinnedNotice } from '../notices/kyc-pinned-notice';
import { NotificationV2 } from '@/types/notification-v2.type';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/sites/home/common/language-context';
import { useFormat } from '@/hooks/use-format';

/** Thứ tự bộ lọc miền — cố định để vị trí chip không nhảy giữa các lần render. */
const DOMAIN_ORDER: NotificationDomain[] = [
  'social',
  'shop',
  'income',
  'admin',
  'system',
];

type DomainFilter = NotificationDomain | 'all';

export const NotificationDropdownV2: React.FC = () => {
  const { t } = useLanguage();
  const { formatRelativeDate } = useFormat();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<DomainFilter>('all');

  const notificationsQuery = useNotificationsV2(session?.accessToken, {
    limit: 10, // Only show recent 10 notifications in dropdown
    enableToast: false,
  });

  const markAsReadMutation = useMarkNotificationAsReadV2();
  const markAllAsReadMutation = useMarkAllNotificationsAsReadV2();
  const navigate = useNotificationNavigate();

  // Flatten notifications from all pages and filter out invalid items
  const allNotifications: NotificationV2[] = useMemo(
    () =>
      notificationsQuery.data?.pages
        ?.flatMap((page) => page.data || [])
        .filter((notification) => notification && notification.id) || [],
    [notificationsQuery.data],
  );

  /** Số thông báo theo từng miền — dùng cho nhãn đếm trên chip lọc. */
  const countsByDomain = useMemo(() => {
    const counts = new Map<NotificationDomain, number>();
    for (const notification of allNotifications) {
      const domain = classifyNotification(
        notification.action,
        notification.linkUrl,
      );
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
    return counts;
  }, [allNotifications]);

  const visibleNotifications = useMemo(
    () =>
      filter === 'all'
        ? allNotifications
        : allNotifications.filter(
            (notification) =>
              classifyNotification(
                notification.action,
                notification.linkUrl,
              ) === filter,
          ),
    [allNotifications, filter],
  );

  const stats = notificationsQuery.data?.pages?.[0]?.stats;
  const unreadCount = stats?.unread || 0;

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      await markAsReadMutation.mutateAsync(notificationId);
    },
    [markAsReadMutation],
  );

  // Auto mark-all-as-read whenever the box is opened (replaces the manual
  // "mark all" button) — opening the notifications counts as having seen them.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open && unreadCount > 0 && !markAllAsReadMutation.isPending) {
        void markAllAsReadMutation.mutateAsync();
      }
    },
    [unreadCount, markAllAsReadMutation],
  );

  const hasNextPage = notificationsQuery.hasNextPage;
  const isFetchingNextPage = notificationsQuery.isFetchingNextPage;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      notificationsQuery.fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, notificationsQuery]);

  const handleNotificationNavigate = useCallback(
    (target: Parameters<typeof navigate>[0]) => {
      setIsOpen(false);
      navigate(target);
    },
    [navigate],
  );

  /** Chỉ hiện chip của những miền thực sự có thông báo — tránh hàng chip rỗng. */
  const activeDomains = DOMAIN_ORDER.filter(
    (domain) => (countsByDomain.get(domain) ?? 0) > 0,
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='relative h-10 w-10 md:w-auto p-0 md:px-3 rounded-xl border-[#E8DDCC] dark:border-token flex items-center justify-center md:justify-start gap-2 bg-white dark:bg-surface hover:bg-surface-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6B00]'
          aria-label={t('notifications.title')}
          title={t('notifications.title')}
        >
          <Bell className='h-4 w-4 sm:h-4.5 sm:w-4.5 text-foreground' />
          <span className='hidden md:inline font-medium text-xs sm:text-sm text-foreground'>
            {t('notifications.title')}
          </span>
          {unreadCount > 0 && (
            <>
              {/* Badge nổi cho chế độ icon (mobile / h-10 w-10) neo chuẩn xác góc trên phải */}
              <span className='md:hidden absolute -top-1.5 -right-1.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white tabular-nums ring-2 ring-white dark:ring-surface shadow-xs pointer-events-none'>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
              {/* Badge dạng pill cho chế độ desktop có chữ */}
              <span className='hidden md:flex h-5 min-w-5 px-1.5 rounded-full items-center justify-center text-xs font-bold tabular-nums bg-red-600 text-white'>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align='end'
        className='w-[calc(100vw-2rem)] max-w-96 p-0 sm:w-96 h-[600px] flex flex-col'
      >
        {/* Header */}
        <div className='flex items-center justify-between gap-3 p-4 pb-3 border-b flex-shrink-0'>
          <h3 className='font-semibold text-base'>{t('notifications.title')}</h3>
          <span className='text-xs text-muted-foreground tabular-nums'>
            {unreadCount > 0
              ? t('notifications.unread_count', { count: unreadCount })
              : t('notifications.total_count', { count: allNotifications.length })}
          </span>
        </div>

        {/* Bộ lọc theo miền — giúp tách bạch 5 nguồn sự kiện đổ chung vào đây */}
        {activeDomains.length > 1 && (
          <div className='flex flex-shrink-0 gap-1.5 overflow-x-auto border-b px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            <button
              type='button'
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={cn(
                'flex-shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors',
                filter === 'all'
                  ? 'border-foreground bg-foreground font-medium text-background'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {t('notifications.filter.all', { count: allNotifications.length })}
            </button>
            {activeDomains.map((domain) => (
              <button
                key={domain}
                type='button'
                onClick={() => setFilter(domain)}
                aria-pressed={filter === domain}
                className={cn(
                  'flex-shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  filter === domain
                    ? cn(
                        'border-transparent font-medium',
                        NOTIFICATION_DOMAIN_META[domain].chip,
                      )
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {t(`notifications.domains.${domain}`) || NOTIFICATION_DOMAIN_META[domain].label}{' '}
                {countsByDomain.get(domain)}
              </button>
            ))}
          </div>
        )}

        {/* Notifications List */}
        <div className='overflow-y-auto overflow-x-hidden flex-1 min-h-0'>
          {/* Nhắc KYC Bậc 1 — ghim trên cùng, nằm NGOÀI danh sách thông báo
              nên không bị đánh dấu đã đọc và vẫn hiện khi chưa có thông báo
              nào. Chỉ hết hiện khi KYC Bậc 1 được duyệt. */}
          <KycPinnedNotice onNavigate={() => setIsOpen(false)} />

          {visibleNotifications.length === 0 ? (
            <div className='text-center text-muted-foreground py-12'>
              <Bell className='h-12 w-12 mx-auto mb-3 opacity-30' />
              <p className='font-medium'>
                {filter === 'all'
                  ? t('notifications.empty.title')
                  : t('notifications.empty.filtered_title')}
              </p>
              <p className='text-xs mt-1'>
                {filter === 'all'
                  ? t('notifications.empty.subtitle')
                  : t('notifications.empty.filtered_subtitle')}
              </p>
            </div>
          ) : (
            <div className='divide-y'>
              {visibleNotifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  variant='dropdown'
                  onMarkAsRead={handleMarkAsRead}
                  onNavigate={handleNotificationNavigate}
                  formatTime={formatRelativeDate}
                  t={t}
                />
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <div className='p-3 text-center'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleLoadMore}
                    disabled={isFetchingNextPage}
                    className='w-full'
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        {t('notifications.loading')}
                      </>
                    ) : (
                      t('notifications.load_more')
                    )}
                  </Button>
                </div>
              )}

              {/* End of data message */}
              {!hasNextPage && visibleNotifications.length > 0 && (
                <div className='p-3 text-center text-muted-foreground'>
                  <p className='text-xs'>{t('notifications.all_loaded')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdownV2;
