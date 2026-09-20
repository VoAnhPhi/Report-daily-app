import { createHash } from 'crypto';

/** Một thư đã render xong, đúng thứ sẽ gửi sang Resend. */
export interface CommitmentBatchPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * `Idempotency-Key` TẤT ĐỊNH cho một chunk `resend.batch.send` của các loại mail cam
 * kết (tổng kết kỳ, danh hiệu TVTC, cảnh báo sắp trượt…).
 *
 * Thành phần: nhãn loại mail + ngày UTC + danh sách `key` của chunk + DẤU BĂM NỘI DUNG.
 *
 * ⚠ Vì sao phải có NỘI DUNG (vá 14/09/2026): trước đó khoá chỉ gồm nhãn + ngày + `key`,
 * mà với thư tuyến trên thì `key` là id NGƯỜI TUYẾN TRÊN. Hai lần gửi cùng ngày UTC cho
 * cùng người tuyến trên nhưng khác danh sách người mới (cron 00:50 rồi nút «Đồng bộ TVTC»,
 * hoặc dev dùng bản sao CSDL prod nên trùng id) ⇒ cùng khoá, khác thân ⇒ Resend từ chối
 * VĨNH VIỄN: "This idempotency key has been used … but the request body was modified".
 * Log thật trên prod 14/09/2026 04:23Z; người tuyến trên không nhận được thư.
 *
 * Giữ nguyên hai tính chất cũ:
 *  • TẤT ĐỊNH trong một lời gọi — ba lượt retry dùng CÙNG chunk đã render nên cùng khoá,
 *    Resend trả kết quả lượt đầu thay vì gửi lần hai (lý do khoá tồn tại).
 *  • ngày UTC — lượt cron đêm sau có khoá mới (xem khối giải thích ở chỗ gọi).
 *
 * Băm thay vì nối chuỗi: header của Resend giới hạn 256 ký tự.
 */
export function buildCommitmentBatchIdempotencyKey(
  tag: string,
  utcDay: string,
  chunk: Array<{ key: string; payload: CommitmentBatchPayload }>,
): string {
  const hash = createHash('sha256').update(`${tag}\0${utcDay}\0`);
  for (const c of chunk) {
    hash
      .update(c.key)
      .update('\0')
      .update(c.payload.to)
      .update('\0')
      .update(c.payload.subject)
      .update('\0')
      .update(createHash('sha256').update(c.payload.html).digest('hex'))
      .update('\0\0');
  }
  return `acta-cmk-${hash.digest('hex').slice(0, 32)}`;
}
