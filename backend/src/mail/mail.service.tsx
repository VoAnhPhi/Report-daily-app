import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import {
  applyMailDeliveryGuard,
  isMailDeliverySuppressed,
  resolveMailDeliveryMode,
  SKIPPED_EMAIL_ID,
} from './mail-delivery.guard';
import {
  buildCommitmentBatchIdempotencyKey,
  type CommitmentBatchPayload,
} from './commitment-batch-idempotency.util';
import { render } from '@react-email/render';
import { WelcomeEmail } from './templates/WelcomeEmail';
import {
  duongDanCongKhaiDiemCau,
  duongDanQuanLyDiemCau,
  URL_PDF_HUONG_DAN_AN_DIEM,
  gocThoDia,
} from './tho-dia-lien-ket.helper';
import {
  DiemCauMoiEmail,
  diemCauMoiSubject,
} from './templates/DiemCauMoiEmail';
import {
  BackfillDiemCauTomTatEmail,
  backfillDiemCauTomTatSubject,
} from './templates/BackfillDiemCauTomTatEmail';
import { VerificationEmail } from './templates/VerificationEmail';
import { PasswordResetEmail } from './templates/PasswordResetEmail';
import { EmailChangeConfirmation } from './templates/EmailChangeConfirmation';
import { PasswordChangeInfoEmail } from './templates/PasswordChangeInfoEmail';
import { PasswordChangeEmail } from './templates/PasswordChangeEmail';
import { AdminRequestChangeAccountEmail } from './templates/AdminRequestChangeAccountUser';
import { AdminRejectAccountEmail } from './templates/AdminRejectAccountUser';
import { AccountDeactivatedEmail } from './templates/AccountDeactivatedEmail';
import { AdminApproveAccountEmail } from './templates/AdminApproveAccountUser';
import { ReferrerApproveAccountEmail } from './templates/ReferrerApproveAccountUser';
import { ReferrerRejectAccountEmail } from './templates/ReferrerRejectAccountUser';
import { ReferrerRequestChangeAccountEmail } from './templates/ReferrerRequestChangeAccountUser';
import { UnpublishedPostNotification } from './templates/UnpublishedPostNotification';
import { KycRequestChangeEmail } from './templates/AdminRequestChangeKycEmail';
import KycApprovedEmail from './templates/AdminApproveKycMail';
import { KYCPendingNotificationEmail } from './templates/KYCPendingNotificationEmail';
import { MstlEligiblePendingEmail } from './templates/MstlEligiblePendingEmail';
import { TvtcDailyDigestEmail } from './templates/TvtcDailyDigestEmail';
import {
  AllocationVoucherSettledEmail,
  type AllocationVoucherSettledEmailProps,
} from './templates/AllocationVoucherSettledEmail';
import {
  AllocationDailyDigestEmail,
  type AllocationDigestEntry,
} from './templates/AllocationDailyDigestEmail';
import {
  CommitmentCycleRecapEmail,
  type CommitmentCycleRecapEmailProps,
} from './templates/CommitmentCycleRecapEmail';
import {
  CommitmentTvtcAwardedSelfEmail,
  type CommitmentTvtcAwardedSelfEmailProps,
} from './templates/CommitmentTvtcAwardedSelfEmail';
import {
  CommitmentTvtcAwardedUplineEmail,
  type CommitmentTvtcAwardedUplineEmailProps,
} from './templates/CommitmentTvtcAwardedUplineEmail';
import {
  CommitmentNearMissEmail,
  type CommitmentNearMissEmailProps,
} from './templates/CommitmentNearMissEmail';
import { WalletResetWarningEmail } from './templates/WalletResetWarningEmail';
import type { WalletResetWarningEmailProps } from '../admin/wallet-reset-preview/warning/wallet-reset-warning-props.helper';
import {
  CommitmentEnrollmentPausedEmail,
  type CommitmentEnrollmentPausedEmailProps,
} from './templates/CommitmentEnrollmentPausedEmail';
import {
  CommitmentEnrollmentOnBehalfEmail,
  type CommitmentEnrollmentOnBehalfEmailProps,
} from './templates/CommitmentEnrollmentOnBehalfEmail';
import {
  CommitmentEnrollmentResumedEmail,
  type CommitmentEnrollmentResumedEmailProps,
} from './templates/CommitmentEnrollmentResumedEmail';
import {
  ShrineInvitationEmail,
  type ShrineInvitationEmailProps,
} from './templates/ShrineInvitationEmail';
import {
  ShrineEnrolledEmail,
  type ShrineEnrolledEmailProps,
} from './templates/ShrineEnrolledEmail';
import {
  ShrineRejectedEmail,
  type ShrineRejectedEmailProps,
} from './templates/ShrineRejectedEmail';
import {
  ShrineRenamedEmail,
  type ShrineRenamedEmailProps,
} from './templates/ShrineRenamedEmail';
import {
  ShrineRevokedEmail,
  type ShrineRevokedEmailProps,
} from './templates/ShrineRevokedEmail';
import {
  ShrineWithdrawnEmail,
  type ShrineWithdrawnEmailProps,
} from './templates/ShrineWithdrawnEmail';
import {
  ShrineInviteExpiredEmail,
  type ShrineInviteExpiredEmailProps,
} from './templates/ShrineInviteExpiredEmail';
import {
  ShrineSuspendedEmail,
  type ShrineSuspendedEmailProps,
} from './templates/ShrineSuspendedEmail';
import {
  ShrineRestoredEmail,
  type ShrineRestoredEmailProps,
} from './templates/ShrineRestoredEmail';
import NotificationUpdateKycEmail from './templates/NotificationUpdateKycEmail';
import KycUpdateReminderEmail from './templates/NotificationChangingKycEmail';
// ApiKeyOtpEmail is dynamically imported to avoid production bundling issues
import { OrderSuccessEmail } from './templates/OrderSuccessEmail';
import { OrderCancelledEmail } from './templates/OrderCancelledEmail';
import { AffiliateCommissionEmail } from './templates/AffiliateCommissionEmail';
import {
  ShareholderReferralRewardEmail,
  type QuanHeGioiThieu,
} from './templates/ShareholderReferralRewardEmail';
import { ViolationAlertEmail } from './templates/ViolationAlertEmail';
import { NewBusinessUserCredentialsEmail } from './templates/NewBusinessUserCredentialsEmail';
import { BusinessCreatedEmail } from './templates/BusinessCreatedEmail';
import { BusinessApprovedEmail } from './templates/BusinessApprovedEmail';
import {
  BusinessFormStatusEmail,
  type BusinessFormEmailTransition,
  type BusinessFormFieldFlagSummary,
} from './templates/BusinessFormStatusEmail';
import { VoucherNotificationEmail } from './templates/VoucherNotificationEmail';
import { VoucherRedistributionNotificationEmail } from './templates/VoucherRedistributionNotificationEmail';
import { DeliverySuccessEmail } from './templates/DeliverySuccessEmail';
import { AccountDeletedEmail } from './templates/AccountDeletedEmail';
import { HalfWalletSubmittedAdminEmail } from './templates/HalfWalletSubmittedAdminEmail';
import { HalfWalletChangeRequestAdminEmail } from './templates/HalfWalletChangeRequestAdminEmail';
import { HalfWalletProcessingEmail } from './templates/HalfWalletProcessingEmail';
import { HalfWalletProofUploadedEmail } from './templates/HalfWalletProofUploadedEmail';
import { HalfTransferRequestedAdminEmail } from './templates/HalfTransferRequestedAdminEmail';
import { HalfTransferDecisionEmail } from './templates/HalfTransferDecisionEmail';
import { HalfManualSentEmail } from './templates/HalfManualSentEmail';
import { TaskRejectedEmail } from './templates/TaskRejectedEmail';
import { RedeemVoucherRequestReceivedEmail } from './templates/RedeemVoucherRequestReceivedEmail';
import {
  RecognizedUserEmail,
  tieuDeThuCongNhan,
} from './templates/RecognizedUserEmail';
import { SalaryVoucherCreatedEmail } from './templates/SalaryVoucherCreatedEmail';
import { SalaryVoucherReminderEmail } from './templates/SalaryVoucherReminderEmail';
import { CommitmentVoucherCreatedEmail } from './templates/CommitmentVoucherCreatedEmail';
import {
  CommitmentVoucherReminderEmail,
  type CommitmentVoucherReminderVariant,
} from './templates/CommitmentVoucherReminderEmail';
import { ConfirmedOrdersNotification } from './templates/ConfirmedOrdersNotification';
import { WithdrawalSuccessEmail } from './templates/WithdrawalSuccessEmail';
import { TeamMembersAddedEmail } from './templates/TeamMembersAddedEmail';
import { TeamMemberRemovedEmail } from './templates/TeamMemberRemovedEmail';
import { TeamJoinRequestApprovedEmail } from './templates/TeamJoinRequestApprovedEmail';
import { TeamLeaveRequestApprovedEmail } from './templates/TeamLeaveRequestApprovedEmail';
import { TeamLeaveRequestRejectedEmail } from './templates/TeamLeaveRequestRejectedEmail';
import { TeamMemberRoleChangedEmail } from './templates/TeamMemberRoleChangedEmail';
import { TeamDissolvedEmail } from './templates/TeamDissolvedEmail';
import { TeamRequestAdminNotificationEmail } from './templates/TeamRequestAdminNotificationEmail';
import { ReferrerNewGuestOrderEmail } from './templates/ReferrerNewGuestOrderEmail';
import { ProductReviewSubmittedEmail } from './templates/ProductReviewSubmittedEmail';
import { ProductReviewResultEmail } from './templates/ProductReviewResultEmail';
import { ReviewSubmittedEmail } from './templates/ReviewSubmittedEmail';
import { ReviewResultEmail } from './templates/ReviewResultEmail';
import { WarehouseReviewSubmittedEmail } from './templates/WarehouseReviewSubmittedEmail';
import { WarehouseReviewApprovedEmail } from './templates/WarehouseReviewApprovedEmail';
import { WarehouseReviewRejectedEmail } from './templates/WarehouseReviewRejectedEmail';
import { WarehouseMovementNoticeEmail } from './templates/WarehouseMovementNoticeEmail';
import { OrderWarehouseAssignmentEmail } from './templates/OrderWarehouseAssignmentEmail';
import { ProductAvailabilityNotificationEmail } from './templates/ProductAvailabilityNotificationEmail';
import { ProductAvailabilitySubscriptionConfirmationEmail } from './templates/ProductAvailabilitySubscriptionConfirmationEmail';
import { OrderGiftRecipientNotificationEmail } from './templates/OrderGiftRecipientNotificationEmail';
import { OrderGiftDeliveredBuyerEmail } from './templates/OrderGiftDeliveredBuyerEmail';
import { GratitudeEmail } from './templates/GratitudeEmail';
import {
  GroupBuyMembershipChangeEmail,
  groupBuyMembershipSubject,
  type GroupBuyMembershipEvent,
} from './templates/GroupBuyMembershipChangeEmail';

type OrderSuccessEmailProductSnapshot = {
  id: string;
  name: string;
  thumbnail?: string;
  code: string;
};

interface OrderSuccessEmailItemData {
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: OrderSuccessEmailProductSnapshot;
}

interface OrderSuccessEmailCustomerInfoData {
  fullName: string;
  phone: string;
  email: string;
  addressLine1?: string;
  province?: string;
  district?: string;
  ward?: string;
}

interface OrderSuccessEmailRecipientAudit {
  attempted: string[];
  placeholder: string[];
}

interface OrderSuccessEmailCustomerSnapshot {
  id?: string;
  userId?: string | null;
  kiotVietCustomerId?: number | null;
  kiotVietCustomerCode?: string | null;
  user?: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    referenceId: string;
  } | null;
}

interface OrderSuccessEmailGiftSummary {
  recipientName: string;
  // Raw recipient phone — masked at render time inside OrderSuccessEmail.
  recipientPhone: string;
  giftTemplateName?: string;
  giftMessagePreview?: string;
  anonymousSender: boolean;
  senderDisplayName?: string;
  preferredDeliveryDate?: Date;
  preferredDeliveryTimeStart?: string;
  preferredDeliveryTimeEnd?: string;
}

interface OrderSuccessEmailPayload {
  customerName: string;
  email?: string | null;
  recipientEmails?: string[];
  recipientAudit?: OrderSuccessEmailRecipientAudit;
  customerSnapshot?: OrderSuccessEmailCustomerSnapshot | null;
  orderCode: string;
  orderId: string;
  items: OrderSuccessEmailItemData[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  vatAmount: number;
  totalWithVat: number;
  estimatedDelivery?: Date;
  customerInfo: OrderSuccessEmailCustomerInfoData;
  trackingNumber?: string;
  giftSummary?: OrderSuccessEmailGiftSummary;
  groupBuy?: {
    leaderName: string;
    total: number;
    members: Array<{ name: string; contribution: number | null; isLeader: boolean }>;
  } | null;
}

/**
 * Bóc danh sách message-id từ phản hồi `resend.batch.send` (Phase 113, D-R6-07).
 *
 * Hình dạng thật là `{ data: { data: [{ id }] }, error }` — hai tầng `data` LỒNG
 * nhau, một cái của SDK và một cái của API. Narrowing từng bước thay vì cast thẳng
 * (§21, không `any`): SDK có thể đổi hình dạng giữa các bản, và thứ ta rút ra đây
 * được ghi vào sổ gửi mail làm manh mối truy vết khi member báo không nhận được —
 * một `undefined` lọt qua sẽ chỉ lộ ra ở đúng lúc cần điều tra nhất.
 *
 * Không nhận diện được ⇒ mảng RỖNG, KHÔNG throw: mail đã gửi thật rồi, thiếu id chỉ
 * làm mất manh mối truy vết chứ không được phép biến thành "gửi hỏng".
 */
function extractResendBatchIds(response: unknown): string[] {
  if (typeof response !== 'object' || response === null) return [];
  const outer = (response as { data?: unknown }).data;
  if (typeof outer !== 'object' || outer === null) return [];
  const inner = (outer as { data?: unknown }).data;
  if (!Array.isArray(inner)) return [];
  return inner.map((entry) => {
    if (typeof entry === 'object' && entry !== null) {
      const id = (entry as { id?: unknown }).id;
      if (typeof id === 'string') return id;
    }
    return '';
  });
}

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.resend = applyMailDeliveryGuard(
      new Resend(process.env.RESEND_API_KEY),
      this.logger,
    );
  }

  private validateEmailConfig() {
    // When the guard suppresses delivery there is no Resend call to make, so a
    // missing key is not an error — this is what lets a local .env drop
    // RESEND_API_KEY entirely without turning every mail path into a 500.
    if (isMailDeliverySuppressed()) return;
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    if (!process.env.FRONTEND_DOMAIN) {
      throw new Error('FRONTEND_DOMAIN environment variable is not set');
    }
  }

  /**
   * sendTransactionalEmail
   *
   * Low-level helper used by BullMQ processor handlers (order-placed,
   * order-completed-with-points, order-delivered) to send a pre-rendered HTML
   * email via Resend.
   *
   * Throws on Resend API error so the BullMQ retry policy (D-06) applies.
   * Does NOT save to sentEmail DB table — transactional mails are tracked via
   * BullMQ job retention (removeOnComplete: 10000).
   */
  async sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
    idempotencyKey?: string;
  }): Promise<void> {
    // Same reasoning as validateEmailConfig(): no key is needed when the guard
    // is going to short-circuit the send anyway.
    if (!isMailDeliverySuppressed() && !process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    const result = await this.resend.emails.send(
      {
        from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        headers: {
          'Content-Language': 'vi',
          'X-Language': 'Vietnamese',
        },
      },
      params.idempotencyKey
        ? { idempotencyKey: params.idempotencyKey }
        : undefined,
    );

    if (result.error) {
      throw new Error(
        `Resend API error sending transactional mail to ${params.to}: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }
  }

  // Redeem Voucher - Request Received
  async sendRedeemVoucherRequestReceivedEmail(data: {
    email: string;
    userName?: string;
    referenceId?: string | null;
    voucherLabel?: string;
  }) {
    this.validateEmailConfig();
    const html = await render(
      <RedeemVoucherRequestReceivedEmail
        email={data.email}
        userName={data.userName}
        referenceId={data.referenceId}
        voucherLabel={data.voucherLabel}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: data.email,
      subject: 'Đã nhận thông tin đổi voucher của bạn',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  private async sendEmailWithRetry<T>(
    emailFunction: () => Promise<T>,
    email: string,
    emailType: string,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await emailFunction();

        // Resend's SDK RESOLVES (does not throw) on API-level failures,
        // returning { data: null, error: {...} } — e.g. 429 rate-limit or an
        // unverified/blocked recipient. Without this guard the loop logs
        // "sent successfully" and silently drops the email with no retry,
        // which is why buyers intermittently miss the order-success mail even
        // though the log says it sent. Surface it so the retry/backoff below
        // runs and a genuine failure throws instead of masquerading as success.
        const resendError = (result as { error?: { message?: string } | null })
          ?.error;
        if (resendError) {
          throw new Error(
            resendError.message ?? JSON.stringify(resendError),
          );
        }

        this.logger.log(
          `${emailType} email sent successfully to ${email} on attempt ${attempt}`,
        );
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Failed to send ${emailType} email to ${email} (attempt ${attempt}/${maxRetries}): ${error.message}`,
        );

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          this.logger.log(
            `Retrying ${emailType} email send to ${email} in ${waitTime}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    this.logger.error(
      `Failed to send ${emailType} email to ${email} after ${maxRetries} attempts. Last error: ${lastError?.message}`,
      lastError?.stack,
    );
    throw lastError;
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    this.validateEmailConfig();
    const url = `${process.env.FRONTEND_DOMAIN}/verify-email?token=${token}`;
    const html = await render(<VerificationEmail name={name} url={url} />);

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: email,
          subject: 'Xác nhận tài khoản',
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      email,
      'verification',
    );
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    this.validateEmailConfig();
    const url = `${process.env.FRONTEND_DOMAIN}/reset-password?token=${token}`;
    const html = await render(
      <PasswordResetEmail name={name} resetUrl={url} />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: email,
          subject: 'Yêu cầu đặt lại mật khẩu',
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      email,
      'password reset',
    );
  }

  async sendEmailChangeConfirmation(
    email: string,
    name: string,
    token: string,
  ) {
    const url = `${process.env.FRONTEND_DOMAIN}/confirm-email-change?token=${token}`;
    const html = await render(
      <EmailChangeConfirmation name={name} url={url} />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Xác nhận địa chỉ email mới',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendPasswordChangeOtpEmail(name: string, email: string, otp: string) {
    const html = await render(<PasswordChangeEmail name={name} otp={otp} />);

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Mã OTP xác thực thay đổi mật khẩu',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendWelcomeEmail(email: string, name: string) {
    const html = await render(<WelcomeEmail name={name} />);

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Chào mừng bạn đến với Liên minh Cộng đồng thực chiến (ACTA)!',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendPasswordChangeInfoEmail(
    email: string,
    name: string,
    changeTime: Date,
  ) {
    const html = await render(
      <PasswordChangeInfoEmail name={name} changeTime={changeTime} />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Mật khẩu của bạn đã được thay đổi',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  /**
   * NOTIF-02 (D-84-L) — email tiếng Việt gửi member khi admin TẠO phiếu cấp
   * phát thu nhập. `deepLinkUrl` là URL tuyệt đối tới ticket affiliate (khóa
   * theo D-84-L). Đây là send TRỰC TIẾP qua Resend; caller (SalaryVoucher
   * NotificationService) bọc try/catch best-effort nên lỗi gửi KHÔNG rơi vào
   * money-path (D-84-L / §35).
   */
  async sendSalaryVoucherCreatedEmail(
    email: string,
    name: string,
    deepLinkUrl: string,
    summary: {
      disbursementAmountText: string;
      periodMonth: number;
      periodYear: number;
      policyLabel?: string;
      // Cấp phát thu nhập (spec §5 ①, optional — backward-compatible): tên
      // chính sách + nhãn chế độ D6 + dòng phạm vi reset + hạn 7 ngày.
      policyName?: string;
      modeLabel?: string;
      resetScopeText?: string;
      deadlineText?: string;
    },
  ) {
    const html = await render(
      <SalaryVoucherCreatedEmail
        name={name}
        deepLinkUrl={deepLinkUrl}
        disbursementAmountText={summary.disbursementAmountText}
        periodMonth={summary.periodMonth}
        periodYear={summary.periodYear}
        policyLabel={summary.policyLabel}
        policyName={summary.policyName}
        modeLabel={summary.modeLabel}
        resetScopeText={summary.resetScopeText}
        deadlineText={summary.deadlineText}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Phiếu cấp phát thu nhập của bạn',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  /**
   * D-84-G — email nhắc/​thông báo vòng đời phiếu cấp phát thu nhập cho member
   * (dùng cho "phiếu sắp hết hạn" và "phiếu đã hết hạn"). Copy tiếng Việt do
   * caller truyền vào; send TRỰC TIẾP qua Resend, caller bọc best-effort (D-84-L).
   */
  async sendSalaryVoucherReminderEmail(
    email: string,
    name: string,
    deepLinkUrl: string,
    content: {
      subject: string;
      title: string;
      bodyText: string;
      ctaLabel?: string;
      footerNote?: string;
    },
  ) {
    const html = await render(
      <SalaryVoucherReminderEmail
        name={name}
        deepLinkUrl={deepLinkUrl}
        title={content.title}
        bodyText={content.bodyText}
        ctaLabel={content.ctaLabel}
        footerNote={content.footerNote}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: content.subject,
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  /**
   * Cấp phát thu nhập (spec §5 ③) — email tiếng Việt gửi member NGAY SAU khi
   * phiếu allocation tất toán, mang SỐ THỰC tính dưới lock lúc accept (phần
   * reset sống · cấn nợ / dư nợ phát sinh · thực nhận/ghi có · dư nợ mới).
   * Caller (`SalaryVoucherNotificationService.notifyAllocationSettled`) bọc
   * best-effort nên lỗi gửi KHÔNG rơi vào money-path (D-84-L / §35).
   *
   * ⚠ THROW khi Resend trả `{ data: null, error }` (SDK RESOLVE, không throw —
   * cùng bẫy `sendEmailWithRetry` đã vá) để caller log được lần gửi hỏng.
   */
  async sendAllocationVoucherSettledEmail(
    email: string,
    props: AllocationVoucherSettledEmailProps,
  ): Promise<void> {
    const html = await render(<AllocationVoucherSettledEmail {...props} />);

    const result = await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Phiếu cấp phát thu nhập của bạn đã tất toán',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });

    if (result.error) {
      throw new Error(
        `Resend API error sending allocation settled mail to ${email}: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }
  }

  /**
   * NOTIF (Phase 93, CTICKET-02 · D-93-F/G/J) — email tiếng Việt gửi member khi
   * cron đối soát mint một phiếu "bù sàn" cam kết (offset) đang chờ nhận. Mirror
   * `sendSalaryVoucherCreatedEmail`: render `CommitmentVoucherCreatedEmail` rồi
   * send TRỰC TIẾP qua Resend. `deepLinkUrl` là URL tuyệt đối tới ticket
   * commitment (do caller dựng qua `buildCommitmentTicketDeepLinkUrl`, host
   * `hoahong.acta.vn` — D-93-I). Caller (`SalaryVoucherNotificationService`) bọc
   * try/catch best-effort nên lỗi gửi KHÔNG rơi vào money-path (D-93-G / §35).
   */
  async sendCommitmentVoucherCreatedEmail(
    email: string,
    name: string,
    deepLinkUrl: string,
    // REV-6 (D-R6-10): CHỈ Mốc Sàn — số thực cộng vào ví là `sàn − khoảnReset`,
    // chỉ tính được lúc member chấp nhận (xem `CommitmentVoucherNotifySummary`).
    summary: {
      floorAmountText: string;
    },
  ): Promise<string | null> {
    const html = await render(
      <CommitmentVoucherCreatedEmail
        name={name}
        deepLinkUrl={deepLinkUrl}
        floorAmountText={summary.floorAmountText}
      />,
    );

    const result = await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Vé bù sàn cam kết của bạn',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });

    // ⚠ Phase 113 (D-R6-08) — SDK Resend RESOLVE (không throw) khi API lỗi, trả về
    // `{ data: null, error: {...} }`; đúng cái bẫy `sendEmailWithRetry` (:269-282) đã
    // phải vá. Trước REV-6 hàm này nuốt luôn nhánh đó nên một lần gửi hỏng vẫn "thành
    // công". Nay THROW để `CommitmentEmailSenderService` bồi hoàn được hàng giành chỗ —
    // không throw thì sổ ghi "đã gửi" cho lá mail chưa bao giờ tới và member bị khoá
    // vĩnh viễn khỏi loại mail đó.
    if (result.error) {
      throw new Error(
        `Resend API error sending commitment voucher created mail to ${email}: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }

    // `providerMessageId` cho sổ gửi mail — truy vết khi member báo "không nhận được".
    return result.data?.id ?? null;
  }

  /**
   * NOTIF (Phase 93, CTICKET-02 · D-93-E/F/J) — email vòng đời vé bù sàn cam kết
   * cho member: dùng cho cả "sắp hết hạn" (`variant='expiring'`, nhắc nhận trước
   * khi cửa sổ đóng) và "đã hết hạn" (`variant='expired'`, thông báo lỡ). Render
   * `CommitmentVoucherReminderEmail` (tự chọn copy tiếng Việt theo `variant`) rồi
   * send TRỰC TIẾP qua Resend; caller bọc best-effort (D-93-G). `deepLinkUrl`
   * tuyệt đối do caller dựng qua `buildCommitmentTicketDeepLinkUrl` (D-93-I).
   */
  async sendCommitmentVoucherReminderEmail(
    email: string,
    name: string,
    deepLinkUrl: string,
    content: {
      variant: CommitmentVoucherReminderVariant;
      /** REV-6 (D-R6-10): CHỈ Mốc Sàn — xem `sendCommitmentVoucherCreatedEmail`. */
      floorAmountText: string;
      /**
       * D-11 (111-04) — hạn chót nhận vé đã format tiếng Việt
       * (`HH:mm ngày dd/MM/yyyy (còn N ngày)` giờ VN); optional để giữ tương
       * thích caller "đã hết hạn" (variant `expired` không cần hạn).
       */
      deadlineText?: string;
    },
  ) {
    const html = await render(
      <CommitmentVoucherReminderEmail
        name={name}
        deepLinkUrl={deepLinkUrl}
        variant={content.variant}
        floorAmountText={content.floorAmountText}
        deadlineText={content.deadlineText}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject:
        content.variant === 'expired'
          ? 'Vé bù sàn cam kết của bạn đã hết hạn'
          : 'Vé bù sàn cam kết của bạn sắp hết hạn',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  /**
   * NOTIF (Phase 113, REV-6 D-R6-08) — mail TẠM DỪNG ghi danh cam kết. Caller là
   * `CommitmentLifecycleEmailService` (đi qua cửa `CommitmentEmailSenderService`),
   * đã bọc best-effort nên lỗi KHÔNG rơi vào đường vòng đời ghi danh.
   *
   * ⚠ THROW khi Resend trả `{ data: null, error }` — bắt buộc, cùng lý do đã ghi ở
   * `sendCommitmentVoucherCreatedEmail`: không throw thì sổ mail ghi "đã gửi" cho
   * một lá chưa bao giờ tới và member bị khoá vĩnh viễn khỏi loại mail đó.
   */
  async sendCommitmentEnrollmentPausedEmail(
    to: string,
    props: CommitmentEnrollmentPausedEmailProps,
  ): Promise<string | null> {
    const html = await render(<CommitmentEnrollmentPausedEmail {...props} />);

    const result = await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to,
      subject: 'Ghi danh Khởi nghiệp cùng ACTA của bạn đã tạm dừng',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });

    if (result.error) {
      throw new Error(
        `Resend API error sending commitment enrollment paused mail to ${to}: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }
    return result.data?.id ?? null;
  }

  /**
   * NOTIF (Phase 113, REV-6 D-R6-08) — mail KHÔI PHỤC ghi danh cam kết. Cùng hợp
   * đồng throw-on-error như method tạm dừng ở trên.
   */
  async sendCommitmentEnrollmentResumedEmail(
    to: string,
    props: CommitmentEnrollmentResumedEmailProps,
  ): Promise<string | null> {
    const html = await render(<CommitmentEnrollmentResumedEmail {...props} />);

    const result = await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to,
      subject: 'Ghi danh Khởi nghiệp cùng ACTA của bạn đã hoạt động trở lại',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });

    if (result.error) {
      throw new Error(
        `Resend API error sending commitment enrollment resumed mail to ${to}: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }
    return result.data?.id ?? null;
  }

  /**
   * Phase 115 (Tra cứu thu nhập, D4 22-07-2026) — báo CHÍNH CHỦ khi có người GỬI
   * HỘ yêu cầu kết nạp Khởi nghiệp cùng ACTA cho họ. Thư GIAO DỊCH đường vòng đời
   * ghi danh (mirror mail admin `notifyEnrollmentRequestToAdmins` — KHÔNG qua sổ
   * `CommitmentEmailSendLog`: khoá của sổ đó theo kỳ/ghi danh, không khớp đơn vị
   * "mỗi yêu cầu"; chống trùng tự nhiên bằng hàng rào 1-yêu-cầu/72h của đường ghi).
   * Cùng hợp đồng throw-on-error như hai method lifecycle ở trên.
   */
  async sendCommitmentEnrollmentRequestOnBehalfEmail(
    to: string,
    props: CommitmentEnrollmentOnBehalfEmailProps,
  ): Promise<string | null> {
    const html = await render(<CommitmentEnrollmentOnBehalfEmail {...props} />);

    const result = await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to,
      subject:
        'Yêu cầu kết nạp Khởi nghiệp cùng ACTA đã được gửi thay cho bạn',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });

    if (result.error) {
      throw new Error(
        `Resend API error sending commitment enrollment on-behalf mail to ${to}: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }
    return result.data?.id ?? null;
  }

  async sendAdminRequestChangeAccountEmail(
    email: string,
    name: string,
    rejectionReason: string,
    changeTime: Date,
  ) {
    const html = await render(
      <AdminRequestChangeAccountEmail
        name={name}
        rejectionReason={rejectionReason}
        changeTime={changeTime}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Yêu cầu đổi thông tin tài khoản',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendAdminRejectAccountEmail(
    email: string,
    name: string,
    rejectionReason: string,
    changeTime: Date,
  ) {
    const html = await render(
      <AdminRejectAccountEmail
        name={name}
        rejectionReason={rejectionReason}
        changeTime={changeTime}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Tài khoản của bạn đã bị từ chối',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  /**
   * Notifies a user their account was deactivated by an admin. Callers must
   * guard against repeats (only send when the status actually transitions
   * INTO `inactive`) — see UserService.notifyAccountDeactivated.
   */
  async sendAccountDeactivatedEmail(
    email: string,
    name: string,
    reason: string | undefined,
    deactivatedAt: Date,
  ) {
    const html = await render(
      <AccountDeactivatedEmail
        name={name}
        reason={reason}
        deactivatedAt={deactivatedAt}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Tài khoản của bạn đã bị vô hiệu hóa',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendAdminApproveAccountEmail(
    email: string,
    name: string,
    changeTime: Date,
  ) {
    const html = await render(
      <AdminApproveAccountEmail name={name} changeTime={changeTime} />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Tài khoản của bạn đã được phê duyệt',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendReferrerApproveAccountEmail(
    email: string,
    name: string,
    referrerName: string,
    changeTime: Date,
  ) {
    const html = await render(
      <ReferrerApproveAccountEmail
        name={name}
        referrerName={referrerName}
        changeTime={changeTime}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Tài khoản của bạn đã được phê duyệt',
      html,
    });
  }

  async sendReferrerRejectAccountEmail(
    email: string,
    name: string,
    referrerName: string,
    rejectionReason: string,
    changeTime: Date,
  ) {
    const html = await render(
      <ReferrerRejectAccountEmail
        name={name}
        referrerName={referrerName}
        rejectionReason={rejectionReason}
        changeTime={changeTime}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Tài khoản của bạn đã bị từ chối',
      html,
    });
  }

  async sendReferrerRequestChangeAccountEmail(
    email: string,
    name: string,
    referrerName: string,
    rejectionReason: string,
    changeTime: Date,
  ) {
    const html = await render(
      <ReferrerRequestChangeAccountEmail
        name={name}
        referrerName={referrerName}
        rejectionReason={rejectionReason}
        changeTime={changeTime}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Yêu cầu đổi thông tin tài khoản',
      html,
    });
  }

  async sendUnpublishedPostNotification(
    email: string,
    name: string,
    totalPosts: string,
  ) {
    const html = await render(
      <UnpublishedPostNotification name={name} totalPosts={totalPosts} />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: `Thông báo: ${totalPosts} bài viết chưa được xuất bản`,
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendUnpublishedPostNotificationBatch(
    adminUsers: Array<{
      id: string;
      email: string;
      fullName: string;
    }>,
    totalPosts: string,
    urlLink: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails in parallel with better error handling
    const emailPromises = adminUsers.map(async (admin) => {
      try {
        const html = await render(
          <UnpublishedPostNotification
            name={admin.fullName || 'Admin'}
            totalPosts={totalPosts}
            urlLink={urlLink}
          />,
        );

        await this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: admin.email,
          subject: `Thông báo: ${totalPosts} bài viết chưa được xuất bản`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        });

        results.success++;
        return { success: true, email: admin.email };
      } catch (error) {
        results.failed++;
        const errorMessage = `Failed to send email to ${admin.email}: ${error.message}`;
        results.errors.push(errorMessage);
        return { success: false, email: admin.email, error: errorMessage };
      }
    });

    // Wait for all emails to complete
    await Promise.allSettled(emailPromises);

    return results;
  }

  async sendConfirmedOrdersNotificationBatch(
    adminUsers: Array<{
      id: string;
      email: string;
      fullName: string;
    }>,
    totalOrders: string,
    urlLink: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds between retries
    const BATCH_SIZE = 100; // Resend's max batch size

    this.logger.log(
      `[sendConfirmedOrdersNotificationBatch] Starting batch email send for ${adminUsers.length} admins using Resend Batch API (max ${MAX_RETRIES} retries)`,
    );
    this.logger.debug(
      `[sendConfirmedOrdersNotificationBatch] Admin users: ${JSON.stringify(
        adminUsers.map((a) => ({
          id: a.id,
          email: a.email,
          fullName: a.fullName,
        })),
      )}`,
    );

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Prepare all email HTML content first
    this.logger.log(
      `[sendConfirmedOrdersNotificationBatch] Preparing HTML content for ${adminUsers.length} emails...`,
    );

    const emailsData = await Promise.all(
      adminUsers.map(async (admin) => {
        const html = await render(
          <ConfirmedOrdersNotification
            name={admin.fullName || 'Admin'}
            totalOrders={totalOrders}
            urlLink={urlLink}
          />,
        );
        return {
          admin,
          html,
        };
      }),
    );

    this.logger.log(
      `[sendConfirmedOrdersNotificationBatch] HTML content prepared. Building batch email payload...`,
    );

    // Helper function to send batch with retry logic
    const sendBatchWithRetry = async (attempt: number): Promise<any> => {
      try {
        if (attempt > 1) {
          this.logger.log(
            `[sendConfirmedOrdersNotificationBatch] Retry attempt ${attempt}/${MAX_RETRIES} for batch`,
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }

        // Build batch payload
        const batchPayload = emailsData.map(({ admin, html }) => ({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: [admin.email],
          subject: `Thông báo: ${totalOrders} đơn hàng đã xác nhận cần xử lý`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }));

        this.logger.log(
          `[sendConfirmedOrdersNotificationBatch] Attempt ${attempt}: Sending batch of ${batchPayload.length} emails via Resend Batch API...`,
        );

        // Send using Resend batch API
        const response = await this.resend.batch.send(batchPayload);

        this.logger.log(
          `[sendConfirmedOrdersNotificationBatch] Attempt ${attempt} raw response: ${JSON.stringify(response)}`,
        );

        return response;
      } catch (error) {
        this.logger.error(
          `[sendConfirmedOrdersNotificationBatch] Attempt ${attempt}/${MAX_RETRIES} exception: ${error.message}`,
        );
        this.logger.debug(
          `[sendConfirmedOrdersNotificationBatch] Error stack: ${error.stack || 'No stack trace'}`,
        );

        if (attempt >= MAX_RETRIES) {
          throw error;
        }

        // Retry
        return sendBatchWithRetry(attempt + 1);
      }
    };

    // Send batch with retry
    let batchResponse;
    try {
      batchResponse = await sendBatchWithRetry(1);
    } catch (error) {
      // All retries failed
      this.logger.error(
        `[sendConfirmedOrdersNotificationBatch] ✗ All ${MAX_RETRIES} attempts failed for entire batch: ${error.message}`,
      );

      results.failed = adminUsers.length;
      adminUsers.forEach((admin) => {
        results.errors.push(
          `Failed after ${MAX_RETRIES} attempts for ${admin.email}: ${error.message}`,
        );
      });

      return results;
    }

    // Process batch response
    this.logger.log(
      `[sendConfirmedOrdersNotificationBatch] Processing batch response...`,
    );

    // Map to track results by index
    const emailResults = new Map<
      number,
      { success: boolean; email: string; responseId?: string; error?: string }
    >();

    // Process successful emails from data array
    if (batchResponse.data && Array.isArray(batchResponse.data)) {
      batchResponse.data.forEach((item: any, index: number) => {
        if (item && item.id) {
          const admin = adminUsers[index];
          emailResults.set(index, {
            success: true,
            email: admin.email,
            responseId: item.id,
          });
          results.success++;
          this.logger.log(
            `[sendConfirmedOrdersNotificationBatch] [${index + 1}/${adminUsers.length}] ✓ Successfully sent to ${admin.email}. Response ID: ${item.id}`,
          );
        }
      });
    }

    // Process failed emails from errors array (permissive mode)
    if (batchResponse.error) {
      // Single error means entire batch failed
      this.logger.error(
        `[sendConfirmedOrdersNotificationBatch] Batch error: ${JSON.stringify(batchResponse.error)}`,
      );

      adminUsers.forEach((admin, index) => {
        if (!emailResults.has(index)) {
          emailResults.set(index, {
            success: false,
            email: admin.email,
            error: JSON.stringify(batchResponse.error),
          });
          results.failed++;
          results.errors.push(
            `${admin.email}: ${JSON.stringify(batchResponse.error)}`,
          );
        }
      });
    } else if (batchResponse.errors && Array.isArray(batchResponse.errors)) {
      // Individual errors in permissive mode
      batchResponse.errors.forEach((error: any) => {
        const index = error.index;
        const admin = adminUsers[index];
        if (admin) {
          emailResults.set(index, {
            success: false,
            email: admin.email,
            error: error.message,
          });
          results.failed++;
          results.errors.push(`${admin.email}: ${error.message}`);
          this.logger.error(
            `[sendConfirmedOrdersNotificationBatch] [${index + 1}/${adminUsers.length}] ✗ Failed to send to ${admin.email}: ${error.message}`,
          );
        }
      });
    }

    // Mark any unprocessed emails as failed (shouldn't happen but safety check)
    adminUsers.forEach((admin, index) => {
      if (!emailResults.has(index)) {
        emailResults.set(index, {
          success: false,
          email: admin.email,
          error: 'No response received for this email',
        });
        results.failed++;
        results.errors.push(
          `${admin.email}: No response received for this email`,
        );
        this.logger.warn(
          `[sendConfirmedOrdersNotificationBatch] [${index + 1}/${adminUsers.length}] ⚠ No response for ${admin.email}`,
        );
      }
    });

    // Retry rate-limited or unaccounted-for emails individually with throttling (Resend: 2 req/sec)
    const isRateLimitError = (msg?: string) =>
      !!msg &&
      (msg.includes('rate_limit_exceeded') ||
        msg.includes('Too many requests') ||
        msg.includes('"statusCode":429'));

    const isRetryable = (msg?: string) =>
      isRateLimitError(msg) ||
      (!!msg && msg.includes('No response received'));

    const rateLimitedIndexes: number[] = [];
    emailResults.forEach((result, index) => {
      if (!result.success && isRetryable(result.error)) {
        rateLimitedIndexes.push(index);
      }
    });

    if (rateLimitedIndexes.length > 0) {
      this.logger.log(
        `[sendConfirmedOrdersNotificationBatch] Retrying ${rateLimitedIndexes.length} email(s) individually with throttling (rate-limited or missing from batch response)`,
      );

      const INDIVIDUAL_RETRY_DELAY_MS = 600; // ~1.67 req/sec, safely under 2/sec
      const INDIVIDUAL_MAX_ATTEMPTS = 3;

      for (const index of rateLimitedIndexes) {
        const admin = adminUsers[index];
        const html = emailsData[index].html;
        let attempt = 0;
        let sent = false;

        while (attempt < INDIVIDUAL_MAX_ATTEMPTS && !sent) {
          attempt++;
          try {
            await new Promise((resolve) =>
              setTimeout(resolve, INDIVIDUAL_RETRY_DELAY_MS * attempt),
            );

            const sendResponse = await this.resend.emails.send({
              from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
              to: [admin.email],
              subject: `Thông báo: ${totalOrders} đơn hàng đã xác nhận cần xử lý`,
              html,
              headers: {
                'Content-Language': 'vi',
                'X-Language': 'Vietnamese',
              },
            });

            if (sendResponse.error) {
              const errMsg = JSON.stringify(sendResponse.error);

              this.logger.warn(
                `[sendConfirmedOrdersNotificationBatch] Individual retry ${attempt}/${INDIVIDUAL_MAX_ATTEMPTS} failed for ${admin.email}: ${errMsg}`,
              );

              if (!isRateLimitError(errMsg) || attempt >= INDIVIDUAL_MAX_ATTEMPTS) {
                emailResults.set(index, {
                  success: false,
                  email: admin.email,
                  error: errMsg,
                });
                break;
              }
              continue;
            }

            emailResults.set(index, {
              success: true,
              email: admin.email,
              responseId: sendResponse.data?.id,
            });
            results.success++;
            results.failed--;
            const originalErrorIdx = results.errors.findIndex((e) =>
              e.startsWith(`${admin.email}:`),
            );
            if (originalErrorIdx !== -1) {
              results.errors.splice(originalErrorIdx, 1);
            }
            sent = true;
            this.logger.log(
              `[sendConfirmedOrdersNotificationBatch] ✓ Individual retry recovered ${admin.email} (attempt ${attempt}, ID: ${sendResponse.data?.id})`,
            );
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `[sendConfirmedOrdersNotificationBatch] Individual retry ${attempt}/${INDIVIDUAL_MAX_ATTEMPTS} threw for ${admin.email}: ${errMsg}`,
            );
            if (!isRateLimitError(errMsg) || attempt >= INDIVIDUAL_MAX_ATTEMPTS) {
              emailResults.set(index, {
                success: false,
                email: admin.email,
                error: errMsg,
              });
              break;
            }
          }
        }
      }
    }

    // Convert results for logging
    const settledResults = Array.from(emailResults.values()).map((result) => ({
      status: 'fulfilled' as const,
      value: result,
    }));

    // Log settled results summary
    this.logger.log(
      `[sendConfirmedOrdersNotificationBatch] All emails processed. Results:`,
    );
    const successfulEmails: Array<{
      email: string;
      responseId: string;
    }> = [];
    const failedEmails: Array<{
      email: string;
      reason: string;
    }> = [];

    settledResults.forEach((result, index) => {
      const value = result.value;
      if (value.success) {
        successfulEmails.push({
          email: value.email,
          responseId: value.responseId || 'N/A',
        });
        this.logger.log(
          `[sendConfirmedOrdersNotificationBatch]   [${index + 1}] ✓ Success: ${value.email} (ID: ${value.responseId || 'N/A'})`,
        );
      } else {
        failedEmails.push({
          email: value.email,
          reason: value.error || 'Unknown error',
        });
        this.logger.warn(
          `[sendConfirmedOrdersNotificationBatch]   [${index + 1}] ✗ Failed: ${value.email} - ${value.error}`,
        );
      }
    });

    this.logger.log(
      `[sendConfirmedOrdersNotificationBatch] Final summary: ${results.success} succeeded, ${results.failed} failed out of ${adminUsers.length} total (via Batch API)`,
    );

    if (successfulEmails.length > 0) {
      this.logger.log(
        `[sendConfirmedOrdersNotificationBatch] ✓ Successful emails (${successfulEmails.length}):`,
      );
      successfulEmails.forEach((email) => {
        this.logger.log(
          `[sendConfirmedOrdersNotificationBatch]   - ${email.email} (ID: ${email.responseId})`,
        );
      });
    }

    if (failedEmails.length > 0) {
      this.logger.error(
        `[sendConfirmedOrdersNotificationBatch] ✗ Failed emails (${failedEmails.length}):`,
      );
      failedEmails.forEach((failed, idx) => {
        this.logger.error(
          `[sendConfirmedOrdersNotificationBatch]   ${idx + 1}. ${failed.email}: ${failed.reason}`,
        );
      });
    }

    if (results.errors.length > 0) {
      this.logger.error(
        `[sendConfirmedOrdersNotificationBatch] All errors: ${JSON.stringify(results.errors)}`,
      );
    }

    return results;
  }

  /**
   * TVTC daily digest (REV-4 luật-2-điều-kiện) — ONE email per admin listing
   * every member who NEWLY became "Thành viên tích cực" this cron run + their
   * upline. Modeled on the established batch pattern (chunk 100, Resend Batch
   * API, `sendEmailWithRetry` wrapper with MAX_RETRIES=3 / RETRY_DELAY_MS=2000,
   * throttled between chunks) so it stays anti-429. Best-effort by contract: the
   * cron calls this AFTER the badges are minted and never rolls a mint back on a
   * mail failure — this method therefore returns a result summary and does not
   * rethrow per-batch send errors.
   */
  async sendTvtcDailyDigestBatch(
    admins: Array<{ id: string; email: string; fullName: string }>,
    entries: Array<{
      member: { referenceId: string; fullName: string; email: string };
      upline: { referenceId: string; fullName: string; email: string } | null;
    }>,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds between retries
    const BATCH_SIZE = 100; // Resend's max batch size
    const THROTTLE_MS = 600; // ≥500ms between batch requests → ≤2 Resend req/sec

    const results = { success: 0, failed: 0, errors: [] as string[] };

    const recipients = admins.filter((a) => !!a.email);
    if (recipients.length === 0 || entries.length === 0) {
      return results;
    }

    const awardedDateLabel = new Date().toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Render one digest message per admin up front (local CPU, no API call).
    const messages: Array<{
      from: string;
      to: string;
      subject: string;
      html: string;
    }> = [];
    for (const admin of recipients) {
      try {
        const html = await render(
          <TvtcDailyDigestEmail
            adminName={admin.fullName || 'Admin'}
            awardedDateLabel={awardedDateLabel}
            entries={entries}
          />,
        );
        messages.push({
          from: 'ACTA <noreply@acta.vn>',
          to: admin.email,
          subject: `TVTC mới hôm nay — ${entries.length} thành viên`,
          html,
        });
      } catch (error: unknown) {
        results.failed++;
        const msg = error instanceof Error ? error.message : String(error);
        results.errors.push(`${admin.email}: render failed — ${msg}`);
        this.logger.error(
          `[sendTvtcDailyDigestBatch] Failed to render digest for ${admin.email}: ${msg}`,
        );
      }
    }

    if (messages.length === 0) {
      return results;
    }

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        // sendEmailWithRetry surfaces Resend's resolve-with-{error} responses and
        // retries with backoff (MAX_RETRIES=3, RETRY_DELAY_MS=2000).
        await this.sendEmailWithRetry(
          () => this.resend.batch.send(batch),
          `batch of ${batch.length} admin(s)`,
          'TVTC Daily Digest',
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );
        results.success += batch.length;
      } catch (error: unknown) {
        results.failed += batch.length;
        const msg = error instanceof Error ? error.message : String(error);
        batch.forEach((m) => results.errors.push(`${m.to}: ${msg}`));
        this.logger.error(
          `[sendTvtcDailyDigestBatch] Failed to send digest batch (${batch.length} messages): ${msg}`,
        );
      }
      // Throttle before the next batch (skip after the last one).
      if (i + BATCH_SIZE < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      }
    }

    this.logger.log(
      `[sendTvtcDailyDigestBatch] Digest dispatched — success=${results.success} failed=${results.failed} (admins=${recipients.length}, tvtc=${entries.length})`,
    );

    return results;
  }

  /**
   * Cấp phát thu nhập (spec §5 ⑥ · D9) — digest hằng ngày gửi MỌI admin active:
   * phiếu allocation TẠO / TẤT TOÁN / HẾT HẠN trong ngày VN. Khuôn chống-429 y
   * hệt `sendTvtcDailyDigestBatch` (BATCH_SIZE=100 trần lô Resend · THROTTLE_MS
   * 600 ⇒ ≤2 req/giây · `sendEmailWithRetry` bắt cả resolve-with-{error}).
   * Caller (`AllocationDigestCronService`) chỉ gọi khi ngày có ≥1 sự kiện.
   */
  async sendAllocationDailyDigestBatch(
    admins: Array<{ id: string; email: string; fullName: string }>,
    digest: {
      dateLabel: string;
      created: AllocationDigestEntry[];
      settled: AllocationDigestEntry[];
      expired: AllocationDigestEntry[];
    },
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 giây giữa hai lần retry
    const BATCH_SIZE = 100; // trần lô của Resend
    const THROTTLE_MS = 600; // ≥500ms giữa hai lô → ≤2 Resend req/giây

    const results = { success: 0, failed: 0, errors: [] as string[] };

    const recipients = admins.filter((a) => !!a.email);
    const totalEvents =
      digest.created.length + digest.settled.length + digest.expired.length;
    if (recipients.length === 0 || totalEvents === 0) {
      return results;
    }

    const subject = `Cấp phát thu nhập ${digest.dateLabel} — tạo ${digest.created.length} · tất toán ${digest.settled.length} · hết hạn ${digest.expired.length}`;

    // Render một digest cho từng admin trước (CPU cục bộ, không gọi API).
    const messages: Array<{
      from: string;
      to: string;
      subject: string;
      html: string;
    }> = [];
    for (const admin of recipients) {
      try {
        const html = await render(
          <AllocationDailyDigestEmail
            adminName={admin.fullName || 'Admin'}
            dateLabel={digest.dateLabel}
            created={digest.created}
            settled={digest.settled}
            expired={digest.expired}
          />,
        );
        messages.push({
          from: 'ACTA <noreply@acta.vn>',
          to: admin.email,
          subject,
          html,
        });
      } catch (error: unknown) {
        results.failed++;
        const msg = error instanceof Error ? error.message : String(error);
        results.errors.push(`${admin.email}: render failed — ${msg}`);
        this.logger.error(
          `[sendAllocationDailyDigestBatch] Failed to render digest for ${admin.email}: ${msg}`,
        );
      }
    }

    if (messages.length === 0) {
      return results;
    }

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        // sendEmailWithRetry surface Resend resolve-with-{error} + retry backoff.
        await this.sendEmailWithRetry(
          () => this.resend.batch.send(batch),
          `batch of ${batch.length} admin(s)`,
          'Allocation Daily Digest',
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );
        results.success += batch.length;
      } catch (error: unknown) {
        results.failed += batch.length;
        const msg = error instanceof Error ? error.message : String(error);
        batch.forEach((m) => results.errors.push(`${m.to}: ${msg}`));
        this.logger.error(
          `[sendAllocationDailyDigestBatch] Failed to send digest batch (${batch.length} messages): ${msg}`,
        );
      }
      // Giãn nhịp trước lô kế tiếp (bỏ qua sau lô cuối).
      if (i + BATCH_SIZE < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      }
    }

    this.logger.log(
      `[sendAllocationDailyDigestBatch] Digest dispatched — success=${results.success} failed=${results.failed} (admins=${recipients.length}, events=${totalEvents})`,
    );

    return results;
  }

  /**
   * Mail TỔNG KẾT KỲ "Khởi nghiệp cùng ACTA" (Phase 113, REV-6 D-R6-07) — MỘT mail
   * cho MỖI member có kỳ vừa đóng, gửi theo lô Resend.
   *
   * Cùng khuôn chống-429 với `sendTvtcDailyDigestBatch` (BATCH_SIZE=100 = trần lô
   * của Resend · THROTTLE_MS=600 ⇒ ≤2 req/giây · `sendEmailWithRetry`), KHÔNG chế
   * nhịp mới.
   *
   * ⚠ KHÁC digest admin ở ĐÚNG một điểm, và điểm đó là lý do method này tồn tại:
   * nó trả KẾT QUẢ THEO TỪNG NGƯỜI NHẬN (`key` do caller đặt). Caller là giao thức
   * GIÀNH-CHỖ-RỒI-GỬI của `CommitmentEmailSenderService`: hàng sổ đã được chèn
   * TRƯỚC khi gọi đây, nên caller PHẢI biết chính xác lá nào đi được để xác nhận và
   * lá nào hỏng để BỒI HOÀN. Trả về một con số tổng như digest admin sẽ khiến toàn
   * bộ lô hỏng bị ghi nhận là "đã gửi" và member mất mail vĩnh viễn.
   *
   * Ngữ nghĩa thành/bại: Resend batch là MỘT lời gọi HTTP cho cả chunk — nó thành
   * công hoặc hỏng NGUYÊN CHUNK. Vì vậy mọi `key` trong cùng chunk chia sẻ cùng kết
   * cục; `providerMessageId` được ghép theo VỊ TRÍ trong mảng `data` mà Resend trả
   * về (đúng thứ tự gửi). Nếu số id trả về không khớp số message — hợp đồng bị vi
   * phạm — ta vẫn coi là ĐÃ GỬI nhưng bỏ trống id, vì mail đã thật sự rời hệ thống;
   * bồi hoàn lúc đó sẽ gửi trùng cho member.
   *
   * Lỗi render là LỖI RIÊNG của từng message (chạy cục bộ, trước mọi lời gọi mạng)
   * nên chỉ đánh hỏng đúng `key` đó.
   */
  async sendCommitmentCycleRecapBatch(
    messages: Array<{
      /** Khoá đối chiếu của caller (eligibilityId) — trả nguyên trong kết quả. */
      key: string;
      to: string;
      props: CommitmentCycleRecapEmailProps;
    }>,
  ): Promise<
    Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }>
  > {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    const BATCH_SIZE = 100; // trần lô của Resend
    const THROTTLE_MS = 600; // ≥500ms giữa hai lô ⇒ ≤2 req/giây

    const results: Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }> = [];
    if (messages.length === 0) return results;

    // Render TRƯỚC (CPU cục bộ, không gọi mạng) — lỗi render chỉ hạ đúng một key.
    const rendered: Array<{
      key: string;
      payload: { from: string; to: string; subject: string; html: string };
    }> = [];
    for (const message of messages) {
      try {
        const html = await render(
          <CommitmentCycleRecapEmail {...message.props} />,
        );
        const subject =
          message.props.awardedTier !== null
            ? `Tổng kết kỳ — Bạn đã đạt Mốc Sàn ${message.props.awardedTier}`
            : 'Tổng kết kỳ Khởi nghiệp cùng ACTA';
        rendered.push({
          key: message.key,
          payload: {
            from: 'ACTA <noreply@acta.vn>',
            to: message.to,
            subject,
            html,
          },
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({
          key: message.key,
          sent: false,
          providerMessageId: null,
          error: `render failed — ${msg}`,
        });
        this.logger.error(
          `[sendCommitmentCycleRecapBatch] Render thất bại cho ${message.to}: ${msg}`,
        );
      }
    }

    for (let i = 0; i < rendered.length; i += BATCH_SIZE) {
      const chunk = rendered.slice(i, i + BATCH_SIZE);
      try {
        const response = await this.sendEmailWithRetry(
          () => this.resend.batch.send(chunk.map((c) => c.payload)),
          `batch of ${chunk.length} member(s)`,
          'Commitment Cycle Recap',
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );
        const ids = extractResendBatchIds(response);
        chunk.forEach((c, index) => {
          results.push({
            key: c.key,
            sent: true,
            // `|| null` chứ không `?? null`: `extractResendBatchIds` trả chuỗi RỖNG
            // cho phần tử không bóc được id, và lưu '' vào sổ thì tệ hơn lưu null.
            providerMessageId: ids[index] || null,
          });
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        chunk.forEach((c) => {
          results.push({
            key: c.key,
            sent: false,
            providerMessageId: null,
            error: msg,
          });
        });
        this.logger.error(
          `[sendCommitmentCycleRecapBatch] Gửi lô thất bại (${chunk.length} mail): ${msg}`,
        );
      }
      if (i + BATCH_SIZE < rendered.length) {
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      }
    }

    const sentCount = results.filter((r) => r.sent).length;
    this.logger.log(
      `[sendCommitmentCycleRecapBatch] Đã gửi ${sentCount}/${messages.length} mail tổng kết kỳ`,
    );
    return results;
  }

  /**
   * Cơ chế gửi LÔ dùng chung cho mọi mail cam kết theo giao thức GIÀNH-CHỖ-RỒI-GỬI
   * của `CommitmentEmailSenderService` (Phase 113, REV-6 D-R6-08).
   *
   * ⚠ VÌ SAO LÀ HÀM DÙNG CHUNG: ba lane mail của phase này (`tvtc_awarded_self`,
   * `tvtc_awarded_upline`, `near_miss_warning`) đều cần ĐÚNG cơ chế của
   * `sendCommitmentCycleRecapBatch` và chỉ khác template + subject + nhãn log. Chép
   * thân hàm ~90 dòng ra bốn bản là bốn nơi phải sửa mỗi lần chỉnh nhịp Resend, và
   * ba bản sẽ lặng lẽ trôi khỏi bản gốc. Hằng nhịp (BATCH_SIZE / THROTTLE_MS /
   * MAX_RETRIES) là hợp đồng với nhà cung cấp, KHÔNG phải tham số của từng loại mail.
   *
   * HỢP ĐỒNG (mọi caller dựa vào, đừng đổi): trả kết quả cho MỌI `key` nhận vào —
   * `key` không được báo về sẽ bị caller coi là GỬI HỎNG và bồi hoàn hàng sổ. Lỗi
   * render hạ ĐÚNG một key (chạy cục bộ, trước mọi lời gọi mạng); Resend batch là
   * MỘT lời gọi HTTP cho cả chunk nên chunk hỏng ⇒ cả chunk `sent:false`.
   */
  /**
   * Dựng `Idempotency-Key` TẤT ĐỊNH cho một chunk `resend.batch.send` — ủy quyền cho
   * `buildCommitmentBatchIdempotencyKey` (hàm thuần, có spec riêng).
   *
   * Ngày UTC nằm TRONG khoá là CÓ CHỦ Ý — xem khối giải thích ở chỗ gọi. Cron cam kết
   * chạy 18:xx UTC nên một lượt quét không bao giờ vắt qua nửa đêm UTC.
   *
   * ⚠ Từ 14/09/2026 khoá gồm cả DẤU BĂM NỘI DUNG thư: trước đó cùng người nhận + cùng
   * ngày nhưng khác nội dung ⇒ cùng khoá ⇒ Resend từ chối vĩnh viễn (xem hàm thuần).
   */
  private buildBatchIdempotencyKey(
    tag: string,
    chunk: Array<{ key: string; payload: CommitmentBatchPayload }>,
  ): string {
    return buildCommitmentBatchIdempotencyKey(
      tag,
      new Date().toISOString().slice(0, 10),
      chunk,
    );
  }

  private async sendCommitmentEmailBatch<TProps>(
    messages: Array<{ key: string; to: string; props: TProps }>,
    options: {
      /** Nhãn log, vd '[sendCommitmentTvtcAwardedSelfBatch]'. */
      label: string;
      /** Tag cho `sendEmailWithRetry`, vd 'Commitment TVTC Awarded Self'. */
      tag: string;
      /** Mô tả loại mail cho dòng log tổng kết, vd 'mail danh hiệu TVTC'. */
      noun: string;
      renderHtml: (props: TProps) => Promise<string>;
      subject: (props: TProps) => string;
    },
  ): Promise<
    Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }>
  > {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    const BATCH_SIZE = 100; // trần lô của Resend
    const THROTTLE_MS = 600; // ≥500ms giữa hai lô ⇒ ≤2 req/giây

    const results: Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }> = [];
    if (messages.length === 0) return results;

    // Render TRƯỚC (CPU cục bộ, không gọi mạng) — lỗi render chỉ hạ đúng một key.
    const rendered: Array<{
      key: string;
      payload: { from: string; to: string; subject: string; html: string };
    }> = [];
    for (const message of messages) {
      try {
        const html = await options.renderHtml(message.props);
        rendered.push({
          key: message.key,
          payload: {
            from: 'ACTA <noreply@acta.vn>',
            to: message.to,
            subject: options.subject(message.props),
            html,
          },
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({
          key: message.key,
          sent: false,
          providerMessageId: null,
          error: `render failed — ${msg}`,
        });
        this.logger.error(
          `${options.label} Render thất bại cho ${message.to}: ${msg}`,
        );
      }
    }

    for (let i = 0; i < rendered.length; i += BATCH_SIZE) {
      const chunk = rendered.slice(i, i + BATCH_SIZE);
      // ⚠⚠ KHOÁ CHỐNG TRÙNG PHÍA NHÀ CUNG CẤP — BẮT BUỘC, đừng gỡ (lỗi CHẶN review 113).
      // `sendEmailWithRetry` bắt MỌI exception rồi gọi LẠI hàm gửi NGUYÊN VẸN tới 3 lần.
      // `resend.batch.send` KHÔNG idempotent tự thân, nên nhánh hỏng thật sự nguy hiểm là
      // lỗi TẦNG MẠNG: Resend NHẬN và enqueue cả 100 mail rồi phản hồi HTTP mất (socket
      // reset / gateway timeout) ⇒ SDK throw ⇒ lượt 2 gửi lại nguyên chunk ⇒ 100 member
      // nhận lá THỨ HAI, và sổ `commitment_email_send_logs` vẫn chỉ có MỘT hàng nên bất
      // biến "hàng tồn tại ⇔ mail đã gửi" chỉ còn đúng ở TẦNG SỔ, không đúng ở hộp thư.
      // Với `Idempotency-Key`, Resend trả lại kết quả của lượt ĐẦU thay vì gửi lần nữa.
      //
      // Khoá dựng TẤT ĐỊNH từ (nhãn loại mail + `key` + NỘI DUNG đã render của chunk + ngày UTC):
      //  • TẤT ĐỊNH ⇒ cả 3 lượt retry trong CÙNG lời gọi dùng chung một khoá — đây chính
      //    là chỗ lỗi được sửa, và test dựng lại được khoá mà không cần mock random.
      //  • danh sách `key` ⇒ hai chunk khác nhau (và hai lô cron khác tập người nhận) có
      //    khoá khác nhau, không vô tình nuốt nhau.
      //  • NỘI DUNG (14/09/2026) ⇒ cùng người nhận, cùng ngày nhưng thư KHÁC (cron rồi đồng
      //    bộ tay; dev dùng bản sao id của prod) có khoá khác. Thiếu nó Resend từ chối vĩnh
      //    viễn "idempotency key … request body was modified" và thư không bao giờ đi.
      //  • ngày UTC ⇒ CỐ Ý cho lượt cron ĐÊM SAU một khoá MỚI. Nhánh bồi hoàn của
      //    `CommitmentEmailSenderService` XOÁ hàng sổ khi chunk hỏng để đêm sau gửi lại
      //    được — đó là thiết kế. Nếu khoá bất biến theo thời gian thì TTL 24h của Resend
      //    có thể trả về chính lỗi đã cache và lá mail KHÔNG BAO GIỜ đi (mail vé bù sàn
      //    TTL 7 ngày ⇒ member mất tiền). Đổi lại là cửa sổ trùng hẹp còn sót ở đúng ca
      //    "Resend đã gửi thật nhưng cả 3 lượt đều báo hỏng" — đánh đổi có chủ ý.
      const idempotencyKey = this.buildBatchIdempotencyKey(options.tag, chunk);
      try {
        const response = await this.sendEmailWithRetry(
          () =>
            this.resend.batch.send(
              chunk.map((c) => c.payload),
              { idempotencyKey },
            ),
          `batch of ${chunk.length} member(s)`,
          options.tag,
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );
        const ids = extractResendBatchIds(response);
        chunk.forEach((c, index) => {
          results.push({
            key: c.key,
            sent: true,
            // `|| null` chứ không `?? null`: `extractResendBatchIds` trả chuỗi RỖNG
            // cho phần tử không bóc được id, và lưu '' vào sổ thì tệ hơn lưu null.
            providerMessageId: ids[index] || null,
          });
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        chunk.forEach((c) => {
          results.push({
            key: c.key,
            sent: false,
            providerMessageId: null,
            error: msg,
          });
        });
        this.logger.error(
          `${options.label} Gửi lô thất bại (${chunk.length} mail): ${msg}`,
        );
      }
      if (i + BATCH_SIZE < rendered.length) {
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      }
    }

    const sentCount = results.filter((r) => r.sent).length;
    this.logger.log(
      `${options.label} Đã gửi ${sentCount}/${messages.length} ${options.noun}`,
    );
    return results;
  }

  /**
   * Mail LÔ "bạn vừa đạt danh hiệu TVTC" (Phase 113, REV-6 D-R6-08 · P1). Loại mail
   * GIAO DỊCH, khoá sổ bằng sentinel TRỌN ĐỜI ⇒ đúng một lá mỗi người trong đời.
   */
  async sendCommitmentTvtcAwardedSelfBatch(
    messages: Array<{
      key: string;
      to: string;
      props: CommitmentTvtcAwardedSelfEmailProps;
    }>,
  ): Promise<
    Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }>
  > {
    return this.sendCommitmentEmailBatch(messages, {
      label: '[sendCommitmentTvtcAwardedSelfBatch]',
      tag: 'Commitment TVTC Awarded Self',
      noun: 'mail danh hiệu TVTC',
      renderHtml: (props) =>
        render(<CommitmentTvtcAwardedSelfEmail {...props} />),
      subject: () => 'Chúc mừng bạn trở thành Thành viên tích cực (TVTC)',
    });
  }

  /**
   * Mail LÔ báo TUYẾN TRÊN có tuyến dưới vừa đạt TVTC (Phase 113, REV-6 D-R6-08 · P1).
   *
   * ⚠ Người gọi đã GỘP sẵn: mỗi tuyến trên đúng MỘT message cho cả ngày, dù có bao
   * nhiêu tuyến dưới lên TVTC hôm đó. Đừng gọi method này trong vòng lặp theo tuyến dưới.
   */
  async sendCommitmentTvtcAwardedUplineBatch(
    messages: Array<{
      key: string;
      to: string;
      props: CommitmentTvtcAwardedUplineEmailProps;
    }>,
  ): Promise<
    Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }>
  > {
    return this.sendCommitmentEmailBatch(messages, {
      label: '[sendCommitmentTvtcAwardedUplineBatch]',
      tag: 'Commitment TVTC Awarded Upline',
      noun: 'mail báo tuyến trên về danh hiệu TVTC',
      renderHtml: (props) =>
        render(<CommitmentTvtcAwardedUplineEmail {...props} />),
      subject: (props) =>
        props.totalCount > 1
          ? `${props.totalCount} thành viên tuyến dưới của bạn vừa đạt danh hiệu TVTC`
          : 'Một thành viên tuyến dưới của bạn vừa đạt danh hiệu TVTC',
    });
  }

  /**
   * Mail LÔ cảnh báo SẮP TRƯỢT Mốc Sàn (Phase 113, REV-6 D-R6-08 · P2). Loại TIẾP
   * THỊ ⇒ vẫn chịu trần tần suất + `NotificationPreference` ở tầng sender.
   */
  async sendCommitmentNearMissBatch(
    messages: Array<{
      key: string;
      to: string;
      props: CommitmentNearMissEmailProps;
    }>,
  ): Promise<
    Array<{
      key: string;
      sent: boolean;
      providerMessageId: string | null;
      error?: string;
    }>
  > {
    return this.sendCommitmentEmailBatch(messages, {
      label: '[sendCommitmentNearMissBatch]',
      tag: 'Commitment Near Miss',
      noun: 'mail cảnh báo sắp trượt Mốc Sàn',
      renderHtml: (props) => render(<CommitmentNearMissEmail {...props} />),
      subject: (props) =>
        `⏳ Còn ${props.daysLeft} ngày để chạm Mốc Sàn ${props.targetTier}`,
    });
  }

  /**
   * Mail LÔ cảnh báo "số dư ví có thể bị đưa về 0" — chiến dịch do quản trị viên bấm tay ở màn
   * Rà soát reset ví.
   *
   * Dùng lại nguyên `sendCommitmentEmailBatch`: nó đã lo lô 100 (trần Resend), throttle 600ms,
   * khoá `Idempotency-Key` chống trùng phía nhà cung cấp, và render TRƯỚC khi gửi để một lỗi
   * template chỉ hạ đúng một người nhận.
   *
   * ⚠ `key` của mỗi message quyết định khoá chống trùng: `buildBatchIdempotencyKey` băm
   * (nhãn + danh sách key + NGÀY UTC). Chiến dịch truyền `key = userId` để hai lần bấm trong cùng
   * ngày không gửi trùng; lượt gửi thử truyền `key` có gắn jobId ngẫu nhiên để lần bấm thứ hai
   * VẪN gửi được — nếu không, người vận hành sẽ tưởng template không cập nhật.
   */
  async sendWalletResetWarningBatch(
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
  > {
    return this.sendCommitmentEmailBatch(messages, {
      label: '[sendWalletResetWarningBatch]',
      tag: 'Wallet Reset Warning',
      noun: 'mail cảnh báo reset ví',
      renderHtml: (props) => render(<WalletResetWarningEmail {...props} />),
      subject: (props) =>
        `Thông báo quan trọng về số dư ví của bạn trước ngày ${props.resetAnchorLabel}`,
    });
  }

  /**
   * Render mail cảnh báo reset ví ra HTML — KHÔNG gửi.
   *
   * ⚠ Đây là đường xem template CHÍNH của nút "Gửi thử (dev)". Ngoài production,
   * `mail-delivery.guard` có thể NUỐT toàn bộ thư (chế độ `skip`) và vẫn trả về phản hồi hình
   * dạng thành công; một nút gửi thử chỉ biết xếp hàng sẽ vô dụng đúng lúc cần nhất. Render đồng
   * bộ tại đây cho phép màn hình quản trị hiện template ngay, không phụ thuộc Resend.
   */
  async renderWalletResetWarningHtml(
    props: WalletResetWarningEmailProps,
  ): Promise<string> {
    return render(<WalletResetWarningEmail {...props} />);
  }

  async sendAdminRequestChangeKycEmail(
    email: string,
    name: string,
    message: string,
    reviewerName: string,
  ) {
    const html = await render(
      <KycRequestChangeEmail
        name={name}
        message={message}
        reviewerName={reviewerName}
      />,
    );

    // Qua `sendEmailWithRetry`: Resend RESOLVE (không throw) khi API lỗi
    // (429, người nhận bị chặn…), gọi thẳng `emails.send` sẽ nuốt lỗi và log
    // "đã gửi" trong khi user không bao giờ nhận được yêu cầu sửa hồ sơ.
    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: email,
          subject: 'Yêu cầu đổi thông tin KYC',
          html,
        }),
      email,
      'KYC Request Change',
    );
  }

  async sendAdminApproveKycEmail(
    email: string,
    name: string,
    reviewerName: string,
  ) {
    const html = await render(
      <KycApprovedEmail name={name} reviewerName={reviewerName} />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: email,
          subject: 'Thông tin KYC của bạn đã được phê duyệt',
          html,
        }),
      email,
      'KYC Approved',
    );
  }

  async sendKYCPendingNotificationEmail(
    email: string,
    adminName: string,
    totalSubmitted: number,
    recentCount: number,
    olderCount: number,
    dashboardUrl: string,
  ) {
    const html = await render(
      <KYCPendingNotificationEmail
        adminName={adminName}
        totalSubmitted={totalSubmitted}
        recentCount={recentCount}
        olderCount={olderCount}
        dashboardUrl={dashboardUrl}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: `Thông báo: ${totalSubmitted} KYC đang chờ xử lý`,
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  /**
   * Broadcast — for EACH admin × EACH newly-eligible member — an email announcing that
   * the member đủ điều kiện trở thành Minh sứ trưởng lão (MSTL) but chưa được công nhận.
   *
   * Rate-limit safety (Resend allows ~2 requests/sec): every message is rendered on the
   * local CPU up front, then fanned out via Resend's BATCH endpoint — ONE API request per
   * ≤100-message chunk — with a throttle delay between chunks so no more than 2 requests
   * are issued per second. Best-effort: a failed chunk is logged and skipped, never thrown.
   */
  async sendMstlEligiblePendingEmails(
    admins: Array<{ email: string | null; fullName: string | null }>,
    qualifiers: Array<{
      fullName: string | null;
      referenceId: string | null;
      qualifiedAt: Date | null;
      completedCount: number;
      totalCount: number;
    }>,
    dashboardUrl: string,
  ): Promise<void> {
    const recipients = admins.filter(
      (a): a is { email: string; fullName: string | null } => !!a.email,
    );
    if (recipients.length === 0 || qualifiers.length === 0) {
      return;
    }

    const formatVnDateTime = (d: Date | null): string =>
      d
        ? d.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : 'Không xác định';

    // Render every (qualifier × admin) message up front (local CPU, no API call).
    const messages: Array<{
      from: string;
      to: string;
      subject: string;
      html: string;
    }> = [];
    for (const q of qualifiers) {
      const qualifierName = q.fullName || 'Người dùng';
      const qualifiedAtText = formatVnDateTime(q.qualifiedAt);
      for (const admin of recipients) {
        try {
          const html = await render(
            <MstlEligiblePendingEmail
              adminName={admin.fullName || 'Admin'}
              qualifierName={qualifierName}
              qualifierReferenceId={q.referenceId || ''}
              qualifiedAtText={qualifiedAtText}
              completedCount={q.completedCount}
              totalCount={q.totalCount}
              dashboardUrl={dashboardUrl}
            />,
          );
          messages.push({
            from: 'ACTA <noreply@acta.vn>',
            to: admin.email,
            subject: `[ACTA] ${qualifierName} đủ điều kiện trở thành nhóm trưởng (MSTL) — chưa công nhận`,
            html,
          });
        } catch (error) {
          this.logger.error(
            `Failed to render MSTL eligible-pending email for ${admin.email}:`,
            error,
          );
        }
      }
    }

    if (messages.length === 0) {
      return;
    }

    const maxBatchSize = 100;
    const throttleMs = 600; // ≥500ms between batch requests → ≤2 Resend requests/sec.
    for (let i = 0; i < messages.length; i += maxBatchSize) {
      const batch = messages.slice(i, i + maxBatchSize);
      try {
        await this.sendEmailWithRetry(
          () => this.resend.batch.send(batch),
          `batch of ${batch.length} recipients`,
          'MSTL Eligible Pending',
        );
      } catch (error) {
        this.logger.error(
          `Failed to send MSTL eligible-pending batch (${batch.length} messages):`,
          error,
        );
      }
      // Throttle before the next batch (skip after the last one).
      if (i + maxBatchSize < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, throttleMs));
      }
    }
  }

  async sendNotificationUpdateKycEmail(
    email: string,
    name: string,
    reason: string,
    updateUrl: string,
  ) {
    const html = await render(
      <NotificationUpdateKycEmail
        name={name}
        reason={reason}
        updateUrl={updateUrl}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Yêu cầu cập nhật thông tin KYC',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendNotificationChangingKycEmail(
    email: string,
    name: string,
    message: string,
    reviewerName: string,
    updateUrl: string,
  ) {
    const html = await render(
      <KycUpdateReminderEmail
        name={name}
        message={message}
        reviewerName={reviewerName}
        updateUrl={updateUrl}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Thông báo: Thông tin KYC của bạn cần được sửa đổi',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendApiKeyOtpEmail(name: string, email: string, otp: string) {
    try {
      this.validateEmailConfig();

      // Dynamic import to avoid production bundling/SSR issues (same pattern as WithdrawalOtpEmail)
      const { ApiKeyOtpEmail } = await import('./templates/ApiKeyOtpEmail');
      const html = await render(<ApiKeyOtpEmail name={name} otp={otp} />);

      const result = await this.resend.emails.send({
        from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
        to: email,
        subject: 'Mã OTP xác thực lấy API Key',
        html,
        headers: {
          'Content-Language': 'vi',
          'X-Language': 'Vietnamese',
        },
      });

      this.logger.log(`✅ API Key OTP email sent successfully to ${email}`, {
        id: result.data?.id,
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to send API Key OTP email to ${email}:`, {
        error: error.message,
        stack: error.stack,
        resendApiKey: process.env.RESEND_API_KEY
          ? `SET (${process.env.RESEND_API_KEY.substring(0, 8)}...)`
          : 'NOT SET',
        frontendDomain: process.env.FRONTEND_DOMAIN || 'NOT SET',
      });
      throw new Error(
        `Failed to send API Key OTP email: ${error.message}. Check server logs for details.`,
      );
    }
  }

  async sendOrderSuccessEmail(orderData: OrderSuccessEmailPayload) {
    this.validateEmailConfig();

    const resolvedRecipients = new Map<string, string>();
    const placeholderRecipients = new Map<string, string>();
    const attemptedCandidates: string[] = [];

    const considerCandidate = (candidate?: string | null) => {
      if (!candidate) {
        return;
      }

      const trimmed = candidate.trim();
      if (!trimmed) {
        return;
      }

      attemptedCandidates.push(trimmed);

      const normalized = trimmed.toLowerCase();
      if (!normalized.includes('@')) {
        return;
      }

      if (normalized.endsWith('@system.temp')) {
        if (!placeholderRecipients.has(normalized)) {
          placeholderRecipients.set(normalized, trimmed);
        }
        return;
      }

      if (!resolvedRecipients.has(normalized)) {
        resolvedRecipients.set(normalized, trimmed);
      }
    };

    (orderData.recipientEmails ?? []).forEach((email) =>
      considerCandidate(email),
    );
    considerCandidate(orderData.email ?? null);
    considerCandidate(orderData.customerInfo?.email ?? null);

    let finalRecipients = Array.from(resolvedRecipients.values());
    const placeholderList = Array.from(placeholderRecipients.values());

    const auditPayload: OrderSuccessEmailRecipientAudit =
      orderData.recipientAudit
        ? orderData.recipientAudit
        : {
            attempted: attemptedCandidates,
            placeholder: placeholderList,
          };

    if (finalRecipients.length === 0 && placeholderList.length > 0) {
      finalRecipients = placeholderList;
    }

    if (finalRecipients.length === 0) {
      this.logger.error(
        `[MailService] No valid recipient email found for order ${orderData.orderCode}. Audit: ${JSON.stringify(auditPayload)}`,
      );
      if (!orderData.recipientAudit) {
        this.logger.debug(
          `[MailService] Order ${orderData.orderCode} attempted recipients: ${attemptedCandidates.join(', ') || 'none'}`,
        );
      }
      if (orderData.customerSnapshot) {
        this.logger.debug(
          `[MailService] Order ${orderData.orderCode} customer snapshot: ${JSON.stringify(orderData.customerSnapshot)}`,
        );
      }
      return;
    }

    const recipientSummary = finalRecipients.join(', ');

    this.logger.log(
      `[MailService] Preparing order success email for order ${orderData.orderCode}. Resolved recipients: ${recipientSummary}`,
    );

    if (orderData.customerSnapshot) {
      this.logger.debug(
        `[MailService] Order ${orderData.orderCode} customer snapshot: ${JSON.stringify(orderData.customerSnapshot)}`,
      );
    }

    if (orderData.recipientAudit) {
      this.logger.debug(
        `[MailService] Order ${orderData.orderCode} recipient audit: ${JSON.stringify(orderData.recipientAudit)}`,
      );
    } else {
      this.logger.debug(
        `[MailService] Order ${orderData.orderCode} auto-generated recipient audit: ${JSON.stringify(auditPayload)}`,
      );
    }

    const html = await render(
      <OrderSuccessEmail
        customerName={orderData.customerName}
        orderCode={orderData.orderCode}
        orderId={orderData.orderId}
        items={orderData.items}
        subtotal={orderData.subtotal}
        shippingFee={orderData.shippingFee}
        discount={orderData.discount}
        total={orderData.total}
        vatAmount={orderData.vatAmount}
        totalWithVat={orderData.totalWithVat}
        estimatedDelivery={orderData.estimatedDelivery}
        customerInfo={orderData.customerInfo}
        trackingNumber={orderData.trackingNumber}
        giftSummary={orderData.giftSummary}
        groupBuy={orderData.groupBuy}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to:
            finalRecipients.length === 1 ? finalRecipients[0] : finalRecipients,
          subject: `🎉 Đặt hàng thành công! Đơn hàng ${orderData.orderCode}`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      recipientSummary,
      'order success',
    );
  }

  async sendOrderCancelledEmail(orderData: {
    customerName: string;
    email: string;
    orderCode: string;
    cancelledAt: Date;
    refundAmount?: number;
    refundMethod?: string;
    refundEta?: string;
    cancellationReason?: string;
  }) {
    this.validateEmailConfig();
    const html = await render(
      <OrderCancelledEmail
        customerName={orderData.customerName}
        orderCode={orderData.orderCode}
        cancelledAt={orderData.cancelledAt}
        refundAmount={orderData.refundAmount}
        refundMethod={orderData.refundMethod}
        refundEta={orderData.refundEta}
        cancellationReason={orderData.cancellationReason}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: orderData.email,
          subject: `❌ Đơn hàng ${orderData.orderCode} đã được hủy`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      orderData.email,
      'order cancelled',
    );
  }

  async sendAffiliateCommissionEmail(commissionData: {
    recipientName: string;
    email: string;
    commissionLevel?: 'F0' | 'F1' | 'F2' | 'F4' | 'F5';
    buyerName: string;
    orderCode: string;
    orderDate: Date;
    commissions: Array<{
      productName: string;
      productCode: string;
      quantity: number;
      baseAmount: number;
      commissionRate: number;
      commissionAmount: number;
      categoryName: string;
    }>;
    totalCommissionAmount: number;
    expectedPaymentDate?: Date;
    customerType?: 'guest' | 'member';
    referralTreeInfo?: {
      directReferrals: number;
      totalReferrals: number;
    };
    paymentInfo?: {
      provider: string;
      method: string;
      amount: number;
      status: string;
      providerRef?: string;
      succeededAt?: Date;
    };
    orderPaymentInfo?: {
      method: string;
      status: string;
      amount: number;
      transDate?: Date;
      bankAccount?: string;
    };
    orderTotals?: {
      subtotal: number;
      shippingFee: number;
      discount: number;
      total: number;
    };
    deliveryInfo?: {
      type: string;
      receiver: string;
      contactNumber?: string;
      province?: string;
      district?: string;
      ward?: string;
      address?: string;
    };
  }) {
    this.validateEmailConfig();
    const html = await render(
      <AffiliateCommissionEmail
        recipientName={commissionData.recipientName}
        commissionLevel={commissionData.commissionLevel}
        buyerName={commissionData.buyerName}
        orderCode={commissionData.orderCode}
        orderDate={commissionData.orderDate}
        commissions={commissionData.commissions}
        totalCommissionAmount={commissionData.totalCommissionAmount}
        expectedPaymentDate={commissionData.expectedPaymentDate}
        customerType={commissionData.customerType}
        referralTreeInfo={commissionData.referralTreeInfo}
        paymentInfo={commissionData.paymentInfo}
        orderPaymentInfo={commissionData.orderPaymentInfo}
        orderTotals={commissionData.orderTotals}
        deliveryInfo={commissionData.deliveryInfo}
      />,
    );

    type AffiliateCommissionLevel = 'F0' | 'F1' | 'F2' | 'F4' | 'F5';

    const levelNames: Record<AffiliateCommissionLevel, string> = {
      F0: 'ngân sách hỗ trợ cộng đồng',
      F1: 'gián tiếp',
      F2: 'trực tiếp',
      F4: 'F4',
      F5: 'F5',
    };

    const levelNameForSubject = commissionData.commissionLevel
      ? levelNames[commissionData.commissionLevel]
      : 'không xác định';

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: commissionData.email,
          subject: `💰 Bạn nhận được chiết khấu ${levelNameForSubject} từ đơn hàng ${commissionData.orderCode}`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      commissionData.email,
      'affiliate commission',
    );
  }

  /**
   * Thù lao giới thiệu cổ đông — MỘT email cho mỗi lần một người trong nhóm lên
   * cấp, gộp mọi cấp vượt qua trong lần đó (lên thẳng x3 ⇒ một email 600.000đ).
   * Người gọi tự nuốt lỗi: tiền đã ghi xong trước khi gửi, email hỏng không
   * được phép làm hỏng việc cộng tiền.
   */
  async sendShareholderReferralRewardEmail(data: {
    email: string;
    recipientName: string;
    sourceName: string;
    sourceReferenceId?: string | null;
    relation: QuanHeGioiThieu;
    levels: number[];
    unitAmount: number;
    totalAmount: number;
    rewardedAt: Date;
  }) {
    this.validateEmailConfig();
    const html = await render(
      <ShareholderReferralRewardEmail
        recipientName={data.recipientName}
        sourceName={data.sourceName}
        sourceReferenceId={data.sourceReferenceId}
        relation={data.relation}
        levels={data.levels}
        unitAmount={data.unitAmount}
        totalAmount={data.totalAmount}
        rewardedAt={data.rewardedAt}
      />,
    );
    const tong = `${new Intl.NumberFormat('vi-VN').format(data.totalAmount)}đ`;

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: `🎉 Bạn nhận ${tong} thù lao giới thiệu cổ đông`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.email,
      'shareholder referral reward',
    );
  }

  async sendGratitudeEmail(data: {
    email: string;
    recipientName: string;
    senderName: string;
    orderCode: string;
    amount: number;
    role: 'giver' | 'beneficiary';
    percentage: number;
  }) {
    this.validateEmailConfig();
    const html = await render(
      <GratitudeEmail
        recipientName={data.recipientName}
        senderName={data.senderName}
        orderCode={data.orderCode}
        amount={data.amount}
        role={data.role}
        percentage={data.percentage}
      />,
    );

    const subject =
      data.role === 'giver'
        ? `🎉 Gửi Thù lao tư vấn thành công cho đơn hàng ${data.orderCode}`
        : `🎁 Bạn nhận được Thù lao tư vấn từ người dùng ${data.senderName}`;

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.email,
      'gratitude reward',
    );
  }

  /**
   * Group-buy membership-change notification (join / leave / kick / disband).
   *
   * Sent to the leader + remaining members. The recipient list is resolved by
   * the caller (GroupBuyService) so the person who left / was kicked is already
   * excluded. Renders a single Vietnamese template with an `event` discriminator.
   *
   * Uses sendEmailWithRetry, which surfaces Resend's resolved { error } (the SDK
   * does NOT throw on 429 / blocked recipient) so a genuine failure is logged
   * and retried instead of masquerading as success.
   */
  async sendGroupBuyMembershipChangeEmail(data: {
    email: string;
    recipientName: string;
    actorName?: string;
    productName: string;
    memberCount?: number;
    groupUrl: string;
    event: GroupBuyMembershipEvent;
  }) {
    this.validateEmailConfig();
    const html = await render(
      <GroupBuyMembershipChangeEmail
        recipientName={data.recipientName}
        actorName={data.actorName}
        productName={data.productName}
        memberCount={data.memberCount}
        groupUrl={data.groupUrl}
        event={data.event}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: groupBuyMembershipSubject({
            event: data.event,
            productName: data.productName,
          }),
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.email,
      `group-buy ${data.event}`,
    );
  }

  // Violation Alert Email
  async sendViolationAlertEmail(violationData: {
    userName: string;
    userEmail: string;
    violationTitle: string;
    violationType: string;
    violationDetails: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      detectedAt: Date;
      location?: string;
      additionalInfo?: string;
    }>;
    actionRequired?: string;
    deadline?: Date;
    appealProcess?: string;
    supportContact?: string;
    additionalResources?: string[];
  }) {
    this.logger.log(
      `[MailService] Attempting to send violation alert email to ${violationData.userEmail}`,
    );
    this.validateEmailConfig();
    const html = await render(
      <ViolationAlertEmail
        userName={violationData.userName}
        userEmail={violationData.userEmail}
        violationTitle={violationData.violationTitle}
        violationType={violationData.violationType}
        violationDetails={violationData.violationDetails}
        actionRequired={violationData.actionRequired}
        deadline={violationData.deadline}
        appealProcess={violationData.appealProcess}
        supportContact={violationData.supportContact}
        additionalResources={violationData.additionalResources}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: violationData.userEmail,
          subject: `🚨 ${violationData.violationTitle} - ${violationData.violationType}`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      violationData.userEmail,
      'violation alert',
    );
  }

  // New Business User Credentials Email
  async sendNewBusinessUserCredentialsEmail(credentialsData: {
    name: string;
    email: string;
    tempPassword: string;
    businessName: string;
    verificationToken?: string;
  }) {
    this.logger.log(
      `[MailService] Attempting to send business user credentials email to ${credentialsData.email}`,
    );
    this.validateEmailConfig();

    // Use verification URL if token is provided, otherwise use a generic login URL
    const verificationUrl = credentialsData.verificationToken
      ? `${process.env.FRONTEND_DOMAIN}/verify-email?token=${credentialsData.verificationToken}`
      : `${process.env.FRONTEND_DOMAIN}/login`;

    const html = await render(
      <NewBusinessUserCredentialsEmail
        name={credentialsData.name}
        email={credentialsData.email}
        tempPassword={credentialsData.tempPassword}
        businessName={credentialsData.businessName}
        verificationUrl={verificationUrl}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: credentialsData.email,
          subject: `🎉 Tài khoản doanh nghiệp ${credentialsData.businessName} đã được tạo`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      credentialsData.email,
      'new business user credentials',
    );
  }

  // Business Created Email
  async sendBusinessCreatedEmail(businessData: {
    businessName: string;
    businessEmail: string;
    businessPhone?: string;
    businessAddress?: string;
    businessWebsite?: string;
    ownerName: string;
    businessType: string;
    verified: boolean;
  }) {
    this.logger.log(
      `[MailService] Attempting to send business created email to ${businessData.businessEmail}`,
    );
    this.validateEmailConfig();
    const dashboardUrl = `${process.env.FRONTEND_DOMAIN}/dashboard`;
    const html = await render(
      <BusinessCreatedEmail
        businessName={businessData.businessName}
        businessEmail={businessData.businessEmail}
        businessPhone={businessData.businessPhone}
        businessAddress={businessData.businessAddress}
        businessWebsite={businessData.businessWebsite}
        ownerName={businessData.ownerName}
        businessType={businessData.businessType}
        verified={businessData.verified}
        dashboardUrl={dashboardUrl}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: businessData.businessEmail,
          subject: `🎉 Chúc mừng! Doanh nghiệp ${businessData.businessName} đã được tạo thành công`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      businessData.businessEmail,
      'business created',
    );
  }

  // Business Approved Email
  async sendBusinessApprovedEmail(approvalData: {
    userName: string;
    userEmail: string;
    businessName: string;
    businessEmail: string;
    businessPhone?: string;
    businessAddress?: string;
    businessWebsite?: string;
    businessType: string;
    verified: boolean;
  }) {
    this.logger.log(
      `[MailService] Attempting to send business approved email to ${approvalData.userEmail}`,
    );
    this.validateEmailConfig();
    const dashboardUrl = `${process.env.FRONTEND_DOMAIN}/dashboard`;
    const html = await render(
      <BusinessApprovedEmail
        userName={approvalData.userName}
        userEmail={approvalData.userEmail}
        businessName={approvalData.businessName}
        businessEmail={approvalData.businessEmail}
        businessPhone={approvalData.businessPhone}
        businessAddress={approvalData.businessAddress}
        businessWebsite={approvalData.businessWebsite}
        businessType={approvalData.businessType}
        verified={approvalData.verified}
        dashboardUrl={dashboardUrl}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: approvalData.userEmail,
          subject: `🎉 Chúc mừng! Doanh nghiệp ${approvalData.businessName} đã được phê duyệt`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      approvalData.userEmail,
      'business approved',
    );
  }

  // Voucher Redistribution Notification Email
  async sendVoucherRedistributionNotificationEmail(voucherData: {
    userEmail: string;
    userName: string;
    voucherName: string;
    voucherCode: string;
    voucherValue: string;
    validFrom: string;
    validTo: string;
    minOrderAmount: string;
    additionalUsage: number;
    totalUsage: number;
    wasStatusUpdated?: boolean;
    voucherDescription?: string;
  }) {
    this.logger.log(
      `[MailService] Attempting to send voucher redistribution notification email to ${voucherData.userEmail}`,
    );
    this.validateEmailConfig();
    const html = await render(
      <VoucherRedistributionNotificationEmail
        userName={voucherData.userName}
        voucherName={voucherData.voucherName}
        voucherCode={voucherData.voucherCode}
        voucherValue={voucherData.voucherValue}
        validFrom={voucherData.validFrom}
        validTo={voucherData.validTo}
        minOrderAmount={voucherData.minOrderAmount}
        additionalUsage={voucherData.additionalUsage}
        totalUsage={voucherData.totalUsage}
        wasStatusUpdated={voucherData.wasStatusUpdated}
        voucherDescription={voucherData.voucherDescription}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: voucherData.userEmail,
          subject: `🎁 Voucher của bạn đã được tăng số lần sử dụng!`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      voucherData.userEmail,
      'voucher redistribution notification',
    );
  }

  // Voucher Notification Email
  async sendVoucherNotificationEmail(voucherData: {
    userEmail: string;
    userName: string;
    voucherName: string;
    voucherCode: string;
    voucherValue: string;
    validFrom: string;
    validTo: string;
    minOrderAmount: string;
    voucherDescription?: string;
  }) {
    this.logger.log(
      `[MailService] Attempting to send voucher notification email to ${voucherData.userEmail}`,
    );
    this.validateEmailConfig();
    const html = await render(
      <VoucherNotificationEmail
        userName={voucherData.userName}
        voucherName={voucherData.voucherName}
        voucherCode={voucherData.voucherCode}
        voucherValue={voucherData.voucherValue}
        validFrom={voucherData.validFrom}
        validTo={voucherData.validTo}
        minOrderAmount={voucherData.minOrderAmount}
        voucherDescription={voucherData.voucherDescription}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: voucherData.userEmail,
          subject: `🎉 Bạn đã nhận được voucher mới từ Acta!`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      voucherData.userEmail,
      'voucher notification',
    );
  }

  /**
   * Alert active admins that a GHN webhook was rejected (auth failure).
   * Sends an inline-HTML mail (no separate template component) — this is an
   * ops alert, not a customer-facing email, so we keep the surface tiny and
   * include the diagnostic blob admins need to debug GHN partner config.
   * Caller is responsible for debouncing — this method always sends.
   */
  async sendGhnWebhookFailureAdminAlert(
    adminUsers: Array<{ id: string; email: string; fullName: string }>,
    data: {
      orderCode: string;
      clientOrderCode: string | null;
      ghnStatus: string | null;
      reason: string;
      diagnostic: {
        receivedHeaders: string[];
        tokenHeaderLength: number | null;
        tokenQueryLength?: number | null;
        expectedTokenLength: number | null;
        candidateAuthHeaders: Record<string, number>;
        queryParamNames?: string[];
        candidateAuthQueryParams?: Record<string, number>;
        userAgent: string | null;
        sourceIp: string | null;
      };
      occurredAt: Date;
    },
  ): Promise<void> {
    if (!adminUsers.length) return;
    this.validateEmailConfig();

    const occurredAtIso = data.occurredAt.toISOString();
    const renderCandidateTable = (
      candidates: Record<string, number>,
      emptyMessage: string,
    ) => {
      const rows = Object.entries(candidates)
        .map(
          ([name, len]) =>
            `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;font-family:monospace">${name}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;font-family:monospace">${len}</td></tr>`,
        )
        .join('');
      return rows
        ? `<table style="border-collapse:collapse;margin:8px 0;font-size:13px"><thead><tr><th style="padding:4px 8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left">Tên</th><th style="padding:4px 8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left">Length</th></tr></thead><tbody>${rows}</tbody></table>`
        : `<p style="color:#6b7280;font-size:13px;margin:8px 0">${emptyMessage}</p>`;
    };
    const headerCandidateTable = renderCandidateTable(
      data.diagnostic.candidateAuthHeaders,
      'Không có header nào trông giống token/auth được gửi kèm.',
    );
    const queryCandidateTable = renderCandidateTable(
      data.diagnostic.candidateAuthQueryParams ?? {},
      'Không có query param nào trông giống token/auth được gửi kèm.',
    );
    const queryParamCount = data.diagnostic.queryParamNames?.length ?? 0;

    const html = `<!DOCTYPE html><html lang="vi"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;line-height:1.5;max-width:640px;margin:0 auto;padding:24px">
      <h2 style="color:#b91c1c;margin:0 0 12px">⚠️ GHN webhook bị từ chối</h2>
      <p style="margin:0 0 8px">Hệ thống nhận webhook từ GHN nhưng <strong>không thể xác thực token</strong>. Đơn hàng <strong>không được cập nhật trạng thái vận chuyển</strong> cho đến khi sự cố được xử lý.</p>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0">
        <p style="margin:0 0 4px"><strong>Lý do:</strong> ${data.reason}</p>
        <p style="margin:0 0 4px"><strong>Mã GHN (OrderCode):</strong> <code>${data.orderCode}</code></p>
        <p style="margin:0 0 4px"><strong>Mã nội bộ (ClientOrderCode):</strong> <code>${data.clientOrderCode ?? '—'}</code></p>
        <p style="margin:0 0 4px"><strong>Trạng thái GHN gửi:</strong> <code>${data.ghnStatus ?? '—'}</code></p>
        <p style="margin:0"><strong>Thời điểm:</strong> ${occurredAtIso}</p>
      </div>
      <h3 style="margin:24px 0 8px;font-size:15px">Chẩn đoán</h3>
      <p style="margin:0 0 4px;font-size:13px"><strong>Header <code>Token</code> nhận được:</strong> ${data.diagnostic.tokenHeaderLength === null ? 'KHÔNG có' : `${data.diagnostic.tokenHeaderLength} ký tự`}</p>
      <p style="margin:0 0 4px;font-size:13px"><strong>Query <code>?token=</code> nhận được:</strong> ${data.diagnostic.tokenQueryLength == null ? 'KHÔNG có' : `${data.diagnostic.tokenQueryLength} ký tự`}</p>
      <p style="margin:0 0 4px;font-size:13px"><strong>Token kỳ vọng (GHN_TOKEN_API):</strong> ${data.diagnostic.expectedTokenLength ?? 'CHƯA cấu hình'} ký tự</p>
      <p style="margin:0 0 4px;font-size:13px"><strong>User-Agent:</strong> <code>${data.diagnostic.userAgent ?? '—'}</code></p>
      <p style="margin:0 0 8px;font-size:13px"><strong>Source IP:</strong> <code>${data.diagnostic.sourceIp ?? '—'}</code></p>
      <p style="margin:8px 0 4px;font-size:13px"><strong>Các header có khả năng chứa token mà GHN gửi:</strong></p>
      ${headerCandidateTable}
      <p style="margin:8px 0 4px;font-size:13px"><strong>Các query param có khả năng chứa token mà GHN gửi:</strong></p>
      ${queryCandidateTable}
      <details style="margin:12px 0;font-size:12px;color:#6b7280">
        <summary style="cursor:pointer">Toàn bộ header nhận được (${data.diagnostic.receivedHeaders.length})</summary>
        <pre style="background:#f9fafb;padding:8px;border-radius:4px;overflow-x:auto">${data.diagnostic.receivedHeaders.join('\n')}</pre>
      </details>
      <details style="margin:12px 0;font-size:12px;color:#6b7280">
        <summary style="cursor:pointer">Toàn bộ query param nhận được (${queryParamCount})</summary>
        <pre style="background:#f9fafb;padding:8px;border-radius:4px;overflow-x:auto">${(data.diagnostic.queryParamNames ?? []).join('\n')}</pre>
      </details>
      <h3 style="margin:24px 0 8px;font-size:15px">Cách xử lý</h3>
      <ol style="font-size:13px;padding-left:20px;margin:0">
        <li>GHN <strong>không ký webhook</strong> — vào panel đối tác GHN và cập nhật webhook URL thành <code>https://&lt;api-host&gt;/webhook/ghn/update-shipment?token=&lt;giá-trị-GHN_TOKEN_API&gt;</code>.</li>
        <li>Sau khi cập nhật, đợi GHN retry webhook tiếp theo (khoảng 1-2 phút) — phần "Lịch sử vận chuyển" của đơn sẽ xuất hiện sự kiện thành công thay vì auth failed.</li>
        <li>Nếu vẫn lỗi: kiểm tra <code>GHN_TOKEN_API</code> trên môi trường đang chạy có khớp giá trị đã embed trong URL hay không.</li>
      </ol>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Cảnh báo này được giảm tần suất tới 1 lần / 10 phút cho mỗi mã đơn. Cảnh báo tiếp theo cho cùng mã sẽ chỉ được gửi sau khoảng thời gian này.</p>
    </body></html>`;

    const subject = `[ACTA] GHN webhook bị từ chối — đơn ${data.orderCode}`;

    const sendResults = await Promise.allSettled(
      adminUsers.map((admin) =>
        this.sendEmailWithRetry(
          () =>
            this.resend.emails.send({
              from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
              to: [admin.email],
              subject,
              html,
              headers: {
                'Content-Language': 'vi',
                'X-Language': 'Vietnamese',
              },
              tags: [
                { name: 'ghn-webhook-failure', value: 'ghn-webhook-failure' },
                { name: 'order', value: data.orderCode },
                { name: 'automated', value: 'automated' },
              ],
            }),
          admin.email,
          'ghn webhook failure alert',
        ),
      ),
    );

    const failed = sendResults.filter((r) => r.status === 'rejected').length;
    if (failed) {
      this.logger.warn(
        `[sendGhnWebhookFailureAdminAlert] ${failed}/${adminUsers.length} admin alerts failed to send for order ${data.orderCode}`,
      );
    }
  }

  // Delivery Success Email
  async sendDeliverySuccessEmail(deliveryData: {
    customerEmail: string;
    customerName: string;
    orderCode: string;
    deliveredAt: Date;
    deliveryAddress: string;
    trackingNumber?: string;
    deliveryPartner?: string;
    reviewUrl?: string;
  }) {
    this.logger.log(
      `[MailService] Attempting to send delivery success email for order ${deliveryData.orderCode} to ${deliveryData.customerEmail}`,
    );
    this.validateEmailConfig();
    const html = await render(
      <DeliverySuccessEmail
        customerName={deliveryData.customerName}
        orderCode={deliveryData.orderCode}
        deliveredAt={deliveryData.deliveredAt}
        deliveryAddress={deliveryData.deliveryAddress}
        trackingNumber={deliveryData.trackingNumber}
        deliveryPartner={deliveryData.deliveryPartner}
        reviewUrl={deliveryData.reviewUrl}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: deliveryData.customerEmail,
          subject: `🎉 Đơn hàng ${deliveryData.orderCode} đã giao thành công!`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
            'X-Avatar-URL':
              'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b',
          },
          tags: [
            { name: 'delivery-success', value: 'delivery-success' },
            { name: 'order', value: deliveryData.orderCode },
            { name: 'automated', value: 'automated' },
          ],
        }),
      deliveryData.customerEmail,
      'delivery success',
    );
  }

  // Account Deleted Email
  async sendAccountDeletedEmail(accountData: {
    userName: string;
    userEmail: string;
    referenceId: string;
    deletedAt: Date;
    deletedData?: {
      business?: boolean;
      posts?: number;
      comments?: number;
      orders?: number;
      referrals?: number;
    };
  }) {
    this.logger.log(
      `[MailService] Attempting to send account deletion email to ${accountData.userEmail}`,
    );
    this.validateEmailConfig();
    const html = await render(
      <AccountDeletedEmail
        name={accountData.userName}
        email={accountData.userEmail}
        referenceId={accountData.referenceId}
        deletedAt={accountData.deletedAt}
        deletedData={accountData.deletedData}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: accountData.userEmail,
          subject: `Xác nhận xóa tài khoản ACTA`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      accountData.userEmail,
      'account deleted',
    );
  }

  /**
   * Send email when task is rejected
   */
  async sendTaskRejectedEmail(taskData: {
    userName: string;
    userEmail: string;
    taskTitle: string;
    rejectionReason: string;
    rejectedAt: Date;
    gamificationUrl?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    this.logger.log(
      `[MailService] Attempting to send task rejected email for task "${taskData.taskTitle}" to ${taskData.userEmail}`,
    );

    const gamificationUrl =
      taskData.gamificationUrl ||
      `${process.env.FRONTEND_DOMAIN || 'https://acta.vn'}/gamification`;

    const html = await render(
      <TaskRejectedEmail
        userName={taskData.userName}
        taskTitle={taskData.taskTitle}
        rejectionReason={taskData.rejectionReason}
        rejectedAt={taskData.rejectedAt}
        gamificationUrl={gamificationUrl}
        supportEmail={process.env.SUPPORT_EMAIL || 'lienhe@acta.vn'}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: taskData.userEmail,
          subject: `Nhiệm vụ "${taskData.taskTitle}" đã bị từ chối`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      taskData.userEmail,
      'task rejected',
    );
  }

  async sendRecognizedUserEmail(
    email: string,
    name: string,
    rank: number | null,
    orderPoints: number,
    kycCount: number,
    sharingLevel: number,
    /** Điểm chính (`sharingCompositePoints`); nơi gọi cũ không truyền ⇒ thư ghi "Điểm mua hàng". */
    sharingCompositePoints?: number,
    /** `false` ⇒ không chào là Cổ Đông Cộng Đồng mới, thư nói "vừa đạt danh hiệu" (xem RecognizedUserEmail). */
    laCoDongMoi = true,
  ) {
    this.validateEmailConfig();
    const html = await render(
      <RecognizedUserEmail
        name={name}
        rank={rank}
        orderPoints={orderPoints}
        kycCount={kycCount}
        sharingLevel={sharingLevel}
        sharingCompositePoints={sharingCompositePoints}
        laCoDongMoi={laCoDongMoi}
      />,
    );

    return this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: email,
          subject: tieuDeThuCongNhan({ rank, sharingLevel, laCoDongMoi }),
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      email,
      'recognized user',
    );
  }

  /**
   * Send email with OTP for withdrawal verification
   */
  async sendWithdrawalOtpEmail(
    name: string,
    email: string,
    otp: string,
    amount: number,
  ): Promise<void> {
    this.validateEmailConfig();
    const { WithdrawalOtpEmail } =
      await import('./templates/WithdrawalOtpEmail');
    const html = await render(
      <WithdrawalOtpEmail name={name} otp={otp} amount={amount} />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: email,
      subject: 'Mã OTP xác thực rút tiền',
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  /**
   * Send email to confirm withdrawal request has been sent and waiting for approval
   */
  async sendWithdrawalSuccessEmail(
    name: string,
    email: string,
    amount: number,
    withdrawalId: string,
    withdrawalMethod: string,
    paymentMethodInfo?: string,
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <WithdrawalSuccessEmail
        name={name}
        amount={amount}
        withdrawalId={withdrawalId}
        withdrawalMethod={withdrawalMethod}
        paymentMethodInfo={paymentMethodInfo}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: email,
          subject: 'Yêu cầu rút tiền đã được gửi thành công',
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      email,
      'Withdrawal Success',
    );
  }

  /**
   * Send email when users are added to a team
   */
  async sendTeamMembersAddedEmail(data: {
    userEmail: string;
    userName: string;
    teamName: string;
    role?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <TeamMembersAddedEmail
        userName={data.userName}
        teamName={data.teamName}
        role={data.role}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: `Chào mừng bạn đến với team ${data.teamName}`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.userEmail,
      'Team Members Added',
    );
  }

  /**
   * Send email when a user is removed from a team
   */
  async sendTeamMemberRemovedEmail(data: {
    userEmail: string;
    userName: string;
    teamName: string;
    reason?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <TeamMemberRemovedEmail
        userName={data.userName}
        teamName={data.teamName}
        reason={data.reason}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: `Thông báo về team ${data.teamName}`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.userEmail,
      'Team Member Removed',
    );
  }

  /**
   * Send email when a join request is approved
   */
  async sendTeamJoinRequestApprovedEmail(data: {
    userEmail: string;
    userName: string;
    teamName: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <TeamJoinRequestApprovedEmail
        userName={data.userName}
        teamName={data.teamName}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: `Yêu cầu tham gia team ${data.teamName} đã được chấp nhận`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.userEmail,
      'Team Join Request Approved',
    );
  }

  /**
   * Send email when a leave request is approved
   */
  async sendTeamLeaveRequestApprovedEmail(data: {
    userEmail: string;
    userName: string;
    teamName: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <TeamLeaveRequestApprovedEmail
        userName={data.userName}
        teamName={data.teamName}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: `Yêu cầu rời team ${data.teamName} đã được chấp nhận`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.userEmail,
      'Team Leave Request Approved',
    );
  }

  /**
   * Send email when a leave request is rejected
   */
  async sendTeamLeaveRequestRejectedEmail(data: {
    userEmail: string;
    userName: string;
    teamName: string;
    rejectionReason?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <TeamLeaveRequestRejectedEmail
        userName={data.userName}
        teamName={data.teamName}
        rejectionReason={data.rejectionReason}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: `Yêu cầu rời team ${data.teamName} đã bị từ chối`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.userEmail,
      'Team Leave Request Rejected',
    );
  }

  /**
   * Send team request notification to admin users (batch)
   */
  async sendTeamRequestAdminNotificationBatch(
    adminUsers: Array<{ id: string; email: string; fullName: string }>,
    data: {
      userName: string;
      userEmail: string;
      userReferenceId: string;
      teamName: string;
      requestType: 'join' | 'leave' | 'cancel';
      requestTime: string;
    },
  ): Promise<void> {
    if (!adminUsers.length) return;

    const TAG = 'sendTeamRequestAdminNotificationBatch';
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;

    const subject =
      data.requestType === 'join'
        ? `[ACTA] Yêu cầu tham gia nhóm ${data.teamName}`
        : data.requestType === 'cancel'
          ? `[ACTA] Huỷ yêu cầu tham gia nhóm ${data.teamName}`
          : `[ACTA] Yêu cầu rời khỏi nhóm ${data.teamName}`;

    this.logger.log(
      `[${TAG}] Starting batch email send for ${adminUsers.length} admins (requestType=${data.requestType})`,
    );

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Render all HTML content up front
    const emailsData = await Promise.all(
      adminUsers.map(async (admin) => {
        const html = await render(
          <TeamRequestAdminNotificationEmail
            adminName={admin.fullName}
            userName={data.userName}
            userEmail={data.userEmail}
            userReferenceId={data.userReferenceId}
            teamName={data.teamName}
            requestType={data.requestType}
            requestTime={data.requestTime}
          />,
        );
        return { admin, html };
      }),
    );

    const buildPayload = () =>
      emailsData.map(({ admin, html }) => ({
        from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
        to: [admin.email],
        subject,
        html,
        headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
      }));

    const sendBatchWithRetry = async (attempt: number): Promise<any> => {
      try {
        if (attempt > 1) {
          this.logger.log(`[${TAG}] Retry attempt ${attempt}/${MAX_RETRIES}`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
        this.logger.log(
          `[${TAG}] Attempt ${attempt}: sending batch of ${adminUsers.length} emails...`,
        );
        const response = await this.resend.batch.send(buildPayload());
        this.logger.log(`[${TAG}] Attempt ${attempt} raw response: ${JSON.stringify(response)}`);
        return response;
      } catch (error) {
        this.logger.error(`[${TAG}] Attempt ${attempt}/${MAX_RETRIES} exception: ${error.message}`);
        if (attempt >= MAX_RETRIES) throw error;
        return sendBatchWithRetry(attempt + 1);
      }
    };

    let batchResponse: any;
    try {
      batchResponse = await sendBatchWithRetry(1);
    } catch (error) {
      this.logger.error(`[${TAG}] ✗ All ${MAX_RETRIES} attempts failed: ${error.message}`);
      results.failed = adminUsers.length;
      adminUsers.forEach((admin) =>
        results.errors.push(`Failed after ${MAX_RETRIES} attempts for ${admin.email}: ${error.message}`),
      );
      return;
    }

    // Map results by index
    const emailResults = new Map<
      number,
      { success: boolean; email: string; responseId?: string; error?: string }
    >();

    if (batchResponse.data && Array.isArray(batchResponse.data)) {
      batchResponse.data.forEach((item: any, index: number) => {
        if (item && item.id) {
          emailResults.set(index, { success: true, email: adminUsers[index].email, responseId: item.id });
          results.success++;
          this.logger.log(`[${TAG}] [${index + 1}/${adminUsers.length}] ✓ Sent to ${adminUsers[index].email} (ID: ${item.id})`);
        }
      });
    }

    if (batchResponse.error) {
      this.logger.error(`[${TAG}] Batch error: ${JSON.stringify(batchResponse.error)}`);
      adminUsers.forEach((admin, index) => {
        if (!emailResults.has(index)) {
          emailResults.set(index, { success: false, email: admin.email, error: JSON.stringify(batchResponse.error) });
          results.failed++;
          results.errors.push(`${admin.email}: ${JSON.stringify(batchResponse.error)}`);
        }
      });
    } else if (batchResponse.errors && Array.isArray(batchResponse.errors)) {
      batchResponse.errors.forEach((err: any) => {
        const index = err.index;
        const admin = adminUsers[index];
        if (admin) {
          emailResults.set(index, { success: false, email: admin.email, error: err.message });
          results.failed++;
          results.errors.push(`${admin.email}: ${err.message}`);
          this.logger.error(`[${TAG}] [${index + 1}/${adminUsers.length}] ✗ ${admin.email}: ${err.message}`);
        }
      });
    }

    // Safety: mark any unaccounted emails as failed
    adminUsers.forEach((admin, index) => {
      if (!emailResults.has(index)) {
        emailResults.set(index, { success: false, email: admin.email, error: 'No response received' });
        results.failed++;
        results.errors.push(`${admin.email}: No response received`);
        this.logger.warn(`[${TAG}] [${index + 1}/${adminUsers.length}] ⚠ No response for ${admin.email}`);
      }
    });

    // Retry rate-limited / missing emails individually
    const isRateLimitError = (msg?: string) =>
      !!msg && (msg.includes('rate_limit_exceeded') || msg.includes('Too many requests') || msg.includes('"statusCode":429'));
    const isRetryable = (msg?: string) => isRateLimitError(msg) || (!!msg && msg.includes('No response received'));

    const retryIndexes: number[] = [];
    emailResults.forEach((result, index) => {
      if (!result.success && isRetryable(result.error)) retryIndexes.push(index);
    });

    if (retryIndexes.length > 0) {
      this.logger.log(`[${TAG}] Retrying ${retryIndexes.length} email(s) individually...`);
      const INDIVIDUAL_DELAY_MS = 600;
      const INDIVIDUAL_MAX_ATTEMPTS = 3;

      for (const index of retryIndexes) {
        const admin = adminUsers[index];
        const html = emailsData[index].html;
        let attempt = 0;
        let sent = false;

        while (attempt < INDIVIDUAL_MAX_ATTEMPTS && !sent) {
          attempt++;
          try {
            await new Promise((resolve) => setTimeout(resolve, INDIVIDUAL_DELAY_MS * attempt));
            const sendResponse = await this.resend.emails.send({
              from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
              to: [admin.email],
              subject,
              html,
              headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
            });

            if (sendResponse.error) {
              const errMsg = JSON.stringify(sendResponse.error);
              this.logger.warn(`[${TAG}] Individual retry ${attempt}/${INDIVIDUAL_MAX_ATTEMPTS} failed for ${admin.email}: ${errMsg}`);
              if (!isRateLimitError(errMsg) || attempt >= INDIVIDUAL_MAX_ATTEMPTS) break;
              continue;
            }

            emailResults.set(index, { success: true, email: admin.email, responseId: sendResponse.data?.id });
            results.success++;
            results.failed--;
            const errIdx = results.errors.findIndex((e) => e.startsWith(`${admin.email}:`));
            if (errIdx !== -1) results.errors.splice(errIdx, 1);
            sent = true;
            this.logger.log(`[${TAG}] ✓ Individual retry recovered ${admin.email} (attempt ${attempt})`);
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`[${TAG}] Individual retry ${attempt}/${INDIVIDUAL_MAX_ATTEMPTS} threw for ${admin.email}: ${errMsg}`);
            if (!isRateLimitError(errMsg) || attempt >= INDIVIDUAL_MAX_ATTEMPTS) break;
          }
        }
      }
    }

    this.logger.log(
      `[${TAG}] Final: ${results.success} succeeded, ${results.failed} failed out of ${adminUsers.length} total`,
    );
    if (results.errors.length > 0) {
      this.logger.error(`[${TAG}] Errors: ${JSON.stringify(results.errors)}`);
    }
  }

  /**
   * Send email when a team member role is changed
   */
  async sendTeamMemberRoleChangedEmail(data: {
    userEmail: string;
    userName: string;
    teamName: string;
    oldRole: string;
    newRole: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <TeamMemberRoleChangedEmail
        userName={data.userName}
        teamName={data.teamName}
        oldRole={data.oldRole}
        newRole={data.newRole}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: `Chức vụ của bạn trong team ${data.teamName} đã được thay đổi`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.userEmail,
      'Team Member Role Changed',
    );
  }

  /**
   * Send email when a team is dissolved
   */
  async sendTeamDissolvedEmail(data: {
    userEmail: string;
    userName: string;
    teamName: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      <TeamDissolvedEmail userName={data.userName} teamName={data.teamName} />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: `Thông báo: Team ${data.teamName} đã bị giải tán`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.userEmail,
      'Team Dissolved',
    );
  }

  /**
   * Send email to referrer when a new guest places order through their referral link
   * Non-blocking: errors are logged but don't throw exceptions
   */
  async sendReferrerNewGuestOrderEmail(data: {
    referrerEmail: string;
    referrerName: string;
    referredUserName: string;
    referredUserPhone: string;
    orderCode: string;
    productName?: string;
  }): Promise<void> {
    try {
      this.validateEmailConfig();
      const html = await render(
        <ReferrerNewGuestOrderEmail
          referrerName={data.referrerName}
          referredUserName={data.referredUserName}
          referredUserPhone={data.referredUserPhone}
          orderCode={data.orderCode}
          productName={data.productName}
        />,
      );

      await this.sendEmailWithRetry(
        () =>
          this.resend.emails.send({
            from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
            to: data.referrerEmail,
            subject: `Chúc mừng! Bạn có một thành viên mới từ đường giới thiệu`,
            html,
            headers: {
              'Content-Language': 'vi',
              'X-Language': 'Vietnamese',
            },
          }),
        data.referrerEmail,
        'Referrer New Guest Order',
      );
      this.logger.log(
        `Sent referrer notification email to ${data.referrerEmail} for order ${data.orderCode}`,
      );
    } catch (error) {
      // Non-blocking: log error but don't throw
      this.logger.error(
        `Failed to send referrer notification email to ${data.referrerEmail} for order ${data.orderCode}: ${error.message}`,
      );
    }
  }

  async sendProductReviewSubmittedEmail(data: {
    emails: string[];
    productName: string;
    reviewType: 'create' | 'update' | 'delete';
    submitterName: string;
    reviewUrl: string;
  }): Promise<void> {
    try {
      const recipients = data.emails.filter((email): email is string => !!email);
      if (recipients.length === 0) {
        return;
      }

      const html = await render(
        <ProductReviewSubmittedEmail
          productName={data.productName}
          reviewType={data.reviewType}
          submitterName={data.submitterName}
          reviewUrl={data.reviewUrl}
        />,
      );

      const subject = `[ACTA] Yêu cầu duyệt sản phẩm: ${data.productName}`;

      // Fan the identical approval notification out via Resend's batch endpoint
      // — ONE API call per chunk (≤100) instead of one call per recipient — so a
      // large approver list never trips Resend's 2 req/sec rate limit. Mirrors
      // the batching in EmailService.sendEmails.
      const maxBatchSize = 100;
      for (let i = 0; i < recipients.length; i += maxBatchSize) {
        const batch = recipients.slice(i, i + maxBatchSize);
        await this.sendEmailWithRetry(
          () =>
            this.resend.batch.send(
              batch.map((email) => ({
                from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
                to: email,
                subject,
                html,
                headers: {
                  'Content-Language': 'vi',
                  'X-Language': 'Vietnamese',
                },
              })),
            ),
          `batch of ${batch.length} recipients`,
          'Product Review Submitted',
        );
      }
    } catch (error) {
      this.logger.error('Failed to send product review email', error);
    }
  }

  async sendProductReviewResultEmail(data: {
    email: string;
    productName: string;
    reviewType: 'create' | 'update' | 'delete';
    action: 'approved' | 'rejected';
    reviewerName: string;
    reviewNote?: string;
    reviewUrl: string;
  }): Promise<void> {
    try {
      const html = await render(
        <ProductReviewResultEmail
          productName={data.productName}
          reviewType={data.reviewType}
          action={data.action}
          reviewerName={data.reviewerName}
          reviewNote={data.reviewNote}
          reviewUrl={data.reviewUrl}
        />,
      );

      const subjectAction =
        data.action === 'approved' ? 'đã được phê duyệt' : 'đã bị từ chối';
      await this.sendEmailWithRetry(
        () =>
          this.resend.emails.send({
            from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
            to: data.email,
            subject: `[ACTA] Yêu cầu duyệt sản phẩm ${subjectAction}: ${data.productName}`,
            html,
            headers: {
              'Content-Language': 'vi',
              'X-Language': 'Vietnamese',
            },
          }),
        data.email,
        'Product Review Result',
      );
    } catch (error) {
      this.logger.error('Failed to send product review result email', error);
    }
  }

  async sendWarehouseReviewSubmittedBatch(
    adminUsers: Array<{ email: string; fullName: string }>,
    data: {
      submitterName: string;
      reviewType: string;
      targetType: string;
      targetName: string;
      note?: string;
      urlLink: string;
    },
  ): Promise<void> {
    const subject = `[ACTA] Yêu cầu duyệt kho hàng: ${data.reviewType} ${data.targetName}`;

    // Render the per-admin personalized HTML up front (local CPU, no API call),
    // then fan out via Resend's batch endpoint — ONE API call per ≤100 chunk
    // instead of one per admin — to stay under Resend's 2 req/sec rate limit.
    const messages: Array<{
      from: string;
      to: string;
      subject: string;
      html: string;
    }> = [];
    for (const admin of adminUsers) {
      if (!admin.email) continue;
      try {
        const html = await render(
          <WarehouseReviewSubmittedEmail
            adminName={admin.fullName || 'Admin'}
            submitterName={data.submitterName}
            reviewType={data.reviewType}
            targetType={data.targetType}
            targetName={data.targetName}
            note={data.note}
            urlLink={data.urlLink}
          />,
        );
        messages.push({
          from: 'ACTA <noreply@acta.vn>',
          to: admin.email,
          subject,
          html,
        });
      } catch (error) {
        this.logger.error(
          `Failed to render warehouse review submitted email for ${admin.email}:`,
          error,
        );
      }
    }

    if (messages.length === 0) {
      return;
    }

    const maxBatchSize = 100;
    for (let i = 0; i < messages.length; i += maxBatchSize) {
      const batch = messages.slice(i, i + maxBatchSize);
      try {
        await this.sendEmailWithRetry(
          () => this.resend.batch.send(batch),
          `batch of ${batch.length} recipients`,
          'Warehouse Review Submitted',
        );
      } catch (error) {
        this.logger.error(
          `Failed to send warehouse review submitted batch (${batch.length} recipients):`,
          error,
        );
      }
    }
  }

  async sendWarehouseReviewApprovedEmail(
    email: string,
    data: {
      submitterName: string;
      reviewerName: string;
      reviewType: string;
      targetType: string;
      targetName: string;
      reviewNote?: string;
      urlLink: string;
    },
  ): Promise<void> {
    try {
      const html = await render(
        <WarehouseReviewApprovedEmail
          submitterName={data.submitterName}
          reviewerName={data.reviewerName}
          reviewType={data.reviewType}
          targetType={data.targetType}
          targetName={data.targetName}
          reviewNote={data.reviewNote}
          urlLink={data.urlLink}
        />,
      );
      await this.resend.emails.send({
        from: 'ACTA <noreply@acta.vn>',
        to: email,
        subject: `[ACTA] Yêu cầu duyệt kho hàng đã được phê duyệt: ${data.targetName}`,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send warehouse review approved email to ${email}:`,
        error,
      );
    }
  }

  /**
   * Báo chủ kho CTV có hàng chuyển vào kho họ quản lý — dùng cho CẢ hai thời
   * điểm: lúc phiếu vừa tạo (`isApproved = false`) và lúc phiếu được duyệt.
   *
   * Không có kiểm tra `MAIL_ENABLED` / `MAIL_REDIRECT_TO` ở đây là CỐ Ý:
   * `applyMailDeliveryGuard` đã vá thẳng `this.resend` trong constructor, nên
   * mọi chỗ gọi đều bị chặn/đổi hướng như nhau. Thêm một lớp gác riêng ở đây
   * là tạo hai nguồn sự thật, và cái thứ hai chắc chắn sẽ trôi khỏi cái thật.
   */
  async sendWarehouseMovementNoticeEmail(
    email: string,
    data: {
      managerName: string;
      destinationWarehouseName: string;
      sourceWarehouseName?: string;
      submitterName: string;
      movementLabel: string;
      productName: string;
      quantityLabel: string;
      note?: string;
      statusLabel: string;
      isApproved: boolean;
      warehouseUrl: string;
    },
  ): Promise<void> {
    try {
      const html = await render(
        <WarehouseMovementNoticeEmail
          managerName={data.managerName}
          destinationWarehouseName={data.destinationWarehouseName}
          sourceWarehouseName={data.sourceWarehouseName}
          submitterName={data.submitterName}
          movementLabel={data.movementLabel}
          productName={data.productName}
          quantityLabel={data.quantityLabel}
          note={data.note}
          statusLabel={data.statusLabel}
          isApproved={data.isApproved}
          warehouseUrl={data.warehouseUrl}
        />,
      );
      await this.resend.emails.send({
        from: 'ACTA <noreply@acta.vn>',
        to: email,
        subject: data.isApproved
          ? `[ACTA] Đã duyệt chuyển hàng vào kho ${data.destinationWarehouseName}`
          : `[ACTA] Có hàng đang chuyển vào kho ${data.destinationWarehouseName}`,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send warehouse movement notice email to ${email}:`,
        error,
      );
    }
  }

  async sendWarehouseReviewRejectedEmail(
    email: string,
    data: {
      submitterName: string;
      reviewerName: string;
      reviewType: string;
      targetType: string;
      targetName: string;
      reviewNote?: string;
      urlLink: string;
    },
  ): Promise<void> {
    try {
      const html = await render(
        <WarehouseReviewRejectedEmail
          submitterName={data.submitterName}
          reviewerName={data.reviewerName}
          reviewType={data.reviewType}
          targetType={data.targetType}
          targetName={data.targetName}
          reviewNote={data.reviewNote}
          urlLink={data.urlLink}
        />,
      );
      await this.resend.emails.send({
        from: 'ACTA <noreply@acta.vn>',
        to: email,
        subject: `[ACTA] Yêu cầu duyệt kho hàng đã bị từ chối: ${data.targetName}`,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send warehouse review rejected email to ${email}:`,
        error,
      );
    }
  }

  async sendOrderWarehouseAssignmentEmail(
    recipients: Array<{ email: string; fullName: string }>,
    data: {
      orderCode: string;
      warehouseName: string;
      assignedByName: string;
    },
  ): Promise<void> {
    const frontendDomain =
      process.env.FRONTEND_ADMIN_DOMAIN ||
      process.env.FRONTEND_DOMAIN ||
      'https://admin.acta.vn';
    const urlLink = `${frontendDomain}/e-commerce/orders`;
    const subject = `[ACTA] Yêu cầu xử lý đơn hàng ${data.orderCode} tại kho ${data.warehouseName}`;

    // Render per-recipient personalized HTML up front, then batch-send in ≤100
    // chunks (ONE API call per chunk) to avoid Resend's 2 req/sec rate limit.
    const messages: Array<{
      from: string;
      to: string;
      subject: string;
      html: string;
    }> = [];
    for (const recipient of recipients) {
      if (!recipient.email) continue;
      try {
        const html = await render(
          <OrderWarehouseAssignmentEmail
            recipientName={recipient.fullName || 'Admin'}
            orderCode={data.orderCode}
            warehouseName={data.warehouseName}
            assignedByName={data.assignedByName}
            urlLink={urlLink}
          />,
        );
        messages.push({
          from: 'ACTA <noreply@acta.vn>',
          to: recipient.email,
          subject,
          html,
        });
      } catch (error) {
        this.logger.error(
          `Failed to render order warehouse assignment email for ${recipient.email}:`,
          error,
        );
      }
    }

    if (messages.length === 0) {
      return;
    }

    const maxBatchSize = 100;
    for (let i = 0; i < messages.length; i += maxBatchSize) {
      const batch = messages.slice(i, i + maxBatchSize);
      try {
        await this.sendEmailWithRetry(
          () => this.resend.batch.send(batch),
          `batch of ${batch.length} recipients`,
          'Order Warehouse Assignment',
        );
      } catch (error) {
        this.logger.error(
          `Failed to send order warehouse assignment batch (${batch.length} recipients):`,
          error,
        );
      }
    }
  }

  async sendProductAvailabilityNotificationEmail(data: {
    email: string;
    productName: string;
    productSlug: string;
    type: 'BACK_IN_STOCK' | 'OPEN_SALE';
    unsubscribeToken: string;
  }) {
    const frontendDomain =
      process.env.FRONTEND_DOMAIN ?? 'https://acta.vn';

    const isOpenSale = data.type === 'OPEN_SALE';
    const subject = isOpenSale
      ? `🛒 Sản phẩm "${data.productName}" đã mở bán!`
      : `✅ Sản phẩm "${data.productName}" đã có hàng trở lại!`;

    const html = await render(
      <ProductAvailabilityNotificationEmail
        email={data.email}
        productName={data.productName}
        productSlug={data.productSlug}
        type={data.type}
        frontendDomain={frontendDomain}
        unsubscribeToken={data.unsubscribeToken}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: data.email,
      subject,
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendProductAvailabilityConfirmationEmail(data: {
    email: string;
    productName: string;
    productSlug: string;
    type: 'BACK_IN_STOCK' | 'OPEN_SALE';
    unsubscribeToken: string;
  }) {
    const frontendDomain =
      process.env.FRONTEND_DOMAIN ?? 'https://acta.vn';

    const subject = `Đã ghi nhận đăng ký nhận thông báo — ${data.productName}`;

    const html = await render(
      <ProductAvailabilitySubscriptionConfirmationEmail
        email={data.email}
        productName={data.productName}
        productSlug={data.productSlug}
        type={data.type}
        frontendDomain={frontendDomain}
        unsubscribeToken={data.unsubscribeToken}
      />,
    );

    await this.resend.emails.send({
      from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
      to: data.email,
      subject,
      html,
      headers: {
        'Content-Language': 'vi',
        'X-Language': 'Vietnamese',
      },
    });
  }

  async sendGiftRecipientNotificationEmail(data: {
    recipientEmail: string;
    recipientName: string;
    buyerName: string;
    anonymousSender: boolean;
    senderDisplayName?: string;
    giftTemplateImageUrl?: string;
    giftTemplateName?: string;
    giftMessage?: string;
    recipientFullAddress: string;
    preferredDeliveryDate?: Date;
    preferredDeliveryTimeStart?: string;
    preferredDeliveryTimeEnd?: string;
    orderCode?: string;
  }): Promise<void> {
    this.validateEmailConfig();

    const storefrontBase =
      process.env.FRONTEND_DOMAIN ?? 'https://acta.vn';
    const recipientLookupUrl = data.orderCode
      ? `${storefrontBase}/qua-tang/${data.orderCode}`
      : undefined;

    const html = await render(
      <OrderGiftRecipientNotificationEmail
        recipientName={data.recipientName}
        buyerName={data.buyerName}
        anonymousSender={data.anonymousSender}
        senderDisplayName={data.senderDisplayName}
        giftTemplateImageUrl={data.giftTemplateImageUrl}
        giftTemplateName={data.giftTemplateName}
        giftMessage={data.giftMessage}
        recipientFullAddress={data.recipientFullAddress}
        preferredDeliveryDate={data.preferredDeliveryDate}
        preferredDeliveryTimeStart={data.preferredDeliveryTimeStart}
        preferredDeliveryTimeEnd={data.preferredDeliveryTimeEnd}
        recipientLookupUrl={recipientLookupUrl}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.recipientEmail,
          subject: `Bạn sắp nhận được một món quà đặc biệt — ACTA`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.recipientEmail,
      'gift recipient notification',
    );
  }

  async sendGiftDeliveredBuyerEmail(data: {
    buyerEmail: string;
    buyerName: string;
    recipientName: string;
    recipientFullAddress: string;
    giftTemplateName?: string;
    deliveredAt: Date;
    orderDetailUrl: string;
  }): Promise<void> {
    this.validateEmailConfig();

    const html = await render(
      <OrderGiftDeliveredBuyerEmail
        buyerName={data.buyerName}
        recipientName={data.recipientName}
        recipientFullAddress={data.recipientFullAddress}
        giftTemplateName={data.giftTemplateName}
        deliveredAt={data.deliveredAt}
        orderDetailUrl={data.orderDetailUrl}
      />,
    );

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.buyerEmail,
          subject: `Món quà của bạn đã được trao thành công — ACTA`,
          html,
          headers: {
            'Content-Language': 'vi',
            'X-Language': 'Vietnamese',
          },
        }),
      data.buyerEmail,
      'gift delivered buyer',
    );
  }

  /**
   * Generic review submission notification — fan-out to all approver
   * recipients. Used by the 9 review services (voucher, category, invoice,
   * news, document, forumTopic, moment, livestream, story). Errors are
   * swallowed so callers can fire-and-forget.
   */
  async sendReviewSubmittedEmail(args: {
    recipients: string[];
    entity: string;
    reviewId: string;
    submittedByName: string;
    summary?: string;
  }): Promise<void> {
    try {
      const frontendDomain =
        process.env.FRONTEND_ADMIN_DOMAIN ||
        process.env.FRONTEND_DOMAIN ||
        'https://admin.acta.vn';
      const reviewUrl = `${frontendDomain}/reviews/${args.entity}/${args.reviewId}`;

      const recipients = args.recipients.filter(
        (email): email is string => !!email,
      );
      if (recipients.length === 0) {
        return;
      }

      const html = await render(
        <ReviewSubmittedEmail
          entityLabel={args.entity}
          targetName=""
          reviewType="create"
          submitterName={args.submittedByName}
          reviewUrl={reviewUrl}
          summary={args.summary}
        />,
      );

      const subject = `[ACTA] Yêu cầu duyệt ${args.entity} mới`;

      // ONE batch API call per ≤100-recipient chunk instead of one call per
      // recipient — avoids Resend's 2 req/sec rate limit. See sendEmails.
      const maxBatchSize = 100;
      for (let i = 0; i < recipients.length; i += maxBatchSize) {
        const batch = recipients.slice(i, i + maxBatchSize);
        await this.sendEmailWithRetry(
          () =>
            this.resend.batch.send(
              batch.map((email) => ({
                from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
                to: email,
                subject,
                html,
                headers: {
                  'Content-Language': 'vi',
                  'X-Language': 'Vietnamese',
                },
              })),
            ),
          `batch of ${batch.length} recipients`,
          `Review Submitted (${args.entity})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send review submitted email for ${args.entity}:${args.reviewId}`,
        error,
      );
    }
  }

  /**
   * Generic review result notification — sent to the submitter when their
   * review is approved or rejected. Errors are swallowed so callers can
   * fire-and-forget.
   */
  async sendReviewResultEmail(args: {
    recipient: string;
    entity: string;
    reviewId: string;
    status: 'approved' | 'rejected';
    reviewerName: string;
    note?: string;
  }): Promise<void> {
    try {
      const frontendDomain =
        process.env.FRONTEND_ADMIN_DOMAIN ||
        process.env.FRONTEND_DOMAIN ||
        'https://admin.acta.vn';
      const reviewUrl = `${frontendDomain}/reviews/${args.entity}/${args.reviewId}`;

      const html = await render(
        <ReviewResultEmail
          entityLabel={args.entity}
          targetName=""
          reviewType="create"
          action={args.status}
          reviewerName={args.reviewerName}
          reviewNote={args.note}
          reviewUrl={reviewUrl}
        />,
      );

      const subjectAction =
        args.status === 'approved' ? 'đã được phê duyệt' : 'đã bị từ chối';
      await this.sendEmailWithRetry(
        () =>
          this.resend.emails.send({
            from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
            to: args.recipient,
            subject: `[ACTA] Yêu cầu duyệt ${args.entity} ${subjectAction}`,
            html,
            headers: {
              'Content-Language': 'vi',
              'X-Language': 'Vietnamese',
            },
          }),
        args.recipient,
        `Review Result (${args.entity})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send review result email for ${args.entity}:${args.reviewId}`,
        error,
      );
    }
  }

  /**
   * Send the business-form status email — used for in_review / needs_more_info /
   * approved / rejected / admin-create transitions. Renders the same template
   * with branching content; subject line and CTA adapt to the transition.
   */
  async sendBusinessFormStatusEmail(args: {
    transition: BusinessFormEmailTransition;
    email: string;
    userName: string;
    companyName: string;
    taxCode: string;
    reviewerName?: string | null;
    adminNote?: string | null;
    fieldFlags?: BusinessFormFieldFlagSummary[];
    formUrl: string;
  }): Promise<void> {
    try {
      const html = await render(
        <BusinessFormStatusEmail
          transition={args.transition}
          userName={args.userName}
          companyName={args.companyName}
          taxCode={args.taxCode}
          reviewerName={args.reviewerName}
          adminNote={args.adminNote}
          fieldFlags={args.fieldFlags}
          formUrl={args.formUrl}
        />,
      );

      const subjectByTransition: Record<BusinessFormEmailTransition, string> = {
        in_review: `[ACTA] Đang xem xét hồ sơ doanh nghiệp — ${args.companyName}`,
        needs_more_info: `[ACTA] Cần bổ sung thông tin form đăng ký — ${args.companyName}`,
        approved: `[ACTA] Form đăng ký doanh nghiệp đã được phê duyệt — ${args.companyName}`,
        rejected: `[ACTA] Form đăng ký doanh nghiệp đã bị từ chối — ${args.companyName}`,
        'admin-create': `[ACTA] Hồ sơ doanh nghiệp đã được tạo & phê duyệt — ${args.companyName}`,
      };

      await this.sendEmailWithRetry(
        () =>
          this.resend.emails.send({
            from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
            to: args.email,
            subject: subjectByTransition[args.transition],
            html,
            headers: {
              'Content-Language': 'vi',
              'X-Language': 'Vietnamese',
            },
          }),
        args.email,
        `BusinessForm Status (${args.transition})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send business-form status email transition=${args.transition}`,
        error,
      );
    }
  }

  async sendHalfWalletSubmittedToAdmins(data: {
    admins: { email: string; fullName: string }[];
    userName: string;
    walletAddress: string;
    userReason?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    await Promise.allSettled(
      data.admins.map(async (admin) => {
        const html = await render(
          HalfWalletSubmittedAdminEmail({
            adminName: admin.fullName,
            userName: data.userName,
            walletAddress: data.walletAddress,
            userReason: data.userReason,
          }),
        );
        return this.sendEmailWithRetry(
          () =>
            this.resend.emails.send({
              from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
              to: admin.email,
              subject: '[ACTA HALF] Yêu cầu xác thực ví HALF mới',
              html,
              headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
            }),
          admin.email,
          'HalfWalletSubmitted',
        );
      }),
    );
  }

  async sendHalfWalletChangeRequestToAdmins(data: {
    admins: { email: string; fullName: string }[];
    userName: string;
    newWalletAddress: string;
    currentWalletAddress?: string;
    reason: string;
  }): Promise<void> {
    this.validateEmailConfig();
    await Promise.allSettled(
      data.admins.map(async (admin) => {
        const html = await render(
          HalfWalletChangeRequestAdminEmail({
            adminName: admin.fullName,
            userName: data.userName,
            newWalletAddress: data.newWalletAddress,
            currentWalletAddress: data.currentWalletAddress,
            reason: data.reason,
          }),
        );
        return this.sendEmailWithRetry(
          () =>
            this.resend.emails.send({
              from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
              to: admin.email,
              subject: '[ACTA HALF] Yêu cầu đổi ví HALF',
              html,
              headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
            }),
          admin.email,
          'HalfWalletChangeRequest',
        );
      }),
    );
  }

  async sendHalfWalletAdminStartedToUser(data: {
    userEmail: string;
    userName?: string;
    walletAddress: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      HalfWalletProcessingEmail({
        userName: data.userName,
        walletAddress: data.walletAddress,
      }),
    );
    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: '[ACTA HALF] Yêu cầu xác thực ví HALF đang được xử lý',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.userEmail,
      'HalfWalletAdminStarted',
    );
  }

  async sendHalfWalletProofUploadedToUser(data: {
    userEmail: string;
    userName?: string;
    walletAddress: string;
    amountSent: string;
    note?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      HalfWalletProofUploadedEmail({
        userName: data.userName,
        walletAddress: data.walletAddress,
        amountSent: data.amountSent,
        note: data.note,
      }),
    );
    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: '[ACTA HALF] Admin đã chuyển HALF – Vui lòng xác nhận',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.userEmail,
      'HalfWalletProofUploaded',
    );
  }

  async sendHalfTransferRequestedToAdmins(data: {
    admins: { email: string; fullName: string }[];
    userName: string;
    amount: string;
    userReason?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    await Promise.allSettled(
      data.admins.map(async (admin) => {
        const html = await render(
          HalfTransferRequestedAdminEmail({
            adminName: admin.fullName,
            userName: data.userName,
            amount: data.amount,
            userReason: data.userReason,
          }),
        );
        return this.sendEmailWithRetry(
          () =>
            this.resend.emails.send({
              from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
              to: admin.email,
              subject: '[ACTA HALF] Yêu cầu chuyển HALF mới',
              html,
              headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
            }),
          admin.email,
          'HalfTransferRequested',
        );
      }),
    );
  }

  async sendHalfTransferDecisionToUser(data: {
    userEmail: string;
    userName?: string;
    approved: boolean;
    reason?: string;
    amount?: string;
    walletAddress?: string;
    processedAt?: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      HalfTransferDecisionEmail({
        userName: data.userName,
        approved: data.approved,
        reason: data.reason,
        amount: data.amount,
        walletAddress: data.walletAddress,
        processedAt: data.processedAt,
      }),
    );
    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: data.approved
            ? '[ACTA HALF] Yêu cầu chuyển HALF được phê duyệt'
            : '[ACTA HALF] Yêu cầu chuyển HALF bị từ chối',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.userEmail,
      'HalfTransferDecision',
    );
  }

  async sendHalfManualSentToUser(data: {
    userEmail: string;
    userName?: string;
    amount: string;
    walletAddress: string;
    processedAt: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = await render(
      HalfManualSentEmail({
        userName: data.userName,
        amount: data.amount,
        walletAddress: data.walletAddress,
        processedAt: data.processedAt,
      }),
    );
    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: '[ACTA HALF] HALF đã được chuyển đến ví của bạn',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.userEmail,
      'HalfManualSent',
    );
  }

  async sendHalfWalletRejectedToUser(data: {
    userEmail: string;
    userName?: string;
    walletAddress: string;
    reason: string;
  }): Promise<void> {
    this.validateEmailConfig();
    const html = `<p>Xin chào ${data.userName ?? 'bạn'},</p><p>Yêu cầu xác thực ví HALF của bạn đã bị <b>từ chối</b>.</p><p>Địa chỉ ví: <b>${data.walletAddress}</b></p><p>Lý do: ${data.reason}</p><p>Bạn có thể gửi lại yêu cầu xác thực ví mới.</p><p>Cảm ơn bạn đã sử dụng dịch vụ ACTA!</p>`;
    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.userEmail,
          subject: '[ACTA HALF] Yêu cầu xác thực ví HALF bị từ chối',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.userEmail,
      'HalfWalletRejected',
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ĐIỆN KIẾN CHỦ (shrines.acta.vn) — 7 lá thư của luồng ghi danh
  //
  // ⚠ Mọi lời gọi đi qua `sendEmailWithRetry`. Resend RESOLVE chứ không throw khi
  // API lỗi (nó trả `{ data: null, error: {...} }`), nên gọi `resend.emails.send`
  // trần sẽ ghi log "sent successfully" trong khi lá thư rơi im lặng — và với một
  // lá thư XIN ĐỒNG Ý thì "im lặng" chính là thứ luật không chấp nhận.
  // ══════════════════════════════════════════════════════════════════════════

  /** Thư 1 — mời một thành viên ghi danh. */
  async sendShrineInvitationEmail(
    data: ShrineInvitationEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineInvitationEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Lời mời ghi danh ĐIỆN KIẾN CHỦ',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineInvitation',
    );
  }

  /**
   * Thư 1, bản gửi LÔ — dùng khi quản trị viên mời nhiều người một lượt.
   *
   * Trần của Resend là 2 request/giây và 100 thư mỗi lô, nên mời 100 người bằng
   * 100 lời gọi đơn sẽ ăn 429 từ người thứ ba trở đi. Khuôn ở đây giống hệt
   * `sendTvtcDailyDigestBatch`: render trước toàn bộ (lỗi render chỉ hạ một
   * người), gửi theo lô 100, nghỉ 600ms giữa hai lô, và KHÔNG throw — trả về sổ
   * `{ success, failed, errors }` để phía gọi ghi log chứ không hỏng nghiệp vụ.
   */
  async sendShrineInvitationBatch(
    entries: Array<ShrineInvitationEmailProps & { email: string }>,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    if (entries.length === 0) {
      return results;
    }

    this.validateEmailConfig();

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    const BATCH_SIZE = 100; // trần lô của Resend
    const THROTTLE_MS = 600; // ≥500ms giữa hai lô ⇒ ≤2 req/giây

    // Render TRƯỚC (CPU cục bộ, không gọi mạng) — lỗi render chỉ hạ đúng một người.
    const messages: Array<{
      from: string;
      to: string;
      subject: string;
      html: string;
      headers: Record<string, string>;
    }> = [];

    for (const entry of entries) {
      try {
        const html = await render(<ShrineInvitationEmail {...entry} />);
        messages.push({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: entry.email,
          subject: 'Lời mời ghi danh ĐIỆN KIẾN CHỦ',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.failed += 1;
        results.errors.push(`${entry.email}: dựng nội dung thư lỗi — ${message}`);
        this.logger.error(
          `[sendShrineInvitationBatch] Render thất bại cho ${entry.email}: ${message}`,
        );
      }
    }

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        await this.sendEmailWithRetry(
          () => this.resend.batch.send(batch),
          `batch of ${batch.length} member(s)`,
          'ShrineInvitationBatch',
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );
        results.success += batch.length;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.failed += batch.length;
        results.errors.push(
          `Lô ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} thư) gửi lỗi — ${message}`,
        );
        this.logger.error(
          `[sendShrineInvitationBatch] Lô ${Math.floor(i / BATCH_SIZE) + 1} thất bại: ${message}`,
        );
      }

      if (i + BATCH_SIZE < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      }
    }

    this.logger.log(
      `[sendShrineInvitationBatch] Đã gửi ${results.success}/${entries.length} thư mời ĐIỆN KIẾN CHỦ (${results.failed} lỗi)`,
    );
    return results;
  }

  /** Thư 2 — ngôi sao đã sáng (dùng cho cả hai chiều ghi danh). */
  async sendShrineEnrolledEmail(
    data: ShrineEnrolledEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineEnrolledEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Ngôi sao của bạn đã sáng trên ĐIỆN KIẾN CHỦ',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineEnrolled',
    );
  }

  /** Thư 3 — từ chối đơn xin ghi danh. */
  async sendShrineRejectedEmail(
    data: ShrineRejectedEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineRejectedEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Đơn xin ghi danh ĐIỆN KIẾN CHỦ chưa được duyệt',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineRejected',
    );
  }

  /** Thư 4 — quản trị viên sửa tên hiển thị. */
  async sendShrineRenamedEmail(
    data: ShrineRenamedEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineRenamedEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Tên hiển thị trên ĐIỆN KIẾN CHỦ đã được điều chỉnh',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineRenamed',
    );
  }

  /** Thư 5 — quản trị viên thu hồi ngôi sao. */
  async sendShrineRevokedEmail(
    data: ShrineRevokedEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineRevokedEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Ngôi sao trên ĐIỆN KIẾN CHỦ đã được thu hồi',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineRevoked',
    );
  }

  /** Thư 6 — biên nhận thành viên đã rút tên. */
  async sendShrineWithdrawnEmail(
    data: ShrineWithdrawnEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineWithdrawnEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: data.wasEnrolled
            ? 'Đã xoá tên bạn khỏi ĐIỆN KIẾN CHỦ'
            : 'Đã rút lại đơn xin ghi danh ĐIỆN KIẾN CHỦ',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineWithdrawn',
    );
  }

  /** Thư 7 — lời mời hết hạn. */
  async sendShrineInviteExpiredEmail(
    data: ShrineInviteExpiredEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineInviteExpiredEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Lời mời ghi danh ĐIỆN KIẾN CHỦ đã hết hạn',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineInviteExpired',
    );
  }

  /**
   * Thư 8 — ngôi sao tắt vì tài khoản rời trạng thái hoạt động.
   *
   * ⚠ Tiêu đề CỐ Ý không mang chữ "thu hồi" hay "xoá": ngôi sao chỉ tạm ẩn, tên
   * hiển thị vẫn được giữ và đồng ý cũ vẫn còn hiệu lực. Dùng chung câu chữ với
   * thư thu hồi sẽ làm thành viên tin là mình đã bị gỡ hẳn, rồi đi ghi danh lại
   * cho một ngôi sao vốn vẫn là của họ.
   */
  async sendShrineSuspendedEmail(
    data: ShrineSuspendedEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineSuspendedEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Ngôi sao của bạn trên ĐIỆN KIẾN CHỦ đã tạm tắt',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineSuspended',
    );
  }

  /** Thư 9 — ngôi sao sáng lại sau khi tài khoản hoạt động trở lại. */
  async sendShrineRestoredEmail(
    data: ShrineRestoredEmailProps & { email: string },
  ): Promise<void> {
    this.validateEmailConfig();
    const html = await render(<ShrineRestoredEmail {...data} />);

    await this.sendEmailWithRetry(
      () =>
        this.resend.emails.send({
          from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
          to: data.email,
          subject: 'Ngôi sao của bạn trên ĐIỆN KIẾN CHỦ đã sáng lại',
          html,
          headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
        }),
      data.email,
      'ShrineRestored',
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  THỔ ĐỊA — ĐỢT TẠO ĐIỂM CẦU TỪ HỒ SƠ KYC
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Thư báo "điểm cầu của bạn vừa được thêm lên bản đồ".
   *
   * ⚠ TRẢ VỀ `daGuiThat`, và bên gọi BẮT BUỘC phải đọc nó. Ngoài production mà
   * thiếu `MAIL_REDIRECT_TO` thì `mail-delivery.guard` KHÔNG gọi Resend, chỉ log
   * `[MAIL-SKIPPED]` rồi trả về id giả `mail-skipped-non-production` để bên gọi
   * "giữ được happy path". Một script backfill tin vào việc không có ngoại lệ sẽ
   * báo "đã gửi 2 224 thư" trong khi con số thật là 0 — đúng lớp lỗi số-0-im-lặng.
   * Cờ này là cách DUY NHẤT phân biệt hai tình huống đó từ bên ngoài.
   *
   * ⚠ `idempotencyKey` không tuỳ chọn cho vui: đợt backfill gửi hàng nghìn thư và
   * có thể phải chạy lại sau khi đứt giữa chừng. Khoá nên gắn với (người nhận +
   * điểm cầu) để lần chạy lại KHÔNG gửi lá thứ hai cho người đã nhận.
   */
  async sendDiemCauMoiEmail(data: {
    to: string;
    tenNguoiNhan: string;
    tenDiemCau: string;
    diaChiHienThi: string | null;
    thoiDiemTao: string;
    nguoiThucHien: string;
    slug: string | null;
    idempotencyKey?: string;
    /** Gắn tiền tố `[XEM THỬ]` vào tiêu đề khi gửi bản mẫu cho ban quản trị. */
    xemThu?: boolean;
  }): Promise<{ id: string | null; daGuiThat: boolean }> {
    // ⚠ Ba dòng này CỐ Ý gọi hàm thuần ở `tho-dia-lien-ket.helper.ts` thay vì
    // ghép chuỗi tại chỗ. Phép đột biến đã chứng minh: ghép tại chỗ thì việc bỏ
    // mất `?huong-dan=an-diem-cau` KHÔNG làm đỏ bài thử nào — thư vẫn gửi, nút
    // vẫn mở đúng trang, chỉ hướng dẫn là biến mất trong im lặng.
    const goc = gocThoDia();
    const duong_dan_quan_ly = duongDanQuanLyDiemCau(goc);
    const duong_dan_cong_khai = duongDanCongKhaiDiemCau(goc, data.slug);

    const html = await render(
      <DiemCauMoiEmail
        tenNguoiNhan={data.tenNguoiNhan}
        tenDiemCau={data.tenDiemCau}
        diaChiHienThi={data.diaChiHienThi}
        thoiDiemTao={data.thoiDiemTao}
        nguoiThucHien={data.nguoiThucHien}
        duongDanQuanLy={duong_dan_quan_ly}
        duongDanCongKhai={duong_dan_cong_khai}
        duongDanHuongDanPdf={URL_PDF_HUONG_DAN_AN_DIEM}
      />,
    );

    const tieu_de = diemCauMoiSubject({ tenDiemCau: data.tenDiemCau });
    const ket_qua = await this.resend.emails.send(
      {
        from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
        to: data.to,
        subject: data.xemThu ? `[XEM THỬ] ${tieu_de}` : tieu_de,
        html,
        headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
      },
      data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : undefined,
    );

    const id = ket_qua?.data?.id ?? null;
    return { id, daGuiThat: id !== null && id !== SKIPPED_EMAIL_ID };
  }

  /**
   * Thư tóm tắt đợt backfill, gửi ban quản trị. Đi kèm — chứ KHÔNG thay thế —
   * lá thư mẫu gửi riêng bằng `sendDiemCauMoiEmail({ xemThu: true })`.
   */
  async sendTomTatBackfillDiemCau(data: {
    admins: { email: string; fullName: string }[];
    cheDo: string;
    soDiemSeTao: number;
    cacLyDoBoQua: { lyDo: string; so: number }[];
    mayChuCsdl: string;
    thoiDiemChay: string;
  }): Promise<{ soGuiThat: number; cheDoGuiThu: string }> {
    const che_do_gui = resolveMailDeliveryMode();
    const giai_thich =
      che_do_gui === 'send'
        ? 'Thư đi thẳng tới hộp thư thật của người nhận.'
        : che_do_gui === 'redirect'
          ? 'Mọi thư được chuyển hướng về hộp thư thử nghiệm khai ở MAIL_REDIRECT_TO — người nhận thật KHÔNG nhận được gì.'
          : 'KHÔNG có thư nào được gửi đi. Đây là môi trường ngoài production và MAIL_REDIRECT_TO chưa được đặt, nên máy chủ bỏ qua mọi lời gọi gửi thư. Đặt MAIL_REDIRECT_TO rồi chạy lại nếu bạn cần nhìn thư thật.';

    const html = await render(
      <BackfillDiemCauTomTatEmail
        cheDo={data.cheDo}
        cheDoGuiThu={che_do_gui}
        giaiThichGuiThu={giai_thich}
        soDiemSeTao={data.soDiemSeTao}
        cacLyDoBoQua={data.cacLyDoBoQua}
        mayChuCsdl={data.mayChuCsdl}
        thoiDiemChay={data.thoiDiemChay}
      />,
    );

    let so_gui_that = 0;
    for (const admin of data.admins) {
      // Gửi TỪNG người một, không nhét cả danh sách vào `to`. `EmailService`
      // đã có sẵn cái bẫy ấy: ≤100 địa chỉ thì nó gộp thành một message và mọi
      // người nhìn thấy địa chỉ của nhau.
      const ket_qua = await this.resend.emails.send({
        from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
        to: admin.email,
        subject: backfillDiemCauTomTatSubject({ cheDo: data.cheDo }),
        html,
        headers: { 'Content-Language': 'vi', 'X-Language': 'Vietnamese' },
      });
      const id = ket_qua?.data?.id ?? null;
      if (id !== null && id !== SKIPPED_EMAIL_ID) so_gui_that += 1;
    }

    return { soGuiThat: so_gui_that, cheDoGuiThu: che_do_gui };
  }
}
