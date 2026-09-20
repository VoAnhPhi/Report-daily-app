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
} from '@react-email/components';

export interface CommitmentEnrollmentOnBehalfEmailProps {
  memberName: string;
  /** Họ tên NGƯỜI GỬI HỘ (server-read từ requestedById — không tin client). */
  senderName: string;
  /** Nhãn vai trò tiếng Việt: 'Quản trị viên' | 'Người chăm sóc' | 'Người giới thiệu'. */
  senderRoleLabel: string;
  /** "22/07/2026 10:35" — thời điểm gửi, giờ VN. */
  requestedAtLabel: string;
  /** Link tuyệt đối tới trang Khởi nghiệp cùng ACTA trên cổng affiliate. */
  overviewUrl: string;
}

/**
 * CommitmentEnrollmentOnBehalfEmail (Phase 115 "Tra cứu thu nhập", D4 22-07-2026)
 * — báo CHÍNH CHỦ rằng một người khác (admin / người chăm sóc / người giới thiệu)
 * vừa GỬI HỘ yêu cầu kết nạp "Khởi nghiệp cùng ACTA" cho họ.
 *
 * ⚠⚠ VÌ SAO LÁ MAIL NÀY TỒN TẠI: yêu cầu kết nạp giờ có thể được gửi bởi người
 * KHÔNG PHẢI chính chủ. Không có lá mail này, người được kết nạp chỉ biết mình
 * "bỗng nhiên" thành thành viên chính sách khi email chào mừng đến — hoặc tệ hơn,
 * không bao giờ biết có ai đó thao tác thay mình. Đây là thông báo MINH BẠCH
 * việc-người-khác-làm-thay, nên được đối xử GIAO DỊCH: luôn gửi, không trần tần
 * suất, KHÔNG unsubscribe (cố ý không có prop unsubscribeUrl).
 *
 * Chủ ý biên tập — trả lời ĐÚNG ba câu hỏi theo thứ tự member hỏi:
 *   (1) ai vừa làm gì cho tôi, (2) tiếp theo điều gì xảy ra,
 *   (3) tôi cần làm gì nếu KHÔNG muốn / không nhận ra người gửi.
 * Câu (3) bắt buộc phải có: gửi hộ mà không có đường lùi là ép tham gia.
 */
export const CommitmentEnrollmentOnBehalfEmail = ({
  memberName = 'Quý thành viên',
  senderName = '',
  senderRoleLabel = '',
  requestedAtLabel = '',
  overviewUrl = '',
}: CommitmentEnrollmentOnBehalfEmailProps) => {
  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Yêu cầu kết nạp Khởi nghiệp cùng ACTA đã được gửi thay cho bạn</title>
      </Head>
      <Preview>
        {`${senderName} vừa gửi yêu cầu kết nạp Khởi nghiệp cùng ACTA thay cho bạn`}
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
              Yêu cầu kết nạp đã được gửi thay cho bạn
            </Heading>

            <Text style={paragraph}>
              Chào <strong style={boldText}>{memberName}</strong>,
            </Text>
            <Text style={paragraph}>
              <strong style={boldText}>{senderName}</strong>{' '}
              (<strong style={highlightText}>{senderRoleLabel}</strong>) vừa gửi{' '}
              <strong style={boldText}>yêu cầu kết nạp</strong> chính sách{' '}
              “Khởi nghiệp cùng ACTA” <strong style={boldText}>thay cho bạn</strong>{' '}
              vào lúc <strong style={highlightText}>{requestedAtLabel}</strong>.
            </Text>

            {/* ── Khối 1: tiếp theo điều gì xảy ra ─────────────────────────── */}
            <Heading style={h2}>Điều gì xảy ra tiếp theo</Heading>
            <Section style={stepsBox}>
              <Text style={stepText}>
                • Quản trị viên ACTA sẽ xem xét yêu cầu và kết nạp bạn nếu đủ
                điều kiện (đã từng có ít nhất 1 đơn hoàn thành, xuất VAT).
              </Text>
              <Text style={stepText}>
                • Khi được kết nạp, bạn sẽ nhận email chào mừng kèm ngày neo kỳ
                và toàn bộ quyền lợi Mốc Sàn của chính sách.
              </Text>
              <Text style={stepText}>
                • Bạn không cần thao tác gì thêm trong lúc chờ xét duyệt.
              </Text>
            </Section>

            {/* ── Khối 2: đường lùi — bắt buộc với mail gửi-hộ ─────────────── */}
            <Section style={optOutBox}>
              <Text style={optOutText}>
                Nếu bạn <strong style={boldText}>không muốn tham gia</strong>{' '}
                chính sách này, hoặc <strong style={boldText}>không nhận ra</strong>{' '}
                người gửi ở trên, vui lòng liên hệ quản trị viên ACTA để hủy yêu
                cầu trước khi xét duyệt.
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={overviewUrl}>
                Tìm hiểu Khởi nghiệp cùng ACTA
              </Button>
            </Section>

            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                Đây là email tự động, gửi khi có yêu cầu kết nạp liên quan tới
                tài khoản của bạn.
              </Text>
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

export default CommitmentEnrollmentOnBehalfEmail;

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
  color: '#047857',
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

const stepsBox = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '10px',
  border: '1px solid #dee2e6',
};

const stepText = {
  fontSize: '15px',
  margin: '0 0 10px 0',
};

const optOutBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '18px',
  marginBottom: '10px',
};

const optOutText = {
  fontSize: '15px',
  margin: '0',
  color: '#92400e',
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

const bottomFooter = {
  textAlign: 'center' as const,
  marginTop: '30px',
  fontSize: '12px',
  color: '#6c757d',
};

const bottomFooterText = {
  margin: '0',
};
