/** Hằng số dùng chung cho Báo cáo hằng ngày (docs 04). */

/** Giới hạn nội dung một câu trả lời. */
export const MAX_ANSWER_CONTENT_LENGTH = 5000;
/** Giới hạn số công việc gắn vào một câu. */
export const MAX_LINKED_TASKS = 50;
/** Giới hạn số người được nhắc tên trong một câu. */
export const MAX_MENTIONED_USERS = 50;
/** Cùng trần với MAX_TASK_ATTACHMENTS của công việc. */
export const MAX_ANSWER_ATTACHMENTS = 20;
/** Khoảng tra cứu lịch sử tối đa (ngày). */
export const MAX_HISTORY_RANGE_DAYS = 92;

/** Giới hạn dòng gợi ý auto-draft (docs 05 mục 4). */
export const DRAFT_MAX_TOMORROW_LINES = 10;
/**
 * Trần dòng của hai câu "đã hoàn thành" và "còn tồn đọng".
 *
 * Từ 25/08/2026 đây là HAI câu riêng, mỗi câu một `linkedTaskIds` riêng — 15 chip
 * mỗi bên, thoải mái dưới `MAX_LINKED_TASKS`. Hồi còn ghép chung câu
 * `done_blocked` thì hai trần này cộng lại (15 + 15 = 30) mới là con số phải giữ
 * dưới trần, và đó là lý do chúng từng bị khoá ở 15.
 */
export const DRAFT_MAX_DONE_LINES = 15;
export const DRAFT_MAX_BLOCKED_LINES = 15;
/** Cửa sổ nhìn lùi cho gợi ý "cần hỗ trợ" (ngày). */
export const DRAFT_LOOKBACK_DAYS = 7;
/** Việc không hoạt động bao nhiêu ngày thì coi là bị treo. */
export const DRAFT_STALLED_DAYS = 5;
/** Việc quá hạn bao nhiêu ngày thì gợi ý vào "cần hỗ trợ". */
export const DRAFT_OVERDUE_HELP_DAYS = 3;
/**
 * Chuỗi chuyển tiếp chạm ngưỡng này thì giao diện cảnh báo: một việc bị đẩy sang
 * ngày sau năm LẦN là dấu hiệu nó đang kẹt. Đếm theo số lần, không theo số ngày
 * (thiết kế 20 mục 10.3). Server giữ ngưỡng và trả cờ `isLongChain`, client không
 * tự so con số.
 */
export const DAILY_REPORT_CARRY_CHAIN_WARN_COUNT = 5;

/** Khóa phân tán cho cron (CronJobLock). */
export const CRON_LOCK_GENERATE = 'daily-report:generate';
export const CRON_LOCK_REMIND = 'daily-report:remind';
export const CRON_LOCK_OUTBOX = 'daily-report:outbox';
export const CRON_LOCK_PURGE = 'daily-report:purge';

export const DAILY_REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';
/** Mặc định lịch theo scope; giờ sinh report vẫn là hằng số sản phẩm. */
export const DAILY_REPORT_GENERATE_MINUTE = 7 * 60 + 30;
export const DAILY_REPORT_REMINDER_MINUTE = 16 * 60 + 30;
/**
 * ĐỌC KỸ — hai hằng số ngay dưới đây đều là 17:20, và **không** hằng số nào là
 * hạn nộp. Tên `LEADER_SUBMISSION_*` dễ đọc nhầm nhất.
 *
 * 17:20 là mốc TỔNG HỢP: hệ thống chốt số liệu và gửi bản tổng hợp cho trưởng
 * nhóm. `DAILY_REPORT_LEADER_SUBMISSION_MINUTE` / `_LABEL` chỉ là NHÃN HIỂN THỊ
 * của đúng mốc đó, dùng cho biến `leaderSubmitTime` trong nội dung email (nghĩa
 * "hạn mềm" để kịp vào bản tổng hợp gửi trưởng nhóm).
 *
 * Backend KHÔNG dùng hai hằng số này để chặn bất kỳ thao tác ghi nào —
 * saveAnswers, submit, reopen sau 17:20 vẫn hợp lệ và được ghi nhận bình thường.
 * Mốc khóa THẬT và DUY NHẤT là `DAILY_REPORT_HARD_STOP_MINUTE` (23:00), áp dụng
 * cho mọi actor kể cả trưởng nhóm.
 */
export const DAILY_REPORT_LEADER_SUMMARY_MINUTE = 17 * 60 + 20;
/** Xem khối chú thích ngay trên: đây là NHÃN HIỂN THỊ, không phải hạn nộp. */
export const DAILY_REPORT_LEADER_SUBMISSION_MINUTE = 17 * 60 + 20;
export const DAILY_REPORT_HARD_STOP_MINUTE = 23 * 60;
export const DAILY_REPORT_ARCHIVE_RETENTION_MONTHS = 12;

/** Nhãn public để client không tự dựng lại contract thời gian. */
export const DAILY_REPORT_GENERATE_LABEL = '07:30';
export const DAILY_REPORT_REMINDER_LABEL = '16:30';
export const DAILY_REPORT_LEADER_SUMMARY_LABEL = '17:20';
export const DAILY_REPORT_LEADER_SUBMISSION_LABEL = '17:20';
export const DAILY_REPORT_HARD_STOP_LABEL = '23:00';

/** Hiển thị phút trong ngày theo định dạng HH:mm cho contract public/email. */
export const dailyReportMinuteLabel = (minute: number): string => {
  const safeMinute = Number.isFinite(minute) ? Math.trunc(minute) : 0;
  const normalized = Math.max(0, Math.min(23 * 60 + 59, safeMinute));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Gốc URL của acta-social.
 *
 * `FRONTEND_DOMAIN` là biến mà CẢ hệ thống dùng để trỏ về app social (mail
 * service, group-buy, order cron…). `ACTA_SOCIAL_URL` chỉ giữ làm override cho
 * trường hợp tách domain riêng — không repo nào đang đặt nó, nên đọc mình nó
 * khiến mọi link email rơi về `https://acta.vn` kể cả khi đang chạy dev.
 */
const socialBaseUrl = () =>
  (
    process.env.ACTA_SOCIAL_URL ??
    process.env.FRONTEND_DOMAIN ??
    'https://acta.vn'
  ).replace(/\/$/, '');

/**
 * Link sâu mở bản báo cáo trên web — trang `/daily-reports/today`, FE đọc query
 * `focusReportId`. Đổi domain một chỗ duy nhất (cùng khuôn taskLink của công việc).
 *
 * Route cũ `/tasks?section=report` chỉ còn được FE nhận để tương thích ngược;
 * mọi link mới sinh ra đều dùng dạng dưới đây.
 */
export const dailyReportLink = (reportId: string) =>
  `${socialBaseUrl()}/daily-reports/today?focusReportId=${encodeURIComponent(reportId)}`;

/**
 * Link sâu mở BẢNG THEO DÕI của một phạm vi — `scopeId` nằm trong đường dẫn
 * (`/daily-reports/:scopeId/board`), ngày đi kèm qua query `?date=`.
 *
 * Dùng cho thông báo tổng hợp gửi trưởng nhóm. KHÔNG được trỏ vào bản báo cáo
 * của một thành viên: `getById` chặn người khác đọc bản chưa nộp
 * (`daily-reports.service.ts` — "Bản nháp chỉ người sở hữu được xem"), nên link
 * kiểu đó luôn trả 403 ngay khi trưởng nhóm bấm vào.
 *
 * Kèm `date` khi biết ngày của sự kiện: FE mặc định mở bảng của HÔM NAY, nên
 * trưởng nhóm mở thông báo tối qua vào sáng hôm sau sẽ thấy bảng trống của ngày
 * mới thay vì ngày được nhắc tới.
 *
 * Dạng cũ `/tasks?section=board&focusScopeId=…&focusDate=…` đã ngừng sinh mới;
 * FE vẫn nhận nó để các thông báo cũ trong hộp thư không chết.
 */
export const dailyReportBoardLink = (scopeId: string, reportDate?: string) => {
  const base = `${socialBaseUrl()}/daily-reports/${encodeURIComponent(scopeId)}/board`;
  return reportDate ? `${base}?date=${encodeURIComponent(reportDate)}` : base;
};

/** Cache tags (nhớ §37: tag phải được invalidate ở phía ghi). */
export const CACHE_TAG_MY = 'daily-report:my';
export const CACHE_TAG_BOARD = 'daily-report:board';
export const CACHE_TAG_SCOPE = 'daily-report:scope';
