import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
  Img,
  Row,
  Column,
} from '@react-email/components';

interface GratitudeEmailProps {
  recipientName: string;
  senderName: string;
  orderCode: string;
  amount: number;
  role: 'giver' | 'beneficiary';
  percentage: number;
}

export const GratitudeEmail = ({
  recipientName,
  senderName,
  orderCode,
  amount,
  role,
  percentage,
}: GratitudeEmailProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  const previewText =
    role === 'giver'
      ? `Bạn đã gửi Thù lao tư vấn thành công cho đơn hàng ${orderCode}`
      : `Bạn nhận được Thù lao tư vấn từ người dùng ${senderName}`;

  const title =
    role === 'giver'
      ? '🎉 Gửi Thù lao tư vấn thành công!'
      : '🎁 Bạn nhận được Thù lao tư vấn!';

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <div style={logoContainer}>
              <a
                href="https://acta.vn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Img
                  src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
                  alt="ACTA Logo"
                  width="120"
                  height="120"
                  style={logoImage}
                />
              </a>
            </div>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading style={h1}>{title}</Heading>

            <Text style={text}>
              Xin chào <strong>{recipientName}</strong>,
            </Text>

            {role === 'giver' ? (
              <Text style={text}>
                Bạn đã thực hiện gửi Thù lao tư vấn thành công cho người dùng{' '}
                <strong>{senderName}</strong> từ đơn hàng{' '}
                <strong>{orderCode}</strong>. Sự trân trọng của bạn là động lực
                to lớn cho cộng đồng ACTA!
              </Text>
            ) : (
              <Text style={text}>
                Bạn vừa nhận được Thù lao tư vấn từ người dùng{' '}
                <strong>{senderName}</strong> cho đơn hàng{' '}
                <strong>{orderCode}</strong>. Đây là phần thưởng cho sự hỗ trợ
                nhiệt tình của bạn.
              </Text>
            )}

            {/* Summary Card */}
            <Section style={summaryCard}>
              <Text style={summaryLabel}>Số tiền Thù lao tư vấn:</Text>
              <Heading style={summaryAmount}>{formatCurrency(amount)}</Heading>
              <Text style={summaryPercentage}>
                (Áp dụng mức {percentage}% trên giá trị đơn hàng sau thuế & phí)
              </Text>
            </Section>

            <Section style={infoSection}>
              <Row>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>Mã đơn hàng:</Text>
                  <Text style={infoValue}>{orderCode}</Text>
                </Column>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>
                    Người {role === 'giver' ? 'nhận' : 'gửi'}:
                  </Text>
                  <Text style={infoValue}>{senderName}</Text>
                </Column>
              </Row>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Số tiền này đã được ghi nhận vào ví Affiliate của bạn. Tiền sẽ khả
              dụng sau khi đơn hàng hoàn tất các thủ tục đối soát tài chính.
            </Text>

            <Text style={footer}>
              Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội hỗ trợ của
              chúng tôi tại{' '}
              <a href="mailto:lienhe@acta.vn" style={link}>
                lienhe@acta.vn
              </a>
              .
            </Text>
          </Section>

          {/* Footer Section */}
          <Section style={footerSection}>
            <Text style={footerText}>
              © 2025 ACTA - Affiliate Community's Tactical Alliance
            </Text>
            <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
            <Text style={footerText}>
              Địa chỉ: 94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
            </Text>
            <Text style={footerText}>Website: https://acta.vn</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#fefdf8',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  boxShadow: '0 4px 20px rgba(221, 191, 148, 0.1)',
  borderRadius: '12px',
  overflow: 'hidden',
};

const header = {
  padding: '30px 40px',
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
  borderRadius: '12px 12px 0 0',
};

const logoContainer = {
  textAlign: 'center' as const,
};

const logoImage = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  padding: '40px',
};

const h1 = {
  color: '#8b4513',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const summaryCard = {
  backgroundColor: '#faf8f3',
  padding: '32px 20px',
  borderRadius: '12px',
  margin: '24px 0',
  border: '2px solid #ddbf94',
  textAlign: 'center' as const,
};

const summaryLabel = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0 0 8px',
};

const summaryAmount = {
  color: '#16a34a',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const summaryPercentage = {
  color: '#8b4513',
  fontSize: '14px',
  margin: '0',
};

const infoSection = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
};

const infoColumn = {
  width: '50%',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
  fontWeight: '600',
};

const infoValue = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  fontWeight: 'bold',
};

const hr = {
  borderColor: '#ddbf94',
  margin: '32px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
};

const link = {
  color: '#cd853f',
  textDecoration: 'underline',
  fontWeight: '600',
};

const footerSection = {
  padding: '20px 40px',
  background: 'linear-gradient(135deg, #faf8f3 0%, #f5f5dc 100%)',
  borderRadius: '0 0 12px 12px',
  borderTop: '1px solid #ddbf94',
};

const footerText = {
  color: '#8b4513',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};
