/**
 * Chuỗi lớp Tailwind dùng chung của Báo cáo hằng ngày: track/chip lọc, họ vòng
 * focus bàn phím theo màu nền phía sau, và khuôn chú giải nổi.
 *
 * Họ `FOCUS_RING_*` dựng từ `FOCUS_RING_BASE` bằng template string nên phải nằm
 * cùng một file — tách ra là mất mối quan hệ đó.
 */

import type { CSSProperties } from 'react';

import type { DailyReportBoardState } from '@/types/daily-report.type';

/**
 * Bộ màu "KHÔNG NỘP" dùng chung cho ô lịch (Lịch sử), ô ngày (Tổng quan), chip
 * tỉ lệ và chữ trạng thái. Đỏ rất nhạt trên nền, viền và chữ đỏ - người dùng
 * chọn tông này thay cho `ws-void` (nâu đỏ, "tái quá") ngày 17/09/2026.
 * Chuỗi viết nguyên văn để Tailwind sinh được CSS.
 */
export const MISSED_CELL_CLASS =
  'border-ws-danger/20 bg-ws-danger/5 text-ws-danger/80';
export const MISSED_FILL_CLASS = 'bg-ws-danger/5 text-ws-danger/80';
export const MISSED_TEXT_CLASS = 'text-ws-danger/80';

/** Dải bọc ngoài cụm chip. `flex-wrap` vì bảng nhóm có bốn mục lọc — `all`,
 *  `pending`, `missed`, `help` (mảng `filters` trong `daily-report-board.tsx`). */
export const CHIP_TRACK_CLASS =
  'inline-flex flex-wrap items-center gap-0.5 rounded-full border border-ws-line bg-ws-surface-sunken p-0.5';

/** Một chip trong cụm. `isOn` quyết định nổi lên hay chìm vào track. */
export function filterChipClass(isOn: boolean): string {
  return isOn
    ? 'rounded-full bg-ws-surface px-2.5 py-1 font-semibold text-ws-ink shadow-ws-rest transition-colors'
    : 'rounded-full px-2.5 py-1 text-ws-ink-soft transition-colors hover:text-ws-ink';
}

/* ── Vòng focus bàn phím ───────────────────────────────────────────────────
 *
 * MỘT công thức cho cả cụm Báo cáo. Trước đây mỗi file tự chép lại chuỗi
 * `focus-visible:…` của `daily-report-history.tsx`, nên chỉ cần một chỗ chép
 * thiếu `ring-offset-*` là vòng focus ở đó lệch hẳn so với các màn còn lại.
 *
 * Vì sao có bốn bản chứ không một: `ring-offset-1` chừa một khe 1px giữa viền
 * và phần tử, và khe đó được TÔ bằng `--tw-ring-offset-color` — mặc định là
 * TRẮNG. Trên nền `ws-surface-alt` hay `ws-ground` thì khe trắng đó cắt ngang
 * vòng focus thành một vệt sáng, đọc ra như viền bị đứt. Nên màu khe phải khớp
 * ĐÚNG nền mà phần tử đang đứng lên.
 *
 * Chuỗi phải viết NGUYÊN VĂN, không ghép động (`ring-offset-ws-${x}`):
 * Tailwind quét mã nguồn theo chuỗi tĩnh, tên lớp ghép lúc chạy không sinh ra
 * CSS nào.
 */
const FOCUS_RING_BASE =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-focus focus-visible:ring-offset-1';

/** Phần tử đứng trên nền `ws-surface-alt` — cột nhóm, thẻ ngữ cảnh, hàng KPI. */
export const FOCUS_RING = `${FOCUS_RING_BASE} focus-visible:ring-offset-ws-surface-alt`;

/** Phần tử đứng trên nền `ws-surface` — thân bản báo cáo, hộp gợi ý con. */
export const FOCUS_RING_SURFACE = `${FOCUS_RING_BASE} focus-visible:ring-offset-ws-surface`;

/** Phần tử đứng thẳng trên nền trang `ws-ground` — hàng công cụ đầu màn. */
export const FOCUS_RING_GROUND = `${FOCUS_RING_BASE} focus-visible:ring-offset-ws-ground`;

/**
 * Chip nằm TRONG một `CHIP_TRACK_CLASS` — nền ngay dưới nó là `ws-surface-sunken`,
 * không phải nền tấm chứa track. Dùng nhầm `FOCUS_RING_SURFACE` ở đây là để lại
 * đúng cái vệt sáng mà cả họ hằng số này sinh ra để tránh.
 */
export const FOCUS_RING_SUNKEN = `${FOCUS_RING_BASE} focus-visible:ring-offset-ws-surface-sunken`;

/**
 * Chú giải nổi dùng chung — nội dung khai trong `ws-scope` vì Radix render nó
 * qua portal ra ngoài cây, tức là ra ngoài lớp bọc token của màn.
 *
 * Nằm ở đây thay vì trong `daily-report-workspace.tsx` (chỗ cũ của nó) vì cả
 * `DailyReportWorkspace` lẫn `ReportForm` đều dùng, mà hai thứ đó nay ở hai
 * file — để hằng này trong một trong hai file là sinh phụ thuộc vòng.
 */
export const TOOLTIP_CONTENT_CLASS =
  'ws-scope max-w-[260px] rounded-ws-chip border border-ws-line bg-ws-surface px-2.5 py-1.5 text-ws-meta leading-snug text-ws-ink shadow-ws-raised';

/**
 * Giới hạn bề ngang của chú giải nổi, đặt bằng INLINE STYLE, đi kèm
 * `TOOLTIP_CONTENT_CLASS` ở mọi chỗ dùng.
 *
 * Vì sao không đủ `max-w-[260px]`: `app/globals.css` có khối `@media
 * (max-width: 540px) { * { max-width: 100% } }` nằm NGOÀI `@layer`, nên thắng
 * mọi utility của Tailwind ở khổ điện thoại. Khung chú giải mất giới hạn, chữ
 * không xuống dòng và chạy thành một dòng dài 1721px (đo 375px, 18/09/2026).
 * Inline style thắng luật đó mà không phải đụng khối CSS dùng chung của app.
 * `100vw - 2rem`: chừa 16px mỗi bên ở màn hẹp hơn 260px + lề.
 */
export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  maxWidth: 'min(260px, calc(100vw - 2rem))',
};

/**
 * Tông badge của TÁM trạng thái trên trục duyệt, dùng chung cho bảng nhóm, lịch
 * sử và cột ngữ cảnh. Chữ LUÔN đi kèm (`BOARD_STATE_LABEL_VI`), màu chỉ là kênh
 * phụ.
 *
 * Nhóm theo việc cần làm: "Chờ duyệt" mượn `progress` (đang chờ một bước), hai
 * kết luận đạt mượn `done`, còn ba ngõ cụt cần một người ra tay ("Quá hạn
 * duyệt", "Quá hạn bổ sung", "Bị trả lại") dùng chữ `ws-danger` trên nền chìm -
 * đúng chỗ `03-bo-mau.md` dành cho con số cần chú ý.
 */
export const BOARD_STATE_BADGE_CLASS: Record<DailyReportBoardState, string> = {
  CHUA_NOP: 'bg-ws-surface-sunken text-ws-ink-soft',
  CHO_DUYET: 'bg-ws-progress-bg text-ws-progress-fg',
  /* Nền đỏ NHẠT cho ba ngõ cụt (UAT 17/09/2026: "viên nhạt có icon"). */
  QUA_HAN_DUYET: 'bg-ws-danger/10 text-ws-danger',
  DA_DUYET: 'bg-ws-done-bg text-ws-done-fg',
  TIEP_TUC: 'bg-ws-done-bg text-ws-done-fg',
  QUA_HAN_BO_SUNG: 'bg-ws-danger/10 text-ws-danger',
  BI_TRA_LAI: 'bg-ws-danger/10 text-ws-danger',
  DA_MO_LAI: 'bg-ws-surface-sunken text-ws-ink-soft',
};
