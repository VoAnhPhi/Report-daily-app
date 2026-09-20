'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Target, Trash2, X } from 'lucide-react';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FOCUS_RING, FOCUS_RING_SURFACE } from '../utils/classes';
import {
  useArchiveReportKpi,
  useCreateReportKpi,
  useReportKpis,
  useUpdateReportKpi,
} from '@/hooks/queries/daily-report-queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Scope đang xem. Popup này chỉ nói về ĐÚNG nhóm đó. */
  scopeId: string | null;
  scopeName?: string;
}

/**
 * Một nút icon quản lý KPI.
 *
 * Gom thành component vì cả ba nút chỉ khác nhau icon, nhãn và việc phải làm —
 * để rời thì mỗi lần sửa vòng focus hay vùng chạm phải sửa ba chỗ, và lần
 * trước đúng là đã sót: cả ba chỉ có `title`, không có `aria-label`, nên trình
 * đọc màn hình đọc ra ba nút TRỐNG TÊN đứng cạnh nhau.
 *
 * Tooltip giữ NGUYÊN câu chữ của `title` cũ. `aria-label` thì thêm tên KPI:
 * một hàng có ba nút, mà cả danh sách có thể mười hàng — ba mươi nút cùng đọc
 * ra "Đưa KPI lên" thì người dùng trình đọc màn hình không biết mình đang ở
 * dòng nào. Nhãn nhìn thấy được không cần tên đó vì mắt đã thấy nó ngay bên
 * trái; nhãn nghe được thì cần.
 */
function KpiIconButton({
  label,
  ariaLabel,
  onClick,
  disabled,
  danger,
  children,
}: {
  /** Câu chữ hiện trong tooltip — đúng bản `title` cũ. */
  label: string;
  /** Nhãn cho trình đọc màn hình, có kèm tên KPI của hàng. */
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={onClick}
            className={cn(
              /* 36x36 thay cho 28x28 cũ. Hàng KPI cao ~48px nên nút to lên
                 không đẩy hàng cao thêm, mà ba nút dính nhau trong một hàng
                 dày đặc là đúng chỗ dễ bấm nhầm nhất — nhầm ở đây là ngừng
                 dùng một KPI. Khe giữa hai nút là `gap-2` = 8px, đúng sàn. */
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-ws-chip text-ws-ink-faint transition-colors disabled:pointer-events-none disabled:opacity-30',
              danger
                ? 'hover:bg-ws-void-bg hover:text-ws-danger'
                : 'hover:bg-ws-surface-sunken hover:text-ws-ink',
              FOCUS_RING,
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent className='ws-scope text-ws-meta'>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Danh mục KPI của MỘT nhóm.
 *
 * Tách khỏi `DailyReportConfigModal` vì hai popup trả lời hai câu hỏi khác
 * nhau, và trả lời với nhịp khác nhau: "nhóm này chạy thế nào" (bật/tắt, ngày
 * trong tuần, mốc giờ) là việc dựng một lần rồi hầu như không đụng lại, còn
 * "nhóm này đo bằng những KPI nào" là việc sửa đi sửa lại theo từng đợt. Nhét
 * chung thì mỗi lần thêm một KPI đều phải cuộn qua bốn khối cấu hình không
 * liên quan, và khối KPI — thứ dài nhất, hay đổi nhất — luôn nằm cuối cùng.
 *
 * Vì vậy nó có nút riêng: `BoardKpiManageButton` (`board/board-kpi-summary.tsx`),
 * đứng ở HÀNG TIÊU ĐỀ NHÓM cạnh nút "Cấu hình báo cáo" — dời tới đó 26/08/2026,
 * lần thứ ba, lý do đầy đủ ghi ở docblock của chính nút. File mount cả nút lẫn
 * popup này là `daily-report-workspace.tsx`.
 *
 * KHÔNG còn ở hàng tiêu đề chung cạnh nút "Nhóm giao việc" nữa (dời 25/08):
 * `daily-report-route-shell.tsx` không còn tham chiếu nào tới popup này, mở
 * file đó tìm nút là mất công. Và nút ở bảng nhóm là lối vào DUY NHẤT tới
 * popup trong cả repo — gỡ nó là mất hẳn đường vào danh mục KPI.
 */
export function DailyReportKpiModal({
  isOpen,
  onClose,
  scopeId,
  scopeName,
}: Props) {
  const [kpiName, setKpiName] = useState('');
  const { data: kpis = [] } = useReportKpis(scopeId);
  const createKpi = useCreateReportKpi();
  const archiveKpi = useArchiveReportKpi();
  const updateKpi = useUpdateReportKpi();
  const addKpi = () => {
    const name = kpiName.trim();
    if (!scopeId || !name) return;
    createKpi.mutate({ scopeId, name }, { onSuccess: () => setKpiName('') });
  };
  const moveKpi = async (index: number, direction: -1 | 1) => {
    if (!scopeId) return;
    const current = kpis[index];
    const adjacent = kpis[index + direction];
    if (!current || !adjacent) return;

    const currentOrder = current.sortOrder ?? index;
    const adjacentOrder = adjacent.sortOrder ?? index + direction;
    await Promise.all([
      updateKpi.mutateAsync({
        scopeId,
        kpiId: current.id,
        payload: { sortOrder: adjacentOrder },
      }),
      updateKpi.mutateAsync({
        scopeId,
        kpiId: adjacent.id,
        payload: { sortOrder: currentOrder },
      }),
    ]);
  };
  return (
    /* `ResponsiveModal` thay `Dialog` trần: dưới 768px nó đổi sang Drawer trồi
       lên từ đáy. Danh sách KPI dài theo số KPI của nhóm, nên trên điện thoại
       bản Dialog là một hộp lơ lửng giữa màn phải cuộn trong lòng — kiểu tương
       tác mà mọi popup khác của Không gian làm việc đã bỏ từ lâu.

       `ws-scope` PHẢI nằm trên chính thân modal: Radix render nội dung qua
       portal ra thẳng `document.body`, tức NGOÀI lớp bọc `.ws-scope` của màn
       /tasks. Thiếu nó thì mọi primitive shadcn bên trong (Input, Button,
       Tooltip) rơi về da mặc định, nên popup đọc ra như của một app khác. */
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      maxWidth='sm:max-w-lg'
      className='ws-scope'
    >
      {/* Tiêu đề tự vẽ chứ không dùng `DialogHeader`: `ResponsiveModal` đã đặt
          sẵn một `DialogTitle` ẩn để giữ đúng chuẩn a11y của Radix, và bản
          Drawer ở mobile không có `DialogHeader` để mà dùng. `aria-labelledby`
          nối vùng nội dung với tiêu đề nhìn thấy được. */}
      <section aria-labelledby='daily-report-kpi-title'>
        <header className='flex items-start gap-2 border-b border-ws-line px-4 py-3'>
          <div className='min-w-0 flex-1 space-y-1'>
            <h2
              id='daily-report-kpi-title'
              className='flex items-center gap-2 text-ws-h2 font-semibold text-ws-ink'
            >
              <Target
                aria-hidden='true'
                className='h-4 w-4 shrink-0 text-ws-ink-soft'
              />
              Danh mục KPI
            </h2>
            <p className='text-ws-meta text-ws-ink-faint'>
              {scopeName
                ? `Chỉ áp dụng cho nhóm ${scopeName}. Thành viên sẽ tự chọn KPI đã đạt khi viết báo cáo.`
                : 'Thành viên sẽ tự chọn KPI đã đạt khi viết báo cáo.'}
            </p>
          </div>
          {/* Nút đóng phải TỰ VẼ. `DialogContent` cũ kèm sẵn một dấu X;
              `ResponsiveModal` dựng trên `DialogContentWithoutCloseButton` nên
              nếu không thêm lại thì trên desktop popup chỉ còn ESC và bấm ra
              ngoài — hai đường mà không có gì trên màn hình nói ra. */}
          <button
            type='button'
            aria-label='Đóng danh mục KPI'
            onClick={onClose}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-ws-pill text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink',
              FOCUS_RING_SURFACE,
            )}
          >
            <X aria-hidden='true' className='h-4 w-4' />
          </button>
        </header>

        {/* `scopeId` null thì không có nhóm nào để hỏi KPI: mọi mutation đều
            cần id, nên vẽ ô nhập ra chỉ tạo một cái bẫy bấm không ăn. Điều
            kiện này cũng chính là thứ thu hẹp kiểu `scopeId` xuống `string`
            cho bốn lời gọi mutation bên trong. */}
        {scopeId && (
          <div className='p-3'>
            <div className='flex gap-2'>
              <Input
                value={kpiName}
                maxLength={200}
                aria-label='Tên KPI mới'
                placeholder='Tên KPI mới'
                onChange={(event) => setKpiName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addKpi();
                  }
                }}
              />
              <Button
                type='button'
                size='sm'
                disabled={!kpiName.trim() || createKpi.isPending}
                onClick={addKpi}
                className={cn('shrink-0', FOCUS_RING)}
              >
                <Plus aria-hidden='true' className='mr-1 h-3.5 w-3.5' />
                Thêm
              </Button>
            </div>
            <div className='mt-2 space-y-1'>
              {kpis.map((kpi, index) => (
                <div
                  key={kpi.id}
                  className='flex items-center gap-2 rounded-ws-control bg-ws-surface-alt px-1.5 py-2'
                >
                  <Input
                    defaultValue={kpi.name}
                    aria-label={`Tên KPI ${kpi.name}`}
                    onBlur={(event) => {
                      const name = event.target.value.trim();
                      if (name && name !== kpi.name)
                        updateKpi.mutate({
                          scopeId,
                          kpiId: kpi.id,
                          payload: { name },
                        });
                    }}
                    /* `shadow-none`: `Input` mang sẵn `shadow-xs`, mà ô này
                       không viền không nền nên chỉ còn lại một vệt bóng đen dưới
                       chân ô (UAT 18/09/2026). Khi sửa thì nổi lên bằng nền
                       trắng + viền, thay cho vòng `ring` 3px của shadcn. */
                    className='h-9 min-w-0 flex-1 border-transparent bg-transparent px-2 text-ws-body shadow-none hover:border-ws-line focus-visible:border-ws-line-strong focus-visible:bg-ws-surface focus-visible:ring-0'
                  />
                  <KpiIconButton
                    label='Đưa KPI lên'
                    ariaLabel={`Đưa KPI ${kpi.name} lên`}
                    disabled={index === 0 || updateKpi.isPending}
                    onClick={() => void moveKpi(index, -1)}
                  >
                    <ChevronUp aria-hidden='true' className='h-3.5 w-3.5' />
                  </KpiIconButton>
                  <KpiIconButton
                    label='Đưa KPI xuống'
                    ariaLabel={`Đưa KPI ${kpi.name} xuống`}
                    disabled={index === kpis.length - 1 || updateKpi.isPending}
                    onClick={() => void moveKpi(index, 1)}
                  >
                    <ChevronDown aria-hidden='true' className='h-3.5 w-3.5' />
                  </KpiIconButton>
                  {/* `disabled` khi đang gửi — hai nút mũi tên kề bên đã có,
                      riêng nút này thì thiếu. Hậu quả không chỉ là mất phản
                      hồi: nút vẫn bấm lại được trong lúc request đầu còn bay,
                      nên bấm hai nhịp là hai lệnh archive cho cùng một KPI. */}
                  <KpiIconButton
                    label='Ngừng sử dụng KPI'
                    ariaLabel={`Ngừng sử dụng KPI ${kpi.name}`}
                    danger
                    disabled={archiveKpi.isPending}
                    onClick={() =>
                      archiveKpi.mutate({ scopeId, kpiId: kpi.id })
                    }
                  >
                    <Trash2 aria-hidden='true' className='h-3.5 w-3.5' />
                  </KpiIconButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </ResponsiveModal>
  );
}
