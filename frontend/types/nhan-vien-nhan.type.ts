/**
 * Kiểu dữ liệu của trợ lý AI "Nhân viên Nhàn" (màn /tasks, chỉ super-admin).
 *
 * Đặt tên trường theo đúng hợp đồng backend đã chốt — KHÔNG Việt hoá lại tên
 * trường ở tầng client, vì mỗi lần đổi tên là một chỗ nữa để lệch với BE. Chỉ
 * phần payload SSE mới dùng tên tiếng Việt, do BE cố ý phát sự kiện như vậy.
 */

export type NhanMessageRole = 'user' | 'assistant';

/** Loại hành động mà Nhàn đề xuất — người dùng phải bấm xác nhận mới chạy. */
export type NhanProposalKind =
  | 'tao_viec'
  | 'cap_nhat_viec'
  | 'doi_trang_thai'
  | 'binh_luan_viec'
  | 'gui_thu';

export type NhanProposalStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'failed';

export interface NhanConversationSummary {
  id: string;
  title: string | null;
  lastMessageAt: string;
  createdAt: string;
  messageCount: number;
}

export interface NhanToolTrace {
  ten: string; // tên kỹ thuật của công cụ
  nhan: string; // nhãn tiếng Việt để hiện cho người dùng
  tomTat?: string; // một dòng kết quả
  thanhCong: boolean;
  msChay?: number;
}

export interface NhanSource {
  tieuDe: string;
  url: string;
  trichDan?: string;
}

export interface NhanPreviewRow {
  nhan: string;
  giaTri: string;
}

export interface NhanProposalPreview {
  tieuDe: string;
  dong: NhanPreviewRow[];
  canhBao?: string[];
  soDoiTuong: number;
}

export interface NhanProposalDto {
  id: string;
  kind: NhanProposalKind;
  status: NhanProposalStatus;
  preview: NhanProposalPreview;
  expiresAt: string;
  resultSummary?: string | null;
  affectedIds: string[];
  createdAt: string;
}

export interface NhanMessageDto {
  id: string;
  conversationId: string;
  role: NhanMessageRole;
  content: string;
  toolTrace: NhanToolTrace[];
  sources: NhanSource[];
  mentionedUserIds: string[];
  mentionedTaskIds: string[];
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  proposals: NhanProposalDto[];
  /** Có tệp Excel tải được từ lượt này không (và tên tệp gợi ý). */
  taiVe?: { san: boolean; tenTep: string } | null;
}

export interface NhanMentionUser {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  referenceId: string;
  /**
   * Tài khoản đang bị KHOÁ (`isActive = false` ở máy chủ) ⇒ **không chọn được**.
   *
   * ⚠ Người bị khoá VẪN nằm trong danh sách gợi ý, và đó là chủ ý. Trước đây máy
   * chủ lọc thẳng họ ra, nên chủ dự án gõ đúng mã tham chiếu của một người có
   * thật mà danh sách không hiện ai — đọc ra là hệ thống hỏng, chứ không ai đoán
   * được rằng tài khoản đó đã bị khoá. Nay họ hiện ra để câu trả lời được nói
   * thành lời, và phần TỪ CHỐI chuyển hẳn về giao diện: hiện mờ, gắn nhãn "tài
   * khoản đã khoá", chuột bấm không ăn, Enter/Tab không chèn, phím mũi tên đi
   * VƯỢT QUA chứ không dừng lại (dừng ở một mục chết là người dùng bấm Enter rồi
   * không hiểu vì sao im).
   *
   * Vì vậy đây là trường BẮT BUỘC, không phải tuỳ chọn: để nó `?:` thì một bản
   * ghi thiếu cờ sẽ lặng lẽ đọc thành `undefined` → hoá "không khoá", và mục
   * chết lại trở nên chọn được — đúng cái lỗi đang được vá, chỉ khó thấy hơn.
   */
  daKhoa: boolean;
}

/**
 * Một thẻ việc đang được KÉO từ bảng sang khung chat để nhắc tới.
 *
 * Chỉ mang đúng hai thứ ô soạn cần, KHÔNG mang cả `Task`: bảng và khung chat là
 * hai nhánh cây khác nhau, nên mọi trường thừa đi qua đây đều là một sợi dây
 * buộc thêm giữa hai bên. `nhan` là chữ sẽ hiện sau dấu `@` trong ô soạn — mã
 * việc nếu có, không thì tiêu đề (việc mới tạo chưa kịp sinh mã).
 */
export interface NhanViecKeoTha {
  id: string;
  nhan: string;
}

export interface NhanMentionTask {
  id: string;
  code: string | null;
  title: string;
  status: string;
}

/* ------------------------------------------------------------------ *
 * Bao gói phản hồi HTTP
 * ------------------------------------------------------------------ */

/**
 * Danh sách hội thoại phân trang bằng CON TRỎ (không phải page/limit như
 * `PaginatedResponse` của phần còn lại của app) — hội thoại được chèn liên tục
 * nên đánh số trang sẽ trượt bản ghi; con trỏ theo `lastMessageAt` thì không.
 */
export interface NhanConversationListResponse {
  data: NhanConversationSummary[];
  nextCursor: string | null;
}

export interface NhanConversationDetail {
  conversation: NhanConversationSummary;
  messages: NhanMessageDto[];
}

export interface NhanMentionSearchResult {
  users: NhanMentionUser[];
  tasks: NhanMentionTask[];
}

/**
 * Mức dùng trong NGÀY của chính người đang hỏi (`GET /nhan-vien-nhan/usage`).
 *
 * ⚠ Hai trường dễ đọc nhầm, và đọc nhầm là vẽ ra màn hình nói ngược sự thật:
 *  • `tranNgay === 0` nghĩa là KHÔNG giới hạn, không phải "trần bằng không".
 *  • `conLai === null` xảy ra ĐÚNG khi `tranNgay === 0`. Nó KHÔNG phải "còn 0
 *    lượt" — hai tình trạng đó trái ngược nhau, nên không bao giờ được rơi về
 *    `conLai ?? 0` rồi vẽ "hết lượt" cho một người đang không bị giới hạn.
 *
 * `chiPhiUocTinhUSD` luôn là CẬN TRÊN: máy chủ không trừ phần token đọc lại từ
 * bộ nhớ đệm (rẻ hơn khoảng mười lần) vì bảng tin nhắn không tách được phần đó.
 * `ghiChu` là những câu tiếng Việt máy chủ đã soạn sẵn để nói thẳng điều này —
 * hiện NGUYÊN VĂN, đừng tóm tắt lại ở client rồi làm lệch nghĩa.
 */
export interface NhanUsageResponse {
  /** Số lượt HỎI đã dùng trong ngày, theo giờ Việt Nam. */
  luotHomNay: number;
  /** Trần đang áp dụng. `0` = không giới hạn. */
  tranNgay: number;
  /** Đã kẹp sàn ở 0. `null` khi và chỉ khi `tranNgay === 0`. */
  conLai: number | null;
  tokenVaoHomNay: number;
  tokenRaHomNay: number;
  /** USD, tối đa 6 chữ số thập phân. */
  chiPhiUocTinhUSD: number;
  /** ISO 8601 — mốc 00:00 của ngày kế tiếp theo giờ Việt Nam. */
  mocReset: string;
  /** Luôn có ít nhất một dòng; dòng đầu là lời cảnh báo "ước tính, không phải hoá đơn". */
  ghiChu: string[];
}

/**
 * Thân yêu cầu khi đổi người phụ trách chính của một bản nháp chưa chạy
 * (`PATCH /nhan-vien-nhan/proposals/:id/nguoi-phu-trach`).
 *
 * Chỉ mang ĐÚNG id người nhận việc, không mang lại cả bản nháp: máy chủ tự sửa
 * cả `payload` (thứ sẽ chạy khi bấm Xác nhận) lẫn `preview` (thứ người đọc thấy
 * trên thẻ) trong một lần ghi. Nếu client gửi kèm bản xem trước đã tự vẽ lại
 * thì sẽ có HAI nguồn sự thật cho cùng một bản nháp, và cái sai sẽ là cái người
 * dùng nhìn thấy trong khi cái chạy thật lại là cái kia — đúng lớp lỗi đã làm
 * một công việc biến mất khỏi mọi tab.
 */
export interface NhanDoiNguoiPhuTrachPayload {
  nguoiPhuTrachId: string;
}

/** Thân yêu cầu của lượt chat (endpoint streaming). */
export interface NhanChatPayload {
  noiDung: string;
  mentionedUserIds?: string[];
  mentionedTaskIds?: string[];
}

/* ------------------------------------------------------------------ *
 * Hợp đồng SSE của endpoint chat
 * ------------------------------------------------------------------ */

/** Giai đoạn Nhàn đang ở — dùng để hiện dòng trạng thái "đang ..." trên UI. */
export type NhanGiaiDoan = 'dang_nghi' | 'dang_dung_cong_cu' | 'dang_viet';

export interface NhanTrangThaiPayload {
  giaiDoan: NhanGiaiDoan;
  model: string;
}

/**
 * Một bước dùng công cụ đang diễn ra. Khác `NhanToolTrace` (bản lưu sau cùng ở
 * `NhanMessageDto`) ở chỗ `thanhCong` còn tuỳ chọn: lúc BE mới bắt đầu gọi công
 * cụ thì chưa biết kết quả, sự kiện thứ hai cùng `ten` mới mang kết luận.
 */
export interface NhanCongCuPayload {
  ten: string;
  nhan: string;
  tomTat?: string;
  thanhCong?: boolean;
}

/** Một mẩu chữ của câu trả lời — nối thêm vào cuối, KHÔNG thay thế. */
export interface NhanChuPayload {
  delta: string;
}

export interface NhanXongPayload {
  message: NhanMessageDto;
}

export interface NhanLoiPayload {
  thongDiep: string;
}

/**
 * Sự kiện SSE đã giải mã, phân biệt bằng trường `event` (discriminated union) —
 * người tiêu thụ `switch (e.event)` là TypeScript tự thu hẹp kiểu `e.data`.
 */
export type NhanStreamEvent =
  | { event: 'trang_thai'; data: NhanTrangThaiPayload }
  | { event: 'cong_cu'; data: NhanCongCuPayload }
  | { event: 'chu'; data: NhanChuPayload }
  | { event: 'nguon'; data: NhanSource }
  | { event: 'de_xuat'; data: NhanProposalDto }
  | { event: 'xong'; data: NhanXongPayload }
  | { event: 'loi'; data: NhanLoiPayload };

/** Tên các sự kiện SSE hợp lệ — tách ra để lọc sự kiện lạ mà không lặp chuỗi. */
export type NhanStreamEventName = NhanStreamEvent['event'];
