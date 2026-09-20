import * as React from "react"

const MOBILE_BREAKPOINT = 768

// `useSyncExternalStore` đòi hàm subscribe giữ nguyên định danh giữa các lượt
// render (đổi định danh là gỡ/gắn lại listener), nên khai báo ở tầng module.
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

// Trả về boolean (giá trị nguyên thuỷ) chứ không phải object mới mỗi lần gọi —
// nếu trả object mới React sẽ coi là store đổi liên tục và render vô hạn.
function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

// Ảnh chụp phía server: chưa có `window` để đo nên trả về false, đúng bằng giá
// trị mà bản cũ trả ra ở lượt render đầu (state khởi tạo `undefined`, hook trả
// `!!undefined`). React dùng ảnh chụp này cho lượt hydrate rồi tự render lại
// bằng ảnh chụp phía client, nên không lệch hydrate.
function getServerSnapshot() {
  return false
}

/**
 * True khi khung nhìn hẹp hơn mốc mobile (768px).
 *
 * Trước đây hook giữ `useState` + `useEffect` gán giá trị sau khi mount, tức
 * setState đồng bộ trong effect. Ở đây `matchMedia`/`innerWidth` là một nguồn
 * dữ liệu BÊN NGOÀI React, và `useSyncExternalStore` là cách đọc nguồn ngoài
 * đúng chuẩn: vẫn đi qua cùng chuỗi giá trị (false khi hydrate → giá trị thật),
 * vẫn nghe đúng sự kiện `change` của cùng media query, nhưng không còn setState
 * trong effect.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
