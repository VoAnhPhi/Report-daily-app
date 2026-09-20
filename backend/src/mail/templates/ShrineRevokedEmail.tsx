import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineRevokedEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Lý do thu hồi, hiện nguyên văn cho thành viên. */
  reason: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
}

/**
 * Thư 5 — quản trị viên thu hồi ngôi sao (NGHIEP-VU §7 dòng 8).
 *
 * Thu hồi là hành động phá huỷ và thành viên không tự hoàn tác được, nên thư phải
 * nói rõ đã xoá cái gì và người ta khiếu nại ở đâu.
 */
export const ShrineRevokedEmail = ({
  name = 'Quý thành viên',
  reason = '',
  portalUrl = '',
}: ShrineRevokedEmailProps) => {
  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(
      'Tên hiển thị của bạn đã được gỡ khỏi ĐIỆN KIẾN CHỦ. Ngôi sao trở lại trạng thái chưa có chủ và không còn dữ liệu cá nhân nào của bạn trên bản đồ công khai.',
    ),
    `<div style="background-color:#fef7f0;border:1px solid #f0c9a0;border-radius:8px;padding:16px;margin:20px 0;"><p style="color:#8b4513;font-size:15px;font-weight:700;margin:0 0 8px;">Lý do</p><p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0;">${escapeShrineHtml(reason)}</p></div>`,
    shrineParagraph(
      'Việc này chỉ ảnh hưởng tới ĐIỆN KIẾN CHỦ. Tài khoản, quyền lợi và mọi dữ liệu khác của bạn không thay đổi.',
    ),
    shrineParagraph(
      `Nếu bạn cho rằng đây là nhầm lẫn, hãy trả lời email này hoặc liên hệ <a href="mailto:lienhe@acta.vn" style="color:#cd853f;font-weight:600;">lienhe@acta.vn</a> để đội hỗ trợ xem lại. Trang ĐIỆN KIẾN CHỦ: <a href="${escapeShrineHtml(portalUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">${escapeShrineHtml(portalUrl)}</a>`,
    ),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Ngôi sao trên ĐIỆN KIẾN CHỦ đã được thu hồi"
      previewText="Tên hiển thị của bạn đã được gỡ khỏi bản đồ sao"
      greeting="Ngôi sao đã được thu hồi"
      contentHtml={contentHtml}
      footerNote="Thu hồi chỉ tác động tới ĐIỆN KIẾN CHỦ, không ảnh hưởng tài khoản của bạn."
    />
  );
};

export default ShrineRevokedEmail;
