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
  Link,
} from '@react-email/components';

export interface MstlEligiblePendingEmailProps {
  /** Recipient admin's display name. */
  adminName: string;
  /** The member who just became eligible for MSTL (Minh sứ trưởng lão / nhóm trưởng). */
  qualifierName: string;
  qualifierReferenceId: string;
  /** Exact moment the member first met every active-preset criterion (formatted VN). */
  qualifiedAtText: string;
  completedCount: number;
  totalCount: number;
  /** Deep link to the admin recognized-users screen (optionally focused on the member). */
  dashboardUrl: string;
}

export const MstlEligiblePendingEmail = ({
  adminName = 'Admin',
  qualifierName = 'Người dùng',
  qualifierReferenceId = 'VN-00000',
  qualifiedAtText = '',
  completedCount = 0,
  totalCount = 0,
  dashboardUrl = 'https://acta.vn/admin/recognized-users',
}: MstlEligiblePendingEmailProps) => {
  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Thành viên đủ điều kiện trở thành nhóm trưởng (MSTL)</title>
      </Head>
      <Preview>
        🏅 {qualifierName} đủ điều kiện trở thành Minh sứ trưởng lão — chưa được
        công nhận
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
              🏅 Thành viên đủ điều kiện trở thành nhóm trưởng (MSTL)
            </Heading>
            <Text style={paragraph}>
              Chào <strong style={boldText}>{adminName}</strong>,
            </Text>
            <Text style={paragraph}>
              Hệ thống ghi nhận một thành viên vừa{' '}
              <strong style={highlightText}>
                đủ TẤT CẢ điều kiện trở thành Minh sứ trưởng lão
              </strong>{' '}
              (theo bộ tiêu chí của preset đang áp dụng) nhưng{' '}
              <strong style={highlightText}>chưa được công nhận</strong>. Vui
              lòng xem xét và bấm nút công nhận nếu phù hợp.
            </Text>

            <Section style={detailsSection}>
              <Heading as="h3" style={detailsTitle}>
                📋 Thông tin thành viên
              </Heading>
              <div style={detailItem}>
                <span style={detailLabel}>Họ tên:</span>
                <span style={detailValue}>{qualifierName}</span>
              </div>
              <div style={detailItem}>
                <span style={detailLabel}>Mã giới thiệu:</span>
                <span style={detailValue}>{qualifierReferenceId}</span>
              </div>
              <div style={detailItem}>
                <span style={detailLabel}>Đủ điều kiện lúc:</span>
                <span style={detailValueStrong}>{qualifiedAtText}</span>
              </div>
              <div style={detailItem}>
                <span style={detailLabel}>Tiến độ điều kiện:</span>
                <span style={detailValue}>
                  {completedCount}/{totalCount} (hoàn tất)
                </span>
              </div>
            </Section>

            <Section style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>
                🚀 Xem & công nhận
              </Link>
            </Section>

            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                Đây là email tự động — được gửi ngay khi một thành viên đạt đủ
                điều kiện. Thời điểm ghi nhận là chính xác đến từng giây.
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

export default MstlEligiblePendingEmail;

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

const detailsSection = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '25px',
  border: '1px solid #dee2e6',
};

const detailsTitle = {
  color: '#495057',
  marginBottom: '15px',
  fontSize: '18px',
};

const detailItem = {
  marginBottom: '12px',
};

const detailLabel = {
  color: '#6c757d',
  fontWeight: 'bold',
  marginRight: '8px',
};

const detailValue = {
  fontSize: '16px',
};

const detailValueStrong = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#b8860b',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginBottom: '25px',
};

const button = {
  backgroundColor: '#b8860b',
  color: '#fff',
  padding: '12px 25px',
  textDecoration: 'none',
  borderRadius: '5px',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
};

const footerInfoSection = {
  fontSize: '14px',
  color: '#6c757d',
  textAlign: 'center' as const,
  borderTop: '1px solid #dee2e6',
  paddingTop: '20px',
};

const footerInfoText = {
  margin: '0 0 10px 0',
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
