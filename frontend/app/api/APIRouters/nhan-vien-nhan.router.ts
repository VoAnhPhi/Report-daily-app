/**
 * Đường dẫn API của trợ lý AI "Nhân viên Nhàn" (chỉ super-admin).
 * Gom về một chỗ để không rải chuỗi đường dẫn khắp tầng client — đổi base path
 * ở backend chỉ phải sửa đúng tệp này.
 */
export const nhanVienNhan = {
  base: '/nhan-vien-nhan',
  conversations: '/nhan-vien-nhan/conversations',
  conversationById: (id: string) => `/nhan-vien-nhan/conversations/${id}`,
  /**
   * Endpoint trả `text/event-stream` — KHÔNG đi qua axios (xem
   * `streamNhanChat`), nhưng vẫn khai ở đây để mọi đường dẫn nằm cùng một nơi.
   */
  chat: (id: string) => `/nhan-vien-nhan/conversations/${id}/chat`,
  proposalConfirm: (proposalId: string) =>
    `/nhan-vien-nhan/proposals/${proposalId}/confirm`,
  proposalCancel: (proposalId: string) =>
    `/nhan-vien-nhan/proposals/${proposalId}/cancel`,
  /**
   * Đổi người phụ trách chính của một bản nháp CHƯA chạy.
   *
   * Đường dẫn để tiếng Việt (`nguoi-phu-trach`) chứ không phải `assignee` là cố
   * ý theo đúng thứ máy chủ đã mở, đừng "chuẩn hoá" lại sang tiếng Anh cho đẹp:
   * mỗi lần đoán tên đường dẫn ở tầng client là một lần nhận 404 mà thông báo
   * lỗi lại nói về đề xuất không tìm thấy — tức lỗi hiện ra ở đúng chỗ khiến
   * người đọc đi tìm nhầm phía máy chủ.
   */
  proposalAssignee: (proposalId: string) =>
    `/nhan-vien-nhan/proposals/${proposalId}/nguoi-phu-trach`,
  /** Tải Excel của một lượt trả lời — trả về nhị phân, không phải JSON. */
  messageExport: (messageId: string) =>
    `/nhan-vien-nhan/messages/${messageId}/export`,
  mentions: '/nhan-vien-nhan/mentions',
  /**
   * Mức dùng trong ngày của CHÍNH người gọi — lệnh `/usage` trong ô soạn.
   *
   * Không nhận tham số nào: phạm vi luôn là người đang đăng nhập, nên không có
   * đường nào để một người xem số liệu của người khác.
   */
  usage: '/nhan-vien-nhan/usage',
} as const;
