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
 * Một dòng "còn thiếu" trong bảng khoảng cách. Shape KHỚP
 * `CommitmentNearMissGapLine` (`commitment-near-miss-payload.service.ts`).
 *
 * ⚠ Template CHỈ trình bày, KHÔNG tính toán. `gap` đã được service tính từ
 * `appliedThresholds` của CHÍNH lượt đánh giá (engine trả kèm, §22) — tự trừ lại ở
 * đây sẽ đọc hằng chính sách hiện hành và in sai số cho member ngay khi ngưỡng đổi
 * giữa lúc mail đang chạy.
 */
export interface CommitmentNearMissGapLineProps {
  label: string;
  achieved: number;
  required: number;
  gap: number;
}

export interface CommitmentNearMissEmailProps {
  memberName: string;
  /** "04/08/2026" — ngày CUỐI CÙNG còn được tính vào kỳ (cycleEnd − 1ms). */
  cycleEndLabel: string;
  /** Số ngày còn lại, đã làm tròn LÊN và sàn ở 1 — không bao giờ in "0 ngày". */
  daysLeft: number;
  /** Mốc Sàn đang nhắm tới (mốc THẤP NHẤT chưa đạt — gần tầm với nhất). */
  targetTier: number;
  /** Mốc Sàn (VND) của `targetTier`. */
  floorVnd: number;
  /** Thu nhập nền tính quyết toán tới thời điểm quét (VND). */
  settlementBaseVnd: number;
  /**
   * Phần bù DỰ KIẾN nếu kịp chạm mốc = `max(0, floorVnd − settlementBaseVnd)`.
   *
   * ⚠ "NẾU kịp" và "DỰ KIẾN" là hai chữ bắt buộc: kỳ CHƯA đóng nên con số này còn
   * đổi, và quyết định phát phiếu vẫn là của quản trị viên (D-112-03). Hứa chắc một
   * số tiền trong mail cảnh báo rồi kỳ chốt ra số khác là sự cố niềm tin nặng hơn
   * hẳn việc không gửi mail.
   */
  potentialTopUpVnd: number;
  /** Các tiêu chí CÒN THIẾU, kèm khoảng cách đã tính sẵn. Luôn có ≥1 phần tử. */
  gaps: CommitmentNearMissGapLineProps[];
  /** Nhãn các tiêu chí ĐÃ đạt — để mail không chỉ toàn tin xấu. */
  metLabels: string[];
  /** Gợi ý hành động tiếng Việt, đã khớp đúng những tiêu chí đang thiếu. */
  actionHints: string[];
  /** Link tuyệt đối tới trang Khởi nghiệp cùng ACTA trên cổng affiliate. */
  overviewUrl: string;
  /** `null` khi không mint được token — chân mail KHÔNG hiện mục hủy (tránh nút chết). */
  unsubscribeUrl: string | null;
  /** Discriminator luật đang áp dụng — in ở chân mail để đối chiếu khi có tranh chấp. */
  criteriaVersion: number;
}

/** "15.000.000₫" — locale VN, không thập phân (mọi số tiền chính sách là đồng chẵn). */
const vnd = (value: number): string =>
  `${Math.round(value).toLocaleString('vi-VN')}₫`;

/**
 * CommitmentNearMissEmail (Phase 113, REV-6 D-R6-08 — P2 `near_miss_warning`).
 *
 * Mail CẢNH BÁO SẮP TRƯỢT: gửi khi kỳ của member sắp đóng mà họ CHƯA chạm Mốc Sàn
 * nào, trong lúc VẪN CÒN kịp hành động.
 *
 * ── Chủ ý biên tập (đây là lá mail dễ viết hỏng nhất của cả bộ) ──────────────────
 * Nó nói với member một tin xấu vào đúng lúc họ còn có thể đổi được kết cục, nên
 * ranh giới giữa "hữu ích" và "làm nản" rất mỏng. Ba luật viết:
 *  1. MỞ ĐẦU bằng cái đã LÀM ĐƯỢC (`metLabels`), không mở đầu bằng cái thiếu. Member
 *     nhận mail này đều đang cố gắng — họ đã qua cổng "có tiến độ" mới được gửi.
 *  2. Khoảng thiếu phải là SỐ CỤ THỂ ("còn 2 người"), không bao giờ là lời khuyên
 *     chung chung. Con số là thứ duy nhất biến mail thành hành động.
 *  3. KHÔNG hứa tiền. Khối tiền luôn đi kèm chữ "dự kiến" + "nếu kịp".
 *
 * ⚠ Mail này là TIẾP THỊ/NHẮC NHỞ (không nằm trong `COMMITMENT_TRANSACTIONAL_EMAIL_TYPES`)
 * nên chịu trần tần suất + `NotificationPreference`, và LUÔN có link hủy khi mint được
 * token. Đó là lý do khối hủy ở chân mail không được bỏ.
 */
export const CommitmentNearMissEmail = ({
  memberName = 'Quý thành viên',
  cycleEndLabel = '',
  daysLeft = 1,
  targetTier = 1,
  floorVnd = 0,
  settlementBaseVnd = 0,
  potentialTopUpVnd = 0,
  gaps = [],
  metLabels = [],
  actionHints = [],
  overviewUrl = '',
  unsubscribeUrl = null,
  criteriaVersion = 0,
}: CommitmentNearMissEmailProps) => {
  const dayText = `${daysLeft} ngày`;

  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Kỳ Khởi nghiệp cùng ACTA của bạn sắp khép lại</title>
      </Head>
      <Preview>
        {`Còn ${dayText}: bạn đang cách Mốc Sàn ${targetTier} không xa — xem cần bổ sung gì`}
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
            <Heading style={h1}>⏳ Còn {dayText} để chạm Mốc Sàn</Heading>

            <Text style={paragraph}>
              Chào <strong style={boldText}>{memberName}</strong>,
            </Text>

            {/* Luật 1: mở đầu bằng cái đã làm được. */}
            {metLabels.length > 0 ? (
              <Text style={paragraph}>
                Kỳ này bạn đã đạt{' '}
                <strong style={okText}>{metLabels.join(' · ')}</strong>. Bạn đang
                đi đúng hướng — chỉ còn thiếu một phần nữa là chạm Mốc Sàn{' '}
                {targetTier}.
              </Text>
            ) : (
              <Text style={paragraph}>
                Kỳ này của bạn đã có hoạt động, nhưng chưa đủ để chạm Mốc Sàn{' '}
                {targetTier}. Vẫn còn <strong style={boldText}>{dayText}</strong>{' '}
                để bổ sung.
              </Text>
            )}

            <Text style={paragraph}>
              Kỳ của bạn tính hết ngày{' '}
              <strong style={highlightText}>{cycleEndLabel}</strong>. Đơn hàng chỉ
              được tính khi đã <strong style={boldText}>hoàn tất xuất VAT</strong>{' '}
              trong kỳ, nên hãy trừ hao thời gian xử lý.
            </Text>

            {/* ── Khối 1: CÒN THIẾU ĐÚNG BAO NHIÊU ─────────────────────────── */}
            <Heading style={h2}>Bạn còn thiếu đúng bao nhiêu</Heading>
            <Section style={gapBox}>
              <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tiêu chí</th>
                    <th style={thStyleNum}>Đang có</th>
                    <th style={thStyleNum}>Cần</th>
                    <th style={thStyleNum}>Còn thiếu</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g) => (
                    <tr key={g.label}>
                      <td style={tdStyle}>{g.label}</td>
                      <td style={tdStyleNum}>{g.achieved}</td>
                      <td style={tdStyleNum}>{g.required}</td>
                      <td style={tdStyleGap}>+{g.gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Text style={legendText}>
                Cột “Còn thiếu” là số cần bổ sung THÊM từ giờ tới hết ngày{' '}
                {cycleEndLabel} để chạm Mốc Sàn {targetTier} ({vnd(floorVnd)}).
              </Text>
            </Section>

            {/* ── Khối 2: việc cần làm ────────────────────────────────────── */}
            {actionHints.length > 0 ? (
              <Section style={nextStepBox}>
                <Text style={nextStepTitle}>Việc nên làm ngay</Text>
                {actionHints.map((hint) => (
                  <Text key={hint} style={nextStepText}>
                    • {hint}
                  </Text>
                ))}
              </Section>
            ) : null}

            {/* ── Khối 3: tiền DỰ KIẾN (luật 3 — không hứa) ────────────────── */}
            <Heading style={h2}>Phần bù sàn dự kiến nếu bạn kịp</Heading>
            <Section style={detailsSection}>
              <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={tdLabel}>Thu nhập tính trong kỳ (tới hiện tại)</td>
                    <td style={tdValue}>{vnd(settlementBaseVnd)}</td>
                  </tr>
                  <tr>
                    <td style={tdLabel}>Mốc Sàn {targetTier}</td>
                    <td style={tdValue}>{vnd(floorVnd)}</td>
                  </tr>
                  <tr>
                    <td style={tdLabel}>
                      <strong style={boldText}>Phần bù dự kiến</strong>
                    </td>
                    <td style={tdValueStrong}>{vnd(potentialTopUpVnd)}</td>
                  </tr>
                </tbody>
              </table>
              <Text style={noteText}>
                Đây là con số <strong style={boldText}>dự kiến</strong> tại thời
                điểm gửi mail và sẽ còn thay đổi cho tới khi kỳ khép lại. Kỳ chốt
                xong, phiếu bù sàn được quản trị viên phát riêng — bạn sẽ nhận
                thông báo khi phiếu sẵn sàng.
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={overviewUrl}>
                Xem tiến độ chi tiết của bạn
              </Button>
            </Section>

            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                Đây là email tự động, gửi tối đa một lần mỗi kỳ và chỉ khi kỳ của
                bạn sắp khép lại mà chưa chạm Mốc Sàn (phiên bản tiêu chí{' '}
                {criteriaVersion}).
              </Text>
              {unsubscribeUrl ? (
                <Text style={footerInfoText}>
                  Không muốn nhận email nhắc tiến độ nữa?{' '}
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

export default CommitmentNearMissEmail;

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

const okText = {
  color: '#15803d',
  fontWeight: 'bold',
};

/** Hộp khoảng-thiếu dùng tông CAM (cảnh báo), KHÔNG đỏ: kỳ chưa mất, còn kịp. */
const gapBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '10px',
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

const thStyle = {
  textAlign: 'left' as const,
  fontSize: '13px',
  color: '#495057',
  borderBottom: '2px solid #b8860b',
  padding: '8px 6px',
};

const thStyleNum = {
  ...thStyle,
  textAlign: 'center' as const,
};

const tdStyle = {
  verticalAlign: 'top' as const,
  fontSize: '14px',
  padding: '10px 6px',
  borderBottom: '1px solid #dee2e6',
};

const tdStyleNum = {
  ...tdStyle,
  textAlign: 'center' as const,
};

const tdStyleGap = {
  ...tdStyleNum,
  color: '#b45309',
  fontWeight: 'bold',
};

const tdLabel = {
  fontSize: '14px',
  color: '#495057',
  padding: '6px 0',
};

const tdValue = {
  fontSize: '14px',
  textAlign: 'right' as const,
  padding: '6px 0',
};

const tdValueStrong = {
  ...tdValue,
  fontWeight: 'bold',
  color: '#b8860b',
};

const noteText = {
  fontSize: '13px',
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

const nextStepTitle = {
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#1e3a8a',
  margin: '0 0 8px 0',
};

const nextStepText = {
  fontSize: '15px',
  margin: '0 0 6px 0',
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

const legendText = {
  fontSize: '12px',
  color: '#6c757d',
  margin: '12px 0 0 0',
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
