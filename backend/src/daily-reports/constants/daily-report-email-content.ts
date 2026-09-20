import { DailyReportEmailTemplateKey } from '@prisma/client';

/**
 * Nội dung mặc định của ba mẫu email hệ thống Daily Report.
 *
 * Đây là PHẦN THÂN, không phải cả email: `DailyReportEmailTemplateService` bọc
 * chuỗi này vào khung ACTA (`CompanyShell`) trước khi gửi, nên ở đây không có
 * logo, header, footer hay bất kỳ domain nào.
 *
 * Ràng buộc bắt buộc — nội dung phải qua được `validateContent`:
 * - không chứa URL tuyệt đối (`http://`, `https://`); mọi link đi qua `{{actionUrl}}`;
 * - dùng đủ biến `required` của từng key, không dùng biến ngoài `allowed`.
 *
 * Style phải inline: email client không đọc `<style>` ổn định, và sanitizer chỉ
 * giữ `style`/`class` chứ không giữ thẻ `<style>`.
 *
 * Cùng ba chuỗi này được seed vào `daily_report_email_templates` bằng migration
 * `20260818040000_daily_report_email_acta_layout` và các migration copy tiếp theo.
 * Sửa ở đây chỉ đổi bản fallback của runtime; bản draft admin đang dùng nằm trong DB.
 */

const TEXT = 'color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;';
const ACCENT = 'color:#8b4513;font-weight:600;';
const GREETING =
  'color:#8b4513;font-size:22px;font-weight:700;line-height:1.4;margin:0 0 20px;';
const CARD =
  'background-color:#faf8f3;border:1px solid #ddbf94;border-radius:12px;margin:24px 0;';
const CELL_LABEL =
  'padding:14px 20px;color:#6b7280;font-size:13px;line-height:1.4;';
const CELL_VALUE =
  'padding:14px 20px;font-size:14px;line-height:1.4;text-align:right;';
const TONE_DEFAULT = 'color:#8b4513;font-weight:600;';
const TONE_DEADLINE = 'color:#b45309;font-weight:700;';
const DIVIDER = 'border-bottom:1px solid #ecdfc9;';
const BUTTON =
  'display:inline-block;background-color:#8b4513;background:linear-gradient(135deg,#cd853f 0%,#8b4513 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:12px;box-shadow:0 6px 16px rgba(139,69,19,0.28);';
const HINT = 'color:#9ca3af;font-size:13px;line-height:1.6;margin:20px 0 0;';

/** Nút hành động + dòng link dự phòng khi email client chặn nút. */
const cta = (label: string) =>
  `<div style="text-align:center;margin:28px 0 18px;">` +
  `<a href="{{actionUrl}}" target="_blank" rel="noopener noreferrer" style="${BUTTON}">${label} &rarr;</a>` +
  `</div>` +
  `<p style="${HINT}">Nếu nút phía trên không hoạt động, hãy sao chép liên kết sau vào trình duyệt:<br />` +
  `<a href="{{actionUrl}}" style="color:#cd853f;text-decoration:underline;word-break:break-all;">{{actionUrl}}</a></p>`;

const row = (label: string, value: string, tone = TONE_DEFAULT, last = false) =>
  `<tr>` +
  `<td style="${CELL_LABEL}${last ? '' : DIVIDER}">${label}</td>` +
  `<td style="${CELL_VALUE}${tone}${last ? '' : DIVIDER}">${value}</td>` +
  `</tr>`;

const READY_CONTENT =
  `<p style="${GREETING}">Xin chào {{recipientName}},</p>` +
  `<p style="${TEXT}">Báo cáo ngày <span style="${ACCENT}">{{reportDate}}</span> của <span style="${ACCENT}">{{scopeName}}</span> đã được tạo và mở lúc 07:30. Bạn hãy hoàn thiện nội dung và bấm <strong>Nộp báo cáo</strong> cho trưởng nhóm trước {{leaderSubmitTime}}.</p>` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${CARD}">` +
  row('Nhóm báo cáo', '{{scopeName}}') +
  row('Ngày báo cáo', '{{reportDate}}') +
  row('Hạn nộp cho trưởng nhóm', '{{leaderSubmitTime}}', TONE_DEADLINE, true) +
  `</table>` +
  cta('Mở báo cáo hôm nay') +
  `<p style="${HINT}">Tạo hoặc lưu báo cáo trước {{leaderSubmitTime}} nhưng chưa bấm Nộp thành công thì vẫn được tính là <strong>Chưa nộp</strong>. Báo cáo vẫn có thể được hoàn thiện trước {{hardStopTime}}; từ {{hardStopTime}}, báo cáo ngày {{reportDate}} chỉ còn ở chế độ xem và không thể sửa, nộp hoặc mở lại.</p>`;

const REMINDER_CONTENT =
  `<p style="${GREETING}">Xin chào {{recipientName}},</p>` +
  `<p style="${TEXT}">Bạn chưa nộp báo cáo ngày <span style="${ACCENT}">{{reportDate}}</span> cho trưởng nhóm của <span style="${ACCENT}">{{scopeName}}</span>. Vui lòng hoàn thiện và bấm <strong>Nộp báo cáo</strong> trước {{leaderSubmitTime}}.</p>` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:12px;margin:24px 0;">` +
  `<tr><td style="padding:20px;text-align:center;">` +
  `<div style="color:#92400e;font-size:13px;line-height:1.4;margin:0 0 6px;">Thời gian còn lại</div>` +
  `<div style="color:#b45309;font-size:26px;font-weight:700;line-height:1.3;margin:0 0 6px;">{{remainingTime}}</div>` +
  `<div style="color:#92400e;font-size:13px;line-height:1.4;">Hạn cuối nộp cho trưởng nhóm: {{leaderSubmitTime}}</div>` +
  `</td></tr></table>` +
  cta('Tiếp tục báo cáo') +
  `<p style="${HINT}">Chỉ lần nộp thành công trước {{leaderSubmitTime}} được ghi nhận. Tạo báo cáo hoặc lưu nháp trước hạn nhưng chưa nộp thành công vẫn hiển thị là <strong>Chưa nộp</strong>. Sau {{hardStopTime}}, báo cáo chuyển sang chỉ xem.</p>`;

const LEADER_SUMMARY_CONTENT =
  `<p style="${GREETING}">Xin chào {{recipientName}},</p>` +
  `<p style="${TEXT}">Đây là tình hình nộp báo cáo của <span style="${ACCENT}">{{scopeName}}</span> cho ngày <span style="${ACCENT}">{{reportDate}}</span>, được ghi nhận tại mốc tổng hợp {{leaderSubmitTime}}:</p>` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${CARD}">` +
  `<tr>` +
  `<td width="33%" style="padding:18px 12px;text-align:center;border-right:1px solid #ecdfc9;">` +
  `<div style="color:#15803d;font-size:26px;font-weight:700;line-height:1.3;">{{submittedCount}}</div>` +
  `<div style="color:#6b7280;font-size:12px;line-height:1.4;margin-top:4px;">Đã nộp</div></td>` +
  `<td width="33%" style="padding:18px 12px;text-align:center;border-right:1px solid #ecdfc9;">` +
  `<div style="color:#b45309;font-size:26px;font-weight:700;line-height:1.3;">{{missingCount}}</div>` +
  `<div style="color:#6b7280;font-size:12px;line-height:1.4;margin-top:4px;">Chưa nộp</div></td>` +
  `<td width="33%" style="padding:18px 12px;text-align:center;">` +
  `<div style="color:#8b4513;font-size:26px;font-weight:700;line-height:1.3;">{{totalCount}}</div>` +
  `<div style="color:#6b7280;font-size:12px;line-height:1.4;margin-top:4px;">Tổng thành viên</div></td>` +
  `</tr></table>` +
  cta('Xem chi tiết báo cáo') +
  `<p style="${HINT}">Từ bảng chi tiết, bạn có thể xem ai đã nộp, ai chưa nộp và mở báo cáo riêng của từng thành viên. Đây là số liệu tại mốc {{leaderSubmitTime}}; từ {{hardStopTime}}, báo cáo chỉ còn ở chế độ xem lịch sử.</p>`;

export interface DailyReportEmailContent {
  subject: string;
  content: string;
}

export const DAILY_REPORT_EMAIL_CONTENT: Record<
  DailyReportEmailTemplateKey,
  DailyReportEmailContent
> = {
  DAILY_REPORT_READY: {
    subject: 'Báo cáo ngày {{reportDate}} đã mở — hạn nộp {{leaderSubmitTime}}',
    content: READY_CONTENT,
  },
  DAILY_REPORT_REMINDER: {
    subject:
      'Bạn chưa nộp báo cáo ngày {{reportDate}} — hạn {{leaderSubmitTime}} (còn {{remainingTime}})',
    content: REMINDER_CONTENT,
  },
  DAILY_REPORT_LEADER_SUMMARY: {
    subject:
      'Tổng hợp lúc {{leaderSubmitTime}} — {{scopeName}} ngày {{reportDate}}',
    content: LEADER_SUMMARY_CONTENT,
  },
};
