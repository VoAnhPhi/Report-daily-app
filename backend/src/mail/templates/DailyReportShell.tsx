import { render } from '@react-email/render';
import { CompanyShell } from './CompanyShell';

/**
 * Khung email ACTA cho ba mẫu hệ thống Daily Report
 * (`DAILY_REPORT_READY`, `DAILY_REPORT_REMINDER`, `DAILY_REPORT_LEADER_SUMMARY`).
 *
 * Vì sao bọc ở server chứ không để admin tự dán khung:
 * contract admin (`acta-clients/acta-admin/docs/features/daily-report-email/00-README.md`
 * mục 5) cấm hard-code domain trong nội dung template, và `validateContent` của
 * `DailyReportEmailTemplateService` từ chối publish khi thấy bất kỳ URL tuyệt đối nào.
 * Logo, link acta.vn và footer liên hệ vì thế phải do server cấp — admin chỉ soạn
 * phần thân.
 *
 * Vì sao cache thay vì render mỗi lần: outbox gọi `renderPublished` một lần cho
 * MỖI người nhận (`daily-report-outbox.service.ts`), nên một nhóm 100 người sẽ
 * kéo theo 100 lần render React. Khung là cố định, chỉ phần thân và preview text
 * đổi theo người nhận, nên render một lần rồi thay sentinel.
 */

const PREVIEW_SENTINEL = 'DAILY_REPORT_PREVIEW_SENTINEL';
const CONTENT_SENTINEL = 'DAILY_REPORT_CONTENT_SENTINEL';

let shellPromise: Promise<string> | null = null;

/**
 * `CompanyShell` chỉ dùng `title` làm preview text dự phòng khi thiếu `previewText`,
 * nên một sentinel là đủ cho vùng preview.
 */
const renderShell = (): Promise<string> => {
  shellPromise ??= render(
    <CompanyShell title={PREVIEW_SENTINEL} contentHtml={CONTENT_SENTINEL} />,
  );
  return shellPromise;
};

/** Thay chuỗi bằng hàm replacer để `$&`, `$1`… trong dữ liệu không bị diễn giải. */
const replaceOnce = (source: string, token: string, value: string): string =>
  source.replace(token, () => value);

/**
 * Bọc phần thân đã render/sanitize vào khung ACTA.
 *
 * @param previewText dòng preview trong hộp thư — dùng subject đã resolve biến.
 * @param contentHtml HTML phần thân, PHẢI được sanitize trước khi truyền vào.
 */
export const renderDailyReportEmail = async (
  previewText: string,
  contentHtml: string,
): Promise<string> => {
  const shell = await renderShell();
  return replaceOnce(
    replaceOnce(shell, PREVIEW_SENTINEL, previewText),
    CONTENT_SENTINEL,
    contentHtml,
  );
};
