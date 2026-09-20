import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Heading,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface NewBusinessUserCredentialsEmailProps {
  name: string;
  email: string;
  tempPassword: string;
  businessName: string;
  verificationUrl: string;
}

export const NewBusinessUserCredentialsEmail = ({
  name = 'Người dùng',
  email = 'user@example.com',
  tempPassword = 'TempPass123',
  businessName = 'Doanh nghiệp ABC',
  verificationUrl = 'https://acta.vn/verify-email?token=xxx',
}: NewBusinessUserCredentialsEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Heading style={h1}>Liên minh Cộng đồng thực chiến (ACTA)</Heading>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={h2}>Chào mừng đến với ACTA!</Heading>

          <Text style={text}>
            Xin chào <strong>{name}</strong>,
          </Text>

          <Text style={text}>
            Tài khoản của bạn đã được tạo thành công cho doanh nghiệp{' '}
            <strong>{businessName}</strong>. Dưới đây là thông tin đăng nhập của
            bạn:
          </Text>

          {/* Credentials Box */}
          <Section style={credentialsBox}>
            <Row style={credentialRow}>
              <Column style={credentialLabel}>
                <Text style={credentialLabelText}>Email đăng nhập:</Text>
              </Column>
              <Column style={credentialValue}>
                <Text style={credentialValueText}>{email}</Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row style={credentialRow}>
              <Column style={credentialLabel}>
                <Text style={credentialLabelText}>Mật khẩu tạm thời:</Text>
              </Column>
              <Column style={credentialValue}>
                <Text style={credentialPasswordText}>{tempPassword}</Text>
              </Column>
            </Row>
          </Section>

          {/* Security Warning */}
          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ <strong>Quan trọng về bảo mật:</strong>
            </Text>
            <Text style={warningText}>
              • Đây là mật khẩu tạm thời, vui lòng đổi mật khẩu ngay sau khi
              đăng nhập lần đầu
            </Text>
            <Text style={warningText}>
              • Không chia sẻ thông tin đăng nhập với bất kỳ ai
            </Text>
            <Text style={warningText}>
              • Sử dụng mật khẩu mạnh với ít nhất 8 ký tự, bao gồm chữ hoa, chữ
              thường, số và ký tự đặc biệt
            </Text>
          </Section>

          {/* Verification Notice */}
          <Section style={verificationBox}>
            <Text style={text}>
              <strong>Bước tiếp theo:</strong>
            </Text>
            <Text style={text}>
              1. Xác thực email của bạn bằng cách nhấn vào nút bên dưới
            </Text>
            <Text style={text}>
              2. Sau khi xác thực, bạn có thể đăng nhập vào hệ thống
            </Text>
            <Text style={text}>
              3. Đổi mật khẩu tạm thời trong phần cài đặt tài khoản
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Link href={verificationUrl} style={button}>
              Xác thực Email
            </Link>
          </Section>

          <Text style={text}>
            Hoặc sao chép và dán liên kết sau vào trình duyệt:
          </Text>
          <Text style={linkText}>{verificationUrl}</Text>

          {/* Info */}
          <Text style={infoText}>
            Link xác thực sẽ hết hạn sau 1 giờ. Nếu bạn không thực hiện yêu cầu
            này, vui lòng bỏ qua email này.
          </Text>
        </Section>

        {/* Footer */}
        <Hr style={hr} />
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} Liên minh Cộng đồng thực chiến (ACTA)
          </Text>
          <Text style={footerText}>
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi tại{' '}
            <Link href="mailto:lienhe@acta.vn" style={footerLink}>
              lienhe@acta.vn
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 40px',
  backgroundColor: '#0066cc',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const h2 = {
  color: '#0066cc',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '16px',
};

const content = {
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '16px',
};

const credentialsBox = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #0066cc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const credentialRow = {
  marginBottom: '0',
};

const credentialLabel = {
  width: '40%',
  verticalAlign: 'middle' as const,
};

const credentialValue = {
  width: '60%',
  verticalAlign: 'middle' as const,
};

const credentialLabelText = {
  color: '#666',
  fontSize: '14px',
  fontWeight: '500',
  margin: '8px 0',
};

const credentialValueText = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '8px 0',
  wordBreak: 'break-all' as const,
};

const credentialPasswordText = {
  color: '#0066cc',
  fontSize: '18px',
  fontWeight: '700',
  fontFamily: 'monospace',
  backgroundColor: '#e6f2ff',
  padding: '8px 12px',
  borderRadius: '4px',
  display: 'inline-block',
  margin: '8px 0',
};

const divider = {
  borderColor: '#e0e0e0',
  margin: '12px 0',
};

const warningBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const warningText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '4px 0',
};

const verificationBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0066cc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0066cc',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
};

const linkText = {
  color: '#0066cc',
  fontSize: '14px',
  lineHeight: '24px',
  wordBreak: 'break-all' as const,
  marginBottom: '16px',
};

const infoText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '24px',
  fontStyle: 'italic',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 40px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
};

const footerLink = {
  color: '#0066cc',
  textDecoration: 'underline',
};

export default NewBusinessUserCredentialsEmail;
