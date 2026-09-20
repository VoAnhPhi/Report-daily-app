'use client';

import { useMedia } from 'react-use';
import {
  Dialog,
  DialogContentWithoutCloseButton,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxWidth?: string;
  overlayClassName?: string;
  /**
   * Class thêm vào thân modal (Dialog ở desktop, Drawer ở mobile).
   *
   * Lý do có prop này: Radix render nội dung ra `document.body` qua portal, tức
   * là NGOÀI mọi lớp bọc theme của trang. Màn `/tasks` truyền `ws-scope` vào
   * đây để modal đổi da theo bảng màu Không gian làm việc; trang khác không
   * truyền gì nên giữ nguyên giao diện cũ.
   */
  className?: string;
  /**
   * Passed to Vaul Drawer on mobile. When false, swipe / backdrop / ESC will not dismiss the drawer
   * (useful while nested content needs vertical scroll gestures without accidentally closing).
   */
  drawerDismissible?: boolean;
  /**
   * Đặt `true` khi modal này mở CHỒNG lên một `ResponsiveModal` khác.
   *
   * ⚠ Ở dưới 768px, `ResponsiveModal` là một Drawer của `vaul`, và `vaul` quản
   * lý khoá cuộn nền bằng một trạng thái TOÀN CỤC. Hai Drawer lồng nhau mà
   * không khai `nested` thì khi Drawer TRONG đóng, `vaul` tưởng đã hết drawer
   * và GỠ khoá cuộn — trong khi Drawer NGOÀI vẫn đang mở. Hệ quả trên
   * iOS/iPadOS: nền trang cuộn được phía sau modal, và cuộn nội dung modal thì
   * kéo theo cả trang. `nested` cho `vaul` biết còn một drawer nữa ở dưới.
   *
   * Mặc định `undefined` để 11 nơi gọi hiện có không đổi hành vi.
   */
  drawerNested?: boolean;
  /**
   * When true (default), the modal content area is scrollable.
   * Set to false if children handle their own scrolling (e.g. for sticky headers/footers).
   */
  scrollable?: boolean;
}

export default function ResponsiveModal({
  children,
  open,
  onOpenChange,
  maxWidth = 'sm:max-w-lg lg:max-w-4xl 2xl:max-w-4xl',
  overlayClassName,
  drawerDismissible = true,
  drawerNested,
  scrollable = true,
  className,
}: Props) {
  const isDesktop = useMedia('(min-width: 768px)', true);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContentWithoutCloseButton
          overlayClassName={cn(
            'bg-ws-overlay backdrop-blur-[3px]',
            'duration-[220ms] ease-[cubic-bezier(.2,.8,.3,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-[140ms] data-[state=open]:fade-in-0',
            overlayClassName,
          )}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border bg-background p-0 shadow-lg',
            /* Mở 220ms theo đường cong giảm tốc của hệ thiết kế: mờ dần,
               phóng từ 0.985 và dâng lên 4px. Đóng 140ms, không dâng —
               rời màn hình thì đi thẳng, không cần kể lại. */
            'duration-[220ms] ease-[cubic-bezier(.2,.8,.3,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-[140ms]',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            /* PHẢI là số nguyên. `zoom-in-*` của tw-animate-css định nghĩa
               `--tw-enter-scale: calc(--value(number)*1%)`, nên `zoom-in-98`
               = 98%. Dạng ngoặc vuông (`zoom-in-[0.985]`) KHÔNG sinh ra rule
               nào — class lọt vào DOM mà CSS rỗng, hiệu ứng phóng biến mất
               không báo lỗi. Đã dính đúng bẫy này một lần. */
            'data-[state=open]:zoom-in-98 data-[state=closed]:zoom-out-98',
            /* 4px này AN TOÀN, khác hẳn bốn class trượt đã bỏ ở
               `components/ui/dialog.tsx`. Chúng lệch theo phần trăm kích
               thước hộp (nửa thân, 48%) nên ở Tailwind v4 cộng dồn với phép
               căn giữa thành cú bay chéo. 4px là số tuyệt đối, cộng vào giữa
               vẫn là giữa lệch 4px — đúng ý đồ. Đừng đổi sang đơn vị %. */
            'data-[state=open]:slide-in-from-bottom-1',
            /* Người bật giảm chuyển động chỉ thấy mờ dần. */
            'motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=open]:slide-in-from-bottom-0',
            maxWidth,
            className,
          )}
          aria-describedby={undefined}
        >
          <div className='sr-only'>
            <DialogTitle />
            <DialogDescription />
          </div>
          <div
            className={cn(
              scrollable && 'ws-scroll overflow-y-auto max-h-[90vh]',
            )}
          >
            {children}
          </div>
        </DialogContentWithoutCloseButton>
      </Dialog>
    );
  }

  return (
    <Drawer
      dismissible={drawerDismissible}
      nested={drawerNested}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerPortal>
        <DrawerOverlay className='bg-ws-overlay backdrop-blur-[3px]' />
        <DrawerContent
          className={cn(
            'bg-background focus:outline-none rounded-t-xl',
            className,
          )}
        >
          {/* Cột co giãn, KHÔNG phải một div trơ.
              `DrawerContent` là `flex h-auto flex-col` với trần `max-h-[80vh]`
              (`components/ui/drawer.tsx:61`). Trước đây lớp bọc này là một div
              thường nên phần "phải co lại" không truyền được xuống con, còn
              con thì tự đặt LẠI `max-h-[80vh]` — hai trần 80vh lồng nhau, cộng
              thêm `pb-8` và chiều cao tay cầm, tổng vượt quá hộp chứa đang
              `fixed bottom-0`. Hệ quả: vài chục pixel cuối của vùng cuộn nằm
              dưới mép màn hình, và footer `sticky bottom-0` của form con ghim
              vào cái đáy đã rơi khỏi tầm nhìn — trên điện thoại là mất luôn
              nút Lưu.
              Giờ chỉ còn MỘT trần (của `DrawerContent`), phần thân nhận chiều
              cao dư qua `flex-1`, và `min-h-0` cho phép nó co thật. */}
          <div className='mx-auto flex min-h-0 w-full flex-1 flex-col'>
            {/* Tay cầm do `DrawerContent` vẽ sẵn (drawer.tsx:69) — trước đây
                chỗ này vẽ thêm một cái nữa, nên có hai vạch chồng nhau. */}
            <div
              className={cn(
                scrollable && 'ws-scroll min-h-0 flex-1 overflow-y-auto pb-8 px-4',
              )}
            >
              {children}
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
