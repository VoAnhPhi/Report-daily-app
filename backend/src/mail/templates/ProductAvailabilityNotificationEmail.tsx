import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface Props {
  email: string;
  productName: string;
  productSlug: string;
  productThumbnail?: string;
  type: 'BACK_IN_STOCK' | 'OPEN_SALE';
  frontendDomain?: string;
  unsubscribeToken: string;
}

export const ProductAvailabilityNotificationEmail = ({
  productName = '',
  productSlug = '',
  type = 'OPEN_SALE',
  frontendDomain = process.env.FRONTEND_DOMAIN ?? 'https://acta.vn',
  unsubscribeToken,
}: Props) => {
  const isOpenSale = type === 'OPEN_SALE';
  const subject = isOpenSale
    ? `🛒 Sản phẩm "${productName}" đã mở bán!`
    : `✅ Sản phẩm "${productName}" đã có hàng trở lại!`;
  const headline = isOpenSale ? 'Sản phẩm đã mở bán!' : 'Sản phẩm đã có hàng!';
  const bodyText = isOpenSale
    ? `Sản phẩm "${productName}" mà bạn đã đăng ký theo dõi hiện đã mở bán. Đừng bỏ lỡ cơ hội này!`
    : `Sản phẩm "${productName}" mà bạn đã đăng ký theo dõi hiện đã có hàng trở lại. Mua ngay trước khi hết hàng!`;

  const productUrl = `${frontendDomain}/product/${productSlug}`;
  const unsubscribeUrl = `${frontendDomain}/notifications/unsubscribe?token=${unsubscribeToken}`;

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerText}>
              Liên minh Cộng đồng thực chiến (ACTA)
            </Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>{headline} 🎉</Heading>

            <Text style={paragraph}>{bodyText}</Text>

            <Section style={buttonContainer}>
              <Button style={button} href={productUrl}>
                Xem sản phẩm ngay
              </Button>
            </Section>

            <Section style={infoBox}>
              <Text style={infoText}>
                📦 <strong>{productName}</strong>
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Trân trọng,
              <br />
              <strong>Đội ngũ ACTA E-commerce</strong>
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              Bạn nhận được email này vì đã đăng ký nhận thông báo trên ACTA.
              <br />
              <a href={unsubscribeUrl} style={unsubscribeLink}>
                Hủy đăng ký nhận thông báo
              </a>
              {' | '}
              Vui lòng không trả lời email này.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  textAlign: 'center' as const,
};

const headerText = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '30px',
  backgroundColor: '#ffffff',
};

const h2 = {
  color: '#333',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const paragraph = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#f57c00',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(245, 124, 0, 0.35)',
};

const infoBox = {
  backgroundColor: '#fff8f0',
  padding: '14px 18px',
  borderRadius: '8px',
  margin: '0 0 20px 0',
  border: '1px solid #f57c00',
};

const infoText = {
  color: '#7a3d00',
  fontSize: '14px',
  margin: '0',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '20px 0',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const footerSection = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#999',
  margin: '0',
};

const unsubscribeLink = {
  color: '#999',
  textDecoration: 'underline',
};
