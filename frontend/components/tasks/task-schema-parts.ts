/**
 * Mảnh schema zod dùng chung giữa các form của Công việc.
 *
 * Tách khỏi `task-utils.ts` có chủ ý: file đó là tiện ích thuần (định dạng,
 * bảng cấu hình hiển thị) và không phụ thuộc zod. Giữ ranh giới đó để form
 * schema không kéo zod vào mọi nơi đang import `task-utils`.
 */
import * as z from 'zod';

/**
 * Một tệp đính kèm đã tải lên: tên hiển thị + URL do UploadThing trả về.
 *
 * Ba form dùng lại mảnh này nhưng bọc nó KHÁC nhau, nên chỉ dùng chung phần
 * lõi `z.object`, không nâng lên mức `.array()`:
 * - `create-task-modal` → `.array(...).optional()`
 * - `task-edit-form`    → `.array(...).default([])` (biến `undefined` thành `[]`)
 * - `update-status-modal` → `.array(...).optional()`, và tên trường là
 *   `evidence` chứ không phải `attachments` — tên đó đi thẳng vào payload gửi
 *   lên API nên không được đổi cho "khớp" với hằng này.
 *
 * `z.string().url()` đã bị đánh dấu deprecated trong zod 4.1 (khuyến nghị
 * `z.url()`). Giữ nguyên văn: đổi nó là viết lại logic, thuộc đợt khác.
 */
export const attachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

/**
 * Hạn hoàn thành không được sớm hơn ngày bắt đầu. Thiếu một trong hai thì bỏ
 * qua — cả hai đều là trường tuỳ chọn ở form tạo.
 */
export const isDueAfterStart = (v: {
  startDate?: string;
  dueDate?: string;
}): boolean =>
  !v.startDate ||
  !v.dueDate ||
  new Date(v.dueDate).getTime() >= new Date(v.startDate).getTime();

/**
 * Tham số lỗi cho `.refine()` của ràng buộc trên.
 *
 * Là HÀM trả object mới mỗi lần gọi, KHÔNG phải một hằng dùng chung — đây
 * không phải chuyện phong cách. zod 4 **sửa đổi tại chỗ** object params truyền
 * vào `.refine()`: `normalizeParams()` (`zod/v4/core/util.cjs`) gán
 * `params.error = params.message` rồi `delete params.message`. Nếu hai schema
 * cùng nhận một object thì schema thứ hai đọc phải object đã bị schema thứ
 * nhất viết lại, và cả hai closure `error` cùng trỏ vào một object sống.
 *
 * Hệ quả kèm theo: tuyệt đối không `Object.freeze` object này — zod sẽ ném
 * `TypeError: Cannot add property error` ngay lúc nạp module.
 */
export const dueAfterStartIssue = () => ({
  message: 'Thời gian hết hạn phải sau thời gian bắt đầu',
  path: ['dueDate'],
});
