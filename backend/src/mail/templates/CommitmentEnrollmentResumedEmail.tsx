import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Img,
  Button,
  Link,
} from '@react-email/components';

export interface CommitmentEnrollmentResumedEmailProps {
  memberName: string;
  /** "24/07/2026" — ngày quản trị viên khôi phục, giờ VN. */
  resumedAtLabel: string;
  /**
   * Số thứ tự kỳ ĐANG MỞ tại thời điểm khôi phục (đã +1 từ `cycleIndex`).
   * ⚠ Đây là kỳ BỊ BỎ QUA, không phải kỳ được hưởng — xem doc-comment lớp.
   */
  cycleOrdinal: number;
  /** "05/07/2026" — 00:00 VN mở kỳ đang dở đó. */
  cycleStartLabel: string;
  /** "04/08/2026" — ngày cuối còn tính của kỳ đang dở đó. */
  cycleEndLabel: string;
  /** Số thứ tự kỳ ĐẦU TIÊN được tính quyền lợi trở lại (`cycleOrdinal + 1`). */
  nextCycleOrdinal: number;
  /** "05/08/2026" — 00:00 VN mở kỳ được tính quyền lợi trở lại. */
  nextCycleStartLabel: string;
  /** Ghi chú quản trị viên khi khôi phục, hoặc `null` ⇒ KHÔNG render khối ghi chú. */
  adminNote: string | null;
  /** Link tuyệt đối tới trang Khởi nghiệp cùng ACTA trên cổng affiliate. */
  overviewUrl: string;
  /** Link hủy nhận mail, `null` ⇒ KHÔNG render mục hủy (tránh nút chết). */
  unsubscribeUrl: string | null;
}

/**
 * CommitmentEnrollmentResumedEmail (Phase 113, REV-6 D-R6-08) — báo member ghi danh
 * "Khởi nghiệp cùng ACTA" đã hoạt động trở lại.
 *
 * ⚠⚠ ĐIỂM SỐNG-CÒN CỦA LÁ MAIL NÀY LÀ KỲ BỊ BỎ QUA, KHÔNG PHẢI LỜI CHÚC MỪNG.
 * `applyResume` đặt `lastReconciledCycleIndex = currentIndex` (D-94-J, forfeit marker
 * tính SERVER-SIDE), nên vòng catch-up của cron đối soát chạy 0 vòng: kỳ ĐANG MỞ tại
 * thời điểm khôi phục — cùng mọi kỳ đã trôi qua trong lúc tạm dừng — KHÔNG được đối
 * soát và KHÔNG bao giờ sinh phiếu bù sàn. Đây là hành vi CÓ CHỦ Ý của chính sách,
 * không phải lỗi.
 *
 * Một mail "chúc mừng, bạn đã trở lại" không nói điều đó sẽ tạo ra đúng khiếu nại tốn
 * kém nhất của cả chính sách: member hoạt động hết sức trong kỳ đang mở, tới ngày mốc
 * neo không thấy phiếu, và họ có trong tay một lá mail của chính hệ thống nói rằng họ
 * đã hoạt động trở lại. Vì vậy mốc "quyền lợi tính lại từ kỳ nào" được đặt ở khối
 * riêng, có viền cảnh báo, TRƯỚC mọi lời khích lệ.
 *
 * ⚠ KHÔNG in ba tiêu chí/ngưỡng ở đây: kỳ mới chưa chạy nên mọi con số sẽ là 0, và
 * ngưỡng phải đọc từ ảnh chụp của kỳ đó (§22) — thứ chưa tồn tại. Trang cam kết là nơi
 * duy nhất nói đúng chuyện đó, nên mail dẫn về trang.
 */
export const CommitmentEnrollmentResumedEmail = ({
  memberName = 'Quý thành viên',
  resumedAtLabel = '',
  cycleOrdinal = 0,
  cycleStartLabel = '',
  cycleEndLabel = '',
  nextCycleOrdinal = 0,
  nextCycleStartLabel = '',
  adminNote = null,
  overviewUrl = '',
  unsubscribeUrl = null,
}: CommitmentEnrollmentResumedEmailProps) => {
  const cycleLabel = `${cycleStartLabel} – ${cycleEndLabel}`;

  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ghi danh Khởi nghiệp cùng ACTA đã hoạt động trở lại</title>
      </Head>
      <Preview>
        {`Ghi danh của bạn đã hoạt động trở lại — quyền lợi tính từ kỳ thứ ${nextCycleOrdinal} (${nextCycleStartLabel})`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA Logo"
              width="150"
              height="auto"
              style={logoImage}
            />
          </Section>

          <Section style={content}>
            <Heading style={h1}>Ghi danh của bạn đã hoạt động trở lại</Heading>

            <Text style={paragraph}>
              Chào <strong style={boldText}>{memberName}</strong>,
            </Text>
            <Text style={paragraph}>
              Quản trị viên đã <strong style={boldText}>khôi phục</strong> ghi
              danh “Khởi nghiệp cùng ACTA” của bạn từ ngày{' '}
              <strong style={highlightText}>{resumedAtLabel}</strong>.
            </Text>

            {/* ── Khối 1: mốc quyền lợi — ĐẶT TRƯỚC mọi lời khích lệ ────────── */}
            <Section style={warningBox}>
              <Text style={warningTitle}>
                Quyền lợi bù sàn được tính lại từ kỳ thứ {nextCycleOrdinal}
              </Text>
              <Text style={warningBody}>
                Kỳ thứ {cycleOrdinal} ({cycleLabel}) đang dở khi bạn được khôi
                phục, nên kỳ này —{' '}
                <strong style={boldText}>
                  cùng mọi kỳ đã trôi qua trong thời gian tạm dừng
                </strong>{' '}
                — không được đối soát và không phát sinh phiếu bù sàn.
              </Text>
              <Text style={warningBody}>
                Kỳ đầu tiên được tính quyền lợi trở lại là{' '}
                <strong style={boldText}>
                  kỳ thứ {nextCycleOrdinal}, bắt đầu ngày {nextCycleStartLabel}
                </strong>
                .
              </Text>
            </Section>

            {/* ── Khối 2: ghi chú của quản trị viên (nếu có) ───────────────── */}
            {adminNote ? (
              <Section style={noteBox}>
                <Text style={noteBoxTitle}>Ghi chú từ quản trị viên</Text>
                <Text style={noteBoxBody}>{adminNote}</Text>
              </Section>
            ) : null}

            {/* ── Khối 3: việc cần làm ─────────────────────────────────────── */}
            <Heading style={h2}>Việc cần làm ngay</Heading>
            <Section style={nextStepBox}>
              <Text style={nextStepText}>
                Hãy mở trang “Khởi nghiệp cùng ACTA” để xem ba tiêu chí và mốc
                thời gian của kỳ thứ {nextCycleOrdinal}. Các số liệu trên trang
                luôn là bản chính xác nhất; email chỉ báo trạng thái.
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={overviewUrl}>
                Xem trang Khởi nghiệp cùng ACTA
              </Button>
            </Section>

            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                Đây là email tự động, gửi khi trạng thái ghi danh của bạn thay
                đổi.
              </Text>
              {unsubscribeUrl ? (
                <Text style={footerInfoText}>
                  Không muốn nhận email thông báo này nữa?{' '}
                  <Link style={unsubscribeLink} href={unsubscribeUrl}>
                    Hủy nhận email
                  </Link>
                  . Các thông báo về phiếu bù sàn và hạn nhận phiếu vẫn được gửi
                  vì liên quan trực tiếp tới quyền lợi của bạn.
                </Text>
              ) : null}
            </Section>
          </Section>

          <Section style={bottomFooter}>
            <Text style={bottomFooterText}>
              © 2024 Liên minh Cộng đồng thực chiến (ACTA)
              <br />
              Email này được gửi tự động, vui lòng không reply.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CommitmentEnrollmentResumedEmail;

const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: 'Arial, sans-serif',
  lineHeight: '1.6',
  color: '#333',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
};

const header = {
  padding: '30px 40px',
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
  borderRadius: '12px 12px 0 0',
};

const logoImage = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  backgroundColor: '#f8f9fa',
  padding: '30px',
  borderRadius: '10px',
  border: '1px solid #e9ecef',
};

const h1 = {
  color: '#15803d',
  textAlign: 'center' as const,
  marginBottom: '25px',
  fontSize: '22px',
};

const h2 = {
  color: '#495057',
  fontSize: '17px',
  marginTop: '28px',
  marginBottom: '12px',
};

const paragraph = {
  fontSize: '16px',
  marginBottom: '20px',
};

const boldText = {
  fontWeight: 'bold',
};

const highlightText = {
  color: '#b8860b',
  fontWeight: 'bold',
};

const warningBox = {
  backgroundColor: '#fff7ed',
  border: '1px solid #fdba74',
  borderRadius: '8px',
  padding: '18px',
  marginBottom: '10px',
};

const warningTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#b45309',
  margin: '0 0 10px 0',
};

const warningBody = {
  fontSize: '15px',
  margin: '0 0 10px 0',
};

const noteBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '10px',
};

const noteBoxTitle = {
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 6px 0',
};

const noteBoxBody = {
  fontSize: '15px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const nextStepBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '18px',
  marginBottom: '10px',
};

const nextStepText = {
  fontSize: '15px',
  margin: '0',
  color: '#1e3a8a',
};

const ctaSection = {
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '10px',
};

const ctaButton = {
  backgroundColor: '#b8860b',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
};

const footerInfoSection = {
  fontSize: '14px',
  color: '#6c757d',
  textAlign: 'center' as const,
  borderTop: '1px solid #dee2e6',
  paddingTop: '20px',
  marginTop: '20px',
};

const footerInfoText = {
  margin: '0 0 10px 0',
  fontSize: '13px',
};

const unsubscribeLink = {
  color: '#6c757d',
  textDecoration: 'underline',
};

const bottomFooter = {
  textAlign: 'center' as const,
  marginTop: '30px',
  fontSize: '12px',
  color: '#6c757d',
};

const bottomFooterText = {
  margin: '0',
};
