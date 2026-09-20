import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineButton,
  shrineConsentNoticeHtml,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineEnrolledEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Tên hiển thị đã chốt trên bản đồ sao. */
  displayName: string;
  /** Tên vùng cánh. */
  regionName: string;
  /** Năm ghi danh — CHỈ NĂM, không bao giờ ngày đầy đủ. */
  enrolledYear: number;
  /** Liên kết trực tiếp tới ngôi sao (theo `publicSlug`). */
  starUrl: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
  /**
   * `true` khi ngôi sao sáng lên nhờ quản trị viên duyệt đơn xin (chiều B);
   * `false` khi thành viên tự bấm đồng ý lời mời (chiều A).
   */
  viaAdminApproval: boolean;
}

/**
 * Thư 2 — ngôi sao đã sáng (NGHIEP-VU §7 dòng 2 và dòng 5 gộp làm một mẫu).
 *
 * Hai chiều ghi danh kết thúc ở cùng một chỗ, nên dùng chung một mẫu và chỉ đổi
 * câu mở đầu; tách thành hai tệp là hai nơi phải sửa mỗi lần đổi phần hướng dẫn
 * rút tên, và bản thứ hai chắc chắn sẽ trôi khỏi bản thứ nhất.
 */
export const ShrineEnrolledEmail = ({
  name = 'Quý thành viên',
  displayName = '',
  regionName = '',
  enrolledYear = new Date().getFullYear(),
  starUrl = '',
  portalUrl = '',
  viaAdminApproval = false,
}: ShrineEnrolledEmailProps) => {
  const openingLine = viaAdminApproval
    ? 'Đơn xin ghi danh của bạn đã được duyệt. Ngôi sao của bạn đã sáng trên ĐIỆN KIẾN CHỦ.'
    : 'Cảm ơn bạn đã đồng ý. Ngôi sao của bạn đã sáng trên ĐIỆN KIẾN CHỦ.';

  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(openingLine),
    shrineParagraph(
      [
        `Tên hiển thị: <strong style="color:#8b4513;">${escapeShrineHtml(displayName)}</strong>`,
        regionName
          ? `<br/>Vùng cánh: <strong style="color:#8b4513;">${escapeShrineHtml(regionName)}</strong>`
          : '',
        `<br/>Năm ghi danh: <strong style="color:#8b4513;">${escapeShrineHtml(String(enrolledYear))}</strong>`,
      ].join(''),
    ),
    shrineButton(starUrl, 'Xem ngôi sao của bạn'),
    shrineConsentNoticeHtml(portalUrl),
    shrineParagraph(
      'Nếu bạn muốn đổi tên hiển thị, hãy trả lời email này hoặc liên hệ đội hỗ trợ. Nếu bạn muốn rút tên, bạn tự làm được ngay trên trang ĐIỆN KIẾN CHỦ, không cần ai duyệt.',
    ),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Ngôi sao của bạn đã sáng trên ĐIỆN KIẾN CHỦ"
      previewText="Ghi danh thành công — và đây là cách rút lại bất cứ lúc nào"
      greeting="Ngôi sao của bạn đã sáng"
      contentHtml={contentHtml}
      footerNote="Bạn có thể rút tên khỏi ĐIỆN KIẾN CHỦ bất cứ lúc nào, không cần nêu lý do."
    />
  );
};

export default ShrineEnrolledEmail;
