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

/** Một dòng tuyến dưới vừa đạt TVTC trong bảng liệt kê. */
export interface CommitmentTvtcUplineDownlineLineProps {
  /** Tên hiển thị, đã fallback ở service khi user thiếu `fullName`. */
  fullName: string;
  /** Mã giới thiệu (`referenceId`) — thứ tuyến trên dùng để nhận ra người của mình. */
  referenceId: string;
}

/**
 * Props mail BÁO TUYẾN TRÊN rằng có tuyến dưới vừa thành TVTC.
 *
 * ⚠⚠ Đây là mail GỘP (aggregate): MỘT lá cho MỘT tuyến trên trong MỘT ngày, liệt kê
 * TẤT CẢ tuyến dưới mới đạt TVTC hôm đó. Một tuyến trên có thể có hàng chục người lên
 * TVTC cùng một đêm (đặc biệt ở lần quét backfill đầu tiên) — gửi rời từng sự kiện là
 * spam thẳng vào hộp thư. Việc gộp được ép ở HAI tầng: service thu gom trước khi gửi,
 * và khoá `(userId, emailType, cycleIndex)` của sổ mail với `cycleIndex` = sentinel
 * theo SỐ HIỆU NGÀY (`commitmentEmailWindowSentinel`) chỉ cho đúng một lá mỗi ngày.
 *
 * Template CHỈ trình bày: `totalCount` / `hiddenCount` do service tính, KHÔNG suy ra
 * từ `downlines.length` ở đây (danh sách đã bị cắt bớt có chủ ý cho mail dài).
 */
export interface CommitmentTvtcAwardedUplineEmailProps {
  /** Tên tuyến trên — NGƯỜI NHẬN lá mail này. */
  uplineName: string;
  /** Ngày cấp danh hiệu, đã format giờ VN ở service (vd "21/07/2026"). */
  awardedDateLabel: string;
  /** TỔNG số tuyến dưới mới đạt TVTC hôm nay (kể cả phần không liệt kê). */
  totalCount: number;
  /** Danh sách hiển thị, ĐÃ cắt ở service. */
  downlines: CommitmentTvtcUplineDownlineLineProps[];
  /** Số người còn lại không liệt kê (`0` ⇒ không render dòng "và N người khác"). */
  hiddenCount: number;
  /** Link tuyệt đối tới trang "Khởi nghiệp cùng ACTA" trên cổng affiliate. */
  overviewUrl: string;
  /** Link hủy nhận mail; `null` ⇒ KHÔNG render mục hủy (tránh nút chết). */
  unsubscribeUrl: string | null;
}

/**
 * CommitmentTvtcAwardedUplineEmail (Phase 113, REV-6 D-R6-08 · P1) — mail báo tuyến
 * trên khi tuyến dưới TRỰC TIẾP (F1) của họ được công nhận TVTC.
 *
 * Chủ ý biên tập: trước REV-6, thông tin này chỉ tồn tại trong digest của admin
 * (`tvtc-badge-mint.cron.ts` đã giải sẵn tuyến trên CHỈ để in bảng cho admin xem).
 * Người hưởng lợi trực tiếp — tuyến trên — hoàn toàn không biết. Mail này vừa là tin
 * vui vừa là lời nhắc hành động: TVTC F1 chỉ được tính vào tiêu chí Mốc Sàn của kỳ
 * KHI người đó có đơn hàng hoàn thành TRONG KỲ, nên việc cần làm là đồng hành tiếp,
 * không phải ngồi đợi.
 *
 * ⚠ KHÔNG hứa tiền: mail nói "được tính vào tiêu chí", không nói "bạn sẽ nhận thêm X".
 */
export const CommitmentTvtcAwardedUplineEmail = ({
  uplineName = 'Quý thành viên',
  awardedDateLabel = '',
  totalCount = 0,
  downlines = [],
  hiddenCount = 0,
  overviewUrl = '',
  unsubscribeUrl = null,
}: CommitmentTvtcAwardedUplineEmailProps) => (
  <Html lang="vi">
    <Head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Tuyến dưới của bạn vừa trở thành Thành viên tích cực</title>
    </Head>
    {/* `Preview` chỉ nhận CHUỖI (children kiểu `ReactNode & string`) — nội suy số
        trực tiếp trong JSX sẽ vỡ kiểu, nên ghép sẵn thành một chuỗi. */}
    <Preview>{`🎉 ${totalCount} thành viên tuyến dưới của bạn vừa được công nhận Thành viên tích cực`}</Preview>
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
          <Heading style={h1}>🎉 Đội nhóm của bạn vừa lớn thêm</Heading>

          <Text style={paragraph}>
            Chào <strong style={boldText}>{uplineName}</strong>,
          </Text>

          <Section style={celebrateBox}>
            <Text style={celebrateHeadline}>
              Ngày {awardedDateLabel}, có{' '}
              <strong style={boldText}>{totalCount} thành viên</strong> trong
              tuyến F1 của bạn được công nhận{' '}
              <strong style={boldText}>Thành viên tích cực (TVTC)</strong>.
            </Text>
          </Section>

          {/* ── Danh sách người vừa đạt ────────────────────────────────────── */}
          <Heading style={h2}>Những người vừa được công nhận</Heading>
          <Section style={detailsSection}>
            <table style={tableStyle} cellPadding={0} cellSpacing={0}>
              <thead>
                <tr>
                  <th style={thStyle}>Thành viên</th>
                  <th style={thStyleRight}>Mã giới thiệu</th>
                </tr>
              </thead>
              <tbody>
                {downlines.map((d) => (
                  <tr key={d.referenceId}>
                    <td style={tdStyle}>{d.fullName}</td>
                    <td style={tdStyleRight}>{d.referenceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hiddenCount > 0 ? (
              <Text style={legendText}>
                … và {hiddenCount} thành viên khác. Xem đầy đủ trên trang Khởi
                nghiệp cùng ACTA.
              </Text>
            ) : null}
          </Section>

          {/* ── Điều này có nghĩa gì với bạn ───────────────────────────────── */}
          <Heading style={h2}>Điều này có nghĩa gì với bạn?</Heading>
          <Section style={detailsSection}>
            <Text style={bulletText}>
              • Thành viên tích cực là{' '}
              <strong style={boldText}>danh hiệu trọn đời</strong> — những người
              trên sẽ giữ danh hiệu này mãi mãi.
            </Text>
            <Text style={bulletText}>
              • Trong mỗi kỳ, một TVTC tuyến F1{' '}
              <strong style={boldText}>có đơn hàng hoàn thành trong kỳ</strong>{' '}
              sẽ được tính vào tiêu chí “TVTC có mua trong kỳ (F1)” của bạn —
              tiêu chí quyết định bạn có chạm Mốc Sàn hay không.
            </Text>
            <Text style={bulletText}>
              • Đạt danh hiệu là điều kiện <em>cần</em>, chưa phải điều kiện{' '}
              <em>đủ</em>: nếu kỳ này họ chưa phát sinh đơn hàng thì tiêu chí của
              bạn vẫn chưa được cộng thêm.
            </Text>
          </Section>

          <Section style={nextStepBox}>
            <Text style={nextStepText}>
              Việc nên làm ngay: liên hệ chúc mừng và đồng hành cùng những thành
              viên trên trong kỳ này. Số liệu tiêu chí và khoảng còn thiếu của
              bạn luôn được cập nhật trên trang Khởi nghiệp cùng ACTA.
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaButton} href={overviewUrl}>
              Xem tiêu chí và đội ngũ của tôi
            </Button>
          </Section>

          <Section style={footerInfoSection}>
            <Text style={footerInfoText}>
              Đây là email tự động, gộp TẤT CẢ thành viên tuyến dưới đạt danh
              hiệu trong cùng một ngày thành một lá duy nhất.
            </Text>
            {unsubscribeUrl ? (
              <Text style={footerInfoText}>
                Không muốn nhận email này nữa?{' '}
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

export default CommitmentTvtcAwardedUplineEmail;

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

const celebrateBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '10px',
};

const celebrateHeadline = {
  fontSize: '17px',
  color: '#15803d',
  margin: '0',
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

const thStyleRight = {
  ...thStyle,
  textAlign: 'right' as const,
};

const tdStyle = {
  verticalAlign: 'top' as const,
  fontSize: '14px',
  padding: '10px 6px',
  borderBottom: '1px solid #dee2e6',
};

const tdStyleRight = {
  ...tdStyle,
  textAlign: 'right' as const,
  color: '#6c757d',
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
