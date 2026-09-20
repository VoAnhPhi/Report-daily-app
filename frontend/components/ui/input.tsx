import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        /* `shadow-none` khi focus — nếu không, bóng đổ và vòng focus đánh nhau.
         *
         * Trong Tailwind, `shadow-*` và `ring-*` cùng ghi vào MỘT thuộc tính
         * `box-shadow` (ring nằm trước shadow trong danh sách). Ở trạng thái
         * thường ô nhập có `shadow-xs` — một bóng đổ mảnh xuống dưới. Khi
         * focus, vòng 3px bao quanh ô và che mất phần bóng ở hai cạnh bên,
         * chỉ chừa lại hai mẩu thò ra dưới đáy: bóng trông như bị vỡ, đúng
         * chỗ người dùng đang nhìn nhất.
         * Bỏ bóng lúc focus thì chỉ còn một vòng liền — và `transition-
         * [color,box-shadow]` sẵn có làm việc chuyển đổi đó mượt. */
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-none',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
