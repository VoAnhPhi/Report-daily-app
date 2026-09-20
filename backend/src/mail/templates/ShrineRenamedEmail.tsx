import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineButton,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineRenamedEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Tên hiển thị trước khi sửa. */
  previousName: string;
  /** Tên hiển thị sau khi sửa. */
  newName: string;
  /** Lý do sửa, hiện nguyên văn cho thành viên. */
  reason: string;
  /** Liên kết trực tiếp tới ngôi sao. */
  starUrl: string;
}

/**
 * Thư 4 — quản trị viên sửa tên hiển thị (NGHIEP-VU §7 dòng 7).
 *
 * Thành viên PHẢI được báo: tên hiển thị là dữ liệu cá nhân đang công khai, sửa
 * mà không báo là thay đổi thứ người ta đã đồng ý mà họ không biết.
 */
export const ShrineRenamedEmail = ({
  name = 'Quý thành viên',
  previousName = '',
  newName = '',
  reason = '',
  starUrl = '',
}: ShrineRenamedEmailProps) => {
  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(
      'Tên hiển thị của bạn trên ĐIỆN KIẾN CHỦ vừa được đội quản trị điều chỉnh.',
    ),
    `<div style="background-color:#faf8f3;border:1px solid #ddbf94;border-radius:8px;padding:16px;margin:20px 0;"><p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0 0 8px;">Tên cũ: <strong style="color:#8b4513;">${escapeShrineHtml(previousName)}</strong></p><p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0 0 8px;">Tên mới: <strong style="color:#8b4513;">${escapeShrineHtml(newName)}</strong></p><p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0;">Lý do: ${escapeShrineHtml(reason)}</p></div>`,
    shrineButton(starUrl, 'Xem ngôi sao của bạn'),
    shrineParagraph(
      'Nếu bạn không đồng ý với thay đổi này, hãy trả lời email này để đội hỗ trợ xem lại. Bạn cũng có thể rút tên khỏi ĐIỆN KIẾN CHỦ bất cứ lúc nào mà không cần nêu lý do.',
    ),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Tên hiển thị trên ĐIỆN KIẾN CHỦ đã được điều chỉnh"
      previewText="Tên hiển thị của bạn trên bản đồ sao vừa thay đổi"
      greeting="Tên hiển thị đã được điều chỉnh"
      contentHtml={contentHtml}
      footerNote="Bạn có quyền yêu cầu xem lại thay đổi này hoặc rút tên bất cứ lúc nào."
    />
  );
};

export default ShrineRenamedEmail;
