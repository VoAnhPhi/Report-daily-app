import { CompanyShell } from './CompanyShell';

export interface AllocationVoucherSettledEmailProps {
  /** Tên hiển thị của member (fullName). */
  name: string;
  /** Deep-link tuyệt đối tới ticket affiliate (D-84-L). */
  deepLinkUrl: string;
  /** Tên chính sách tiếng Việt (vd "Hái lộc cùng ACTA"). */
  policyName: string;
  /** Nhãn chế độ D6 ("Giải ngân" / "Cấp bù"). */
  modeLabel: string;
  /** Dòng phạm vi reset ("Từ trước đến nay" / "Đến hh:mm dd/mm/yyyy"). */
  resetScopeText: string;
  /** true = chế độ Cấp bù (offset); false = Giải ngân (payout). */
  isOffset: boolean;
  /** SỐ THỰC lúc accept: phần thu nhập thuộc phạm vi reset (vi-VN, không ₫). */
  liveResetPortionText: string;
  /** Payout: số đã cấn vào dư nợ tạm ứng (vi-VN). */
  debtRepayText: string;
  /** Offset: dư nợ tạm ứng phát sinh thêm (vi-VN). */
  topUpText: string;
  /** Số cuối cùng: thực giải ngân (payout) / đã ghi có (offset) — vi-VN. */
  finalAmountText: string;
  /** Dư nợ tạm ứng MỚI của đúng sổ chính sách sau tất toán (vi-VN). */
  newDebtBalanceText: string;
}

/**
 * Cấp phát thu nhập (spec cap-phat-thu-nhap §5 ③) — email tiếng Việt gửi member
 * NGAY SAU khi phiếu allocation tất toán, mang SỐ THỰC tính dưới lock lúc accept
 * (phần reset sống · cấn nợ / dư nợ phát sinh · thực nhận/ghi có · dư nợ mới).
 * Bọc `CompanyShell`; mọi style inline, gradient luôn kèm nền đặc dự phòng
 * Outlook (khuôn SalaryVoucherCreatedEmail).
 */
export const AllocationVoucherSettledEmail = ({
  name = 'Quý thành viên',
  deepLinkUrl = 'https://hoahong.acta.vn',
  policyName = '',
  modeLabel = '',
  resetScopeText = '',
  isOffset = false,
  liveResetPortionText = '0',
  debtRepayText = '0',
  topUpText = '0',
  finalAmountText = '0',
  newDebtBalanceText = '0',
}: AllocationVoucherSettledEmailProps) => {
  const amountLabel = isOffset
    ? 'Số tiền đã ghi có vào ví'
    : 'Số tiền thực giải ngân';
  const movementRow = isOffset
    ? `<tr>
        <td style="padding:8px 0;color:#8b7355;font-size:14px;">Dư nợ tạm ứng phát sinh</td>
        <td align="right" style="padding:8px 0;color:#b45309;font-size:14px;font-weight:700;">${topUpText}&nbsp;₫</td>
      </tr>`
    : `<tr>
        <td style="padding:8px 0;color:#8b7355;font-size:14px;">Đã cấn trừ dư nợ tạm ứng</td>
        <td align="right" style="padding:8px 0;color:#b45309;font-size:14px;font-weight:700;">${debtRepayText}&nbsp;₫</td>
      </tr>`;
  const payoutNote = isOffset
    ? ''
    : `<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:12px 0 0;">
        Khoản thực giải ngân được chi trả ngoài hệ thống kèm chứng từ đính trên phiếu.
      </p>`;

  const contentHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.65;margin:0 0 24px;">
      Phiếu <strong style="color:#8b4513;">cấp phát thu nhập</strong> của bạn đã được
      <strong style="color:#166534;">tất toán thành công</strong>. Dưới đây là các con số
      thực tế được hệ thống tính tại thời điểm bạn xác nhận.
    </p>

    <table role="presentation" width="100%" style="border-collapse:separate;margin:0 0 8px;">
      <tr>
        <td align="center" style="background-color:#f5ecdb;background:linear-gradient(135deg,#faf8f3 0%,#f3e5cf 100%);border:1px solid #ddbf94;border-radius:16px;padding:30px 24px;text-align:center;">
          <span style="display:inline-block;background-color:#ecfdf5;color:#047857;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;padding:5px 14px;border-radius:999px;border:1px solid #a7f3d0;">
            Đã tất toán
          </span>
          <div style="color:#8b7355;font-size:13px;margin:18px 0 4px;">${amountLabel}</div>
          <div style="color:#166534;font-size:40px;font-weight:800;line-height:1.1;letter-spacing:-0.5px;">
            ${finalAmountText}<span style="font-size:24px;font-weight:700;margin-left:4px;">₫</span>
          </div>
          <div style="color:#8b7355;font-size:13px;margin-top:12px;">
            Chính sách <strong style="color:#5b4636;">${policyName}</strong> &middot; ${modeLabel}
          </div>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0 4px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#8b7355;font-size:14px;">Phạm vi reset</td>
              <td align="right" style="padding:8px 0;color:#374151;font-size:14px;font-weight:600;">${resetScopeText}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#8b7355;font-size:14px;border-top:1px solid #f3f4f6;">Phần thu nhập thuộc phạm vi reset</td>
              <td align="right" style="padding:8px 0;color:#374151;font-size:14px;font-weight:700;border-top:1px solid #f3f4f6;">${liveResetPortionText}&nbsp;₫</td>
            </tr>
            ${movementRow}
            <tr>
              <td style="padding:8px 0;color:#8b7355;font-size:14px;border-top:1px solid #f3f4f6;">Dư nợ tạm ứng mới của chính sách</td>
              <td align="right" style="padding:8px 0;color:#374151;font-size:14px;font-weight:700;border-top:1px solid #f3f4f6;">${newDebtBalanceText}&nbsp;₫</td>
            </tr>
          </table>
          ${payoutNote}
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:28px 0 18px;">
      <a href="${deepLinkUrl}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background-color:#8b4513;background:linear-gradient(135deg,#cd853f 0%,#8b4513 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:12px;box-shadow:0 6px 16px rgba(139,69,19,0.28);">
        Xem chi tiết phiếu &rarr;
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
      title="Phiếu cấp phát thu nhập đã tất toán"
      previewText="Phiếu cấp phát thu nhập của bạn đã được tất toán"
      greeting={`Xin chào ${name},`}
      contentHtml={contentHtml}
      footerNote="Các con số trong email là số thực tế được hệ thống tính tại thời điểm bạn xác nhận phiếu."
    />
  );
};
