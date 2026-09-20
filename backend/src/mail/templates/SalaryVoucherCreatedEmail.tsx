import { CompanyShell } from './CompanyShell';

export interface SalaryVoucherCreatedEmailProps {
  /** Member display name (fullName). */
  name: string;
  /** Absolute deep-link to the member's affiliate ticket (D-84-L). */
  deepLinkUrl: string;
  /** Số tiền cấp phát (con số cuối cùng member nhận), đã format kiểu vi-VN. */
  disbursementAmountText: string;
  /** Kỳ thu nhập — tháng (1-12). */
  periodMonth: number;
  /** Kỳ thu nhập — năm. */
  periodYear: number;
  /** Nhãn chính sách tiếng Việt (vd "Cấn trừ" / "Giải ngân"). */
  policyLabel?: string;
  /**
   * Cấp phát thu nhập (spec §5 ①, optional — backward-compatible với phiếu kỳ):
   * tên chính sách ("Minh Sứ Trưởng Lão" / "Khởi nghiệp cùng ACTA" / "Hái lộc
   * cùng ACTA"). Khi có, dòng "Kỳ thu nhập" được thay bằng chính sách + chế độ.
   */
  policyName?: string;
  /** Nhãn chế độ D6 ("Giải ngân" / "Cấp bù") — chỉ dùng cùng `policyName`. */
  modeLabel?: string;
  /** Dòng phạm vi reset ("Từ trước đến nay" / "Đến hh:mm dd/mm/yyyy"). */
  resetScopeText?: string;
  /** Hạn xác nhận 7 ngày đã format VN (vd "10:30 ngày 30/07/2026"). */
  deadlineText?: string;
}

/**
 * NOTIF-02 — email tiếng Việt gửi member khi admin TẠO một phiếu cấp phát thu
 * nhập (Minh Sứ Trưởng Lão). Bọc `CompanyShell` (khung thương hiệu chung) và
 * đính nút CTA dẫn tới ticket affiliate qua deep-link đã khóa (D-84-L).
 *
 * `contentHtml` là chuỗi HTML (CompanyShell render qua dangerouslySetInnerHTML) —
 * mọi style để inline để tương thích client email; gradient/box-shadow luôn kèm
 * `background-color`/nền đặc dự phòng cho Outlook (không hỗ trợ gradient).
 */
export const SalaryVoucherCreatedEmail = ({
  name = 'Quý thành viên',
  deepLinkUrl = 'https://hoahong.acta.vn',
  disbursementAmountText = '0',
  periodMonth = 1,
  periodYear = new Date().getFullYear(),
  policyLabel,
  policyName,
  modeLabel,
  resetScopeText,
  deadlineText,
}: SalaryVoucherCreatedEmailProps) => {
  const periodText = `Tháng ${String(periodMonth)}/${String(periodYear)}`;
  const policyInline = policyLabel ? ` &middot; ${policyLabel}` : '';

  // Cấp phát thu nhập (spec §5 ①): phiếu allocation không thuộc kỳ thu nhập —
  // thay dòng kỳ bằng chính sách + chế độ D6, thêm dòng phạm vi reset + hạn 7
  // ngày. Phiếu kỳ (không truyền `policyName`) giữ NGUYÊN nội dung cũ.
  const isAllocation = Boolean(policyName);
  const metaLine = isAllocation
    ? `Chính sách <strong style="color:#5b4636;">${policyName ?? ''}</strong>${
        modeLabel ? ` &middot; ${modeLabel}` : ''
      }`
    : `Kỳ thu nhập <strong style="color:#5b4636;">${periodText}</strong>${policyInline}`;
  const scopeLine =
    isAllocation && resetScopeText
      ? `<div style="color:#8b7355;font-size:13px;margin-top:6px;">Phạm vi reset: <strong style="color:#5b4636;">${resetScopeText}</strong></div>`
      : '';
  const ttlNote = isAllocation
    ? `Phiếu có hạn xác nhận trong <strong>7 ngày</strong>${
        deadlineText ? ` — đến hết <strong>${deadlineText}</strong>` : ''
      }. Nếu để quá hạn, phiếu sẽ hết hiệu lực và bạn cần chờ quản trị viên phát lại.`
    : `Phiếu có thời hạn xử lý. Nếu để quá hạn, phiếu sẽ hết hiệu lực và bạn cần
          chờ quản trị viên phát lại cho kỳ này.`;

  const contentHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.65;margin:0 0 24px;">
      Bạn vừa nhận một <strong style="color:#8b4513;">phiếu cấp phát thu nhập</strong>
      đang chờ xác nhận. Vui lòng kiểm tra thông tin và xử lý
      <strong>trước hạn</strong> để không bỏ lỡ quyền lợi của mình.
    </p>

    <table role="presentation" width="100%" style="border-collapse:separate;margin:0 0 8px;">
      <tr>
        <td align="center" style="background-color:#f5ecdb;background:linear-gradient(135deg,#faf8f3 0%,#f3e5cf 100%);border:1px solid #ddbf94;border-radius:16px;padding:30px 24px;text-align:center;">
          <span style="display:inline-block;background-color:#fff4e6;color:#b45309;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;padding:5px 14px;border-radius:999px;border:1px solid #f5d9a8;">
            Đang chờ xác nhận
          </span>
          <div style="color:#8b7355;font-size:13px;margin:18px 0 4px;">Số tiền cấp phát</div>
          <div style="color:#166534;font-size:40px;font-weight:800;line-height:1.1;letter-spacing:-0.5px;">
            ${disbursementAmountText}<span style="font-size:24px;font-weight:700;margin-left:4px;">₫</span>
          </div>
          <div style="color:#8b7355;font-size:13px;margin-top:12px;">
            ${metaLine}
          </div>
          ${scopeLine}
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:28px 0 18px;">
      <a href="${deepLinkUrl}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background-color:#8b4513;background:linear-gradient(135deg,#cd853f 0%,#8b4513 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:12px;box-shadow:0 6px 16px rgba(139,69,19,0.28);">
        Xem &amp; xác nhận phiếu &rarr;
      </a>
    </div>

    <table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 4px;">
      <tr>
        <td style="background-color:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 16px;color:#92400e;font-size:14px;line-height:1.55;">
          ${ttlNote}
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
      title="Phiếu cấp phát thu nhập của bạn"
      previewText="Bạn có một phiếu cấp phát thu nhập đang chờ xác nhận"
      greeting={`Xin chào ${name},`}
      contentHtml={contentHtml}
      footerNote="Thông báo này được gửi tự động khi có phiếu cấp phát thu nhập mới dành cho bạn."
    />
  );
};
