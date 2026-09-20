import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineButton,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineRestoredEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Tên hiển thị đã sáng lại trên bản đồ sao. */
  displayName: string;
  /** Tên vùng cánh, ví dụ "Cánh Hữu". */
  regionName: string;
  /** Liên kết công khai tới đúng ngôi sao đó. */
  starUrl: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
}

/**
 * Thư 9 — ngôi sao sáng lại sau khi tài khoản hoạt động trở lại.
 *
 * ⚠ Lá thư này thông báo một thứ vừa được CÔNG KHAI TRỞ LẠI mà thành viên không
 * hề bấm nút nào, nên nó phải kèm lối rút tên ngay trong thư. Đồng ý cũ vẫn còn
 * hiệu lực về mặt pháp lý (họ chưa từng rút), nhưng người ta có quyền đổi ý trong
 * quãng thời gian tài khoản tạm dừng — và nếu lá thư duy nhất báo việc này lại
 * không nói cách gỡ xuống thì đồng ý đó không còn là "rút lại được" trên thực tế.
 */
export const ShrineRestoredEmail = ({
  name = 'Quý thành viên',
  displayName = '',
  regionName = '',
  starUrl = '',
  portalUrl = '',
}: ShrineRestoredEmailProps) => {
  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(
      'Tài khoản của bạn đã hoạt động trở lại, nên ngôi sao của bạn trên ĐIỆN KIẾN CHỦ cũng vừa sáng lại — ở đúng vị trí cũ, với đúng cái tên bạn đã chọn trước đây. Bạn không phải ghi danh lại.',
    ),
    `<div style="background-color:#faf8f3;border:1px solid #ddbf94;border-radius:8px;padding:16px;margin:20px 0;"><p style="color:#8b4513;font-size:15px;font-weight:700;margin:0 0 10px;">Ngôi sao của bạn</p><p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0 0 8px;">Tên hiển thị: <strong>${escapeShrineHtml(displayName)}</strong></p><p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0;">Vùng cánh: <strong>${escapeShrineHtml(regionName)}</strong></p></div>`,
    shrineButton(starUrl, 'Xem ngôi sao của bạn'),
    shrineParagraph(
      `Nếu bạn <strong>không</strong> muốn tên mình xuất hiện công khai nữa, bạn rút lại bất cứ lúc nào: mở <a href="${escapeShrineHtml(portalUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">trang ĐIỆN KIẾN CHỦ</a>, đăng nhập rồi bấm “Rút tên”. Tên hiển thị bị xoá ngay lập tức, không cần nêu lý do và không cần ai duyệt.`,
    ),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Ngôi sao của bạn trên ĐIỆN KIẾN CHỦ đã sáng lại"
      previewText="Tài khoản hoạt động trở lại — ngôi sao của bạn đã sáng lại"
      greeting="Ngôi sao của bạn đã sáng lại"
      contentHtml={contentHtml}
      footerNote="Bạn có thể rút tên bất cứ lúc nào."
    />
  );
};

export default ShrineRestoredEmail;
