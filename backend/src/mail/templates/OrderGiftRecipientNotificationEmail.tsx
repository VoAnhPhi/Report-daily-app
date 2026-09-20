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
  Button,
} from '@react-email/components';

export interface OrderGiftRecipientNotificationEmailProps {
  recipientName: string;
  buyerName: string;
  anonymousSender: boolean;
  senderDisplayName?: string;
  giftTemplateImageUrl?: string;
  giftTemplateName?: string;
  giftMessage?: string;
  recipientFullAddress: string;
  preferredDeliveryDate?: Date;
  preferredDeliveryTimeStart?: string;
  preferredDeliveryTimeEnd?: string;
  /** URL trang tra cứu quà tặng trên storefront (e.g. https://acta.vn/qua-tang/ORD-1756) */
  recipientLookupUrl?: string;
}

const formatVietnameseDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const OrderGiftRecipientNotificationEmail = ({
  recipientName,
  buyerName,
  anonymousSender,
  senderDisplayName,
  giftTemplateImageUrl,
  giftTemplateName,
  giftMessage,
  recipientFullAddress,
  preferredDeliveryDate,
  preferredDeliveryTimeStart,
  preferredDeliveryTimeEnd,
  recipientLookupUrl,
}: OrderGiftRecipientNotificationEmailProps) => {
  const senderLabel = anonymousSender
    ? senderDisplayName || 'Một người gửi đặc biệt'
    : buyerName;

  const buildDeliveryLine = (): string | null => {
    if (!preferredDeliveryDate) return null;
    const datePart = `ngày ${formatVietnameseDate(preferredDeliveryDate)}`;
    if (preferredDeliveryTimeStart && preferredDeliveryTimeEnd) {
      return `${datePart}, khung ${preferredDeliveryTimeStart}–${preferredDeliveryTimeEnd}`;
    }
    return datePart;
  };

  const deliveryLine = buildDeliveryLine();

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        Bạn sắp nhận được một món quà từ {senderLabel} — ACTA
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
              Bạn sắp nhận được một món quà
            </Heading>

            <Text style={greeting}>
              Kính gửi <strong>{recipientName}</strong>,
            </Text>

            <Text style={bodyText}>
              Chúng tôi xin thông báo rằng{' '}
              <strong>{senderLabel}</strong> đã gửi tặng bạn một món quà đặc
              biệt qua hệ thống ACTA. Món quà đang trên đường đến với bạn.
            </Text>

            {/* Gift Template Image */}
            {giftTemplateImageUrl && (
              <Section style={giftImageSection}>
                <Img
                  src={giftTemplateImageUrl}
                  alt={giftTemplateName || 'Thiệp quà tặng'}
                  width="240"
                  height="160"
                  style={giftImage}
                />
                {giftTemplateName && (
                  <Text style={giftTemplateLabel}>{giftTemplateName}</Text>
                )}
              </Section>
            )}

            {/* Gift Message */}
            {giftMessage && (
              <Section style={messageCard}>
                <Text style={messageLabel}>Lời nhắn từ người gửi</Text>
                <Text style={messageText}>{giftMessage}</Text>
              </Section>
            )}

            {/* Delivery Info */}
            <Section style={deliverySection}>
              <Heading as="h2" style={sectionTitle}>
                Thông tin giao hàng
              </Heading>
              <Text style={deliveryRow}>
                <strong>Địa chỉ nhận:</strong> {recipientFullAddress}
              </Text>
              {deliveryLine ? (
                <Text style={deliveryRow}>
                  <strong>Dự kiến giao:</strong> {deliveryLine}
                </Text>
              ) : (
                <Text style={deliveryRow}>
                  <strong>Dự kiến giao:</strong> Sẽ được giao trong thời gian
                  sớm nhất.
                </Text>
              )}
            </Section>

            {recipientLookupUrl && (
              <Section style={ctaSection}>
                <Button href={recipientLookupUrl} style={ctaButton}>
                  Xem chi tiết quà →
                </Button>
              </Section>
            )}

            <Hr style={hr} />

            <Text style={footerNote}>
              Email này được gửi tự động bởi hệ thống ACTA. Nếu bạn có thắc
              mắc, vui lòng liên hệ{' '}
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
  color: '#8b4513',
  fontSize: '26px',
  fontWeight: 'bold',
  margin: '0 0 28px',
  textAlign: 'center' as const,
  letterSpacing: '0.01em',
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

const giftImageSection = {
  textAlign: 'center' as const,
  margin: '16px 0 28px',
};

const giftImage = {
  borderRadius: '10px',
  border: '1px solid #ddbf94',
  margin: '0 auto',
  display: 'block',
};

const giftTemplateLabel = {
  color: '#8b4513',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  margin: '8px 0 0',
  textAlign: 'center' as const,
};

const messageCard = {
  backgroundColor: '#faf8f3',
  border: '1px solid #ddbf94',
  borderRadius: '10px',
  padding: '20px 24px',
  margin: '0 0 28px',
};

const messageLabel = {
  color: '#8b4513',
  fontSize: '13px',
  fontWeight: '600' as const,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
};

const messageText = {
  color: '#374151',
  fontSize: '17px',
  lineHeight: '1.75',
  fontStyle: 'italic' as const,
  margin: '0',
};

const deliverySection = {
  backgroundColor: '#f0f9ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 0 28px',
  border: '1px solid #0ea5e9',
};

const sectionTitle = {
  color: '#8b4513',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 14px',
};

const deliveryRow = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '28px 0 0',
};

const ctaButton = {
  backgroundColor: '#8b4513',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
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

export default OrderGiftRecipientNotificationEmail;
