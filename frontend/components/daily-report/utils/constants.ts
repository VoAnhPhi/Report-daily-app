/**
 * Số liệu do SERVER chốt mà client chỉ được đọc: múi giờ nghiệp vụ, các trần
 * khớp DTO (chặn ở UI trước khi ăn 422), và bốn mốc giờ dự phòng dùng khi chưa
 * có scope nào để đọc.
 */

/** Múi giờ nghiệp vụ — server chốt cứng, client hiển thị theo đúng nó. */
export const REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/* ── Khuôn cụm chip lọc ────────────────────────────────────────────────────
 *
 * Ba màn (Lịch sử · Bảng nhóm · Tổng hợp) đều có một hàng chip "chọn một
 * trong nhiều". Trước đây mục đang chọn tô NỀN ĐEN (`ws-solid`) — cùng màu
 * với nút hành động chính. Đen là màu đậm nhất của cả bảng màu, mà một màn
 * Báo cáo có thể hiện cùng lúc: cụm chuyển màn, bốn tab việc, ba chip khoảng
 * ngày, dải chip lọc của bảng nhóm — tức năm sáu mảng đen tranh nhau, trong
 * khi thứ thật sự cần được nhìn thấy trước là nút nộp.
 *
 * Khuôn mới là "segmented": cả cụm nằm trên một dải nền CHÌM, mục đang chọn
 * nổi lên bằng nền TRẮNG + bóng nhẹ. Tương phản đến từ chênh lệch nền giữa
 * mục chọn và track, nên đọc được trên mọi nền mà không cần tới đen, và ở
 * chế độ tối tự đảo theo token. Đen từ đây chỉ còn ở đúng một nút chính mỗi
 * màn.
 *
 * Viền nằm ở TRACK chứ không ở từng chip: bốn năm chip mỗi cái một đường bao
 * là bốn năm hình chữ nhật cạnh nhau, đúng lỗi "khung trong khung" mà thang
 * viền ở docs 03 dặn tránh.
 */

/** Khoảng lịch sử tối đa BE cho phép (inclusive). Quá thì trả 422. */
export const MAX_HISTORY_RANGE_DAYS = 92;

/* ── Bốn trần của một câu trả lời ──────────────────────────────────────────
 *
 * Cả bốn là bản sao của hằng cùng tên trong
 * `acta-main-server/src/daily-reports/constants/daily-report.constants.ts`,
 * nơi `SaveAnswerDto` gắn chúng lên từng trường. Vượt trần là 422 — mà cú gọi
 * vướng 422 thường là cú TỰ ĐỘNG LƯU chạy ngầm, nên người dùng không thấy báo
 * gì, chỉ mất bài. Vì vậy phải chặn ở UI trước khi gọi.
 */

/**
 * Trần `content` — `@MaxLength(MAX_ANSWER_CONTENT_LENGTH)` của `SaveAnswerDto`.
 *
 * Trường `content` bên server KHÔNG có `@Transform(trimString)`, nên nó đếm
 * chuỗi THÔ: khoảng trắng và ký tự xuống dòng đều tính. Bộ đếm hiển thị cho
 * người dùng phải đếm y như vậy — `trim()` trước khi đếm là báo một con số dễ
 * chịu hơn con số server dùng để từ chối.
 */
export const MAX_ANSWER_CONTENT_LENGTH = 5000;

/**
 * Trần `linkedTaskIds` — `@ArrayMaxSize(MAX_LINKED_TASKS)` của `SaveAnswerDto`.
 *
 * Một cú bấm "Chèn" chạm ĐỒNG THỜI trần này và trần trên: nó vừa nối thêm một
 * dòng vào `content` vừa đẩy một `taskId` vào mảng này.
 */
export const MAX_LINKED_TASKS = 50;

/* Hai trần dưới đây CHƯA có nơi nào đọc, và hiện tại đó là đúng: payload lưu
 * nháp mà `buildPayload` (trong `report/report-form.tsx`) dựng chỉ gồm
 * `questionId`, `content`, `isAutoDrafted` và `linkedTaskIds`. Giao diện Báo
 * cáo chưa có ô nhắc tên người và chưa có đường đính kèm tệp, nên không có
 * đường nào chạm tới hai trần này. Giữ lại vì hai trường vẫn nằm trong
 * `SaveAnswerPayload` và trong `SaveAnswerDto` — ngày dựng hai tính năng đó
 * thì con số đã sẵn ở đây và vẫn khớp server. */

/** `@ArrayMaxSize(MAX_MENTIONED_USERS)` của `mentionedUserIds`. */
export const MAX_MENTIONED_USERS = 50;

/** `@ArrayMaxSize(MAX_ANSWER_ATTACHMENTS)` của `attachments`. */
export const MAX_ANSWER_ATTACHMENTS = 20;

/**
 * 07:30 — giờ sinh bản báo cáo. Hằng số sản phẩm: DTO server đã gỡ
 * `generateMinute`, không nhóm nào đổi được, nên đây vừa là dự phòng vừa là
 * giá trị duy nhất có thể xảy ra. Vẫn ưu tiên `scope.generationLabel` khi có.
 */
export const REPORT_GENERATE_MINUTE = 7 * 60 + 30;

/**
 * 23:00 — giờ khóa cứng mặc định của server.
 *
 * CHỈ là giá trị dự phòng cuối cùng khi thiếu `hardStopMinute`: nhóm đổi được
 * `cutoffMinute` qua form cấu hình, nên giá trị thật LUÔN đến từ
 * `scope.hardStopMinute`. Giữ hằng số vì `daily-report-schedule.test.ts` khoá
 * nó, và vì `validateReportSchedule` phải kiểm được cả draft chưa kèm cutoff.
 */
export const REPORT_CUTOFF_MINUTE = 23 * 60;

/**
 * 390 phút (6,5 giờ) trước giờ khóa — mặc định `reminderBeforeMinutes` của
 * server, ra 16:30 khi khóa lúc 23:00. Dự phòng khi chưa đọc được
 * `scope.reminderLabel`.
 */
export const DEFAULT_REMINDER_BEFORE_MINUTES = 390;

/**
 * 17:20 — mặc định `leaderSummaryMinute` của server. Đây là mốc CHỐT SỐ LIỆU
 * gửi trưởng nhóm, KHÔNG chặn nộp (docs 11 mục 1). Dự phòng khi chưa đọc được
 * `scope.leaderSummaryLabel`.
 */
export const DEFAULT_LEADER_SUMMARY_MINUTE = 17 * 60 + 20;

/** Trần `reminderBeforeMinutes` ở DTO server. */
export const REPORT_MAX_REMINDER_BEFORE = 720;
