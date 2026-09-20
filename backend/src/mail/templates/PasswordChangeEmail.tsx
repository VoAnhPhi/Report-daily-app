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
}

export const PasswordChangeEmail = ({ name, otp }: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      Mã OTP xác thực thay đổi mật khẩu cho tài khoản ACTA của bạn
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
          <Heading style={h1}>🔐 Xin chào {name}!</Heading>
          <Text style={text}>
            📧 Chúng tôi nhận được yêu cầu thay đổi mật khẩu cho tài khoản ACTA
            của bạn. Để bảo mật tài khoản, vui lòng sử dụng mã OTP bên dưới để
            xác thực:
          </Text>

          <Section style={otpSection}>
            <Text style={otpLabel}>🔢 Mã OTP của bạn:</Text>
            <Text style={otpCode}>{otp}</Text>
            <Text style={otpNote}>⏱️ Mã này chỉ có hiệu lực trong 10 phút</Text>
          </Section>

          <Section style={instructionSection}>
            <Text style={instructionTitle}>📝 Hướng dẫn sử dụng:</Text>
            <Text style={instructionText}>
              1. 📱 Tại giao diện đổi mật khẩu của "Cài đặt"
            </Text>
            <Text style={instructionText}>
              2. 🔤 Nhập mã OTP: <strong>{otp}</strong>
            </Text>
            <Text style={instructionText}>
              3. ✅ Nhấn "Xác thực" để tiếp tục
            </Text>
            <Text style={instructionText}>
              4. 🔑 Mật khẩu mới của bạn đã được thiết lập
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
            <strong>⏰ Thời hạn:</strong> Mã OTP này sẽ hết hạn sau 2 phút kể từ
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
              📧 lienhe@acta.vn
            </a>{' '}
            hoặc gọi hotline: 📞 0912 880 330
          </Text>

          <Section style={securityTipsSection}>
            <Text style={securityTitle}>🛡️ Mẹo bảo mật tài khoản:</Text>
            <div style={tipsList}>
              <Text style={tipItem}>
                🔐 Chỉ nhập OTP trên trang web chính thức của ACTA
              </Text>
              <Text style={tipItem}>
                👀 Kiểm tra đường dẫn liên kết chính xác: https://acta.vn
              </Text>
              <Text style={tipItem}>
                🚫 Không chia sẻ mã OTP qua điện thoại hoặc tin nhắn
              </Text>
              <Text style={tipItem}>🔄 Yêu cầu mã mới nếu nghi ngờ bị lộ</Text>
              <Text style={tipItem}>
                📱 Đăng xuất khỏi tất cả thiết bị sau khi đổi mật khẩu
              </Text>
            </div>
          </Section>
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
            Email này được gửi tự động từ hệ thống bảo mật ACTA. Vui lòng không
            trả lời trực tiếp email này.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles with beige theme (same as original)
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
  padding: '40px 50px', // Increased padding
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
  padding: '50px', // Increased padding
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
  transition: 'all 0.3s ease',
};

const infoSection = {
  backgroundColor: '#f0f8ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #ddbf94',
};

const infoTitle = {
  color: '#8b4513',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};

const warningSection = {
  backgroundColor: '#fff3cd',
  padding: '25px', // Increased padding
  borderRadius: '10px',
  margin: '25px 0', // Increased margin
  border: '2px solid #ffc107',
};

const warningTitle = {
  color: '#856404',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const warningText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

const securityTipsSection = {
  backgroundColor: '#faf8f3',
  padding: '25px', // Increased padding
  borderRadius: '10px',
  margin: '25px 0', // Increased margin
  border: '1px solid #ddbf94',
};

const securityTitle = {
  color: '#8b4513',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const tipsList = {
  margin: '0',
};

const tipItem = {
  color: '#6b7280',
  fontSize: '14px',
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
  padding: '30px 50px', // Increased padding
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

const otpSection = {
  backgroundColor: '#e8f5e8',
  padding: '30px', // Added padding
  borderRadius: '12px',
  margin: '30px 0', // Increased margin
  border: '2px solid #4caf50',
  textAlign: 'center' as const,
};

const otpLabel = {
  color: '#2e7d32',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 15px',
};

const otpCode = {
  color: '#1b5e20',
  fontSize: '36px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  letterSpacing: '8px',
  margin: '0 0 15px',
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '2px dashed #4caf50',
};

const otpNote = {
  color: '#d32f2f',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const instructionSection = {
  backgroundColor: '#f3f8ff',
  padding: '25px', // Added padding
  borderRadius: '10px',
  margin: '25px 0', // Increased margin
  border: '1px solid #2196f3',
};

const instructionTitle = {
  color: '#1565c0',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 15px',
};

const instructionText = {
  color: '#424242',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 10px',
  paddingLeft: '10px', // Added padding
};
