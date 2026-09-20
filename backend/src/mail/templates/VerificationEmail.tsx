import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Img,
} from '@react-email/components';

interface Props {
  name: string;
  url: string;
}

export const VerificationEmail = ({
  name = 'Khách hàng',
  url = '#',
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      Chào mừng bạn đến với Liên minh Cộng đồng thực chiến (ACTA)!
    </Preview>
    <Body style={main}>
      <Container style={container}>
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

        <Section style={content}>
          <Heading style={h1}>Xin chào {name}! 🎉</Heading>

          <Text style={text}>
            Cảm ơn bạn đã tham gia{' '}
            <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong>. Để kích hoạt
            tài khoản và bắt đầu hành trình{' '}
            <strong>"Kết nối đỉnh cao, lợi nhuận bền vững"</strong>, vui lòng
            xác nhận địa chỉ email của bạn.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={url}>
              ✨ Xác nhận email ngay ✨
            </Button>
          </Section>

          <Section style={{ marginTop: 20, textAlign: 'center' }}>
            <Text style={{ ...text, fontSize: 14, color: '#b7810b' }}>
              Nếu bạn không bấm được nút trên, hãy sao chép (copy) hoặc nhấn vào
              đường link bên dưới để xác nhận email:
            </Text>
            <Text
              style={{
                wordBreak: 'break-all',
                background: '#fff6dc',
                border: '1px dashed #d4b04b',
                padding: '10px',
                margin: '16px 0 0 0',
                borderRadius: 4,
                fontSize: 15,
                color: '#ba7107',
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            >
              {url}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>⏰ Lưu ý:</strong> Liên kết xác nhận này sẽ hết hạn sau 1
            giờ. Sau thời gian này, bạn sẽ cần yêu cầu gửi lại email xác nhận
            mới. Nếu bạn không tạo tài khoản này, bạn có thể bỏ qua email này.
          </Text>

          <Text style={footer}>
            Nếu bạn gặp khó khăn hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi
            tại{' '}
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
            Bạn nhận được email này vì đã đăng ký tài khoản tại hệ thống ACTA
            của chúng tôi.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles with golden/yellow theme
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
  boxShadow: '0 4px 20px rgba(251, 191, 36, 0.1)',
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  background: 'linear-gradient(135deg, #ddbf94 0%, #cd853f 100%)',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(221, 191, 148, 0.3)',
};

const hr = {
  borderColor: '#fde68a',
  margin: '32px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
};

// Update link color to lighter
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

const benefitsSection = {
  background: 'linear-gradient(135deg, #faf8f3 0%, #f5f5dc 100%)',
  padding: '32px 24px',
  borderRadius: '16px',
  margin: '32px 0',
  border: '2px solid #ddbf94',
  boxShadow: '0 8px 25px rgba(221, 191, 148, 0.15)',
};

const benefitsHeader = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const benefitsTitle = {
  color: '#8b4513',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const benefitsSubtitle = {
  color: '#a0522d',
  fontSize: '16px',
  margin: '0 0 24px',
};

const benefitsGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  maxWidth: '100%',
};

const benefitCard = {
  backgroundColor: '#ffffff',
  padding: '20px',
  borderRadius: '12px',
  textAlign: 'center' as const,
  border: '1px solid #ddbf94',
  boxShadow: '0 4px 12px rgba(221, 191, 148, 0.1)',
};

const benefitIcon = {
  fontSize: '32px',
  marginBottom: '12px',
};

const benefitTitle = {
  color: '#8b4513',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const benefitDesc = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0',
};
