import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineButton,
  shrineConsentNoticeHtml,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineInvitationEmailProps {
  /** Họ tên thành viên được mời. */
  name: string;
  /** Tên vùng cánh của ngôi sao, ví dụ "Cánh Hữu". */
  regionName: string;
  /** Link mở màn hình ghi danh, đã kèm mã thông hành. */
  consentUrl: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
  /** Hạn phản hồi đã định dạng tiếng Việt, ví dụ "06/09/2026". */
  expiresAtText: string;
}

/**
 * Thư 1 — quản trị viên mời một thành viên ghi danh (NGHIEP-VU §7 dòng 1).
 *
 * Đây là lá thư XIN ĐỒNG Ý, không phải thư thông báo: nó phải nêu đủ dữ liệu nào
 * công khai, ai xem được, giữ bao lâu và cách rút lại, và người nhận phải tự bấm
 * mới coi là đồng ý. Không phản hồi KHÔNG phải là đồng ý.
 */
export const ShrineInvitationEmail = ({
  name = 'Quý thành viên',
  regionName = '',
  consentUrl = '',
  portalUrl = '',
  expiresAtText = '',
}: ShrineInvitationEmailProps) => {
  const regionLine = regionName
    ? shrineParagraph(
        `Ngôi sao dành cho bạn nằm ở vùng <strong style="color:#8b4513;">${escapeShrineHtml(regionName)}</strong> của hoa lan Cattleya — biểu tượng của ACTA.`,
      )
    : '';

  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(
      'ĐIỆN KIẾN CHỦ là một bản đồ sao công khai, nơi mỗi thành viên ứng với một ngôi sao. Ngôi sao của bạn đã ở đó từ ngày đầu — ghi danh chỉ là gắn tên bạn vào nó.',
    ),
    regionLine,
    shrineParagraph(
      'Chúng tôi trân trọng mời bạn ghi danh. Việc này hoàn toàn tự nguyện: bạn chọn tên hiển thị, đọc kỹ phần dưới rồi tự bấm đồng ý. Nếu bạn không phản hồi thì không có gì xảy ra và tên bạn không xuất hiện ở đâu cả.',
    ),
    shrineConsentNoticeHtml(portalUrl),
    shrineButton(consentUrl, 'Xem lời mời và chọn tên hiển thị'),
    shrineParagraph(
      `Lời mời này có hiệu lực tới hết ngày <strong style="color:#8b4513;">${escapeShrineHtml(expiresAtText)}</strong>. Sau thời điểm đó liên kết sẽ hết hạn; bạn vẫn có thể tự xin ghi danh bất cứ lúc nào từ trang ĐIỆN KIẾN CHỦ.`,
    ),
    shrineParagraph(
      'Nếu bạn không muốn ghi danh, bạn có thể bấm “Từ chối” ngay trong màn hình trên, hoặc đơn giản là bỏ qua thư này.',
    ),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Lời mời ghi danh ĐIỆN KIẾN CHỦ"
      previewText="Ngôi sao của bạn đã ở đó — mời bạn gắn tên vào"
      greeting="Lời mời ghi danh ĐIỆN KIẾN CHỦ"
      contentHtml={contentHtml}
      footerNote="Ghi danh chỉ có hiệu lực khi chính bạn bấm đồng ý. Im lặng không được coi là đồng ý."
    />
  );
};

export default ShrineInvitationEmail;
