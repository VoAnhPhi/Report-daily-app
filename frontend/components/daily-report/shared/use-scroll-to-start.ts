'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Đưa đầu một khối danh sách về ngay dưới các thanh dính sau khi người dùng đổi
 * trang hoặc đổi bộ lọc của khối đó.
 *
 * Vì sao cần: đổi trang ở cuối danh sách, hoặc đổi sang một tab ngắn hơn, thì
 * trình duyệt giữ nguyên vị trí cuộn (hoặc kẹp nó lại khi trang ngắn đi). Người
 * dùng đứng giữa nội dung mới và phải tự kéo lên tìm đầu khối (UAT 17/09/2026,
 * đo 375px: tiêu đề "Thành viên" nằm ở -742px sau khi bấm trang 2).
 *
 * Cách dùng: `const [ref, request] = useScrollToStart()`, gắn `ref` lên khối, đặt `scroll-margin-top` cho khối bằng tổng
 * chiều cao các thanh dính phía trên nó, và gọi `request()` trong ĐÚNG các
 * handler đổi trang/bộ lọc. Không nối vào `useEffect` theo số trang: số trang
 * còn bị đặt lại bởi những thao tác khác (đổi khoảng ngày ở đầu màn), và khi đó
 * kéo màn xuống khối này là giật màn ngoài ý muốn.
 *
 * `request()` tăng một bộ đếm nên cuộn chạy trong lượt commit của CHÍNH thao
 * tác đó, sau khi DOM đã đổi và trước khi vẽ.
 */
export function useScrollToStart<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    if (tick === 0 || !ref.current) return;
    scrollElementToStart(ref.current);
  }, [tick]);

  const request = useCallback(() => setTick((value) => value + 1), []);
  /* Tuple chứ không object: lint của React Compiler coi mọi thuộc tính của một
     object chứa ref là ref, nên `x.request` trong JSX bị chặn. */
  return [ref, request] as const;
}

/**
 * Đầu khối đã nằm ngay dưới thanh dính (trong 1/4 màn hình đầu) thì để yên:
 * bấm một chip ở đầu khối mà màn vẫn nhích là giật vô cớ.
 */
function scrollElementToStart(element: HTMLElement) {
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const top = element.getBoundingClientRect().top;
  if (top >= margin - 1 && top <= margin + window.innerHeight * 0.25) return;
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  element.scrollIntoView({
    block: 'start',
    behavior: reduceMotion ? 'auto' : 'smooth',
  });
}
