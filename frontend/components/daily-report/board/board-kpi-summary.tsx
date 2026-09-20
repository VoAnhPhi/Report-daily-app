'use client';

import { ChevronDown, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { BoardKpiSummary } from '@/types/daily-report.type';
import {
  FOCUS_RING,
  FOCUS_RING_SURFACE,
  TOOLTIP_CONTENT_CLASS,
  TOOLTIP_CONTENT_STYLE,
} from '../utils/classes';

/**
 * Tổng hợp KPI của ĐÚNG ngày đang xem trên bảng theo dõi nhóm: một con số
 * chung bấm được, bung ra danh sách từng KPI kèm thanh phần trăm.
 *
 * Tách làm BA export chứ không một khối liền vì ba mảnh nằm ở ba chỗ khác nhau
 * trong cây `daily-report-board.tsx`: chip bấm được gộp vào hàng thống kê sẵn
 * có ("2/3 đã nộp"), danh sách bung ra nằm dưới thanh tiến độ, còn nút vào
 * danh mục KPI đứng cuối hàng điều hướng ngày — hàng DUY NHẤT của đầu bảng nằm
 * ngoài `{data && (` (vì sao, xem docblock của `BoardKpiManageButton`). Gói
 * chung là buộc phải kéo cả ba hàng đó vào file này.
 *
 * Vì sao chip gộp vào hàng có sẵn thay vì đứng riêng một tầng: ở bề ngang 375px
 * đầu bảng đã mang tên nhóm, cụm điều hướng ngày, nút danh mục KPI, hàng thống
 * kê, nút Tổng hợp, thanh tiến độ và bốn chip lọc — thêm một tầng nữa là hàng
 * thành viên đầu tiên bị đẩy xuống dưới nếp gấp (cùng lý do đã ghi ở cụm chip
 * lọc trong `daily-report-board.tsx`). Danh sách bung ra được phép chiếm tầng riêng vì
 * mặc định nó đóng.
 */

/**
 * Nhóm chưa khai KPI nào thì cả cụm BIẾN MẤT, không hiện "0%".
 *
 * `0%` là một khẳng định: "cả nhóm không ai đạt KPI nào". Với nhóm chưa có
 * danh mục KPI thì đó là lời buộc tội sai — mẫu số bằng 0, không phải tử số
 * bằng 0. `kpiSummary` còn có thể VẮNG khi bảng đọc từ bản server cũ hơn đợt
 * thêm trường, nên kiểm cả `summary` chứ không chỉ `items`.
 */
function hasKpi(summary: BoardKpiSummary | undefined): boolean {
  return Boolean(summary?.items?.length);
}

export function BoardKpiToggle({
  summary,
  isOpen,
  onToggle,
  panelId,
}: {
  summary: BoardKpiSummary | undefined;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  if (!hasKpi(summary)) return null;

  return (
    <button
      type='button'
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className={cn(
        /* 44px trên điện thoại, hạ về 36px từ `sm` trở lên để khớp chiều cao
           nút Tổng hợp đứng cùng hàng. Cùng khuôn với các ô ngày ở màn Lịch
           sử (`min-h-11 sm:min-h-9`).

           Nền TRẮNG có viền, cỡ chữ `ws-cell`, chữ `font-medium` (18/09/2026):
           từ khi hàng số liệu bị bỏ, chip này không còn thừa hưởng `text-ws-chip`
           của hàng đó nên nhảy lên cỡ chữ mặc định và đọc ra như nút chính. Nó
           là thứ để LIẾC, không phải hành động chính của bảng. */
        'inline-flex min-h-11 items-center gap-1 rounded-full border border-ws-line bg-ws-surface px-2.5 text-ws-cell font-medium text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink sm:min-h-9',
        FOCUS_RING_SURFACE,
      )}
    >
      <span className='tabular-nums'>
        KPI{' '}
        <span className='font-semibold text-ws-ink'>
          {summary?.achievedPercent ?? 0}%
        </span>
      </span>
      {/* Chữ chỉ đọc được bằng mắt là "KPI 45%" — không nói được 45% của cái
          gì, cũng không nói bấm vào thì ra gì. Nhãn phụ này bù đúng hai điều
          đó cho trình đọc màn hình mà không làm hàng thống kê dài thêm. */}
      <span className='sr-only'>
        tỷ lệ đạt trung bình của ngày — bấm để xem từng KPI
      </span>
      <ChevronDown
        className={cn(
          'h-3.5 w-3.5 shrink-0 text-ws-ink-ghost transition-transform',
          isOpen && 'rotate-180',
        )}
        aria-hidden='true'
      />
    </button>
  );
}

/**
 * Lối vào DANH MỤC KPI của nhóm — đứng ngay cạnh nút "Cấu hình báo cáo" trên
 * hàng tiêu đề nhóm của `daily-report-workspace.tsx`.
 *
 * **Đã dời lần thứ ba, 26/08/2026, theo yêu cầu chủ dự án.** Hai bản trước:
 * hàng công cụ chung ở `daily-report-route-shell.tsx`, rồi cuối hàng điều hướng
 * ngày ở đầu bảng nhóm. Bản này đưa nó về cùng chỗ với nút Cấu hình, và đó là
 * chỗ hợp lý nhất: hai nút là một CẶP — cùng phạm vi (nhóm đang xem), cùng điều
 * kiện hiện (`isManagerOfActive`), cùng là lối vào cấu hình chứ không phải thao
 * tác trên dữ liệu của một ngày. Vì thế chúng dùng chung một khuôn 40×40 có
 * viền; đừng đổi khuôn của riêng một nút.
 *
 * Đánh đổi phải chịu: nút nay hiện ở CẢ ba màn `report` / `board` / `summary`
 * chứ không riêng màn "Nhóm". Đây là điều bản trước cố tránh — danh mục KPI chỉ
 * nói lên điều gì ở màn Nhóm. Đổi lại, nó không còn biến mất theo trạng thái
 * tải của bảng, và người dùng luôn tìm thấy nó ở một chỗ cố định.
 *
 * Vì sao KHÔNG đứng cạnh chip `BoardKpiToggle`, dù nghe hợp lý hơn hẳn: chip đó
 * nằm trong hàng thống kê, mà cả hàng ấy bọc trong `{data && (` vì nó in
 * `data.stats`. Nút đứng đó là tắt suốt lượt tải và mất HẲN ở nhánh `isError`.
 * Nút này không đọc con số nào của `data` — chỉ cần `scopeId` và quyền — và nó
 * là lối vào DUY NHẤT tới `DailyReportKpiModal` trong cả repo, nên đúng lúc
 * bảng hỏng lại là lúc không được phép mất đường vào. Ở chỗ mới, nút nằm hẳn
 * ngoài cây của `DailyReportBoard` nên ràng buộc đó thoả một cách hiển nhiên.
 *
 * Nút này KHÔNG đi qua `hasKpi`, khác hẳn hai export kia: nhóm chưa khai KPI
 * nào mới là lúc cần vào danh mục nhất. Ẩn theo `hasKpi` là khoá cửa đúng lúc
 * người ta cần mở.
 *
 * Chỉ có icon nên `aria-label` là tên đọc được DUY NHẤT; `title=` của trình
 * duyệt không thay được vì nó không hiện khi Tab tới và không bao giờ hiện
 * trên cảm ứng — dùng Tooltip của Radix, đúng cách hàng tiêu đề chung đang làm.
 */
export function BoardKpiManageButton({
  scopeName,
  onOpen,
}: {
  /** Tên nhóm cho nhãn đọc được. Vắng khi bảng chưa có dữ liệu. */
  scopeName?: string;
  onOpen: () => void;
}) {
  const label = scopeName
    ? `Danh mục KPI của ${scopeName}`
    : 'Danh mục KPI của nhóm';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            aria-label={label}
            onClick={onOpen}
            className={cn(
              /* Khuôn PHẢI trùng từng lớp với nút "Cấu hình báo cáo" đứng ngay
                 cạnh trong `daily-report-workspace.tsx` — 40×40, bo
                 `ws-control`, có viền và nền. Hai nút đọc thành một cặp; lệch
                 một pixel là hàng tiêu đề nhóm gãy nhịp. Sửa một nút thì sửa cả
                 hai.

                 ⚠ Bề ngang phải là `w-*`, KHÔNG được dùng `min-w-*`.
                 `app/globals.css` mở một khối `@media (max-width: 540px)` ghi
                 chú "Surface Duo specific fixes", trong đó đặt `min-width: 0`
                 cho mọi `input, select, button`. Khối ấy nằm NGOÀI mọi
                 `@layer`, còn Tailwind v4 để utilities trong `@layer utilities`
                 — theo tầng xếp lớp của CSS, luật không phân lớp thắng luật
                 phân lớp bất kể độ đặc hiệu. Nên `min-w-*` bị vô hiệu dưới
                 541px và nút co về đúng bề rộng icon: đo được `min-width: 0px`
                 và nút rộng **16px** ở 320/375, dưới sàn chạm 24px của WCAG 2.2
                 AA. `width` không bị khối đó đụng tới nên `w-10` giữ được.

                 `FOCUS_RING` (offset `ws-surface-alt`) chứ không phải
                 `FOCUS_RING_SURFACE` như hồi nút còn ở đầu bảng: nền dưới nút
                 nay là hàng tiêu đề nhóm, đúng nền mà nút Cấu hình kề bên đang
                 lấy offset theo. */
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-ws-control border border-ws-line bg-ws-surface text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink',
              FOCUS_RING,
            )}
          >
            {/* 17px, đúng bằng icon của nút "Cấu hình báo cáo" kề bên — icon
                16px trong khuôn 40px đọc ra nhỏ hơn hẳn khi đứng cạnh nó. */}
            <Target className='h-[17px] w-[17px]' aria-hidden='true' />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className={TOOLTIP_CONTENT_CLASS}
          style={TOOLTIP_CONTENT_STYLE}
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BoardKpiPanel({
  summary,
  id,
  isOpen,
}: {
  summary: BoardKpiSummary | undefined;
  id: string;
  isOpen: boolean;
}) {
  if (!hasKpi(summary)) return null;

  return (
    /* Vẽ sẵn rồi ẩn bằng thuộc tính `hidden`, KHÔNG tháo khỏi cây khi đóng:
       `aria-controls` của nút phải trỏ tới một phần tử CÓ THẬT, nếu không
       trình đọc màn hình chỉ đọc được "đã thu gọn" mà không tìm ra thứ vừa
       được thu gọn. Danh sách này tối đa vài dòng nên giữ trong DOM không
       tốn gì.

       ⚠ `hidden` còn ăn được là CHỈ VÌ div này không mang class `display`
       nào. `[hidden]{display:none}` của preflight nằm ở `@layer base`, còn
       utility của Tailwind ở `@layer utilities` — theo tầng xếp lớp thì
       utility thắng bất kể độ đặc hiệu. Thêm `block` hay `flex` vào đây là
       khung KPI hiện vĩnh viễn, không báo lỗi gì. Bốn class dưới đây an toàn
       vì không class nào đặt `display`.

       TRẦN CHIỀU CAO là bắt buộc, không phải trang trí. Khung này nằm BÊN
       TRONG thanh đầu bảng `sticky` của `daily-report-board.tsx`. Không có
       trần thì bung khung ra là thanh sticky cao thêm đúng bằng danh sách
       KPI, mà nó thì dính lại — nên danh sách thành viên bị đẩy xuống dưới và
       cuộn kiểu gì cũng không tới, phải bấm thu khung mới xem được. Nhóm càng
       nhiều KPI càng kẹt.

       Số trừ là ba thứ ĐO ĐƯỢC trên trang thật, không phải ước lượng: thanh
       sticky khi đóng khung + `mt-3` 12px + chỗ chừa cho 3 hàng thành viên.
       Hai giá trị vì đầu bảng cao khác nhau theo khổ — dưới `sm` các hàng
       dùng khuôn chạm 44px và tên nhóm xuống dòng nên thanh sticky đo được
       230px, từ `sm` trở lên là 162px:

         < sm : 230 + 12 + 234 = 476px → `30rem`
         ≥ sm : 162 + 12 + 250 = 424px → `26.5rem`

       Bỏ biến thể mobile đi thì điện thoại chỉ còn 2 hàng, và câu "chừa 3
       hàng" ở trên thành một lời hứa sai. Sàn `7.5rem` để khung hình thấp vẫn
       đọc được khung; trần `26rem` để màn rất cao không biến cả đầu bảng
       thành một bức tường.

       `overscroll-contain` để cuộn hết danh sách thì dừng ở đó, không kéo
       theo cả trang — cùng lý do đã ghi ở dải ngày của màn Tổng hợp. Nó là
       `overscroll-behavior` chứ không phải `overflow`, và đặt trên con cháu
       của phần tử sticky, nên điều cấm "đừng thêm overflow cho TỔ TIÊN của
       sticky" ở `daily-report-workspace.tsx` không bị chạm tới. */
    <div
      id={id}
      hidden={!isOpen}
      className='ws-scroll mt-3 max-h-[clamp(7.5rem,calc(100vh-var(--ws-sticky-top,0px)-30rem),26rem)] overflow-y-auto overscroll-contain rounded-ws-block border border-ws-line bg-ws-surface-alt px-3 py-2.5 sm:max-h-[clamp(7.5rem,calc(100vh-var(--ws-sticky-top,0px)-26.5rem),26rem)]'
    >
      <ul className='space-y-2.5'>
        {(summary?.items ?? []).map((item) => (
          <li key={item.kpiId}>
            <div className='flex items-baseline justify-between gap-2'>
              {/* KHÔNG `truncate`: tên KPI tiếng Việt hay dài ("Gọi lại khách
                  chưa chốt trong ngày"), mà cắt đuôi ở đây là bỏ đúng phần
                  phân biệt KPI này với KPI kia. Cho nó xuống dòng — cả khối
                  chỉ hiện khi người dùng chủ động bung ra. */}
              <span className='min-w-0 text-ws-meta text-ws-ink'>
                {item.name}
              </span>
              <span className='shrink-0 text-ws-chip tabular-nums text-ws-ink-soft'>
                {item.achievedMembers}/{item.totalMembers} · {item.percent}%
              </span>
            </div>
            {/* Cùng primitive với thanh tiến độ "đã nộp" ở trên: nó tự mang
                `role="progressbar"` và `aria-valuenow`. Màu thanh chạy phải
                đặt qua selector con vì primitive không mở prop cho Indicator. */}
            <Progress
              value={item.percent}
              aria-label={`${item.name}: ${item.achievedMembers} trên ${item.totalMembers} người đạt`}
              className='mt-1.5 h-1.5 rounded-ws-bar bg-ws-surface-sunken [&>div]:bg-ws-done-edge'
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
