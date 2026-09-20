import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineSuspendedEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
}

/**
 * Thư 8 — ngôi sao tắt vì tài khoản ngừng hoạt động.
 *
 * ⚠ Đây là lá thư dễ viết sai nhất trong tám mẫu, vì nó rất giống thư thu hồi mà
 * lại phải nói điều ngược lại. Ba điều BẮT BUỘC phải rõ:
 *
 *  1. **Đây không phải hình phạt và không phải rút lại đồng ý.** Thành viên không
 *     làm gì cả; tư cách thành viên tạm dừng nên phần công khai tạm dừng theo.
 *  2. **Đồng ý vẫn còn hiệu lực và tên vẫn được giữ.** Nói thẳng ra, vì người đọc
 *     sẽ mặc định là đã bị xoá — và nếu họ tin vậy thì lúc quay lại họ sẽ đi ghi
 *     danh lần nữa cho một ngôi sao vốn vẫn là của họ.
 *  3. **Cách lấy lại: khôi phục tài khoản, không phải ghi danh lại.** Kèm luôn
 *     lối thoát ngược chiều — muốn xoá hẳn tên thì vẫn xoá được, để việc "giữ
 *     tên" không biến thành một thứ bị giữ lại trái ý.
 *
 * KHÔNG nêu lý do tài khoản ngừng hoạt động: module ĐIỆN KIẾN CHỦ không biết lý do đó
 * (nó chỉ đọc `users.status`), và đoán bừa trong một lá thư tự động là cách nhanh
 * nhất để nói sai với người thật.
 */
export const ShrineSuspendedEmail = ({
  name = 'Quý thành viên',
  portalUrl = '',
}: ShrineSuspendedEmailProps) => {
  const keptItems = [
    '• Tên hiển thị bạn đã chọn — vẫn được giữ, chỉ tạm ẩn khỏi bản đồ công khai',
    '• Vị trí ngôi sao và vùng cánh — không thay đổi, không ai khác nhận được chỗ này',
    '• Bằng chứng đồng ý và năm ghi danh — vẫn còn nguyên giá trị',
  ];

  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(
      'Chúng tôi báo để bạn biết: ngôi sao của bạn trên ĐIỆN KIẾN CHỦ vừa tạm tắt, vì tài khoản thành viên của bạn hiện không còn ở trạng thái đang hoạt động. Tên bạn đã được gỡ khỏi bản đồ sao công khai.',
    ),
    shrineParagraph(
      '<strong>Đây không phải là thu hồi, cũng không phải bạn đã rút lại đồng ý.</strong> ĐIỆN KIẾN CHỦ chỉ hiển thị thành viên đang hoạt động, nên khi tư cách thành viên tạm dừng thì phần hiển thị công khai cũng tạm dừng theo. Bạn không cần làm gì với riêng ĐIỆN KIẾN CHỦ.',
    ),
    `<div style="background-color:#faf8f3;border:1px solid #ddbf94;border-radius:8px;padding:16px;margin:20px 0;"><p style="color:#8b4513;font-size:15px;font-weight:700;margin:0 0 10px;">Những gì vẫn được giữ nguyên</p>${keptItems
      .map(
        (item) =>
          `<p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0 0 8px;">${escapeShrineHtml(item)}</p>`,
      )
      .join('')}</div>`,
    shrineParagraph(
      'Ngay khi tài khoản của bạn hoạt động trở lại, ngôi sao sẽ tự sáng lại ở đúng vị trí cũ với đúng cái tên cũ — bạn <strong>không cần ghi danh lại</strong> và chúng tôi sẽ gửi một lá thư báo khi điều đó xảy ra.',
    ),
    shrineParagraph(
      'Nếu bạn muốn khôi phục tài khoản, vui lòng liên hệ bộ phận hỗ trợ ACTA. Ngược lại, nếu bạn muốn <strong>xoá hẳn</strong> tên khỏi ĐIỆN KIẾN CHỦ thay vì chỉ tạm ẩn, hãy trả lời thư này — chúng tôi sẽ xoá và xác nhận lại với bạn.',
    ),
    shrineParagraph(
      `Trang ĐIỆN KIẾN CHỦ: <a href="${escapeShrineHtml(portalUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">${escapeShrineHtml(portalUrl)}</a>`,
    ),
    shrineDisclaimerHtml(),
  ].join('');

  return (
    <CompanyShell
      title="Ngôi sao của bạn trên ĐIỆN KIẾN CHỦ đã tạm tắt"
      previewText="Tài khoản ngừng hoạt động nên ngôi sao tạm ẩn — tên của bạn vẫn được giữ"
      greeting="Ngôi sao của bạn đã tạm tắt"
      contentHtml={contentHtml}
      footerNote="Ngôi sao sẽ tự sáng lại khi tài khoản hoạt động trở lại."
    />
  );
};

export default ShrineSuspendedEmail;
