'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useNotificationsV2,
  useMarkNotificationAsReadV2,
} from '@/hooks/use-notifications-v2';
import { useNotificationNavigate } from '@/hooks/use-notification-navigate';
import { NotificationRow } from './notification-row';
import { NotificationV2 } from '@/types/notification-v2.type';
import { useLanguage } from '@/components/sites/home/common/language-context';
import { useFormat } from '@/hooks/use-format';
import { cn } from '@/lib/utils';
import {
  classifyNotification,
} from '@/constants/notification-domains';
import {
  NOTIFICATION_DOMAIN_META,
  getNotificationIcon,
} from '@/constants/notification-visuals';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveNotificationTarget } from '@/constants/notification-domains';

export interface NotificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SheetFilter = 'all' | 'unread';

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ').toLowerCase();
}

type AggregatedGroup = {
  key: string;
  notifications: NotificationV2[];
  representative: NotificationV2;
  count: number;
};

function aggregateNotifications(notifications: NotificationV2[]): AggregatedGroup[] {
  const groups = new Map<string, NotificationV2[]>();
  for (const n of notifications) {
    const key = `${n.action}__${normalizeMessage(n.message)}`;
    const arr = groups.get(key);
    if (arr) arr.push(n);
    else groups.set(key, [n]);
  }
  const result: AggregatedGroup[] = [];
  const seen = new Set<string>();
  for (const n of notifications) {
    const key = `${n.action}__${normalizeMessage(n.message)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const members = groups.get(key)!;
    result.push({ key, notifications: members, representative: members[0], count: members.length });
  }
  return result;
}

const BRAND_REPLY_ACTIONS = new Set(['rating_replied', 'rating_edited']);

function AggregatedRow({
  group,
  onMarkAsRead,
  onNavigate,
  formatTime,
  t,
  onClose,
}: {
  group: AggregatedGroup;
  onMarkAsRead: (id: string) => void | Promise<void>;
  onNavigate: (target: ReturnType<typeof resolveNotificationTarget>) => void;
  formatTime: (isoDate: string) => string;
  t?: (key: string, values?: Record<string, string | number | boolean | null | undefined>) => string;
  onClose: () => void;
}) {
  const notification = group.representative;
  const count = group.count;
  const domain = useMemo(
    () => classifyNotification(notification.action, notification.linkUrl),
    [notification.action, notification.linkUrl],
  );
  const meta = NOTIFICATION_DOMAIN_META[domain];
  const hasTarget = Boolean(notification.linkUrl?.trim());
  const avatarUrl = notification.actorUser?.avatar?.fileUrl;
  const isBrandReply = BRAND_REPLY_ACTIONS.has(notification.action);
  const showsPortrait = Boolean(avatarUrl) || isBrandReply;
  const isUnread = group.notifications.some((n) => !n.isRead);

  const handleClick = useCallback(() => {
    // mark all unread in group as read (fire-and-forget)
    for (const n of group.notifications) {
      if (!n.isRead) void onMarkAsRead(n.id);
    }
    onNavigate(resolveNotificationTarget(notification.action, notification.linkUrl));
    onClose();
  }, [group.notifications, notification.action, notification.linkUrl, onMarkAsRead, onNavigate, onClose]);

  return (
    <div
      role={hasTarget ? 'button' : undefined}
      tabIndex={hasTarget ? 0 : undefined}
      onClick={hasTarget ? handleClick : undefined}
      onKeyDown={
        hasTarget
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      className={cn(
        'relative flex items-start gap-3 py-3 pl-4 pr-3 transition-colors',
        hasTarget
          ? 'cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none'
          : 'cursor-default',
        isUnread && meta.unreadRow,
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', meta.rail)} />
      <div className='relative flex-shrink-0'>
        {showsPortrait ? (
          <Avatar className='h-10 w-10 rounded-xl border'>
            {isBrandReply ? (
              <AvatarImage src='/logo.png' alt='ACTA' className='object-contain p-1' />
            ) : (
              <AvatarImage src={avatarUrl} alt='' />
            )}
            <AvatarFallback className='rounded-xl text-sm font-medium'>
              {isBrandReply ? 'ACTA' : notification.actorUser?.fullName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', meta.medallion)}>
            {React.createElement(getNotificationIcon(notification.action, domain), {
              className: 'h-[18px] w-[18px]',
            })}
          </div>
        )}
        {showsPortrait && (
          <span
            aria-hidden
            className={cn(
              'absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-md ring-2 ring-background',
              meta.pip,
            )}
          >
            {React.createElement(getNotificationIcon(notification.action, domain), {
              className: 'h-2.5 w-2.5',
            })}
          </span>
        )}
        {/* count badge */}
        <span className='absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B00] px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-background'>
          {count}
        </span>
      </div>
      <div className='min-w-0 flex-1'>
        <p
          className={cn(
            'line-clamp-2 text-sm leading-snug',
            isUnread ? 'font-medium text-foreground' : 'font-normal text-muted-foreground',
          )}
        >
          {notification.message}
        </p>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1'>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', meta.chip)}>
            {t ? t(`notifications.domains.${domain}`) || meta.label : meta.label}
          </span>
          <span className='text-xs text-muted-foreground'>{formatTime(notification.createdAt)}</span>
          {isUnread && (
            <span
              aria-label={t ? t('notifications.unread') : 'Chưa đọc'}
              className={cn('ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full', meta.dot)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationSheet({ open, onOpenChange }: NotificationSheetProps) {
  const { t } = useLanguage();
  const { formatRelativeDate } = useFormat();
  const { data: session } = useSession();
  const [filter, setFilter] = useState<SheetFilter>('all');

  const notificationsQuery = useNotificationsV2(session?.accessToken, {
    limit: 10,
    enableToast: false,
  });

  const markAsReadMutation = useMarkNotificationAsReadV2();
  const navigate = useNotificationNavigate();

  const allNotifications: NotificationV2[] = useMemo(
    () =>
      notificationsQuery.data?.pages
        ?.flatMap((page) => page.data || [])
        .filter((notification) => notification && notification.id) || [],
    [notificationsQuery.data],
  );

  const filteredNotifications = useMemo(
    () => (filter === 'all' ? allNotifications : allNotifications.filter((n) => !n.isRead)),
    [allNotifications, filter],
  );

  const groups = useMemo(
    () => aggregateNotifications(filteredNotifications).slice(0, 8),
    [filteredNotifications],
  );

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      await markAsReadMutation.mutateAsync(notificationId);
    },
    [markAsReadMutation],
  );

  const handleNotificationNavigate = useCallback(
    (target: Parameters<typeof navigate>[0]) => {
      onOpenChange(false);
      navigate(target);
    },
    [navigate, onOpenChange],
  );

  const isLoading = notificationsQuery.isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-full sm:w-[440px] sm:max-w-[92vw] p-0 flex flex-col gap-0 bg-[#FDFAF5] dark:bg-background'
      >
        <SheetHeader className='px-4 py-3 pr-12 border-b border-[#F0E6D3] dark:border-token bg-white dark:bg-surface'>
          <SheetTitle>{t('notifications.title')}</SheetTitle>
          <SheetDescription className='sr-only'>{t('notifications.title')}</SheetDescription>
        </SheetHeader>

        {/* Filter row — exactly two chips */}
        <div className='flex gap-2 px-4 py-3 border-b border-[#F0E6D3] dark:border-token bg-white dark:bg-surface'>
          <button
            type='button'
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={cn(
              'rounded-full px-3 text-[13px] font-medium cursor-pointer transition-colors min-h-11',
              filter === 'all'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-white dark:bg-surface border border-[#E8DDCC] dark:border-token text-[#2B2118] dark:text-foreground',
            )}
          >
            Tất cả
          </button>
          <button
            type='button'
            onClick={() => setFilter('unread')}
            aria-pressed={filter === 'unread'}
            className={cn(
              'rounded-full px-3 text-[13px] font-medium cursor-pointer transition-colors min-h-11',
              filter === 'unread'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-white dark:bg-surface border border-[#E8DDCC] dark:border-token text-[#2B2118] dark:text-foreground',
            )}
          >
            Chưa đọc
          </button>
        </div>

        {/* Scrollable list */}
        <div className='flex-1 overflow-y-auto min-h-0'>
          {isLoading ? (
            <div className='flex items-center justify-center py-16'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : groups.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
              <Bell className='h-10 w-10 text-muted-foreground/40 mb-3' />
              <p className='text-sm font-medium text-foreground'>{t('notifications.sheet.empty_title')}</p>
              <p className='text-xs text-muted-foreground mt-1'>{t('notifications.sheet.empty_subtitle')}</p>
            </div>
          ) : (
            <div className='divide-y'>
              {groups.map((group) =>
                group.count === 1 ? (
                  <NotificationRow
                    key={group.key}
                    notification={group.representative}
                    variant='dropdown'
                    onMarkAsRead={handleMarkAsRead}
                    onNavigate={handleNotificationNavigate}
                    formatTime={formatRelativeDate}
                    t={t}
                  />
                ) : (
                  <AggregatedRow
                    key={group.key}
                    group={group}
                    onMarkAsRead={handleMarkAsRead}
                    onNavigate={handleNotificationNavigate}
                    formatTime={formatRelativeDate}
                    t={t}
                    onClose={() => onOpenChange(false)}
                  />
                ),
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='border-t border-[#F0E6D3] dark:border-token p-3 bg-white dark:bg-surface'>
          <Link
            href='/notifications'
            onClick={() => onOpenChange(false)}
            className='flex w-full min-h-11 items-center justify-center gap-1.5 rounded-xl text-[15px] font-medium bg-[#FFF1D6] dark:bg-surface-muted text-[#2B2118] dark:text-foreground hover:bg-[#FFE8BC] dark:hover:bg-muted transition-colors px-4'
          >
            {t('notifications.sheet.view_all')}
            <ChevronRight className='h-4 w-4 shrink-0' />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationSheet;
