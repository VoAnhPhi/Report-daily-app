'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    /*
     * `value` phải đi TIẾP xuống Radix, không chỉ dùng cho `transform`.
     *
     * Bản trước hủy `value` khỏi props rồi chỉ dùng nó tính `translateX`, nên
     * Radix nhận `value = null` (mặc định của nó) và bỏ hẳn thuộc tính
     * `aria-valuenow`. Hệ quả: MỌI thanh tiến độ trong repo đọc ra "thanh tiến
     * độ" trơ trọi trên trình đọc màn hình — người dùng nghe được rằng có một
     * thanh, nhưng không bao giờ biết nó đang ở bao nhiêu phần trăm. Thanh vẽ
     * ra vẫn đúng nên mắt thường không phát hiện được; lỗi này lộ ra khi có
     * test khoá `aria-valuenow`.
     *
     * `data-state` cũng đổi theo (`indeterminate` → `loading`/`complete`) —
     * đã kiểm toàn repo, không nơi nào style theo thuộc tính đó.
     */
    value={value}
    className={cn(
      'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className='h-full w-full flex-1 bg-primary transition-all'
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
