import { CompanyShell } from './CompanyShell';

export interface SalaryVoucherReminderEmailProps {
  /** Member display name (fullName). */
  name: string;
  /** Absolute deep-link to the member's affiliate ticket (D-84-L). */
  deepLinkUrl: string;
  /** Tiêu đề + preview email (vd "Phiếu cấp phát thu nhập sắp hết hạn"). */
  title: string;
  /** Câu dẫn tiếng Việt mô tả sự kiện (sắp hết hạn / đã hết hạn). */
  bodyText: string;
  /** Nhãn nút CTA (vd "Xem phiếu cấp phát của tôi"). */
  ctaLabel?: string;
  /** Ghi chú chân trang tùy chọn. */
  footerNote?: string;
}

/**
 * D-84-G — email nhắc/​thông báo vòng đời phiếu cấp phát thu nhập cho member
 * (dùng cho "sắp hết hạn" và "đã hết hạn"). Bọc `CompanyShell`; copy tiếng Việt
 * do caller truyền vào để mỗi sự kiện có nội dung chính xác (§34). Đính nút CTA
 * dẫn tới ticket affiliate qua deep-link đã khóa (D-84-L). Gradient/box-shadow
 * luôn kèm nền đặc dự phòng cho Outlook.
 */
export const SalaryVoucherReminderEmail = ({
  name = 'Quý thành viên',
  deepLinkUrl = 'https://hoahong.acta.vn',
  title = 'Phiếu cấp phát thu nhập',
  bodyText = '',
  ctaLabel = 'Xem phiếu cấp phát của tôi',
  footerNote,
}: SalaryVoucherReminderEmailProps) => {
  const contentHtml = `
    <table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 8px;">
      <tr>
        <td style="background-color:#faf8f3;background:linear-gradient(135deg,#faf8f3 0%,#f3e5cf 100%);border:1px solid #ddbf94;border-left:4px solid #cd853f;border-radius:12px;padding:20px 22px;color:#5b4636;font-size:16px;line-height:1.65;">
          ${bodyText}
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:28px 0 18px;">
      <a href="${deepLinkUrl}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background-color:#8b4513;background:linear-gradient(135deg,#cd853f 0%,#8b4513 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:12px;box-shadow:0 6px 16px rgba(139,69,19,0.28);">
        ${ctaLabel} &rarr;
      </a>
    </div>

    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:20px 0 0;">
      Nếu nút phía trên không hoạt động, hãy sao chép và dán liên kết sau vào trình
      duyệt của bạn:<br />
      <a href="${deepLinkUrl}" style="color:#cd853f;text-decoration:underline;word-break:break-all;">${deepLinkUrl}</a>
    </p>
  `;

  return (
    <CompanyShell
      title={title}
      previewText={title}
      greeting={`Xin chào ${name},`}
      contentHtml={contentHtml}
      footerNote={footerNote}
    />
  );
};
