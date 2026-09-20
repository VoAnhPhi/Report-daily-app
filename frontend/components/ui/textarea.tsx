import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        /* Vòng focus theo lối Tailwind v4, ĐỒNG BỘ với `Input` bên cạnh.
         *
         * Bản cũ còn nguyên chuỗi shadcn thời v3: `ring-offset-background` +
         * `focus-visible:ring-2` + `focus-visible:ring-offset-2`. Bộ ba đó vẽ
         * ra BA lớp chồng nhau khi ô được chọn — viền 1px, khe hở 2px màu nền,
         * rồi vòng đặc 2px màu ring — nên ô nhập trông như bị viền đôi lệch
         * màu. Thấy rõ nhất ngay sau khi thêm một việc con, vì lúc đó con trỏ
         * tự quay lại ô nhập nên viền bật lên ngay trước mắt.
         *
         * `ring-[3px]` + `ring-ring/50` + `border-ring` cho ra MỘT quầng mềm
         * ôm sát viền, đúng cái `Input` đang dùng (components/ui/input.tsx:12).
         */
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
