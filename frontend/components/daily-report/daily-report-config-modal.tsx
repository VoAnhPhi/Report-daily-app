'use client';

import { Settings2, X } from 'lucide-react';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { DailyReportConfigPanel } from './daily-report-config-panel';
import { cn } from '@/lib/utils';
import { FOCUS_RING_SURFACE } from './daily-report-utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Scope đang xem. Popup này chỉ nói về ĐÚNG nhóm đó. */
  scopeId: string | null;
  scopeName?: string;
}

/**
 * Cấu hình báo cáo của MỘT nhóm.
 *
 * Tách khỏi `TaskGroupModal` vì hai popup trả lời hai câu hỏi khác nhau:
 * "tôi có những nhóm nào" (danh sách, tạo, xoá) và "nhóm này chạy thế nào"
 * (bật/tắt, ngày trong tuần, mốc giờ). Trước đây nút mang nhãn "Cấu hình" lại
 * mở ra danh sách, và ở màn Báo cáo thì hành vi chính của danh sách — bấm một
 * nhóm để áp dụng thành viên — còn bị vô hiệu hoá, tức người dùng phải tự tìm
 * lại đúng nhóm mình đang xem rồi bấm bút chì.
 */
export function DailyReportConfigModal({
  isOpen,
  onClose,
  scopeId,
  scopeName,
}: Props) {
  return (
    /* `ResponsiveModal` thay `Dialog` trần: dưới 768px nó đổi sang Drawer trồi
       lên từ đáy. Popup này còn bốn khối cấu hình (danh mục KPI đã dời sang
       `DailyReportKpiModal`), nên trên điện thoại bản Dialog cũ là một hộp lơ
       lửng giữa màn phải cuộn trong lòng — kiểu tương tác mà mọi popup khác
       của Không gian làm việc đã bỏ từ lâu.

       `ws-scope` PHẢI nằm trên chính thân modal: Radix render nội dung qua
       portal ra thẳng `document.body`, tức NGOÀI lớp bọc `.ws-scope` của màn
       Báo cáo hằng ngày. Thiếu nó thì mọi primitive shadcn bên trong (Switch,
       Select, Button, ConfirmationDialog) rơi về da mặc định, nên popup đọc ra
       như của một app khác — đúng lỗi đã thấy. */
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
      <section aria-labelledby='daily-report-config-title'>
        <header className='flex items-start gap-2 border-b border-ws-line px-4 py-3'>
          <div className='min-w-0 flex-1 space-y-1'>
            <h2
              id='daily-report-config-title'
              className='flex items-center gap-2 text-ws-h2 font-semibold text-ws-ink'
            >
              <Settings2
                aria-hidden='true'
                className='h-4 w-4 shrink-0 text-ws-ink-soft'
              />
              Cấu hình báo cáo
            </h2>
            <p className='text-ws-meta text-ws-ink-faint'>
              {scopeName
                ? `Chỉ áp dụng cho ${scopeName}. Mọi thay đổi lưu ngay.`
                : 'Mọi thay đổi lưu ngay, không cần bấm nút.'}
            </p>
          </div>
          {/* Nút đóng phải TỰ VẼ. `DialogContent` cũ kèm sẵn một dấu X;
              `ResponsiveModal` dựng trên `DialogContentWithoutCloseButton` nên
              nếu không thêm lại thì trên desktop popup chỉ còn ESC và bấm ra
              ngoài — hai đường mà không có gì trên màn hình nói ra. */}
          <button
            type='button'
            aria-label='Đóng cấu hình báo cáo'
            onClick={onClose}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-ws-pill text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink',
              FOCUS_RING_SURFACE,
            )}
          >
            <X aria-hidden='true' className='h-4 w-4' />
          </button>
        </header>

        <div className='p-3'>
          <DailyReportConfigPanel groupId={null} scopeId={scopeId} />
          {/* Câu dẫn này đứng đúng chỗ khối "Danh mục KPI" vừa dời đi. Người đã
              quen mở popup này để sửa KPI mà thấy mục biến mất sẽ kết luận
              tính năng bị gỡ — bỏ câu này đi là để lại đúng ngõ cụt đó.

              ⚠ Câu dưới đây là văn bản HIỂN THỊ, không phải chú thích, nên
              `rg` theo tên định danh KHÔNG tìm ra nó. Nó đã sai HAI vòng liên
              tiếp, cả hai lần vì cùng một lý do: nó TẢ VỊ TRÍ của nút KPI trên
              đầu bảng, mà vị trí đó đổi mỗi khi có người sắp lại đầu bảng.

              Nên nay nó chỉ tên MÀN. Bảng theo dõi nhóm là màn duy nhất mang
              nút mở danh mục KPI trong cả repo, và điều đó bền hơn nhiều so với
              "cạnh nút X" hay "cuối hàng Y". Nếu bạn thấy muốn thêm lại một câu
              tả vị trí cho "rõ hơn" — đó đúng là thứ đã hỏng hai lần. */}
          {scopeId && (
            <p className='mt-4 border-t border-ws-line pt-4 text-ws-meta text-ws-ink-faint'>
              Danh mục KPI nay quản lý ở{' '}
              <span className='font-semibold text-ws-ink-soft'>
                bảng theo dõi nhóm
              </span>
              .
            </p>
          )}
        </div>
      </section>
    </ResponsiveModal>
  );
}
