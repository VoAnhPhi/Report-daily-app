import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineRejectedEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Lý do từ chối, hiện nguyên văn cho thành viên. */
  reason: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
}

/**
 * Thư 3 — quản trị viên từ chối đơn xin ghi danh (NGHIEP-VU §7 dòng 6).
 *
 * Lý do đi kèm là bắt buộc: một lời từ chối không có lý do sẽ đẩy toàn bộ câu hỏi
 * sang đội hỗ trợ, và người bị từ chối không có cách nào biết mình nên sửa gì.
 */
export const ShrineRejectedEmail = ({
  name = 'Quý thành viên',
  reason = '',
  portalUrl = '',
}: ShrineRejectedEmailProps) => {
  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(
      'Chúng tôi đã xem đơn xin ghi danh ĐIỆN KIẾN CHỦ của bạn và rất tiếc chưa thể duyệt lần này.',
    ),
    `<div style="background-color:#fef7f0;border:1px solid #f0c9a0;border-radius:8px;padding:16px;margin:20px 0;"><p style="color:#8b4513;font-size:15px;font-weight:700;margin:0 0 8px;">Lý do</p><p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0;">${escapeShrineHtml(reason)}</p></div>`,
    shrineParagraph(
      'Việc này không ảnh hưởng gì tới tài khoản hay quyền lợi thành viên của bạn. Bạn có thể gửi lại đơn sau khi đã điều chỉnh, ngay trên trang ĐIỆN KIẾN CHỦ.',
    ),
    shrineParagraph(
      `Trang ĐIỆN KIẾN CHỦ: <a href="${escapeShrineHtml(portalUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">${escapeShrineHtml(portalUrl)}</a>`,
    ),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Đơn xin ghi danh ĐIỆN KIẾN CHỦ chưa được duyệt"
      previewText="Đơn ghi danh của bạn chưa được duyệt lần này"
      greeting="Đơn xin ghi danh chưa được duyệt"
      contentHtml={contentHtml}
      footerNote="Bạn có thể gửi lại đơn bất cứ lúc nào."
    />
  );
};

export default ShrineRejectedEmail;
