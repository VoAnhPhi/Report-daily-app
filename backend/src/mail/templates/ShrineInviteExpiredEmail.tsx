import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineButton,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineInviteExpiredEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
  /** Số ngày lời mời có hiệu lực, để nhắc lại trong thư. */
  ttlDays: number;
}

/**
 * Thư 7 — lời mời hết hạn (NGHIEP-VU §7 dòng cuối).
 *
 * Hết hạn được tính LƯỜI lúc đọc chứ không cần cron: bản ghi chuyển sang `expired`
 * ngay lần đầu ai đó chạm vào nó sau hạn, và thư này gửi tại đúng thời điểm đó.
 * Nhờ vậy module không cần một `@Cron` nào — thứ mà theo §42 sẽ phải nằm ở kho
 * WORKERS chứ không phải ở đây.
 */
export const ShrineInviteExpiredEmail = ({
  name = 'Quý thành viên',
  portalUrl = '',
  ttlDays = 30,
}: ShrineInviteExpiredEmailProps) => {
  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(
      `Lời mời ghi danh ĐIỆN KIẾN CHỦ gửi cho bạn đã quá hạn ${escapeShrineHtml(String(ttlDays))} ngày và không còn hiệu lực. Liên kết trong thư mời cũ sẽ không mở được nữa.`,
    ),
    shrineParagraph(
      'Không có gì được ghi lại về phía bạn: tên bạn chưa từng xuất hiện trên bản đồ sao, và việc không phản hồi không được coi là đồng ý cũng không được coi là từ chối.',
    ),
    shrineParagraph(
      'Ngôi sao của bạn vẫn ở đúng chỗ cũ. Nếu bạn muốn ghi danh, bạn có thể tự xin bất cứ lúc nào ngay trên trang ĐIỆN KIẾN CHỦ.',
    ),
    shrineButton(portalUrl, 'Mở trang ĐIỆN KIẾN CHỦ'),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Lời mời ghi danh ĐIỆN KIẾN CHỦ đã hết hạn"
      previewText="Liên kết ghi danh cũ đã hết hiệu lực — bạn vẫn xin lại được"
      greeting="Lời mời ghi danh đã hết hạn"
      contentHtml={contentHtml}
      footerNote="Không phản hồi không được coi là đồng ý — không có gì được ghi lại."
    />
  );
};

export default ShrineInviteExpiredEmail;
