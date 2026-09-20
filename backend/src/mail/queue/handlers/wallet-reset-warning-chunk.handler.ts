import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import { WalletResetWarningChunkResult } from '../../../admin/wallet-reset-preview/warning/dto/wallet-reset-warning.dto';
import { WalletResetWarningEmailProps } from '../../../admin/wallet-reset-preview/warning/wallet-reset-warning-props.helper';

/**
 * Job CON của chiến dịch cảnh báo reset ví — gửi đúng một lô (tối đa 100 mail).
 *
 * Một job con ứng với đúng một lượt `resend.batch.send`, nên nó chiếm worker khoảng một giây.
 * Đó là điều kiện để chiến dịch không chặn mail giao dịch trên hàng đợi dùng chung.
 */

/** Chỉ phần gửi lô của `MailService` là thứ handler này cần. */
export interface WalletResetWarningSender {
  sendWalletResetWarningBatch(
    messages: Array<{
      key: string;
      to: string;
      props: WalletResetWarningEmailProps;
    }>,
  ): Promise<
    Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }>
  >;
}

/** Số thông điệp lỗi giữ lại — đủ để chẩn đoán, không đủ để phình `returnvalue` của job. */
const MAX_SAMPLE_ERRORS = 5;

export async function handleWalletResetWarningChunk(
  job: Job<MailJobPayload>,
  sender: WalletResetWarningSender,
): Promise<WalletResetWarningChunkResult> {
  const payload = job.data;
  if (payload.mailType !== 'wallet-reset-warning-chunk') {
    throw new Error(
      `[wallet-reset-warning-chunk] Sai loại job: nhận được "${payload.mailType}".`,
    );
  }

  const results = await sender.sendWalletResetWarningBatch(payload.messages);

  const sent = results.filter((result) => result.sent).length;
  const sampleErrors = results
    .filter((result) => Boolean(result.error))
    .slice(0, MAX_SAMPLE_ERRORS)
    .map((result) => result.error as string);

  // ⚠ KHÔNG ném khi một phần lô hỏng. Job chiến dịch chạy với `attempts: 1`, nên ném ở đây là
  // vứt luôn số liệu của cả lô: tuyến tra cứu trạng thái sẽ không đọc được `returnvalue` và
  // người vận hành mất hẳn thông tin "đã gửi được bao nhiêu". Trả `failed > 0` để báo cáo được.
  return {
    chunkIndex: payload.chunkIndex,
    attempted: payload.messages.length,
    sent,
    failed: payload.messages.length - sent,
    sampleErrors,
  };
}
