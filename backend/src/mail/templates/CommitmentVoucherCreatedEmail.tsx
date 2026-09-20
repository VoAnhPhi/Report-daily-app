import { CompanyShell } from './CompanyShell';

export interface CommitmentVoucherCreatedEmailProps {
  /** Member display name (fullName). */
  name: string;
  /** Absolute deep-link to the member's commitment ticket (D-93-I). */
  deepLinkUrl: string;
  /** Mốc Sàn kỳ này (floorVnd), đã format kiểu vi-VN. */
  floorAmountText: string;
}
// ⚠ REV-6 (D-R6-10): KHÔNG nhận `creditedAmountText`. Số thực cộng vào ví là
// `sàn − khoảnReset`, chỉ tính được lúc member chấp nhận — mail phát vé nêu con
// số nào cũng sai (xem `CommitmentVoucherNotifySummary`). Mail chỉ nói Mốc Sàn.

/**
 * NOTIF (Phase 93, D-93-J) — email tiếng Việt gửi member khi cron đối soát mint
 * một phiếu "bù sàn" cam kết (offset) đang chờ nhận. Bọc `CompanyShell` (khung
 * thương hiệu chung) và đính nút CTA dẫn tới ticket commitment qua deep-link đã
 * khóa (D-93-I). Khung tiền cấp phát ở đây là quyền lợi CỘNG THÊM (bù sàn), không
 * phải cấp phát tạm ứng bị thu hồi — copy nhấn "cộng thêm để đạt Mốc Sàn".
 *
 * Template KHÔNG tự tính deep-link: caller (mail method) truyền `deepLinkUrl`
 * tuyệt đối vào (D-93-I prohibition — no route logic inside the template).
 *
 * `contentHtml` là chuỗi HTML (CompanyShell render qua dangerouslySetInnerHTML) —
 * mọi style để inline cho tương thích client email; gradient/box-shadow luôn kèm
 * `background-color`/nền đặc dự phòng cho Outlook (không hỗ trợ gradient).
 */
export const CommitmentVoucherCreatedEmail = ({
  name = 'Quý thành viên',
  deepLinkUrl = 'https://hoahong.acta.vn',
  floorAmountText = '0',
}: CommitmentVoucherCreatedEmailProps) => {
  const contentHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.65;margin:0 0 24px;">
      Kỳ này thu nhập của bạn chưa đạt <strong style="color:#8b4513;">Mốc Sàn cam kết</strong>.
      ACTA có một <strong style="color:#8b4513;">vé bù sàn</strong> cộng thêm cho bạn để
      đạt đủ mức sàn đã cam kết. Bấm nhận để khoản này được cộng vào ví hoa hồng của bạn.
    </p>

    <table role="presentation" width="100%" style="border-collapse:separate;margin:0 0 8px;">
      <tr>
        <td align="center" style="background-color:#f5ecdb;background:linear-gradient(135deg,#faf8f3 0%,#f3e5cf 100%);border:1px solid #ddbf94;border-radius:16px;padding:30px 24px;text-align:center;">
          <span style="display:inline-block;background-color:#fff4e6;color:#b45309;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;padding:5px 14px;border-radius:999px;border:1px solid #f5d9a8;">
            Vé bù sàn &middot; chờ nhận
          </span>
          <div style="color:#8b7355;font-size:13px;margin:18px 0 4px;">Mốc Sàn kỳ này</div>
          <div style="color:#166534;font-size:40px;font-weight:800;line-height:1.1;letter-spacing:-0.5px;">
            ${floorAmountText}<span style="font-size:24px;font-weight:700;margin-left:4px;">₫</span>
          </div>
          <div style="color:#8b7355;font-size:13px;margin-top:12px;">
            Nhận vé để thu nhập kỳ này <strong style="color:#5b4636;">đạt đủ Mốc Sàn</strong>
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:28px 0 18px;">
      <a href="${deepLinkUrl}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background-color:#8b4513;background:linear-gradient(135deg,#cd853f 0%,#8b4513 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:12px;box-shadow:0 6px 16px rgba(139,69,19,0.28);">
        Nhận vé bù sàn &rarr;
      </a>
    </div>

    <table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 4px;">
      <tr>
        <td style="background-color:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 16px;color:#92400e;font-size:14px;line-height:1.55;">
          Vé bù sàn có thời hạn nhận. Nếu để quá hạn, vé sẽ hết hiệu lực và kỳ này
          bạn chỉ nhận phần hoa hồng thực tế, không được cộng thêm bù sàn.
        </td>
      </tr>
    </table>

    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:20px 0 0;">
      Nếu nút phía trên không hoạt động, hãy sao chép và dán liên kết sau vào trình
      duyệt của bạn:<br />
      <a href="${deepLinkUrl}" style="color:#cd853f;text-decoration:underline;word-break:break-all;">${deepLinkUrl}</a>
    </p>
  `;

  return (
    <CompanyShell
      title="Vé bù sàn cam kết của bạn"
      previewText="Bạn có một vé bù sàn đang chờ nhận để đạt Mốc Sàn cam kết"
      greeting={`Xin chào ${name},`}
      contentHtml={contentHtml}
      footerNote="Thông báo này được gửi tự động khi có vé bù sàn cam kết mới dành cho bạn."
    />
  );
};
