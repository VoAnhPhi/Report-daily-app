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

export interface CommitmentEnrollmentPausedEmailProps {
  memberName: string;
  /** "21/07/2026" — ngày quản trị viên tạm dừng, giờ VN. */
  pausedAtLabel: string;
  /** Số thứ tự kỳ MEMBER đọc được (đã +1 từ `cycleIndex` zero-based). */
  cycleOrdinal: number;
  /** "05/07/2026" — 00:00 VN mở kỳ đang diễn ra lúc bị tạm dừng. */
  cycleStartLabel: string;
  /** "04/08/2026" — ngày CUỐI CÙNG còn tính của kỳ đó (cửa sổ nửa-mở). */
  cycleEndLabel: string;
  /**
   * Ghi chú quản trị viên nhập khi tạm dừng, hoặc `null`.
   *
   * ⚠ `null` ⇒ KHÔNG render khối ghi chú. Một khối "Ghi chú từ quản trị viên:" rỗng
   * còn khó hiểu hơn là không có khối nào — member sẽ đọc nó thành "họ có nói gì đó
   * mà mail bị mất".
   */
  adminNote: string | null;
  /** Link tuyệt đối tới trang Khởi nghiệp cùng ACTA trên cổng affiliate. */
  overviewUrl: string;
  /**
   * Link hủy nhận mail, `null` khi mail được xếp GIAO DỊCH (hoặc mint token hỏng) —
   * chân mail sẽ KHÔNG hiện mục hủy thay vì hiện một nút chết.
   */
  unsubscribeUrl: string | null;
}

/**
 * CommitmentEnrollmentPausedEmail (Phase 113, REV-6 D-R6-08) — báo member biết ghi
 * danh "Khởi nghiệp cùng ACTA" của họ vừa bị quản trị viên TẠM DỪNG.
 *
 * ⚠⚠ VÌ SAO LÁ MAIL NÀY TỒN TẠI: trước REV-6, pause/resume im lặng HOÀN TOÀN
 * (`commitment-admin.service.ts` — chỉ `applyEnd` có notify). Member bị tạm dừng vẫn
 * thấy trang cam kết, vẫn bán hàng, vẫn đếm đủ ba tiêu chí — rồi tới ngày mốc neo
 * KHÔNG có phiếu bù sàn nào và không có lời giải thích nào. Họ tin là hệ thống lỗi.
 * Đây là lý do mail này được đối xử GIAO DỊCH dù nó không mang hạn chót nào.
 *
 * Chủ ý biên tập — trả lời ĐÚNG ba câu hỏi, theo thứ tự member hỏi:
 *   (1) chuyện gì vừa xảy ra, (2) tôi mất gì và KHÔNG mất gì, (3) làm sao để trở lại.
 * Câu (2) phải nêu cả phần KHÔNG mất (danh hiệu TVTC trọn đời, tuyến dưới) — bỏ nó đi
 * thì "tạm dừng" đọc như "xoá sổ", và member sẽ ngừng hoạt động thật.
 *
 * ⚠ KHÔNG nêu LÝ DO tạm dừng ngoài phần `adminNote` do chính quản trị viên gõ. Hệ
 * thống KHÔNG lưu lý do có cấu trúc; đoán một lý do trong mail là nói sai thay mặt
 * quản trị viên, và member sẽ trích lại nó khi khiếu nại.
 */
export const CommitmentEnrollmentPausedEmail = ({
  memberName = 'Quý thành viên',
  pausedAtLabel = '',
  cycleOrdinal = 0,
  cycleStartLabel = '',
  cycleEndLabel = '',
  adminNote = null,
  overviewUrl = '',
  unsubscribeUrl = null,
}: CommitmentEnrollmentPausedEmailProps) => {
  const cycleLabel = `${cycleStartLabel} – ${cycleEndLabel}`;

  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ghi danh Khởi nghiệp cùng ACTA đã tạm dừng</title>
      </Head>
      <Preview>
        {`Ghi danh Khởi nghiệp cùng ACTA của bạn đã tạm dừng từ ngày ${pausedAtLabel}`}
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
            <Heading style={h1}>Ghi danh của bạn đang tạm dừng</Heading>

            <Text style={paragraph}>
              Chào <strong style={boldText}>{memberName}</strong>,
            </Text>
            <Text style={paragraph}>
              Quản trị viên đã <strong style={boldText}>tạm dừng</strong> ghi
              danh “Khởi nghiệp cùng ACTA” của bạn từ ngày{' '}
              <strong style={highlightText}>{pausedAtLabel}</strong>, trong kỳ
              thứ {cycleOrdinal} ({cycleLabel}).
            </Text>

            {/* ── Khối 1: ghi chú của quản trị viên (nếu có) ───────────────── */}
            {adminNote ? (
              <Section style={noteBox}>
                <Text style={noteBoxTitle}>Ghi chú từ quản trị viên</Text>
                <Text style={noteBoxBody}>{adminNote}</Text>
              </Section>
            ) : null}

            {/* ── Khối 2: hệ quả — mất gì, KHÔNG mất gì ────────────────────── */}
            <Heading style={h2}>Điều này có nghĩa là gì</Heading>
            <Section style={impactBox}>
              <Text style={impactMiss}>
                • Trong thời gian tạm dừng, các kỳ của bạn{' '}
                <strong style={boldText}>không được đối soát</strong>, nên bạn
                sẽ không nhận phiếu bù sàn cho những kỳ đó — kể cả kỳ thứ{' '}
                {cycleOrdinal} đang diễn ra.
              </Text>
              <Text style={impactKeep}>
                • Danh hiệu{' '}
                <strong style={boldText}>Thành viên tích cực (TVTC)</strong> bạn
                đã có là trọn đời, <strong style={boldText}>không</strong> bị ảnh
                hưởng.
              </Text>
              <Text style={impactKeep}>
                • Tuyến dưới, đơn hàng và hoa hồng của bạn vẫn được ghi nhận bình
                thường. Chỉ riêng quyền lợi bù sàn của chính sách này tạm ngưng.
              </Text>
            </Section>

            {/* ── Khối 3: làm sao để trở lại ───────────────────────────────── */}
            <Section style={nextStepBox}>
              <Text style={nextStepText}>
                Để được xem xét khôi phục, bạn vui lòng liên hệ quản trị viên
                hoặc người phụ trách đã kết nạp bạn. Khi ghi danh hoạt động trở
                lại, bạn sẽ nhận một email xác nhận kèm mốc thời gian quyền lợi
                được tính lại.
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

export default CommitmentEnrollmentPausedEmail;

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
  color: '#b45309',
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

const impactBox = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '10px',
  border: '1px solid #dee2e6',
};

const impactMiss = {
  fontSize: '15px',
  color: '#b45309',
  margin: '0 0 10px 0',
};

const impactKeep = {
  fontSize: '15px',
  color: '#15803d',
  margin: '0 0 10px 0',
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
