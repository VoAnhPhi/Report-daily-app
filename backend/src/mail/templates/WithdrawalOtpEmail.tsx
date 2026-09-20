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
  otp: string;
  amount: number;
}

export const WithdrawalOtpEmail = ({ name, otp, amount }: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview style={{ fontWeight: 'bold' }}>
      [{otp}] Mã OTP xác thực rút tiền cho tài khoản ACTA của bạn
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

        {/* Main content */}
        <Section style={content}>
          <Heading style={h1}>Xin chào {name}!</Heading>
          <Text style={text}>
            📧 Chúng tôi nhận được yêu cầu rút tiền từ tài khoản ACTA của bạn.
            Để bảo mật giao dịch, vui lòng sử dụng mã OTP bên dưới để xác thực:
          </Text>

          <Section style={amountSection}>
            <Text style={amountLabel}>💵 Số tiền rút:</Text>
            <Text style={amountValue}>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(amount)}
            </Text>
          </Section>

          <Section style={amountSection}>
            <Text style={amountLabel}>
              + Số tiền thực nhận (sau khi trừ 10% thuế TNCN):
            </Text>
            <Text style={amountValue}>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(amount - amount * 0.1)}
            </Text>
          </Section>
          <Section style={otpSection}>
            <Text style={otpLabel}>🔢 Mã OTP của bạn:</Text>
            <Text style={otpCode}>{otp}</Text>
            <Text style={otpNote}>⏱️ Mã này chỉ có hiệu lực trong 5 phút</Text>
          </Section>

          <Section style={instructionSection}>
            <Text style={instructionTitle}>📝 Hướng dẫn sử dụng:</Text>
            <Text style={instructionText}>
              1. 📱 Tại giao diện xác nhận rút tiền
            </Text>
            <Text style={instructionText}>
              2. 🔤 Nhập mã OTP: <strong>{otp}</strong>
            </Text>
            <Text style={instructionText}>
              3. ✅ Nhấn "Xác nhận OTP" để hoàn tất
            </Text>
            <Text style={instructionText}>
              4. 🎉 Yêu cầu rút tiền của bạn sẽ được xử lý
            </Text>
          </Section>

          <Section style={warningSection}>
            <Text style={warningTitle}>⚠️ Lưu ý bảo mật</Text>
            <Text style={warningText}>
              🚫 Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này
              và liên hệ với chúng tôi ngay lập tức để bảo vệ tài khoản của bạn.
            </Text>
            <Text style={warningText}>
              🔒 Không chia sẻ mã OTP này với bất kỳ ai, kể cả nhân viên ACTA.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>⏰ Thời hạn:</strong> Mã OTP này sẽ hết hạn sau 5 phút kể từ
            khi email được gửi. Nếu mã hết hạn, vui lòng yêu cầu mã mới.
          </Text>

          <Text style={footer}>
            💬 Cần hỗ trợ? Liên hệ với chúng tôi tại{' '}
            <a
              href="mailto:lienhe@acta.vn"
              style={link}
              target="_blank"
              rel="noreferrer"
            >
              lienhe@acta.vn
            </a>
          </Text>

          <Text style={footer}>
            🌐 Hoặc ghé thăm{' '}
            <a
              href="https://acta.vn"
              style={link}
              target="_blank"
              rel="noreferrer"
            >
              acta.vn
            </a>
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
  color: 'linear-gradient(135deg, #d6aa6d 0%, #e1c297 100%)',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  textAlign: 'center' as const,
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '20px',
};

const amountSection = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px solid #1a56db',
};

const amountLabel = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const amountValue = {
  color: '#1a56db',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  letterSpacing: '-0.5px',
};

const otpSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px dashed #f59e0b',
};

const otpLabel = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const otpCode = {
  color: '#78350f',
  fontSize: '42px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  margin: '8px 0',
  fontFamily: 'Courier New, monospace',
};

const otpNote = {
  color: '#92400e',
  fontSize: '13px',
  margin: '12px 0 0 0',
  fontStyle: 'italic' as const,
};

const instructionSection = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const instructionTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const instructionText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const warningSection = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #fecaca',
};

const warningTitle = {
  color: '#991b1b',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const warningText = {
  color: '#7f1d1d',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  marginBottom: '12px',
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

const link = {
  color: '#1a56db',
  textDecoration: 'underline',
};

export default WithdrawalOtpEmail;
