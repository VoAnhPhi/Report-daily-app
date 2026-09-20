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
  Button,
  Row,
  Column,
} from '@react-email/components';

interface Props {
  userName: string;
  voucherName: string;
  voucherCode: string;
  voucherValue: string;
  validFrom: string;
  validTo: string;
  minOrderAmount: string;
  voucherDescription?: string;
}

export const VoucherNotificationEmail = ({
  userName = 'Khách hàng',
  voucherName = 'Voucher đặc biệt',
  voucherCode = 'VOUCHER123',
  voucherValue = 'Giảm 10%',
  validFrom = '01/01/2024',
  validTo = '31/12/2024',
  minOrderAmount = '200.000₫',
  voucherDescription = 'Voucher đặc biệt dành cho bạn',
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      🎉 Chúc mừng! Bạn đã nhận được voucher mới từ Acta - {voucherName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>🎉 Chúc mừng!</Heading>
          <Text style={headerText}>Bạn đã nhận được voucher mới từ Acta</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Xin chào {userName},</Text>

          <Text style={paragraph}>
            Chúng tôi rất vui thông báo rằng bạn đã nhận được một voucher đặc
            biệt từ Acta!
          </Text>

          <Section style={voucherCard}>
            <Heading style={voucherNameStyle}>{voucherName}</Heading>
            <Text style={voucherValueStyle}>{voucherValue}</Text>
            <Text style={voucherCodeStyle}>{voucherCode}</Text>
            {voucherDescription && (
              <Text style={voucherDescriptionStyle}>{voucherDescription}</Text>
            )}
          </Section>

          <Section style={voucherDetails}>
            <Row>
              <Column>
                <Text style={detailLabel}>📅 Thời gian hiệu lực:</Text>
              </Column>
              <Column>
                <Text style={detailValue}>
                  {validFrom} - {validTo}
                </Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={detailLabel}>💰 Đơn hàng tối thiểu:</Text>
              </Column>
              <Column>
                <Text style={detailValue}>{minOrderAmount}</Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={detailLabel}>🎯 Trạng thái:</Text>
              </Column>
              <Column>
                <Text style={detailValueStatus}>Sẵn sàng sử dụng</Text>
              </Column>
            </Row>
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href="https://e-commerce.acta.vn">
              🛒 Sử dụng voucher ngay
            </Button>
          </Section>

          <Section style={noteBox}>
            <Text style={noteText}>
              💡 <strong>Lưu ý:</strong> Voucher này có thời hạn sử dụng. Hãy sử
              dụng trước khi hết hạn để không bỏ lỡ cơ hội tiết kiệm!
            </Text>
          </Section>
        </Section>

        <Hr style={hr} />

        <Section style={footer}>
          <Text style={footerText}>
            Trân trọng,
            <br />
            <strong>Đội ngũ Acta</strong>
          </Text>
          <Text style={footerLinks}>
            <a href="https://acta.vn" style={link}>
              acta.vn
            </a>{' '}
            |
            <a href="https://acta.vn/support" style={link}>
              Hỗ trợ
            </a>{' '}
            |
            <a href="https://acta.vn/terms" style={link}>
              Điều khoản
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles
const main = {
  backgroundColor: '#f8f9fa',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const header = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '30px',
  textAlign: 'center' as const,
  color: '#ffffff',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '600',
  lineHeight: '1.2',
  margin: '0',
};

const headerText = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: '1.4',
  margin: '10px 0 0 0',
  opacity: '0.9',
};

const content = {
  padding: '30px',
};

const greeting = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0 0 16px 0',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0 0 20px 0',
};

const voucherCard = {
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  borderRadius: '12px',
  padding: '25px',
  margin: '20px 0',
  color: '#ffffff',
  textAlign: 'center' as const,
  position: 'relative' as const,
  overflow: 'hidden' as const,
};

const voucherNameStyle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 10px 0',
};

const voucherValueStyle = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '10px 0',
};

const voucherCodeStyle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  margin: '15px 0',
  backgroundColor: 'rgba(255,255,255,0.2)',
  padding: '10px 20px',
  borderRadius: '8px',
  display: 'inline-block',
};

const voucherDescriptionStyle = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '15px 0 0 0',
  opacity: '0.9',
};

const voucherDetails = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const detailLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#495057',
  margin: '0',
};

const detailValue = {
  fontSize: '14px',
  color: '#6c757d',
  margin: '0',
  textAlign: 'right' as const,
};

const detailValueStatus = {
  fontSize: '14px',
  color: '#e74c3c',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'right' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const button = {
  backgroundColor: '#667eea',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '15px 30px',
  border: 'none',
};

const noteBox = {
  backgroundColor: '#e3f2fd',
  borderLeft: '4px solid #2196f3',
  padding: '15px',
  margin: '20px 0',
  borderRadius: '4px',
};

const noteText = {
  fontSize: '14px',
  color: '#1976d2',
  margin: '0',
};

const hr = {
  borderColor: '#e9ecef',
  margin: '20px 0',
};

const footer = {
  padding: '20px',
  textAlign: 'center' as const,
  color: '#6c757d',
};

const footerText = {
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 10px 0',
};

const footerLinks = {
  fontSize: '14px',
  margin: '0',
};

const link = {
  color: '#667eea',
  textDecoration: 'none',
};

export default VoucherNotificationEmail;
