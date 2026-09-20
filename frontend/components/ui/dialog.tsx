'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot='dialog' {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot='dialog-close' {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot='dialog-overlay'
      className={cn(
        /* Lớp phủ dùng token `ws-overlay` thay `bg-black/50`.
         *
         * Đen 50% là một tấm màn thật sự tối: nội dung phía sau gần như mất
         * hẳn, và khi mở hai hộp thoại lồng nhau (chọn nhóm → chọn thành viên)
         * hai lớp chồng lên thành ~75% — màn hình gần như đen kịt. Token này
         * nhạt hơn và có chút mờ nền, đủ để tách lớp mà mắt không phải chịu
         * một mảng đen lớn. Biến khai ở `:root` nên dùng được cả ngoài
         * `.ws-scope`, tức mọi hộp thoại của app đều dịu theo. */
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-ws-overlay backdrop-blur-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = false,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const scrollProps = useScrollPreservation({
    onOpenAutoFocus,
    onCloseAutoFocus,
  });

  return (
    <DialogPortal data-slot='dialog-portal'>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot='dialog-content'
        {...scrollProps}
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className,
        )}
        {...props}
      >
        <DialogTitle>{props.title}</DialogTitle>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot='dialog-close'
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className='sr-only'>Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-header'
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

// Version without the close button
function DialogContentWithoutCloseButton({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  overlayClassName,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  overlayClassName?: string;
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Content>>;
}) {
  const scrollProps = useScrollPreservation({
    onOpenAutoFocus,
    onCloseAutoFocus,
  });

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        {...scrollProps}
        className={cn(
          /* ĐÃ BỎ bốn utility trượt của tw-animate-css (hai cái theo trục X nửa
           * thân, hai cái theo trục Y 48%). Đừng thêm lại.
           *
           * Chúng là di chứng Tailwind v3: ở v3 phép căn giữa và keyframe của
           * animation cùng ghi vào `transform` nên triệt tiêu nhau, hộp thoại chỉ
           * mờ dần tại chỗ. Tailwind v4 biên dịch `translate-x-[-50%]` thành
           * thuộc tính `translate:` RIÊNG, còn keyframe vẫn dùng `transform`.
           * Hai thuộc tính độc lập nên độ lệch không triệt tiêu mà cộng dồn —
           * hộp thoại xuất phát lệch trái nửa thân, cao hơn 48%, rồi bay chéo
           * xuống. Đó là hiện tượng "popup trượt từ trái vào".
           *
           * Không chữa được từ nơi gọi: `twMerge` không có nhóm xung đột cho
           * utility của tw-animate-css nên class ghi đè và class gốc CÙNG lọt vào
           * DOM, mà trong CSS chúng cùng độ đặc hiệu (0,2,0) — cái khai sau thắng.
           * Phải bỏ tại đây. */
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
DialogContentWithoutCloseButton.displayName = 'DialogContentWithoutCloseButton';


function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogContentWithoutCloseButton,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
