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
  referrerName: string;
  changeTime: Date;
}

export const ReferrerApproveAccountEmail = ({
  name = 'Khách hàng',
  referrerName,
  changeTime = new Date(),
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      Tài khoản của bạn đã được người giới thiệu phê duyệt! Chào mừng bạn đến
      với Liên minh Cộng đồng thực chiến (ACTA).
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
          <Heading style={h1}>Chúc mừng {name}! 🎉</Heading>

          <Text style={text}>
            Tài khoản của bạn tại{' '}
            <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong> đã được{' '}
            <strong style={approvedText}>
              người giới thiệu phê duyệt thành công
            </strong>
            !
          </Text>

          <Text style={text}>
            Người giới thiệu <strong>{referrerName}</strong> đã xác nhận thông
            tin của bạn và chào mừng bạn gia nhập cộng đồng ACTA.
          </Text>

          <Text style={text}>
            Bây giờ bạn có thể truy cập đầy đủ các tính năng của hệ thống và bắt
            đầu hành trình kinh doanh affiliate cùng chúng tôi.
          </Text>

          <Text style={text}>Những gì bạn có thể làm ngay bây giờ:</Text>

          <Section style={featuresSection}>
            <Text style={featureText}>• Đăng nhập vào tài khoản của bạn</Text>
            <Text style={featureText}>
              • Kết nối với người giới thiệu của bạn
            </Text>
            <Text style={featureText}>• Khám phá các sản phẩm affiliate</Text>
            <Text style={featureText}>• Tham gia các chương trình đào tạo</Text>
            <Text style={featureText}>
              • Bắt đầu xây dựng mạng lưới của riêng bạn
            </Text>
            <Text style={featureText}>
              • Kiếm thu nhập từ chiết khấu affiliate
            </Text>
          </Section>

          <Section style={referrerSection}>
            <Text style={referrerText}>
              💡 <strong>Lời khuyên:</strong> Hãy liên hệ với người giới thiệu{' '}
              {referrerName} để được hướng dẫn chi tiết về cách bắt đầu hiệu quả
              nhất!
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội hỗ trợ của
            chúng tôi.
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
            Bạn nhận được email này vì tài khoản của bạn đã được người giới
            thiệu phê duyệt tại hệ thống ACTA.
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

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const approvedText = {
  color: '#059669',
  fontWeight: 'bold',
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

const referrerSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const referrerText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
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
