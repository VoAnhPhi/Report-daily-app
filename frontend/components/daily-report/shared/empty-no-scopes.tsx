'use client';

import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyNoScopesBodyProps {
  /** Mở hộp thoại Nhóm giao việc. Vắng mặt thì không hiện nút. */
  onOpenGroups?: () => void;
  /** Chỉ người có quyền tạo nhóm mới thấy nút — người khác chỉ đọc lời giải thích. */
  canCreateGroups: boolean;
}

/**
 * Phần THÂN của trạng thái "chưa thuộc nhóm nào có báo cáo hằng ngày".
 *
 * Cố ý KHÔNG có `<div>` bọc và KHÔNG có icon. Hai nơi dùng đặt chúng khác nhau:
 * một nơi `<div>` + `<Users/>` nằm NGOÀI nhánh điều kiện và dùng chung với
 * nhánh anh em ("Bạn không quản lý nhóm nào."), nơi kia `<div>` + `<ClipboardList/>`
 * thuộc riêng khối rỗng. Nếu component này tự dựng vỏ thì ở nơi thứ nhất sẽ
 * thành div lồng div (padding gấp đôi) và hai icon chồng nhau.
 *
 * Đây không phải trạng thái lỗi cũng không phải rỗng do lọc — nó là màn hình
 * đầu tiên của người mới, nên phải nói đủ ba điều: đang thế nào, vì sao, và
 * bước tiếp theo là gì.
 */
export function EmptyNoScopesBody({
  onOpenGroups,
  canCreateGroups,
}: EmptyNoScopesBodyProps) {
  return (
    <>
      <p className='text-sm font-medium text-ws-ink'>
        Bạn chưa thuộc nhóm nào có báo cáo hằng ngày
      </p>
      <p className='mt-1 max-w-[340px] text-xs text-ws-ink-faint'>
        Báo cáo hằng ngày chạy theo nhóm giao việc. Tạo một nhóm rồi bật báo cáo
        cho nhóm đó, hoặc chờ trưởng nhóm thêm bạn vào nhóm của họ.
      </p>
      {onOpenGroups && canCreateGroups && (
        <Button size='sm' className='mt-4' onClick={onOpenGroups}>
          <Users className='mr-1.5 h-3.5 w-3.5' />
          Tạo nhóm
        </Button>
      )}
    </>
  );
}
