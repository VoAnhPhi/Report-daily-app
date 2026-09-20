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

interface Props {
  name: string;
  reason?: string;
  deactivatedAt: Date;
}

/**
 * Sent exactly once when an admin moves an account to `inactive`
 * (UserService.notifyAccountDeactivated guards against repeats by comparing
 * the previous status). Referrer rejections have their own email and must NOT
 * also send this one.
 */
export const AccountDeactivatedEmail = ({
  name = 'Khách hàng',
  reason,
  deactivatedAt = new Date(),
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      Tài khoản của bạn tại ACTA đã bị vô hiệu hóa. Vui lòng liên hệ ACTA để
      được hỗ trợ.
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
          <Heading style={h1}>Xin chào {name},</Heading>

          <Text style={text}>
            Chúng tôi thông báo rằng tài khoản của bạn tại{' '}
            <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong> đã bị{' '}
            <strong>vô hiệu hóa</strong> vào lúc{' '}
            {deactivatedAt.toLocaleString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
            })}
            .
          </Text>

          {reason ? (
            <Section style={reasonSection}>
              <Text style={reasonTitle}>Lý do vô hiệu hóa:</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          ) : null}

          <Text style={text}>
            Kể từ thời điểm này, tài khoản của bạn không thể đăng nhập hoặc sử
            dụng các chức năng của hệ thống, bao gồm cả chức năng quên mật
            khẩu.
          </Text>

          <Text style={text}>
            Nếu bạn cho rằng đây là nhầm lẫn hoặc cần thêm thông tin, vui lòng
            liên hệ ACTA để được hỗ trợ:
          </Text>

          <Section style={featuresSection}>
            <Text style={featureText}>
              • Email:{' '}
              <a
                href="mailto:lienhe@acta.vn"
                style={link}
                target="_blank"
                rel="noreferrer"
              >
                lienhe@acta.vn
              </a>
            </Text>
            <Text style={featureText}>• Số điện thoại: 0912 880 330</Text>
            <Text style={featureText}>• Website: https://acta.vn</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Đội ngũ ACTA luôn sẵn sàng giải đáp mọi thắc mắc về quyết định này.
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

// Styles with beige theme (same palette as AdminRejectAccountUser)
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

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const reasonSection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const reasonTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const reasonText = {
  color: '#7f1d1d',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0',
  fontStyle: 'italic',
};

const featuresSection = {
  margin: '24px 0',
  padding: '0 0 0 20px',
};

const featureText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 12px',
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
