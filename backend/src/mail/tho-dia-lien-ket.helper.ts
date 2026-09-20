/**
 * Dựng liên kết trỏ sang acta-solutions (bản đồ Thổ địa) cho thư điện tử.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  VÌ SAO TÁCH RA MỘT TỆP HÀM THUẦN, KHÔNG ĐỂ TRONG `mail.service.tsx`     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Bắt được bằng phép ĐỘT BIẾN, không phải bằng suy đoán: bỏ hẳn tham số
 * `?huong-dan=an-diem-cau` khỏi URL trong `mail.service.tsx` thì **không một
 * bài thử nào đỏ**. Nút trong thư vẫn hiện, vẫn bấm được, vẫn mở đúng trang
 * "điểm cầu của tôi" — chỉ có hộp thoại hướng dẫn ẩn điểm là không bao giờ bật
 * ra. Người nhận thư sẽ thấy một danh sách và không biết phải làm gì tiếp; và
 * không có lỗi nào để ai đó đi tìm.
 *
 * Tham số ấy là MỐI NỐI DUY NHẤT giữa lá thư (acta-api) và hộp thoại
 * (acta-solutions) — hai kho khác nhau, không có kiểu chung, không cổng nào so
 * hai bên. Thứ duy nhất giữ được nó là một hằng có tên, ở một chỗ, có bài thử.
 *
 * ⚠ Đổi giá trị `THAM_SO_HUONG_DAN_AN` là việc của HAI KHO. Bên acta-solutions
 * có hằng đối ứng trong `src/features/dia-diem-cua-toi/`; sửa một bên là tắt
 * hướng dẫn trong im lặng.
 *
 * ⚠ Đuôi `.helper.ts` là CỐ Ý — nó nằm trong `shared-base.manifest` (§42) nên
 * tự băng qua CORE↔WORKERS. `mail.service.tsx` thì KHÔNG (glob nền chung là
 * `*.service.ts`, không khớp `.tsx`), nên mọi thứ đặt được ở đây thì đừng để
 * bên kia.
 */

/**
 * Tham số mở hộp thoại hướng dẫn ẩn điểm cầu trên acta-solutions.
 * Dạng `khoa=giatri` trọn vẹn để nơi gọi không tự ghép sai dấu `=`.
 */
export const THAM_SO_HUONG_DAN_AN = 'huong-dan=an-diem-cau';

/** Đường dẫn màn "điểm cầu của tôi" — nơi DUY NHẤT bỏ ẩn được. */
export const DUONG_DAN_DIEM_CUA_TOI = '/profile/dia-diem';

/** Gốc mặc định khi biến môi trường vắng mặt. */
export const GOC_THO_DIA_MAC_DINH = 'https://thodia.acta.vn';

/**
 * Tờ hướng dẫn ẩn điểm cầu (PDF), đã tải lên UploadThing.
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  ĐÂY LÀ MỘT ĐỊA CHỈ ĐÃ PHÁT RA NGOÀI — ĐỔI NÓ LÀ LÀM CHẾT THƯ ĐÃ GỬI   ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * Nút trong thư trỏ THẲNG vào đây. Thư đã gửi thì không thu hồi được, nên xoá
 * hoặc thay tệp trên UploadThing = mọi lá thư cũ có một cái nút dẫn tới trang
 * lỗi, và người nhận sẽ đọc điều đó thành "ACTA gửi cho tôi một liên kết hỏng".
 * Muốn sửa nội dung tờ hướng dẫn thì **tải lên một tệp MỚI và đổi hằng này**,
 * đừng ghi đè tệp cũ.
 *
 * ⚠ Ghi CỨNG, không đọc từ biến môi trường. Một biến vắng mặt ở đây sẽ thành
 * chuỗi rỗng, và `shrineButton` vẫn dựng ra một cái nút bấm không đi đâu cả —
 * đúng lớp lỗi mà `gocThoDia` bên dưới đã phải vá bằng tay (`--env-file` không
 * bóc dấu nháy). Một hằng thì hoặc đúng, hoặc đỏ ngay ở bài thử.
 *
 * ⚠ KHÔNG dùng chung `gocThoDia()`: tệp nằm trên miền của UploadThing
 * (`*.ufs.sh`), không phải trên `thodia.acta.vn`.
 *
 * Đo 08/09/2026 khi nhận link: `HTTP 200` · `content-type: application/pdf` ·
 * `content-disposition: inline` (mở thẳng trong trình duyệt, không ép tải về) ·
 * sha256 trùng khít bản dựng tại máy (`1eebe948…`) · 3 trang.
 */
export const URL_PDF_HUONG_DAN_AN_DIEM =
  'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vxGQFv5DE9pAdQnxhjuVvR7wOyoSiXcBq0FW5';

/**
 * Gốc URL của acta-solutions, đã làm sạch.
 *
 * ⚠ Gỡ dấu nháy BAO QUANH là bản vá cho một lỗi đã xảy ra thật: `docker run
 * --env-file` KHÔNG bóc dấu nháy như shell, nên một dòng `X="https://…"` đi vào
 * tiến trình kèm hai dấu `"` NẰM TRONG giá trị, và mọi nút trong thư hiện ra
 * đẹp đẽ mà bấm không đi đâu cả — không log nào báo hỏng.
 *
 * ⚠ Cắt `/` ở đuôi để `${goc}${duongDan}` không ra `//profile/...`.
 */
export function gocThoDia(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const tho = env.SOLUTIONS_FRONTEND_DOMAIN ?? GOC_THO_DIA_MAC_DINH;
  const sach = tho
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim()
    .replace(/\/+$/, '');
  // Chuỗi rỗng (biến khai nhưng để trống) phải lùi về mặc định, nếu không mọi
  // liên kết thành đường dẫn tương đối và Gmail bỏ luôn thuộc tính `href`.
  return sach || GOC_THO_DIA_MAC_DINH;
}

/** Nút CHÍNH của thư: mở màn "điểm cầu của tôi" KÈM hộp thoại hướng dẫn. */
export function duongDanQuanLyDiemCau(goc: string): string {
  return `${goc}${DUONG_DAN_DIEM_CUA_TOI}?${THAM_SO_HUONG_DAN_AN}`;
}

/**
 * Liên kết PHỤ tới trang công khai của điểm cầu.
 *
 * ⚠ Trả `null` khi chưa có slug, và nơi gọi PHẢI bỏ hẳn liên kết đi chứ không
 * dựng một thẻ `<a href="">`. Trang công khai giải slug bằng
 * `CHI_KHO_HIEN_TREN_BAN_DO` (có `hiddenOnMap: false`), nên nó 404 với cả điểm
 * chưa có slug lẫn điểm vừa bị ẩn — dựng liên kết là đưa người vừa nhận thư
 * vào một trang lỗi.
 */
export function duongDanCongKhaiDiemCau(
  goc: string,
  slug: string | null,
): string | null {
  const sach = slug?.trim();
  return sach ? `${goc}/dia-diem/${sach}` : null;
}
