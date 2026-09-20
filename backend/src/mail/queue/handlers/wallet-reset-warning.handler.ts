import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import {
  WalletResetPreviewDataset,
  WalletResetPreviewParams,
  WalletResetPreviewQueryDto,
  WalletResetPreviewRow,
} from '../../../admin/wallet-reset-preview/dto/wallet-reset-preview.dto';
import {
  WALLET_RESET_WARNING_BATCH_SIZE,
  WALLET_RESET_WARNING_DEV_TEST_EMAIL,
  WALLET_RESET_WARNING_DEV_TEST_SOURCE_EMAIL,
  WalletResetWarningKickoffResult,
} from '../../../admin/wallet-reset-preview/warning/dto/wallet-reset-warning.dto';
import { buildWarningProps } from '../../../admin/wallet-reset-preview/warning/wallet-reset-warning-props.helper';

/**
 * Job KHỞI ĐỘNG của chiến dịch cảnh báo reset ví.
 *
 * Chạy truy vấn cohort đúng MỘT lần rồi rải ra các job con, mỗi job con một lô mail. Việc chia
 * lô là lý do duy nhất khiến chiến dịch dùng chung được hàng đợi `mail-notifications` mà không
 * chặn mail giao dịch: không job nào giữ chỗ của worker quá khoảng một giây.
 *
 * Hàm độc lập, nhận phụ thuộc dạng interface CẤU TRÚC (khuôn `order-delivered.handler.ts`) để
 * test được mà không phải dựng cả đồ thị phụ thuộc của Nest.
 */

/** Chỉ phần `collect` của `WalletResetPreviewService` là thứ handler này cần. */
export interface WalletResetCohortSource {
  collect(query: WalletResetPreviewQueryDto): Promise<WalletResetPreviewDataset>;
  collectSingleByEmail(
    query: WalletResetPreviewQueryDto,
    email: string,
  ): Promise<{
    params: WalletResetPreviewParams;
    row: WalletResetPreviewRow;
  } | null>;
}

/** Chỉ phần `enqueue` của `MailNotificationsPublisher`. */
export interface ChunkDispatcher {
  enqueue(
    payload: MailJobPayload,
  ): Promise<{ jobId: string; alreadyQueued: boolean }>;
}

/**
 * Địa chỉ email có dùng được không.
 *
 * `users.email` khai `String @unique` (không null) nhưng thực tế vẫn lọt chuỗi rác / placeholder.
 * Người bị loại ở đây đếm vào `skippedNoEmail` và KHÔNG tính là lỗi gửi — trộn hai con số đó lại
 * sẽ khiến một cohort có nhiều tài khoản rác trông như một lượt gửi hỏng.
 */
function isUsableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.includes('@');
}

export async function handleWalletResetWarning(
  job: Job<MailJobPayload>,
  cohort: WalletResetCohortSource,
  dispatcher: ChunkDispatcher,
): Promise<WalletResetWarningKickoffResult> {
  const payload = job.data;
  if (payload.mailType !== 'wallet-reset-warning') {
    throw new Error(
      `[wallet-reset-warning] Sai loại job: nhận được "${payload.mailType}".`,
    );
  }

  const startedAt = new Date().toISOString();
  const parentJobId = job.id ?? 'unknown';

  // `AFFILIATE_APP_URL` phải trỏ cổng affiliate (hoahong.acta.vn), KHÔNG phải acta.vn — trang
  // tổng quan nằm trên cổng affiliate, đặt sai giá trị là nút trong thư dẫn tới link chết.
  const overviewUrl = (
    process.env.AFFILIATE_APP_URL ?? 'https://hoahong.acta.vn'
  ).replace(/\/+$/, '');

  // ---- Chế độ gửi thử ----
  // Lấy dữ liệu THẬT của tài khoản mẫu qua đúng pipeline tính tiền, rồi gửi tới hộp thư thử
  // nghiệm. Người NHẬN và tài khoản lấy DỮ LIỆU là hai địa chỉ khác nhau — đừng gộp hai hằng.
  //
  // `key` gắn `parentJobId` để mỗi lần bấm sinh một khoá chống-trùng khác nhau ở phía Resend:
  // khoá của `sendCommitmentEmailBatch` băm theo (nhãn + danh sách key + ngày UTC), nên một `key`
  // cố định sẽ khiến lần bấm thứ hai trong cùng ngày bị nuốt và người vận hành tưởng template
  // không cập nhật.
  if (payload.mode === 'dev_test') {
    const sample = await cohort.collectSingleByEmail(
      payload.filters,
      WALLET_RESET_WARNING_DEV_TEST_SOURCE_EMAIL,
    );
    if (!sample) {
      throw new Error(
        `[wallet-reset-warning] Không tìm thấy tài khoản đang hoạt động với địa chỉ ` +
          `${WALLET_RESET_WARNING_DEV_TEST_SOURCE_EMAIL} để lấy dữ liệu cho thư mẫu.`,
      );
    }

    await dispatcher.enqueue({
      mailType: 'wallet-reset-warning-chunk',
      parentJobId,
      chunkIndex: 0,
      messages: [
        {
          key: `devtest-${parentJobId}`,
          to: WALLET_RESET_WARNING_DEV_TEST_EMAIL,
          props: buildWarningProps(sample.row, sample.params, overviewUrl),
        },
      ],
    });

    return { cohortSize: 1, chunkCount: 1, skippedNoEmail: 0, startedAt };
  }

  // ---- Chế độ chiến dịch ----
  // `collect` NÉM LỖI khi cohort vượt trần 20.000 thay vì cắt bớt. Để lỗi đó nổi lên nguyên vẹn:
  // job khởi động hỏng TRƯỚC khi rải job con nào, nên không ai nhận nửa chiến dịch.
  const dataset = await cohort.collect(payload.filters);

  const usable = dataset.rows.filter((row) => isUsableEmail(row.email));
  const skippedNoEmail = dataset.rows.length - usable.length;

  const messages = usable.map((row) => ({
    key: row.userId,
    to: row.email.trim(),
    props: buildWarningProps(row, dataset.params, overviewUrl),
  }));

  let chunkIndex = 0;
  for (
    let offset = 0;
    offset < messages.length;
    offset += WALLET_RESET_WARNING_BATCH_SIZE
  ) {
    await dispatcher.enqueue({
      mailType: 'wallet-reset-warning-chunk',
      parentJobId,
      chunkIndex,
      messages: messages.slice(
        offset,
        offset + WALLET_RESET_WARNING_BATCH_SIZE,
      ),
    });
    chunkIndex += 1;
  }

  return {
    cohortSize: dataset.rows.length,
    chunkCount: chunkIndex,
    skippedNoEmail,
    startedAt,
  };
}
