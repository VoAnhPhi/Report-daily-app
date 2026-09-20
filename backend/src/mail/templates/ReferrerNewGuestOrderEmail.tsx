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

interface ReferrerNewGuestOrderEmailProps {
  referrerName: string;
  referredUserName: string;
  referredUserPhone: string;
  orderCode: string;
  productName?: string;
}

export const ReferrerNewGuestOrderEmail = ({
  referrerName = "Người giới thiệu",
  referredUserName,
  referredUserPhone,
  orderCode,
  productName,
}: ReferrerNewGuestOrderEmailProps) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      Chúc mừng! Bạn có một thành viên mới từ đường giới thiệu của mình
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with ACTA logo */}
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

        {/* Main content */}
        <Section style={content}>
          <Heading style={h1}>Chúc mừng {referrerName}! 🎉</Heading>

          <Text style={text}>
            Bạn có một thành viên mới vừa đặt hàng thông qua đường giới thiệu
            của mình!
          </Text>

          <Section style={infoBox}>
            <Heading style={h2}>Thông tin thành viên mới:</Heading>
            <Text style={infoText}>
              <strong>Họ tên:</strong> {referredUserName}
            </Text>
            <Text style={infoText}>
              <strong>Số điện thoại:</strong> {referredUserPhone}
            </Text>
            <Text style={infoText}>
              <strong>Mã đơn hàng:</strong> {orderCode}
            </Text>
            {productName && (
              <Text style={infoText}>
                <strong>Sản phẩm:</strong> {productName}
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            Thành viên này sẽ được tính vào hệ thống giới thiệu của bạn. Khi
            họ hoàn tất các bước xác nhận và thanh toán, bạn sẽ nhận được hoa
            hồng theo chính sách của ACTA.
          </Text>

          <Text style={text}>
            Theo dõi đội ngũ của bạn và xem thống kê hoa hồng tại trang
            quản lý.
          </Text>

          <Section style={buttonSection}>
            <Button
              href="https://acta.vn/dashboard"
              style={button}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội hỗ trợ
            của chúng tôi.
          </Text>

          <Text style={footer}>
            Chúng tôi luôn sẵn sàng hỗ trợ bạn tại{' '}
            <a
              href="mailto:lienhe@acta.vn"
              style={link}
              target="_blank"
              rel="noreferrer"
            >
              lienhe@acta.vn
            </a>
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            © 2025 ACTA - Affiliate Community's Tactical Alliance
          </Text>
          <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
          <Text style={footerText}>Số điện thoại: 0912 880 330</Text>
          <Text style={footerText}>
            Địa chỉ: 94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
          </Text>
          <Text style={footerText}>Website: https://acta.vn</Text>
          <Text style={footerText}>
            Bạn nhận được email này vì có thành viên mới đăng ký qua đường
            giới thiệu của bạn tại hệ thống ACTA.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles with beige theme
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
  textAlign: 'left' as const,
};

const h2 = {
  color: '#cd853f',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  textAlign: 'left' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const infoBox = {
  backgroundColor: '#fefdf8',
  border: '1px solid #ddbf94',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const infoText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const hr = {
  borderColor: '#ddbf94',
  margin: '24px 0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#cd853f',
  color: '#ffffff',
  padding: '12px 32px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
  display: 'inline-block',
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
