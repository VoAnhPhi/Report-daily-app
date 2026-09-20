/**
 * Từ vựng tiếng Việt của trạng thái bản / yêu cầu hỗ trợ và lý do gợi ý, cộng
 * bộ dựng dòng gợi ý nháp khớp đúng khuôn server sinh ra.
 */

import type {
  DailyReportBoardState,
  DailyReportHelpRequestStatus,
  DailyReportReviewDecision,
  DailyReportStatus,
  DraftSource,
} from '@/types/daily-report.type';

export const REPORT_STATUS_LABEL_VI: Record<DailyReportStatus, string> = {
  DRAFT: 'Chưa nộp',
  SUBMITTED: 'Đã nộp',
  REOPENED: 'Đang sửa lại',
  ARCHIVED: 'Đã lưu trữ',
};

/**
 * Chỉ hai trạng thái này được tính là chưa giải quyết (doc 12 mục 7). Giao diện
 * chỉ có HAI trạng thái cho một yêu cầu hỗ trợ (chốt 15/09/2026): `ACKNOWLEDGED`
 * còn trong enum nhưng không màn nào dùng, nên đọc chung là "Chưa giải quyết".
 */
export const isHelpOpen = (status: DailyReportHelpRequestStatus): boolean =>
  status === 'OPEN' || status === 'ACKNOWLEDGED';

/** Vì sao một việc được gợi ý — hiện trong tooltip của chip công việc. */
export const DRAFT_REASON_LABEL_VI: Record<string, string> = {
  activity_today: 'Có hoạt động hôm nay',
  completed_today: 'Hoàn thành hôm nay',
  subtask_done_today: 'Xong việc con hôm nay',
  in_progress_today: 'Đang làm',
  updated_today: 'Vừa cập nhật hôm nay',
  overdue: 'Quá hạn',
  due_today: 'Đến hạn hôm nay',
  carry_over: 'Chuyển tiếp từ hôm nay',
  reviewer_carry_over: 'Người duyệt chuyển sang hôm nay',
  due_tomorrow: 'Đến hạn ngày mai',
  starts_tomorrow: 'Bắt đầu ngày mai',
  stalled: 'Không hoạt động nhiều ngày',
  recurring_blocker: 'Tồn đọng lặp lại',
};

export const draftReasonLabel = (reason: string): string =>
  DRAFT_REASON_LABEL_VI[reason] ?? reason;

/**
 * Câu cảnh báo khi chuỗi chuyển tiếp chạm ngưỡng. Ngưỡng do server giữ và trả
 * qua cờ `isLongChain`; client chỉ nói câu này, không tự so con số.
 */
export const CARRY_LONG_CHAIN_WARNING =
  'Việc này đã bị đẩy sang ngày sau nhiều lần, có thể đang bị kẹt.';

/**
 * Nhãn một việc chuyển tiếp, dùng chung cho form kết luận và danh sách việc cần
 * làm tiếp: ưu tiên "mã · tiêu đề", rồi tiêu đề, rồi nội dung gõ tay.
 */
export function carryItemLabel(item: {
  code: string | null;
  title: string | null;
  note: string | null;
}): string {
  if (item.code && item.title) return `${item.code} · ${item.title}`;
  return item.title ?? item.note ?? 'Việc không có tiêu đề';
}

/**
 * Nhãn TÁM trạng thái trên trục duyệt, đọc thẳng `boardState` do server suy.
 * Một nguồn chữ cho bảng nhóm, dải trạng thái trên bản, và lịch sử.
 *
 * Ba nhãn dễ nhầm nhất nằm sát nhau:
 *   · "Chờ duyệt"       — người DUYỆT phải hành động;
 *   · "Quá hạn duyệt"   — người duyệt đã lỡ, KHÔNG phải thành viên làm sai;
 *   · "Quá hạn bổ sung" — thành viên hết hạn sửa, chỉ quản lý mở lại được.
 */
export const BOARD_STATE_LABEL_VI: Record<DailyReportBoardState, string> = {
  CHUA_NOP: 'Chưa nộp',
  CHO_DUYET: 'Chờ duyệt',
  QUA_HAN_DUYET: 'Quá hạn duyệt',
  DA_DUYET: 'Đạt',
  TIEP_TUC: 'Tiếp tục thực hiện',
  QUA_HAN_BO_SUNG: 'Quá hạn bổ sung',
  BI_TRA_LAI: 'Bị trả lại',
  DA_MO_LAI: 'Đã mở lại để bổ sung',
};

/**
 * Nhãn ba kết luận của người duyệt. MỘT nguồn chữ cho form kết luận và cho khối
 * kết luận đã có, nên hai khối không thể nói khác nhau về cùng một quyết định.
 */
export const REVIEW_DECISION_LABEL_VI: Record<
  DailyReportReviewDecision,
  string
> = {
  ACCEPTED: 'Đạt',
  CONTINUED: 'Tiếp tục thực hiện',
  // "Chưa đạt" thay cho "Trả lại" (UAT 17/09/2026): nói về chất lượng bản,
  // cặp đôi rõ ràng với "Đạt".
  REJECTED: 'Chưa đạt',
};

/**
 * Trần cắt chữ của TÊN VIỆC, khớp đúng `task.title.slice(0, 80)` trong
 * `renderLine` của `daily-report-draft.service.ts`. Server gửi `title` nguyên
 * vẹn trong `sources` nên client phải tự cắt cho ra cùng một dòng.
 *
 * Việc con thì KHÔNG có trần tương ứng: server đẩy thẳng `  – ${item.label}`,
 * không cắt gì. Bản cũ ở đây cắt nhãn việc con ở 60 ký tự và chú thích còn ghi
 * là để "khớp `DRAFT_MAX_ITEM_LABEL_LENGTH` trong service" — hằng đó chưa bao
 * giờ tồn tại bên server. Hậu quả người dùng báo 27/08/2026: chèn một việc con
 * tên dài thì câu trả lời nhận về một dòng cụt kèm dấu …, trong khi chữ mờ do
 * server dựng lại in đủ. Cùng loại lỗi với lần lọc `!done` vừa gỡ: client tự ý
 * xử lý lại thứ server đã chốt.
 */
const DRAFT_MAX_TITLE_LENGTH = 80;

export const ellipsize = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/**
 * Một dòng gợi ý: `• CV260814001 — Tên việc`, kèm việc con còn dở thụt lề.
 *
 * Phải ra ĐÚNG khuôn mà server dựng trong `daily-report-draft.service.ts`, vì
 * cùng một ô nhập chứa cả dòng do server điền sẵn lẫn dòng do người dùng bấm
 * chip thêm vào — hai khuôn khác nhau sẽ đọc như hai hệ thống khác nhau.
 */
export const draftSourceLine = (source: DraftSource): string => {
  const head = `• ${source.code ? `${source.code} — ` : ''}${ellipsize(source.title, DRAFT_MAX_TITLE_LENGTH)}`;
  /*
   * In ĐÚNG `source.items`, KHÔNG lọc lại lần nữa.
   *
   * Bản cũ lọc `items.filter((i) => !i.done)` và đó là lỗi người dùng báo
   * 27/08/2026. Server đã lọc `items` theo TỪNG CÂU HỎI trước khi gửi xuống
   * (`daily-report-draft.service.ts`, hàm `pickItems`, rồi `toSource` gán
   * `source.items = shownItems`):
   *
   *   câu "đã hoàn thành"  → mode `done_today` → mọi item mang `done: true`
   *   câu "còn tồn đọng"   → mode `pending`    → mọi item mang `!done`
   *
   * Nên ở câu "đã hoàn thành", cái lọc `!done` vứt sạch đúng những việc con vừa
   * tick xong. Chữ mờ trong ô nhập (server dựng) hiện đủ ba dòng, bấm "Chèn"
   * chỉ ra một dòng — người dùng mất đúng phần thành quả họ cần khai. Ở câu
   * "còn tồn đọng" thì cái lọc đó vô hại, nên lỗi chỉ lộ ở một câu.
   *
   * CÒN LỆCH MỘT ĐIỂM, cố ý chưa vá ở đây: server gắn thêm hậu tố vào dòng cha
   * (` (đã xong)`, ` (quá hạn 3 ngày)`, ` (chuyển tiếp từ hôm nay)`…) suy từ
   * `reason`, mà nhánh `overdue` cần `task.dueDate` — trường không có trong
   * `DraftSource`. Dựng lại bảng hậu tố ở client là tạo bản sao thứ hai chắc
   * chắn sẽ trôi khỏi bản gốc, đúng loại lỗi vừa sửa. Đường ra đúng là thôi
   * dựng lại chuỗi ở client và dùng thẳng `answer.suggestion` — chuỗi server đã
   * viết trọn cho cả câu.
   */
  const shown = source.items ?? [];
  if (shown.length === 0) return head;

  // Server gửi ĐỦ việc con khớp khối (không cắt theo số lượng, cũng không cắt
  // theo độ dài nhãn), nên ở đây cũng in đủ và in nguyên — không có dòng gộp
  // "… và N việc con khác", cũng không có dấu … giữa chừng.
  return [head, ...shown.map((i) => `  – ${i.label}`)].join('\n');
};
