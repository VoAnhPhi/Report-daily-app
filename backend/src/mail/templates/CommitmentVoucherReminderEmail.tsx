import { CompanyShell } from './CompanyShell';

/** Trạng thái vòng đời vé bù sàn cần nhắc member. */
export type CommitmentVoucherReminderVariant = 'expiring' | 'expired';

export interface CommitmentVoucherReminderEmailProps {
  /** Member display name (fullName). */
  name: string;
  /** Absolute deep-link to the member's commitment ticket (D-93-I). */
  deepLinkUrl: string;
  /** Biến thể: sắp hết hạn (nhắc nhận) hoặc đã hết hạn (thông báo lỡ). */
  variant: CommitmentVoucherReminderVariant;
  /**
   * Mốc Sàn kỳ này (floorVnd), đã format kiểu vi-VN.
   *
   * ⚠ REV-6 (D-R6-10): template CỐ Ý KHÔNG có `creditedAmountText`. Số thực cộng
   * vào ví là `sàn − khoảnReset`, chỉ tính được lúc member chấp nhận; cột
   * `advanceOffsetAmount` chốt-lúc-mint mà hai cron từng truyền vào đây BÁO THIẾU
   * đúng bằng phần member đã rút trong kỳ (anh Long: 5tr thay vì 13tr).
   */
  floorAmountText: string;
  /**
   * D-11 (111-04) — hạn chót nhận vé đã format tiếng Việt
   * (`HH:mm ngày dd/MM/yyyy (còn N ngày)` giờ VN). Optional: caller "sắp hết
   * hạn" truyền để nêu ngày hạn cụ thể; caller "đã hết hạn" bỏ qua.
   */
  deadlineText?: string;
}

/**
 * NOTIF (Phase 93, D-93-E/J) — email vòng đời vé bù sàn cam kết cho member: dùng
 * cho cả "sắp hết hạn" (nhắc nhận trước khi cửa sổ đóng) và "đã hết hạn" (vé kỳ
 * này đã lỡ). Bọc `CompanyShell`; copy tiếng Việt có dấu chọn theo `variant`
 * (§34). Đính nút CTA dẫn tới ticket commitment qua deep-link đã khóa (D-93-I).
 *
 * Template KHÔNG tự tính deep-link: caller (mail method) truyền `deepLinkUrl`
 * tuyệt đối vào (D-93-I prohibition — no route logic inside the template).
 *
 * Gradient/box-shadow luôn kèm nền đặc dự phòng cho Outlook.
 */
export const CommitmentVoucherReminderEmail = ({
  name = 'Quý thành viên',
  deepLinkUrl = 'https://hoahong.acta.vn',
  variant = 'expiring',
  floorAmountText = '0',
  deadlineText,
}: CommitmentVoucherReminderEmailProps) => {
  const isExpired = variant === 'expired';

  // D-11 (111-04): nêu NGÀY HẠN CHÓT cụ thể khi caller truyền (nhánh "sắp hết
  // hạn" — member biết chính xác hạn quyết định vé).
  const deadlinePart = deadlineText
    ? ` Hạn nhận: <strong style="color:#b45309;">${deadlineText}</strong>.`
    : '';

  const title = isExpired
    ? 'Vé bù sàn cam kết đã hết hạn'
    : 'Vé bù sàn cam kết sắp hết hạn';

  const previewText = isExpired
    ? 'Vé bù sàn kỳ này đã hết hạn nhận'
    : 'Vé bù sàn của bạn sắp hết hạn — nhận ngay để đạt Mốc Sàn';

  const bodyText = isExpired
    ? `Vé bù sàn kỳ này của bạn <strong style="color:#8b4513;">đã hết hạn nhận</strong>.
       Kỳ này bạn chỉ nhận phần hoa hồng thực tế, không được bù sàn để đạt Mốc Sàn
       <strong>${floorAmountText}₫</strong>. Vé cho các kỳ tiếp theo vẫn được cấp bình thường.`
    : `Bạn đang có một <strong style="color:#8b4513;">vé bù sàn</strong> đưa thu nhập kỳ này
       lên Mốc Sàn <strong>${floorAmountText}₫</strong>
       <strong style="color:#b45309;">sắp hết hạn nhận</strong>.${deadlinePart} Hãy bấm nhận ngay để không
       bỏ lỡ quyền lợi bù sàn của kỳ này.`;

  const ctaLabel = isExpired ? 'Xem vé bù sàn của tôi' : 'Nhận vé bù sàn ngay';

  const footerNote = isExpired
    ? 'Thông báo này được gửi tự động khi một vé bù sàn cam kết của bạn hết hạn.'
    : 'Thông báo này được gửi tự động để nhắc bạn nhận vé bù sàn trước khi hết hạn.';

  const accentBorder = isExpired ? '#9ca3af' : '#cd853f';

  const contentHtml = `
    <table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 8px;">
      <tr>
        <td style="background-color:#faf8f3;background:linear-gradient(135deg,#faf8f3 0%,#f3e5cf 100%);border:1px solid #ddbf94;border-left:4px solid ${accentBorder};border-radius:12px;padding:20px 22px;color:#5b4636;font-size:16px;line-height:1.65;">
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
      previewText={previewText}
      greeting={`Xin chào ${name},`}
      contentHtml={contentHtml}
      footerNote={footerNote}
    />
  );
};
