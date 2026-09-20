import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineDisclaimerHtml,
  shrineParagraph,
} from './ShrineEmailShared';

export interface ShrineWithdrawnEmailProps {
  /** Họ tên thành viên. */
  name: string;
  /** Trang ĐIỆN KIẾN CHỦ công khai. */
  portalUrl: string;
  /**
   * `true` khi ngôi sao ĐANG sáng lúc rút; `false` khi thành viên rút lại một đơn
   * còn đang chờ quản trị viên duyệt (tên chưa từng hiện công khai).
   */
  wasEnrolled: boolean;
}

/**
 * Thư 6 — xác nhận thành viên đã rút tên (NGHIEP-VU §7 dòng 9).
 *
 * Đây là BIÊN NHẬN việc rút lại đồng ý theo Luật 91/2025, nên phải nói rõ đã xoá
 * cái gì chứ không chỉ "đã ghi nhận yêu cầu của bạn".
 */
export const ShrineWithdrawnEmail = ({
  name = 'Quý thành viên',
  portalUrl = '',
  wasEnrolled = true,
}: ShrineWithdrawnEmailProps) => {
  const openingLine = wasEnrolled
    ? 'Chúng tôi xác nhận bạn đã rút tên khỏi ĐIỆN KIẾN CHỦ. Yêu cầu đã được thực hiện ngay, không cần ai duyệt.'
    : 'Chúng tôi xác nhận bạn đã rút lại đơn xin ghi danh ĐIỆN KIẾN CHỦ. Yêu cầu đã được thực hiện ngay, không cần ai duyệt. Tên bạn chưa từng xuất hiện trên bản đồ sao.';

  const erasedItems = wasEnrolled
    ? [
        '• Tên hiển thị của bạn trên bản đồ sao công khai',
        '• Biệt danh bạn từng nhập, nếu có',
        '• Năm ghi danh hiển thị công khai',
      ]
    : [
        '• Tên hiển thị bạn đã chọn khi nộp đơn',
        '• Biệt danh bạn từng nhập, nếu có',
      ];

  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(name)}</strong>,`,
    ),
    shrineParagraph(openingLine),
    // `escapeShrineHtml` ở đây là thừa hôm nay — `erasedItems` toàn chuỗi hằng
    // khai ngay bên trên. Vẫn giữ, vì bất biến của `ShrineEmailShared` là "MỌI giá
    // trị nội suy đều đi qua hàm thoát": một ngoại lệ duy nhất trong tám mẫu thư
    // là cái bẫy chờ sẵn cho ngày ai đó làm danh sách này động.
    `<div style="background-color:#faf8f3;border:1px solid #ddbf94;border-radius:8px;padding:16px;margin:20px 0;"><p style="color:#8b4513;font-size:15px;font-weight:700;margin:0 0 10px;">Những gì đã được xoá</p>${erasedItems
      .map(
        (item) =>
          `<p style="color:#4b3b2f;font-size:15px;line-height:1.7;margin:0 0 8px;">${escapeShrineHtml(item)}</p>`,
      )
      .join('')}</div>`,
    shrineParagraph(
      'Ngôi sao vẫn ở đúng vị trí cũ nhưng trở lại trạng thái chưa có chủ và không hiển thị bất kỳ thông tin nào về bạn. Hệ thống chỉ giữ lại bản ghi lịch sử để đối chiếu khi cần chứng minh bạn đã rút lại đồng ý.',
    ),
    shrineParagraph(
      `Nếu sau này bạn đổi ý, bạn có thể tự xin ghi danh lại bất cứ lúc nào tại <a href="${escapeShrineHtml(portalUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">${escapeShrineHtml(portalUrl)}</a>.`,
    ),
    shrineDisclaimerHtml(),
  ].join('');

  const title = wasEnrolled
    ? 'Đã xoá tên bạn khỏi ĐIỆN KIẾN CHỦ'
    : 'Đã rút lại đơn xin ghi danh ĐIỆN KIẾN CHỦ';

  return (
    <CompanyShell
      title={title}
      previewText="Xác nhận đã rút lại và xoá tên khỏi ĐIỆN KIẾN CHỦ"
      greeting={title}
      contentHtml={contentHtml}
      footerNote="Bạn có thể xin ghi danh lại bất cứ lúc nào."
    />
  );
};

export default ShrineWithdrawnEmail;
