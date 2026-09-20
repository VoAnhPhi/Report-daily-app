/**
 * Ngôn ngữ hình ảnh của trung tâm thông báo — bảng màu + biểu tượng theo miền.
 *
 * Nguyên tắc thiết kế: MIỀN NGUỒN là trục tổ chức của danh sách. Mỗi dòng mang
 * ba tín hiệu cùng một sắc: thanh ray dọc bên trái (đọc được khi lướt nhanh),
 * huy hiệu biểu tượng, và nhãn miền. Kể cả khi thông báo có ảnh đại diện người
 * dùng, huy hiệu miền vẫn bám ở góc ảnh nên KHÔNG dòng nào mất tín hiệu nguồn.
 *
 * Trạng thái chưa đọc dùng chính sắc miền pha loãng — không thêm màu xanh dương
 * thứ sáu vô nghĩa như bản cũ (`bg-blue-50`).
 *
 * Sắc màu neo vào bản sắc thật của từng app: mua sắm lấy cam `#f57c00` của
 * storefront, thu nhập lấy xanh `#43a047` trong `@acta/brand-tokens`. Quản trị
 * cố ý giảm bão hoà — thông báo dành cho nhân sự vận hành phải đọc ra ngay là
 * "không thuộc thế giới của bạn".
 *
 * ⚠ File này được NHÂN BẢN BYTE-IDENTICAL sang acta-social, acta-affiliate và
 * acta-admin — xem ghi chú ở `constants/notification-domains.ts`.
 */

import {
  AlertTriangle,
  Ban,
  BellRing,
  Cake,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileCheck2,
  Gift,
  Heart,
  LifeBuoy,
  ListChecks,
  MessageCircle,
  Package,
  PlayCircle,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type { NotificationDomain } from './notification-domains';

export interface NotificationDomainMeta {
  /** Nhãn tiếng Việt hiện trên chip của mỗi dòng. */
  label: string;
  /** Thanh ray dọc bên trái dòng. */
  rail: string;
  /** Nền + chữ + viền của huy hiệu biểu tượng. */
  medallion: string;
  /** Chip nhãn miền ở hàng meta. */
  chip: string;
  /** Nền dòng khi chưa đọc. */
  unreadRow: string;
  /** Chấm tròn đánh dấu chưa đọc. */
  dot: string;
  /** Huy hiệu nhỏ đè lên góc ảnh đại diện. */
  pip: string;
}

/**
 * ⚠ Class Tailwind phải là CHUỖI TĨNH — không ghép động (`bg-${x}-50`), nếu
 * không JIT sẽ không sinh ra CSS tương ứng.
 */
export const NOTIFICATION_DOMAIN_META: Record<
  NotificationDomain,
  NotificationDomainMeta
> = {
  social: {
    label: 'Cộng đồng',
    rail: 'bg-indigo-500 dark:bg-indigo-400',
    medallion:
      'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
    chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    unreadRow: 'bg-indigo-50/50 dark:bg-indigo-950/25',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
    pip: 'bg-indigo-500 text-white dark:bg-indigo-400 dark:text-indigo-950',
  },
  shop: {
    label: 'Mua sắm',
    rail: 'bg-orange-500 dark:bg-orange-400',
    medallion:
      'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    chip: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    unreadRow: 'bg-orange-50/50 dark:bg-orange-950/25',
    dot: 'bg-orange-500 dark:bg-orange-400',
    pip: 'bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950',
  },
  income: {
    label: 'Thu nhập',
    rail: 'bg-emerald-600 dark:bg-emerald-400',
    medallion:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    unreadRow: 'bg-emerald-50/50 dark:bg-emerald-950/25',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    pip: 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950',
  },
  admin: {
    label: 'Quản trị',
    rail: 'bg-slate-500 dark:bg-slate-400',
    medallion:
      'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    unreadRow: 'bg-slate-100/60 dark:bg-slate-800/40',
    dot: 'bg-slate-500 dark:bg-slate-400',
    pip: 'bg-slate-600 text-white dark:bg-slate-400 dark:text-slate-950',
  },
  system: {
    label: 'Hệ thống',
    rail: 'bg-rose-500 dark:bg-rose-400',
    medallion:
      'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    unreadRow: 'bg-rose-50/50 dark:bg-rose-950/25',
    dot: 'bg-rose-500 dark:bg-rose-400',
    pip: 'bg-rose-500 text-white dark:bg-rose-400 dark:text-rose-950',
  },
};

/**
 * `action` → biểu tượng.
 *
 * ⚠ Khoá là giá trị TRÊN DÂY (snake_case của enum Prisma). Bản cũ tra bằng enum
 * camelCase phía client (`kycApproved`) nên mọi action nhiều từ đều trượt về
 * nhánh mặc định — đó là lý do danh sách hiện tại toàn chuông xám giống nhau.
 */
const ACTION_ICON: Readonly<Record<string, LucideIcon>> = {
  // Cộng đồng
  liked: Heart,
  commented: MessageCircle,
  message_replied: MessageCircle,
  mentioned: BellRing,
  shared: Users,
  followed: UserPlus,
  unfollowed: UserPlus,
  published: FileCheck2,
  unpublished: Ban,

  // KYC
  kyc_submitted: ShieldCheck,
  kyc_approved: ShieldCheck,
  kyc_changing: AlertTriangle,
  kyc_changed: ShieldCheck,

  // Video rèn luyện
  training_video_available: PlayCircle,
  training_video_completed: Trophy,
  training_video_cooldown_ended: PlayCircle,

  // Nhiệm vụ
  task_assigned: ClipboardList,
  task_due_soon: ClipboardList,
  task_overdue: AlertTriangle,
  task_points_earned: Trophy,
  task_completed: CheckCircle2,
  task_status_changed: ListChecks,
  task_commented: MessageCircle,
  task_deleted: Ban,
  task_restored: ListChecks,

  // Báo cáo hằng ngày
  daily_report_reminder: BellRing,
  daily_report_submitted: FileCheck2,
  daily_report_missing: AlertTriangle,
  daily_report_reopened: ListChecks,
  daily_report_help_requested: LifeBuoy,
  daily_report_help_acknowledged: CheckCircle2,
  daily_report_help_resolved: CheckCircle2,
  daily_report_help_cancelled: Ban,

  birthday_reminder: Cake,

  // Mua sắm
  rating_replied: Star,
  rating_edited: Star,
  group_buy_invite_received: Users,
  group_buy_accepted: Users,
  group_buy_declined: Ban,
  group_buy_kicked: Ban,
  group_buy_joined: Users,
  gift_recipient_notified: Gift,
  gift_card_prepared: Gift,
  gift_delivered_to_recipient: Gift,

  // Thu nhập
  direct_referral_registered: UserPlus,
  indirect_referral_registered: Users,
  direct_referral_verified: ShieldCheck,
  salary_voucher_created: Ticket,
  salary_voucher_accepted: CheckCircle2,
  salary_voucher_rejected: Ban,
  salary_voucher_settled: Coins,
  commitment_voucher_created: Ticket,
  commitment_voucher_accepted: CheckCircle2,
  commitment_voucher_rejected: Ban,
  commitment_voucher_settled: Coins,
  commission_early_settled: Coins,
  commission_early_settle_clawback: AlertTriangle,
  half_wallet_admin_processing: Wallet,
  half_wallet_rejected: Ban,
  half_transfer_approved: Wallet,
  half_transfer_rejected: Ban,
  half_manual_sent: Wallet,

  // Quản trị
  pending_approval: ClipboardList,
  mstl_eligible_pending: Trophy,

  // Động từ dùng chung
  approved: CheckCircle2,
  rejected: Ban,
  created: BellRing,
  updated: Settings2,
  deleted: Ban,
  system_alert: Package,
};

/** Biểu tượng dự phòng theo miền khi `action` chưa có mục riêng. */
const DOMAIN_FALLBACK_ICON: Record<NotificationDomain, LucideIcon> = {
  social: MessageCircle,
  shop: ShoppingBag,
  income: Coins,
  admin: Settings2,
  system: AlertTriangle,
};

export function getNotificationIcon(
  action: string | undefined,
  domain: NotificationDomain,
): LucideIcon {
  return (
    (action ? ACTION_ICON[action] : undefined) ?? DOMAIN_FALLBACK_ICON[domain]
  );
}
