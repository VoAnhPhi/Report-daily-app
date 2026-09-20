/**
 * Lưới cột của Bảng tính — TÁCH RA FILE RIÊNG có chủ ý.
 *
 * Hàng tiêu đề và hàng dữ liệu nay ở hai file khác nhau, nên hằng này phải
 * đứng ở một nơi trung lập mà cả hai import. Để nó trong một trong hai file
 * là gán quan hệ sai và sinh phụ thuộc vòng.
 */
/**
 * Lưới 8 cột, khai MỘT chỗ để hàng tiêu đề và hàng dữ liệu không bao giờ lệch.
 *
 * Dưới 1280px ẩn cột Hồ sơ và Thẻ — hai ô đó dùng `hidden xl:block` nên chúng
 * biến mất khỏi luồng lưới, còn đúng 6 ô khớp 6 rãnh.
 */
export const SHEET_GRID =
  'grid-cols-[260px_132px_116px_128px_168px_108px] xl:grid-cols-[300px_168px_132px_116px_128px_168px_108px_1fr]';
