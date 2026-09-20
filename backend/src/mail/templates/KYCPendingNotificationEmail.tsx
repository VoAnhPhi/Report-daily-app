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

interface KYCPendingNotificationEmailProps {
  adminName: string;
  totalSubmitted: number;
  recentCount: number;
  olderCount: number;
  dashboardUrl: string;
}

export const KYCPendingNotificationEmail = ({
  adminName = 'Admin',
  totalSubmitted = 5,
  recentCount = 3,
  olderCount = 2,
  dashboardUrl = 'https://acta.vn/admin/dashboard',
}: KYCPendingNotificationEmailProps) => {
  const getCurrentDateTime = () => {
    return new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Thông báo KYC đang chờ xử lý</title>
      </Head>
      <Preview>🔔 Thông báo KYC đang chờ xử lý</Preview>
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
            <Heading style={h1}>🔔 Thông báo KYC đang chờ xử lý</Heading>
            <Text style={paragraph}>
              Chào <strong style={boldText}>{adminName}</strong>,
            </Text>
            <Text style={paragraph}>
              Hệ thống đã phát hiện có{' '}
              <strong style={highlightText}>
                {totalSubmitted} KYC đang chờ xử lý
              </strong>{' '}
              cần được xem xét:
            </Text>
            <Section style={detailsSection}>
              <Heading as="h3" style={detailsTitle}>
                📊 Chi tiết:
              </Heading>
              <div style={detailItem}>
                <span style={recentKycText}>✅ KYC mới (24h gần đây):</span>
                <span style={detailCount}>{recentCount}</span>
              </div>
              {olderCount > 0 && (
                <div style={detailItem}>
                  <span style={olderKycText}>⚠️ KYC cũ (trên 24h):</span>
                  <span style={detailCount}>{olderCount}</span>
                </div>
              )}
              <div style={totalSection}>
                <span style={totalLabel}>📋 Tổng cộng:</span>
                <span style={totalCount}>{totalSubmitted} KYC</span>
              </div>
            </Section>
            {olderCount > 0 && (
              <Section style={warningSection}>
                <Text style={warningText}>
                  <strong>⚠️ Lưu ý:</strong> Có {olderCount} KYC đã chờ xử lý
                  quá 24h. Vui lòng ưu tiên xem xét để đảm bảo trải nghiệm tốt
                  cho người dùng.
                </Text>
              </Section>
            )}
            <Section style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>
                🚀 Xử lý KYC ngay
              </Link>
            </Section>
            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                <strong>Thời gian kiểm tra:</strong> {getCurrentDateTime()}
              </Text>
              <Text style={footerInfoText}>
                Email này được gửi tự động mỗi 15 phút khi có KYC chờ xử lý.
              </Text>
            </Section>
          </Section>
          <Section style={bottomFooter}>
            <Text style={bottomFooterText}>
              © 2024 Liên minh Cộng đồng thực chiến (ACTA) (ACTA)
              <br />
              Email này được gửi tự động, vui lòng không reply.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default KYCPendingNotificationEmail;

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
  color: '#dc3545',
  textAlign: 'center' as const,
  marginBottom: '25px',
  fontSize: '24px',
};

const paragraph = {
  fontSize: '16px',
  marginBottom: '20px',
};

const boldText = {
  fontWeight: 'bold',
};

const highlightText = {
  color: '#dc3545',
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

const recentKycText = {
  color: '#28a745',
  fontWeight: 'bold',
};

const olderKycText = {
  color: '#ffc107',
  fontWeight: 'bold',
};

const detailCount = {
  marginLeft: '10px',
  fontSize: '16px',
  fontWeight: 'bold',
};

const totalSection = {
  marginTop: '15px',
  paddingTop: '15px',
  borderTop: '1px solid #dee2e6',
};

const totalLabel = {
  color: '#6c757d',
  fontWeight: 'bold',
};

const totalCount = {
  marginLeft: '10px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#dc3545',
};

const warningSection = {
  backgroundColor: '#fff3cd',
  padding: '15px',
  borderRadius: '8px',
  marginBottom: '25px',
  border: '1px solid #ffeaa7',
};

const warningText = {
  margin: '0',
  color: '#856404',
  fontSize: '14px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginBottom: '25px',
};

const button = {
  backgroundColor: '#007bff',
  color: '#fff',
  padding: '12px 25px',
  textDecoration: 'none',
  borderRadius: '5px',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
  transition: 'background-color 0.3s',
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
