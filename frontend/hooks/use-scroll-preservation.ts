/**
 * useScrollPreservation — lưu và phục hồi window.scrollY xung quanh các modal/dialog.
 *
 * Liên tục theo dõi window.scrollY khi người dùng đang lướt trang. Khi có modal mở
 * (Dialog, Drawer, AlertDialog...), nếu trình duyệt hay thư viện react-remove-scroll
 * gây giật cuộn về 0, hook sẽ chủ động giữ và phục hồi toạ độ cuộn ban đầu cả khi mở
 * lẫn khi đóng modal.
 *
 * Hỗ trợ modal lồng nhau (nested/stacked dialogs) qua reference counting.
 */
import { useEffect, useRef } from 'react';

let globalScrollY = 0;
let activeModalCount = 0;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'scroll',
    () => {
      // Chỉ cập nhật toạ độ cuộn khi không có modal nào đang mở / khóa
      if (
        activeModalCount === 0 &&
        !document.body.hasAttribute('data-scroll-locked')
      ) {
        globalScrollY = window.scrollY;
      }
    },
    { passive: true },
  );
}

export interface UseScrollPreservationOptions {
  onOpenAutoFocus?: (e: Event) => void;
  onCloseAutoFocus?: (e: Event) => void;
}

export function useScrollPreservation(
  options: UseScrollPreservationOptions = {},
) {
  const {
    onOpenAutoFocus: onOpenAutoFocusProp,
    onCloseAutoFocus: onCloseAutoFocusProp,
  } = options;
  const savedY = useRef(globalScrollY);

  useEffect(() => {
    activeModalCount += 1;
    const targetY = globalScrollY;
    savedY.current = targetY;

    // Ngay sau khi mount (nếu browser đã lỡ giật về 0), khôi phục ngay lập tức
    if (
      typeof window !== 'undefined' &&
      window.scrollY !== targetY &&
      targetY > 0
    ) {
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      // Khôi phục khi unmount
      if (typeof window !== 'undefined' && targetY > 0) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        });
      }
    };
  }, []);

  const onOpenAutoFocus = (e: Event) => {
    e.preventDefault();
    onOpenAutoFocusProp?.(e);
    const targetY = savedY.current || globalScrollY;
    if (
      typeof window !== 'undefined' &&
      window.scrollY !== targetY &&
      targetY > 0
    ) {
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }
  };

  const onCloseAutoFocus = (e: Event) => {
    e.preventDefault();
    onCloseAutoFocusProp?.(e);
    const targetY = savedY.current || globalScrollY;
    if (typeof window !== 'undefined' && targetY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: 'instant' });
      });
    }
  };

  return { onOpenAutoFocus, onCloseAutoFocus };
}
