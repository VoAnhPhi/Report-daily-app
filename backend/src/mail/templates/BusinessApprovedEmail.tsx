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

interface BusinessApprovedEmailProps {
  userName: string;
  userEmail: string;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  businessAddress?: string;
  businessWebsite?: string;
  businessType: string;
  verified: boolean;
  dashboardUrl?: string;
}

export const BusinessApprovedEmail = ({
  userName = 'Người dùng',
  userEmail = 'user@example.com',
  businessName = 'Doanh nghiệp ABC',
  businessEmail = 'business@example.com',
  businessPhone = 'Chưa cập nhật',
  businessAddress = 'Chưa cập nhật',
  businessWebsite = 'Chưa cập nhật',
  businessType = 'expansion',
  verified = true,
  dashboardUrl = 'https://acta.vn/dashboard',
}: BusinessApprovedEmailProps) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      Chúc mừng! Doanh nghiệp {businessName} của bạn đã được phê duyệt thành
      công trên hệ thống ACTA.
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
          <Heading style={h1}>Chúc mừng {userName}! 🎉</Heading>

          <Text style={text}>
            Chúng tôi vui mừng thông báo rằng doanh nghiệp{' '}
            <strong style={businessNameText}>{businessName}</strong> của bạn đã
            được <strong style={approvedText}>phê duyệt thành công</strong> trên
            hệ thống <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong>!
          </Text>

          <Text style={text}>
            Bây giờ bạn có thể bắt đầu sử dụng đầy đủ các tính năng của hệ thống
            và phát triển doanh nghiệp của mình trong cộng đồng ACTA.
          </Text>

          {/* Business Information */}
          <Section style={businessInfoSection}>
            <Heading style={sectionTitle}>
              📋 Thông tin doanh nghiệp đã phê duyệt
            </Heading>

            <Section style={infoBox}>
              <Text style={infoLabel}>Tên doanh nghiệp:</Text>
              <Text style={infoValue}>{businessName}</Text>

              <Text style={infoLabel}>Email doanh nghiệp:</Text>
              <Text style={infoValue}>{businessEmail}</Text>

              <Text style={infoLabel}>Số điện thoại:</Text>
              <Text style={infoValue}>{businessPhone}</Text>

              <Text style={infoLabel}>Địa chỉ:</Text>
              <Text style={infoValue}>{businessAddress}</Text>

              <Text style={infoLabel}>Website:</Text>
              <Text style={infoValue}>{businessWebsite}</Text>

              <Text style={infoLabel}>Loại hình:</Text>
              <Text style={infoValue}>
                {businessType === 'expansion'
                  ? 'Đối tác mở rộng'
                  : 'Đối tác nền tảng'}
              </Text>

              <Text style={infoLabel}>Trạng thái:</Text>
              <Text style={verified ? statusVerified : statusPending}>
                {verified ? '✅ Đã xác thực' : '⏳ Chờ xác thực'}
              </Text>
            </Section>
          </Section>

          {/* Next Steps */}
          <Section style={nextStepsSection}>
            <Heading style={sectionTitle}>🚀 Các bước tiếp theo</Heading>

            <Text style={stepText}>
              <strong>1. Đăng nhập vào hệ thống</strong>
            </Text>
            <Text style={stepDescription}>
              Sử dụng tài khoản {userEmail} để đăng nhập vào dashboard quản lý
              doanh nghiệp.
            </Text>

            <Text style={stepText}>
              <strong>2. Hoàn thiện hồ sơ doanh nghiệp</strong>
            </Text>
            <Text style={stepDescription}>
              Cập nhật đầy đủ thông tin để tăng độ tin cậy và khả năng tiếp cận
              khách hàng.
            </Text>

            <Text style={stepText}>
              <strong>3. Thêm sản phẩm/dịch vụ</strong>
            </Text>
            <Text style={stepDescription}>
              Bắt đầu tạo danh mục sản phẩm để khách hàng có thể tìm hiểu và đặt
              hàng.
            </Text>

            <Text style={stepText}>
              <strong>4. Kết nối với cộng đồng</strong>
            </Text>
            <Text style={stepDescription}>
              Tham gia các chương trình đào tạo và kết nối với các đối tác khác
              trong hệ sinh thái ACTA.
            </Text>
          </Section>

          {/* CTA Button */}
          {dashboardUrl && (
            <Section style={buttonContainer}>
              <a href={dashboardUrl} style={button}>
                Truy cập Dashboard
              </a>
            </Section>
          )}

          {/* Support Information */}
          <Section style={supportSection}>
            <Text style={supportTitle}>💬 Cần hỗ trợ?</Text>
            <Text style={supportText}>
              Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ trong quá trình sử
              dụng hệ thống, đừng ngần ngại liên hệ với chúng tôi:
            </Text>
            <Text style={supportText}>
              • Email:{' '}
              <a href="mailto:lienhe@acta.vn" style={supportLink}>
                lienhe@acta.vn
              </a>
            </Text>
            <Text style={supportText}>• Hotline: 0912 880 330</Text>
            <Text style={supportText}>
              • Địa chỉ: 94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Chúng tôi rất mong được đồng hành cùng bạn trên hành trình phát
            triển doanh nghiệp trong cộng đồng ACTA!
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
            Bạn nhận được email này vì doanh nghiệp của bạn đã được phê duyệt
            tại hệ thống ACTA.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles with beige theme (consistent with other templates)
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

const businessNameText = {
  color: '#8b4513',
  fontWeight: 'bold',
};

const approvedText = {
  color: '#059669',
  fontWeight: 'bold',
};

const businessInfoSection = {
  margin: '32px 0',
};

const sectionTitle = {
  color: '#8b4513',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #ddbf94',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '8px 0 4px',
};

const infoValue = {
  color: '#374151',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0 0 16px',
  wordBreak: 'break-all' as const,
};

const statusVerified = {
  color: '#059669',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const statusPending = {
  color: '#d97706',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const nextStepsSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #7dd3fc',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
};

const stepText = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '16px 0 8px',
};

const stepDescription = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
  paddingLeft: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#8b4513',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  border: 'none',
};

const supportSection = {
  backgroundColor: '#e8f5e9',
  border: '1px solid #4caf50',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
};

const supportTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const supportText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '4px 0',
};

const supportLink = {
  color: '#8b4513',
  textDecoration: 'underline',
  fontWeight: '600',
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
  textAlign: 'center' as const,
  fontStyle: 'italic',
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

export default BusinessApprovedEmail;
