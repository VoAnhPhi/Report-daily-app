'use client';

/**
 * Một dòng thông báo — dùng chung cho cả hộp thả xuống và trang danh sách đầy đủ.
 *
 * Mỗi dòng mang ba tín hiệu cùng một sắc miền: thanh ray dọc bên trái, huy hiệu
 * biểu tượng, và chip nhãn miền. Ảnh đại diện (nếu có) vẫn được đeo huy hiệu
 * miền ở góc dưới phải, nên không dòng nào mất tín hiệu nguồn.
 *
 * ⚠ File này được NHÂN BẢN BYTE-IDENTICAL sang acta-social, acta-affiliate và
 * acta-admin — xem ghi chú ở `constants/notification-domains.ts`.
 */

import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  classifyNotification,
  resolveNotificationTarget,
  type NotificationTarget,
} from '@/constants/notification-domains';
import {
  NOTIFICATION_DOMAIN_META,
  getNotificationIcon,
} from '@/constants/notification-visuals';
import { cn } from '@/lib/utils';
import type { NotificationV2 } from '@/types/notification-v2.type';

/** Phản hồi của admin cho đánh giá sản phẩm — hiện logo ACTA thay avatar cá nhân. */
const BRAND_REPLY_ACTIONS = new Set(['rating_replied', 'rating_edited']);

export interface NotificationRowProps {
  notification: NotificationV2;
  /** Hộp thả xuống dùng bản gọn hơn trang danh sách đầy đủ. */
  variant?: 'dropdown' | 'feed';
  onMarkAsRead: (id: string) => void | Promise<void>;
  /** Nhận đích đến ĐÃ phân giải — `null` khi thông báo không có chỗ để đi. */
  onNavigate: (target: NotificationTarget | null) => void;
  /** Định dạng thời gian tương đối (mỗi repo có helper riêng). */
  formatTime: (isoDate: string) => string;
  /** Tùy chọn chuyển hàm dịch (i18n) nếu repo có hỗ trợ đa ngôn ngữ */
  t?: (
    key: string,
    values?: Record<string, string | number | boolean | null | undefined>,
  ) => string;
}

export const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  variant = 'dropdown',
  onMarkAsRead,
  onNavigate,
  formatTime,
  t,
}) => {
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  const domain = useMemo(
    () => classifyNotification(notification.action, notification.linkUrl),
    [notification.action, notification.linkUrl],
  );

  // Đích đến phụ thuộc hostname đang chạy nên chỉ phân giải khi người dùng bấm —
  // tránh lệch hydrate giữa server và client.
  const meta = NOTIFICATION_DOMAIN_META[domain];
  const hasTarget = Boolean(notification.linkUrl?.trim());
  const isCompact = variant === 'dropdown';

  const handleMarkAsRead = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (notification.isRead || isMarkingAsRead) return;
    setIsMarkingAsRead(true);
    try {
      await onMarkAsRead(notification.id);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleClick = () => {
    if (!notification.isRead) void handleMarkAsRead();
    onNavigate(
      resolveNotificationTarget(notification.action, notification.linkUrl),
    );
  };

  const avatarUrl = notification.actorUser?.avatar?.fileUrl;
  const isBrandReply = BRAND_REPLY_ACTIONS.has(notification.action);
  const showsPortrait = Boolean(avatarUrl) || isBrandReply;

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
        'relative flex items-start gap-3 transition-colors',
        isCompact ? 'py-3 pl-4 pr-3' : 'py-4 pl-5 pr-4',
        hasTarget
          ? 'cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none'
          : 'cursor-default',
        !notification.isRead && meta.unreadRow,
      )}
    >
      {/* Thanh ray miền — tín hiệu nhận diện chính khi lướt danh sách */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-[3px]', meta.rail)}
      />

      {/* Huy hiệu */}
      <div className='relative flex-shrink-0'>
        {showsPortrait ? (
          <Avatar
            className={cn(
              'rounded-xl border',
              isCompact ? 'h-10 w-10' : 'h-11 w-11',
            )}
          >
            {isBrandReply ? (
              <AvatarImage
                src='/logo.png'
                alt='ACTA'
                className='object-contain p-1'
              />
            ) : (
              <AvatarImage src={avatarUrl} alt='' />
            )}
            <AvatarFallback className='rounded-xl text-sm font-medium'>
              {isBrandReply
                ? 'ACTA'
                : notification.actorUser?.fullName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-xl border',
              isCompact ? 'h-10 w-10' : 'h-11 w-11',
              meta.medallion,
            )}
          >
            {React.createElement(
              getNotificationIcon(notification.action, domain),
              { className: isCompact ? 'h-[18px] w-[18px]' : 'h-5 w-5' },
            )}
          </div>
        )}

        {/* Ảnh đại diện vẫn phải khai báo miền nguồn */}
        {showsPortrait && (
          <span
            aria-hidden
            className={cn(
              'absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-md ring-2 ring-background',
              meta.pip,
            )}
          >
            {React.createElement(
              getNotificationIcon(notification.action, domain),
              { className: 'h-2.5 w-2.5' },
            )}
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className='min-w-0 flex-1'>
        <p
          className={cn(
            'line-clamp-2 text-sm leading-snug',
            notification.isRead
              ? 'font-normal text-muted-foreground'
              : 'font-medium text-foreground',
          )}
        >
          {notification.message}
        </p>

        <div className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1'>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              meta.chip,
            )}
          >
            {t ? t(`notifications.domains.${domain}`) || meta.label : meta.label}
          </span>
          <span className='text-xs text-muted-foreground'>
            {formatTime(notification.createdAt)}
          </span>

          {hasTarget && domain !== 'system' && (
            <ExternalLink
              aria-hidden
              className='h-3 w-3 text-muted-foreground/60'
            />
          )}
          {!notification.isRead && (
            <span
              aria-label={t ? t('notifications.unread') : 'Chưa đọc'}
              className={cn(
                'ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full',
                meta.dot,
              )}
            />
          )}
        </div>
      </div>

      {/* Đánh dấu đã đọc — chỉ ở trang danh sách đầy đủ; hộp thả xuống tự đánh
          dấu tất cả khi mở nên nút này thừa ở đó. */}
      {!isCompact && !notification.isRead && (
        <Button
          variant='ghost'
          size='sm'
          className='h-7 w-7 flex-shrink-0 p-0'
          aria-label={t ? t('notifications.mark_read') : 'Đánh dấu đã đọc'}
          onClick={handleMarkAsRead}
          disabled={isMarkingAsRead}
        >
          {isMarkingAsRead ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Check className='h-3.5 w-3.5' />
          )}
        </Button>
      )}
    </div>
  );
};

export default NotificationRow;
