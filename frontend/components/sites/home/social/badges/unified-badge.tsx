'use client';

import { cn } from '@/lib/utils';
import {
  Sparkles,
  Crown,
  User,
  LucideIcon,
  Wrench,
  Star,
  Handshake,
  HandshakeIcon,
  CircleStar,
  Heart,
  CircleCheckBig,
  Diamond,
} from 'lucide-react';
import { PiCrownBold } from 'react-icons/pi';
import { GiHeartWings } from 'react-icons/gi';
import { ComponentType } from 'react';
import { Role } from '@/types/user.type';

export const BADGE_TYPES = {
  SHARING: 'SHARING',
  ILLUMINATOR: 'ILLUMINATOR',
  LUMINARY: 'LUMINARY',
  ELDER: 'ELDER',
  STARTER: 'STARTER',
  USER: 'USER',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  PROFESSIONAL: 'PROFESSIONAL',
  BUSINESS: 'BUSINESS',
  ACTIVE: 'ACTIVE',
  DIAMOND: 'DIAMOND',
} as const;

export type BadgeType = (typeof BADGE_TYPES)[keyof typeof BADGE_TYPES];

interface BadgeConfig {
  label: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  shadowColor: string;
  defaultIcon: ComponentType<{ className?: string }> | string;
  iconSize?: string;
  iconWrapperClassName?: string;
}

export const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  [BADGE_TYPES.SHARING]: {
    /**
     * ⚠ 'Cổ đông cộng đồng' → 'Cổ đông lan tỏa' (chủ dự án chốt 05/09/2026).
     *
     * Tên mới trùng ĐÚNG `RecognitionType.name` trong CSDL của acta-api
     * (`src/recognized-users/services/recognition-v2.service.ts`, mảng
     * `DEFAULT_RECOGNITION_TYPES`, mã `sharing`) VÀ trùng đúng chữ IN SẴN trên
     * ảnh huy hiệu thiết kế gốc. Giữ tên cũ thì CÙNG một huy hiệu mang HAI tên
     * trên CÙNG một màn hình — đúng lớp lỗi mà `BADGE_VISUALS` đã phải gỡ hẳn
     * trường `label` để tránh (xem chú thích ở `achievement-card.theme.ts`).
     *
     * ⚠ 'Cổ đông cộng đồng' vẫn còn dùng ĐÚNG ở chỗ khác như một khái niệm BAO
     * TRÙM (khối `<CommunityShareholders />` ở cột giữa trang chủ, bộ câu hỏi
     * ACTA Game của acta-api) — ở đó nó gộp cả lan tỏa / chuyên gia / doanh
     * nghiệp. Đừng thay thế hàng loạt chuỗi ấy trong cả kho.
     */
    label: 'Cổ đông lan tỏa',
    borderColor: 'border-amber-500/25 dark:border-amber-400/20',
    gradientFrom: 'from-amber-500/10',
    gradientTo: 'to-amber-500/5',
    textColor: 'text-amber-900 dark:text-amber-300',
    shadowColor: 'shadow-none',
    defaultIcon: Sparkles,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.DIAMOND]: {
    /**
     * ⚠ 'Thành Viên Kim Cương' → 'Thành viên kim cương' (chủ dự án chốt
     * 05/09/2026). Chỉ đổi KIỂU VIẾT HOA, không đổi từ ngữ.
     *
     * Cùng một lý do với `SHARING` và `LUMINARY` ở trên: nhãn mới trùng ĐÚNG
     * `RecognitionType.name` của mã `diamond` trong CSDL acta-api
     * (`src/recognized-users/services/recognition-v2.service.ts`, mảng
     * `DEFAULT_RECOGNITION_TYPES`) VÀ trùng chữ in sẵn trên ảnh huy hiệu thiết
     * kế gốc. Đây là NGUỒN NHÃN DUY NHẤT của cả app (xem chú thích ở
     * `achievement-card.theme.ts`: `BADGE_VISUALS` đã gỡ hẳn trường `label` để
     * không bao giờ có hai tên cho cùng một danh hiệu), nên sửa ở đây là dãy
     * chip hồ sơ, hộp thoại chọn danh hiệu và Thẻ thành tích cùng đổi theo.
     *
     * ⚠ Viết hoa giữa câu ('Viên', 'Kim', 'Cương') là dấu vết của bản đầu,
     * lệch với 8 nhãn còn lại vốn chỉ hoa chữ đầu.
     */
    label: 'Thành viên kim cương',
    borderColor: 'border-violet-500/25 dark:border-violet-400/20',
    gradientFrom: 'from-violet-500/10',
    gradientTo: 'to-cyan-500/5',
    textColor: 'text-violet-900 dark:text-violet-300',
    shadowColor: 'shadow-none',
    defaultIcon: '💎',
    iconSize: 'h-3 w-3',
    iconWrapperClassName: '-mt-0.5',
  },
  [BADGE_TYPES.ILLUMINATOR]: {
    label: 'Minh sứ chuyên nghiệp',
    borderColor: 'border-indigo-500/25 dark:border-indigo-400/20',
    gradientFrom: 'from-indigo-500/10',
    gradientTo: 'to-purple-500/5',
    textColor: 'text-indigo-900 dark:text-indigo-300',
    shadowColor: 'shadow-none',
    defaultIcon: Heart,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.USER]: {
    label: 'Người dùng',
    borderColor: 'border-stone-400/25 dark:border-stone-600/20',
    gradientFrom: 'from-stone-500/10',
    gradientTo: 'to-stone-500/5',
    textColor: 'text-stone-700 dark:text-stone-300',
    shadowColor: 'shadow-none',
    defaultIcon: User,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.ADMIN]: {
    label: 'Quản trị viên',
    borderColor: 'border-rose-500/25 dark:border-rose-400/20',
    gradientFrom: 'from-rose-500/10',
    gradientTo: 'to-rose-500/5',
    textColor: 'text-rose-900 dark:text-rose-300',
    shadowColor: 'shadow-none',
    defaultIcon: PiCrownBold,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.MODERATOR]: {
    label: 'Điều hành viên',
    borderColor: 'border-blue-500/25 dark:border-blue-400/20',
    gradientFrom: 'from-blue-500/10',
    gradientTo: 'to-sky-500/5',
    textColor: 'text-blue-900 dark:text-blue-300',
    shadowColor: 'shadow-none',
    defaultIcon: Wrench,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.PROFESSIONAL]: {
    label: 'Cổ đông chuyên gia',
    borderColor: 'border-purple-500/25 dark:border-purple-400/20',
    gradientFrom: 'from-purple-500/10',
    gradientTo: 'to-purple-500/5',
    textColor: 'text-purple-900 dark:text-purple-300',
    shadowColor: 'shadow-none',
    defaultIcon: CircleStar,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.BUSINESS]: {
    label: 'Cổ đông doanh nghiệp',
    borderColor: 'border-amber-500/25 dark:border-amber-400/20',
    gradientFrom: 'from-amber-500/10',
    gradientTo: 'to-yellow-500/5',
    textColor: 'text-amber-900 dark:text-amber-300',
    shadowColor: 'shadow-none',
    defaultIcon: HandshakeIcon,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.ACTIVE]: {
    label: 'Cổ đông tích cực',
    borderColor: 'border-emerald-500/25 dark:border-emerald-400/20',
    gradientFrom: 'from-emerald-500/10',
    gradientTo: 'to-teal-500/5',
    textColor: 'text-emerald-900 dark:text-emerald-300',
    shadowColor: 'shadow-none',
    defaultIcon: CircleCheckBig,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.LUMINARY]: {
    /**
     * ⚠ 'Minh sứ cao cấp' → 'Minh sứ cấp cao' (chủ dự án chốt 05/09/2026).
     *
     * Cùng một lý do với `SHARING` ở trên: tên mới trùng ĐÚNG
     * `RecognitionType.name` của mã `luminary` trong CSDL acta-api
     * (`recognition-v2.service.ts`) VÀ trùng chữ in sẵn trên ảnh huy hiệu thiết
     * kế gốc. Đây là NGUỒN NHÃN DUY NHẤT của cả app, nên sửa ở đây là dãy chip
     * hồ sơ, hộp thoại chọn danh hiệu và Thẻ thành tích cùng đổi theo.
     */
    label: 'Minh sứ cấp cao',
    borderColor: 'border-pink-500/25 dark:border-pink-400/20',
    gradientFrom: 'from-pink-500/10',
    gradientTo: 'to-rose-500/5',
    textColor: 'text-pink-900 dark:text-pink-300',
    shadowColor: 'shadow-none',
    defaultIcon: CircleCheckBig,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.ELDER]: {
    label: 'Minh sứ trưởng lão',
    borderColor: 'border-amber-500/25 dark:border-amber-400/20',
    gradientFrom: 'from-amber-500/10',
    gradientTo: 'to-amber-500/5',
    textColor: 'text-amber-900 dark:text-amber-300',
    shadowColor: 'shadow-none',
    defaultIcon: Crown,
    iconSize: 'h-3 w-3',
  },
  [BADGE_TYPES.STARTER]: {
    label: 'Minh sứ thường',
    borderColor: 'border-sky-500/25 dark:border-sky-400/20',
    gradientFrom: 'from-sky-500/10',
    gradientTo: 'to-blue-500/5',
    textColor: 'text-sky-900 dark:text-sky-300',
    shadowColor: 'shadow-none',
    defaultIcon: Star,
    iconSize: 'h-3 w-3',
  },
};

interface UnifiedBadgeProps {
  type: BadgeType;
  size?: 'sm' | 'xs';
  className?: string;
  label?: string;
  iconClassName?: string;
  icon?: ComponentType<{ className?: string }> | string;
}

export function UnifiedBadge({
  type,
  size = 'sm',
  className,
  label,
  iconClassName,
  icon,
}: UnifiedBadgeProps) {
  const config = BADGE_CONFIGS[type];
  const sizeClasses =
    size === 'xs'
      ? 'text-[9.5px] px-1.5 py-0.5 leading-normal'
      : 'text-[11px] px-2 py-0.5 leading-normal';

  const Icon = icon || config.defaultIcon;
  const finalLabel = label ?? config.label;
  const iconSize = config.iconSize || 'h-3 w-3';

  const getIconColorClass = (badgeType: BadgeType): string => {
    switch (badgeType) {
      case BADGE_TYPES.ILLUMINATOR:
        return 'text-indigo-600 dark:text-indigo-400';
      case BADGE_TYPES.SHARING:
        return 'text-amber-600 dark:text-amber-400';
      case BADGE_TYPES.ADMIN:
        return 'text-rose-600 dark:text-rose-400';
      case BADGE_TYPES.MODERATOR:
        return 'text-blue-600 dark:text-blue-400';
      case BADGE_TYPES.PROFESSIONAL:
        return 'text-purple-600 dark:text-purple-400';
      case BADGE_TYPES.BUSINESS:
        return 'text-amber-600 dark:text-amber-400';
      case BADGE_TYPES.ACTIVE:
        return 'text-emerald-600 dark:text-emerald-400';
      case BADGE_TYPES.LUMINARY:
        return 'text-pink-600 dark:text-pink-400';
      case BADGE_TYPES.ELDER:
        return 'text-amber-600 dark:text-amber-400';
      case BADGE_TYPES.STARTER:
        return 'text-sky-600 dark:text-sky-400';
      case BADGE_TYPES.DIAMOND:
        return 'text-violet-600 dark:text-violet-400';
      default:
        return 'text-stone-500';
    }
  };

  const iconColorClass = getIconColorClass(type);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border bg-linear-to-r font-medium tracking-normal shrink-0 shadow-none min-w-0',
        config.borderColor,
        config.gradientFrom,
        config.gradientTo,
        config.textColor,
        config.shadowColor,
        sizeClasses,
        className,
      )}
      title={finalLabel}
    >
      {typeof Icon === 'string' ? (
        <span
          className={cn(
            iconSize,
            'shrink-0',
            config.iconWrapperClassName,
            iconClassName,
          )}
        >
          {Icon}
        </span>
      ) : (
        <Icon
          className={cn(
            iconSize,
            'shrink-0',
            iconColorClass,
            config.iconWrapperClassName,
            iconClassName,
          )}
        />
      )}
      <span className='min-w-0 max-w-[160px] whitespace-normal break-words leading-tight sm:max-w-none sm:whitespace-nowrap'>
        {finalLabel}
      </span>
    </span>
  );
}

export interface GetBadgeTypeForUserDto {
  role: Role;
  isModerator: boolean;
  isIlluminatorUser: boolean;
  isLuminaryUser?: boolean;
  isSharingUser: boolean;
  isProfessionalUser?: boolean;
  isBusinessUser?: boolean;
  isActiveUser?: boolean;
  isDiamondUser?: boolean;
  isElderUser?: boolean;
  isStarterUser?: boolean;
}

export function getBadgeTypeForUser(dto: GetBadgeTypeForUserDto): BadgeType {
  const badges = getBadgeTypesForUser(dto);
  return badges[0] || BADGE_TYPES.USER;
}

export function buildAllEarnedBadges(dto: GetBadgeTypeForUserDto): BadgeType[] {
  const badges: BadgeType[] = [];
  // Priority order: admin => moderator => elder =>  professional/business => illuminator/luminary => active => sharing => starter => diamond
  if (dto.role === Role.ADMIN) badges.push(BADGE_TYPES.ADMIN);
  if (dto.isModerator) badges.push(BADGE_TYPES.MODERATOR);
  if (dto.isElderUser) badges.push(BADGE_TYPES.ELDER);
  if (dto.isProfessionalUser) badges.push(BADGE_TYPES.PROFESSIONAL);
  if (dto.isBusinessUser) badges.push(BADGE_TYPES.BUSINESS);
  if (dto.isIlluminatorUser) badges.push(BADGE_TYPES.ILLUMINATOR);
  if (dto.isLuminaryUser) badges.push(BADGE_TYPES.LUMINARY);
  if (dto.isActiveUser) badges.push(BADGE_TYPES.ACTIVE);
  if (dto.isSharingUser) badges.push(BADGE_TYPES.SHARING);
  if (dto.isStarterUser) badges.push(BADGE_TYPES.STARTER);
  if (dto.isDiamondUser) badges.push(BADGE_TYPES.DIAMOND);
  return badges;
}

export function getBadgeTypesForUser(dto: GetBadgeTypeForUserDto): BadgeType[] {
  return buildAllEarnedBadges(dto).slice(0, 3);
}

export function resolveDisplayBadges(
  dto: GetBadgeTypeForUserDto,
  preferences: string[] | null | undefined,
  maxCount = 3,
): BadgeType[] {
  const allEarned = buildAllEarnedBadges(dto);
  if (!preferences || preferences.length === 0)
    return allEarned.slice(0, maxCount);
  const earnedSet = new Set<string>(allEarned);
  const valid = preferences
    .filter((p): p is BadgeType => earnedSet.has(p))
    .slice(0, maxCount);
  return valid.length > 0 ? valid : allEarned.slice(0, maxCount);
}
