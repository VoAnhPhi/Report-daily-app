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

/**
 * Props mail CHÚC MỪNG người vừa được công nhận "Thành viên tích cực" (TVTC).
 *
 * ⚠ Template CHỈ trình bày, KHÔNG tính toán (cùng luật với `CommitmentCycleRecapEmail`):
 * `capHitDays` / `requiredCapHitDays` / `windowDays` đều được service lấy từ
 * `criteriaSnapshot` BẤT BIẾN của danh hiệu (§22) hoặc từ hằng chính sách. Tự đọc lại
 * hằng ở đây sẽ in sai luật cho những danh hiệu cấp trước một lần đổi ngưỡng.
 */
export interface CommitmentTvtcAwardedSelfEmailProps {
  memberName: string;
  /** Ngày cấp danh hiệu, đã format giờ VN ở service (vd "21/07/2026"). */
  awardedDateLabel: string;
  /**
   * Số ngày chạm trần thưởng đào tạo ghi trong bằng chứng bất biến của danh hiệu.
   * `null` = ảnh chụp đời cũ không mang trường này ⇒ mail bỏ hẳn dòng số liệu thay vì
   * in một con số bịa.
   */
  capHitDays: number | null;
  /** Ngưỡng ĐK2 tại thời điểm cấp (hằng `TVTC_CAP_HIT_DAYS_REQUIRED`). */
  requiredCapHitDays: number;
  /** Độ dài cửa sổ TRƯỢT của ĐK2 (hằng `TVTC_CAP_HIT_WINDOW_DAYS`). */
  windowDays: number;
  /** Link tuyệt đối tới trang "Khởi nghiệp cùng ACTA" trên cổng affiliate. */
  overviewUrl: string;
  /**
   * Link hủy nhận mail — với mail GIAO DỊCH luôn là `null` và chân mail KHÔNG render
   * mục hủy (bấm xong vẫn nhận mail = hứa suông, xem `CommitmentEmailRecipient`).
   */
  unsubscribeUrl: string | null;
}

/**
 * CommitmentTvtcAwardedSelfEmail (Phase 113, REV-6 D-R6-08 · P1) — mail gửi CHÍNH
 * NGƯỜI vừa đạt danh hiệu TVTC, ngay sau lượt cấp hằng đêm.
 *
 * Chủ ý biên tập: trước REV-6, việc cấp danh hiệu CHỈ đi vào digest của admin
 * (`tvtc-badge-mint.cron.ts` → `sendTvtcDailyDigestBatch`) — người đạt được không hề
 * biết. Mail này trả lời đúng ba câu member sẽ hỏi ngay khi nhận:
 *   (1) tôi vừa đạt cái gì, (2) tôi đạt nhờ đâu (hai điều kiện, có số liệu thật của
 *   chính họ), (3) đạt rồi thì được gì.
 *
 * ⚠ Từ ngữ về quyền lợi phải giữ mức "được ghi nhận / được tính vào tiêu chí" — TVTC
 * là DANH HIỆU, không phải một khoản tiền. Việc ghi-nhận-tiền cho tuyến trên do money
 * reader tính theo kỳ kết nạp và còn phụ thuộc đơn hàng trong kỳ; hứa tiền ở đây rồi
 * kỳ đó không phát sinh gì là một sự cố niềm tin.
 */
export const CommitmentTvtcAwardedSelfEmail = ({
  memberName = 'Quý thành viên',
  awardedDateLabel = '',
  capHitDays = null,
  requiredCapHitDays = 0,
  windowDays = 0,
  overviewUrl = '',
  unsubscribeUrl = null,
}: CommitmentTvtcAwardedSelfEmailProps) => (
  <Html lang="vi">
    <Head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Chúc mừng bạn trở thành Thành viên tích cực</title>
    </Head>
    <Preview>
      🏅 Bạn đã được công nhận Thành viên tích cực (TVTC) — danh hiệu trọn đời
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
          <Heading style={h1}>
            🏅 Chúc mừng — Bạn là Thành viên tích cực!
          </Heading>

          <Text style={paragraph}>
            Chào <strong style={boldText}>{memberName}</strong>,
          </Text>

          <Section style={celebrateBox}>
            <Text style={celebrateHeadline}>
              Ngày {awardedDateLabel}, bạn đã chính thức được công nhận{' '}
              <strong style={boldText}>Thành viên tích cực (TVTC)</strong>.
            </Text>
            <Text style={noteText}>
              Đây là danh hiệu <strong style={boldText}>trọn đời</strong> — đã
              đạt là giữ mãi, bạn không cần duy trì hay đăng ký lại.
            </Text>
          </Section>

          {/* ── Vì sao bạn đạt: HAI điều kiện, kèm số liệu thật ────────────── */}
          <Heading style={h2}>Bạn đã đạt nhờ đâu?</Heading>
          <Section style={detailsSection}>
            <Text style={paragraph}>
              Danh hiệu TVTC được xét tự động hằng đêm cho mọi thành viên đang
              hoạt động. Có <strong style={boldText}>hai điều kiện</strong>, và
              bạn đã thỏa cả hai:
            </Text>
            <table style={tableStyle} cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={tdCriterion}>
                    <strong style={boldText}>Điều kiện 1.</strong> Có ít nhất{' '}
                    <strong style={boldText}>1 thành viên tuyến F1</strong> (do
                    bạn giới thiệu trực tiếp) đang hoạt động và đã hoàn tất định
                    danh KYC.
                  </td>
                  <td style={tdCheck}>✓</td>
                </tr>
                <tr>
                  <td style={tdCriterion}>
                    <strong style={boldText}>Điều kiện 2.</strong> Có từ{' '}
                    <strong style={boldText}>{requiredCapHitDays} ngày</strong>{' '}
                    trở lên chạm trần thưởng đào tạo, tính trong{' '}
                    <strong style={boldText}>{windowDays} ngày</strong> gần nhất
                    {/* "không cần liên tiếp" chỉ có nghĩa khi ngưỡng ≥ 2 ngày —
                        với ngưỡng 1 (OP 2026-09-10) không có gì để liên tiếp, in ra
                        chỉ khiến người đọc tưởng còn một luật ẩn nào đó. Rẽ nhánh
                        theo CHÍNH ngưỡng nhận được, KHÔNG hardcode con số. */}
                    {requiredCapHitDays > 1 ? ' (các ngày không cần liên tiếp)' : ''}
                    .
                    {capHitDays === null ? null : (
                      <>
                        {' '}
                        Số ngày ghi nhận của bạn:{' '}
                        <strong style={highlightText}>{capHitDays} ngày</strong>.
                      </>
                    )}
                  </td>
                  <td style={tdCheck}>✓</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* ── Đạt rồi thì được gì ───────────────────────────────────────── */}
          <Heading style={h2}>Danh hiệu này mang lại điều gì?</Heading>
          <Section style={detailsSection}>
            <Text style={bulletText}>
              • <strong style={boldText}>Giữ trọn đời.</strong> Danh hiệu không
              hết hạn và không bị thu hồi khi bạn tạm nghỉ một thời gian.
            </Text>
            <Text style={bulletText}>
              • <strong style={boldText}>Đóng góp cho đội nhóm.</strong> Khi bạn
              có đơn hàng hoàn thành trong kỳ, bạn được tính vào tiêu chí “TVTC
              có mua trong kỳ” của người giới thiệu bạn — trực tiếp giúp tuyến
              trên tiến gần Mốc Sàn hơn.
            </Text>
            <Text style={bulletText}>
              • <strong style={boldText}>Được ghi nhận công khai.</strong> Bạn
              xuất hiện trong danh sách Thành viên tích cực của tuyến trên và
              trong số liệu đội ngũ trên trang Khởi nghiệp cùng ACTA.
            </Text>
            <Text style={legendText}>
              Danh hiệu TVTC độc lập với việc bạn đã ghi danh chương trình “Khởi
              nghiệp cùng ACTA” hay chưa — bạn giữ danh hiệu trong cả hai trường
              hợp.
            </Text>
          </Section>

          <Section style={nextStepBox}>
            <Text style={nextStepText}>
              Bước tiếp theo: hãy tiếp tục đồng hành cùng tuyến dưới của bạn.
              Mỗi người trong tuyến F1 trở thành TVTC là một bậc tiến của cả đội
              nhóm — và bạn sẽ nhận được email báo ngay khi điều đó xảy ra.
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaButton} href={overviewUrl}>
              Xem trang Khởi nghiệp cùng ACTA
            </Button>
          </Section>

          <Section style={footerInfoSection}>
            <Text style={footerInfoText}>
              Đây là email tự động, gửi MỘT LẦN duy nhất vào lần đầu bạn được
              công nhận Thành viên tích cực.
            </Text>
            {unsubscribeUrl ? (
              <Text style={footerInfoText}>
                Không muốn nhận email nhắc nhở của chương trình nữa?{' '}
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

export default CommitmentTvtcAwardedSelfEmail;

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
  color: '#b8860b',
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

const celebrateBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '10px',
};

const celebrateHeadline = {
  fontSize: '17px',
  color: '#92400e',
  margin: '0 0 10px 0',
};

const noteText = {
  fontSize: '13px',
  color: '#6c757d',
  margin: '12px 0 0 0',
};

const detailsSection = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '10px',
  border: '1px solid #dee2e6',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tdCriterion = {
  verticalAlign: 'top' as const,
  fontSize: '14px',
  padding: '10px 6px',
  borderBottom: '1px solid #dee2e6',
};

const tdCheck = {
  verticalAlign: 'top' as const,
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#15803d',
  textAlign: 'center' as const,
  width: '36px',
  padding: '10px 6px',
  borderBottom: '1px solid #dee2e6',
};

const bulletText = {
  fontSize: '14px',
  margin: '0 0 10px 0',
};

const legendText = {
  fontSize: '12px',
  color: '#6c757d',
  margin: '12px 0 0 0',
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
