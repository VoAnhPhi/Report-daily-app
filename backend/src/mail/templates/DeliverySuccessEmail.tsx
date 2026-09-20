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
} from '@react-email/components';

interface DeliverySuccessEmailProps {
  customerName: string;
  orderCode: string;
  deliveredAt: Date;
  deliveryAddress: string;
  trackingNumber?: string;
  deliveryPartner?: string;
  reviewUrl?: string;
}

export const DeliverySuccessEmail = ({
  customerName = 'Khách hàng',
  orderCode = 'HN-250827-023',
  deliveredAt = new Date(),
  deliveryAddress = '',
  trackingNumber,
  deliveryPartner = 'GHN',
  reviewUrl,
}: DeliverySuccessEmailProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        🎉 Đơn hàng {orderCode} đã giao thành công! Cảm ơn bạn đã tin tưởng
        ACTA.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with ACTA logo */}
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
                  width="150"
                  height="150"
                  style={logoImage}
                />
              </a>
            </div>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading style={h1}>🎉 Giao hàng thành công!</Heading>

            <Text style={text}>
              Xin chào <strong>{customerName}</strong>,
            </Text>

            <Text style={text}>
              Tuyệt vời! Đơn hàng <strong>{orderCode}</strong> của bạn đã được
              giao thành công vào lúc <strong>{formatDate(deliveredAt)}</strong>
              .
            </Text>

            {/* Delivery Details */}
            <Section style={deliverySection}>
              <Heading style={sectionTitle}>📦 Chi tiết giao hàng</Heading>
              <div style={deliveryRow}>
                <Text style={deliveryLabel}>Thời gian giao:</Text>
                <Text style={deliveryValue}>{formatDate(deliveredAt)}</Text>
              </div>
              <div style={deliveryRow}>
                <Text style={deliveryLabel}>Địa chỉ giao hàng:</Text>
                <Text style={deliveryValue}>{deliveryAddress}</Text>
              </div>
              {trackingNumber && (
                <div style={deliveryRow}>
                  <Text style={deliveryLabel}>Mã vận đơn:</Text>
                  <Text style={deliveryValue}>{trackingNumber}</Text>
                </div>
              )}
              <div style={deliveryRow}>
                <Text style={deliveryLabel}>Đơn vị vận chuyển:</Text>
                <Text style={deliveryValue}>{deliveryPartner}</Text>
              </div>
            </Section>

            {/* Success Message */}
            <Section style={successSection}>
              <Text style={successIcon}>✅</Text>
              <Heading style={successTitle}>Đơn hàng đã hoàn thành!</Heading>
              <Text style={successText}>
                Cảm ơn bạn đã tin tưởng và mua sắm tại ACTA. Chúng tôi hy vọng
                bạn hài lòng với sản phẩm đã nhận được.
              </Text>
            </Section>

            {/* Review Section */}
            {reviewUrl && (
              <Section style={reviewSection}>
                <Heading style={sectionTitle}>⭐ Đánh giá sản phẩm</Heading>
                <Text style={reviewText}>
                  Chia sẻ trải nghiệm của bạn để giúp những khách hàng khác có
                  thể đưa ra quyết định mua sắm tốt hơn.
                </Text>
                <div style={buttonContainer}>
                  <a href={reviewUrl} style={reviewButton}>
                    ⭐ Đánh giá ngay
                  </a>
                </div>
              </Section>
            )}

            {/* Next Steps */}
            <Section style={nextStepsSection}>
              <Heading style={sectionTitle}>🔄 Tiếp theo bạn có thể</Heading>
              <Text style={stepText}>
                • Đánh giá sản phẩm và chia sẻ trải nghiệm
              </Text>
              <Text style={stepText}>
                • Khám phá thêm các sản phẩm mới trên website
              </Text>
              <Text style={stepText}>
                • Theo dõi các chương trình khuyến mãi hấp dẫn
              </Text>
              <Text style={stepText}>
                • Liên hệ hỗ trợ nếu có bất kỳ vấn đề gì với sản phẩm
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Nếu bạn có bất kỳ vấn đề gì với sản phẩm đã nhận hoặc cần hỗ trợ
              bảo hành, vui lòng liên hệ với chúng tôi trong vòng 7 ngày kể từ
              ngày nhận hàng.
            </Text>

            <Text style={footer}>
              Hỗ trợ khách hàng:{' '}
              <a href="mailto:lienhe@acta.vn" style={link}>
                lienhe@acta.vn
              </a>{' '}
              hoặc gọi <strong>0912 880 330</strong>
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

// Styles with success theme
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
  color: '#16a34a',
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

const sectionTitle = {
  color: '#8b4513',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const deliverySection = {
  backgroundColor: '#f0f9ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #0ea5e9',
};

const deliveryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  margin: '0 0 12px',
};

const deliveryLabel = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  fontWeight: '600',
  width: '40%',
};

const deliveryValue = {
  color: '#0ea5e9',
  fontSize: '16px',
  margin: '0',
  fontWeight: 'bold',
  width: '60%',
  textAlign: 'right' as const,
};

const successSection = {
  backgroundColor: '#f0fdf4',
  padding: '30px 20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #16a34a',
  textAlign: 'center' as const,
};

const successIcon = {
  fontSize: '48px',
  margin: '0 0 16px',
  display: 'block',
};

const successTitle = {
  color: '#16a34a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const successText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0',
};

const reviewSection = {
  backgroundColor: '#fffbeb',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #f59e0b',
  textAlign: 'center' as const,
};

const reviewText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
};

const reviewButton = {
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  padding: '12px 24px',
  textDecoration: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
  border: 'none',
  cursor: 'pointer',
};

const nextStepsSection = {
  backgroundColor: '#faf8f3',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #ddbf94',
};

const stepText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 8px',
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

export default DeliverySuccessEmail;
