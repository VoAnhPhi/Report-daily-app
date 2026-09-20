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
  Link,
} from '@react-email/components';

export interface OrderGiftDeliveredBuyerEmailProps {
  buyerName: string;
  recipientName: string;
  recipientFullAddress: string;
  giftTemplateName?: string;
  deliveredAt: Date;
  orderDetailUrl: string;
}

const formatVietnameseDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const OrderGiftDeliveredBuyerEmail = ({
  buyerName,
  recipientName,
  recipientFullAddress,
  giftTemplateName,
  deliveredAt,
  orderDetailUrl,
}: OrderGiftDeliveredBuyerEmailProps) => {
  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        Món quà của bạn đã được trao đến tay {recipientName} thành công!
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <div style={logoContainer}>
              <a href="https://acta.vn" target="_blank" rel="noopener noreferrer">
                <Img
                  src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
                  alt="ACTA Logo"
                  width="150"
                  height="150"
                  style={logoImage}
                />
              </a>
            </div>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {/* Hero */}
            <Heading style={heroHeading}>
              Món quà của bạn đã được trao thành công
            </Heading>

            <Text style={greeting}>
              Xin chào <strong>{buyerName}</strong>,
            </Text>

            <Text style={bodyText}>
              Chúng tôi xin thông báo rằng món quà bạn gửi đã được giao thành
              công đến tay <strong>{recipientName}</strong>.
            </Text>

            {/* Delivery Details */}
            <Section style={deliverySection}>
              <Heading as="h2" style={sectionTitle}>
                Thông tin giao hàng
              </Heading>
              <Text style={detailRow}>
                <strong>Người nhận:</strong> {recipientName}
              </Text>
              <Text style={detailRow}>
                <strong>Địa chỉ nhận:</strong> {recipientFullAddress}
              </Text>
              <Text style={detailRow}>
                <strong>Thời gian giao:</strong>{' '}
                {formatVietnameseDateTime(deliveredAt)}
              </Text>
              {giftTemplateName && (
                <Text style={detailRow}>
                  <strong>Thiệp quà:</strong> {giftTemplateName}
                </Text>
              )}
            </Section>

            {/* Success Note */}
            <Section style={successSection}>
              <Text style={successText}>
                Cảm ơn bạn đã lựa chọn ACTA để gửi đi những điều ý nghĩa.
                Chúng tôi rất vui được đồng hành cùng bạn trong khoảnh khắc
                đặc biệt này.
              </Text>
            </Section>

            {/* CTA */}
            <Section style={ctaSection}>
              <Link href={orderDetailUrl} style={ctaButton}>
                Xem chi tiết đơn hàng
              </Link>
            </Section>

            <Hr style={hr} />

            <Text style={footerNote}>
              Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi
              tại{' '}
              <a href="mailto:lienhe@acta.vn" style={link}>
                lienhe@acta.vn
              </a>{' '}
              hoặc gọi <strong>0912 880 330</strong>.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              © 2025 ACTA - Affiliate Community's Tactical Alliance
            </Text>
            <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
            <Text style={footerText}>
              94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
            </Text>
            <Text style={footerText}>Website: https://acta.vn</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

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

const heroHeading = {
  color: '#16a34a',
  fontSize: '26px',
  fontWeight: 'bold',
  margin: '0 0 28px',
  textAlign: 'center' as const,
  lineHeight: '1.3',
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const bodyText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.7',
  margin: '0 0 24px',
};

const sectionTitle = {
  color: '#8b4513',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 14px',
};

const deliverySection = {
  backgroundColor: '#f0f9ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 0 24px',
  border: '1px solid #0ea5e9',
};

const detailRow = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const successSection = {
  backgroundColor: '#f0fdf4',
  padding: '20px 24px',
  borderRadius: '8px',
  margin: '0 0 24px',
  border: '1px solid #16a34a',
};

const successText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0',
  fontStyle: 'italic' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const ctaButton = {
  backgroundColor: '#8b4513',
  color: '#ffffff',
  padding: '12px 28px',
  textDecoration: 'none',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: '600' as const,
  display: 'inline-block',
};

const hr = {
  borderColor: '#ddbf94',
  margin: '32px 0',
};

const footerNote = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0',
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

export default OrderGiftDeliveredBuyerEmail;
