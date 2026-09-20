import { CheckCircle2, LifeBuoy } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Chỉ báo trạng thái của một yêu cầu hỗ trợ. MỘT hình dạng dùng ở cả ba chỗ
 * người dùng gặp nó - dòng dưới câu 3 của bản, danh sách trong Tổng quan, và
 * chip trên bảng nhóm - vì trước vòng sửa 16/09/2026 ba chỗ đó tự vẽ ba kiểu
 * khác nhau (chữ có màu, chip bo tròn, dòng có icon) cho cùng hai trạng thái.
 *
 * Icon đi kèm chữ chứ không thay chữ: trạng thái không được phép chỉ nói bằng
 * màu (`color-not-only`), và cũng không được là icon trơ không có tên.
 *
 * `label` để đổi CÁCH GỌI theo chủ thể của từng màn, không đổi trạng thái: trên
 * bảng nhóm, chip nói về BẢN BÁO CÁO ("Cần hỗ trợ"), còn trong danh sách yêu
 * cầu thì nó nói về chính YÊU CẦU ("Chưa giải quyết").
 */
export function HelpStatusPill({
  resolved,
  label,
  className,
}: {
  resolved: boolean;
  label?: string;
  className?: string;
}) {
  const Icon = resolved ? CheckCircle2 : LifeBuoy;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-ws-surface-sunken px-1.5 py-0.5 text-ws-micro font-semibold',
        resolved ? 'text-ws-done-fg' : 'text-ws-danger',
        className,
      )}
    >
      <Icon aria-hidden='true' className='h-3 w-3 shrink-0' />
      {label ?? (resolved ? 'Đã giải quyết' : 'Chưa giải quyết')}
    </span>
  );
}
