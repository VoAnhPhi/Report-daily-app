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

interface BusinessCreatedEmailProps {
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  businessAddress?: string;
  businessWebsite?: string;
  ownerName: string;
  businessType: string;
  verified: boolean;
  dashboardUrl?: string;
}

export const BusinessCreatedEmail = ({
  businessName = 'Doanh nghiệp ABC',
  businessEmail = 'business@example.com',
  businessPhone = 'Chưa cập nhật',
  businessAddress = 'Chưa cập nhật',
  businessWebsite = 'Chưa cập nhật',
  ownerName = 'Người quản lý',
  businessType = 'expansion',
  verified = false,
  dashboardUrl = 'https://acta.vn/dashboard',
}: BusinessCreatedEmailProps) => (
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
          <Heading style={h2}>
            🎉 Chúc mừng! Doanh nghiệp đã khởi tạo thành công
          </Heading>

          <Text style={text}>
            Kính gửi <strong>{ownerName}</strong>,
          </Text>

          <Text style={text}>
            Chúng tôi xin thông báo rằng doanh nghiệp{' '}
            <strong>{businessName}</strong> đã được đăng ký thành công trên Hệ
            sinh thái ACTA. Chúng tôi rất vui mừng được đồng hành cùng bạn trong
            hành trình phát triển cộng đồng.
          </Text>

          {/* Business Information Box */}
          <Section style={infoBox}>
            <Heading style={h3}>📋 Thông tin doanh nghiệp</Heading>

            <Row style={infoRow}>
              <Column style={infoLabel}>
                <Text style={infoLabelText}>Tên doanh nghiệp:</Text>
              </Column>
              <Column style={infoValue}>
                <Text style={infoValueText}>{businessName}</Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row style={infoRow}>
              <Column style={infoLabel}>
                <Text style={infoLabelText}>Email:</Text>
              </Column>
              <Column style={infoValue}>
                <Text style={infoValueText}>{businessEmail}</Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row style={infoRow}>
              <Column style={infoLabel}>
                <Text style={infoLabelText}>Số điện thoại:</Text>
              </Column>
              <Column style={infoValue}>
                <Text style={infoValueText}>
                  {businessPhone || 'Chưa cập nhật'}
                </Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row style={infoRow}>
              <Column style={infoLabel}>
                <Text style={infoLabelText}>Địa chỉ:</Text>
              </Column>
              <Column style={infoValue}>
                <Text style={infoValueText}>
                  {businessAddress || 'Chưa cập nhật'}
                </Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row style={infoRow}>
              <Column style={infoLabel}>
                <Text style={infoLabelText}>Website:</Text>
              </Column>
              <Column style={infoValue}>
                <Text style={infoValueText}>
                  {businessWebsite || 'Chưa cập nhật'}
                </Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row style={infoRow}>
              <Column style={infoLabel}>
                <Text style={infoLabelText}>Loại hình:</Text>
              </Column>
              <Column style={infoValue}>
                <Text style={infoValueText}>
                  {businessType === 'expansion' ? 'Mở rộng' : 'Khác'}
                </Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row style={infoRow}>
              <Column style={infoLabel}>
                <Text style={infoLabelText}>Trạng thái xác thực:</Text>
              </Column>
              <Column style={infoValue}>
                <Text style={verified ? statusVerifiedText : statusPendingText}>
                  {verified ? '✓ Đã xác thực' : '⏳ Chờ xác thực'}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Status Notice */}
          {!verified && (
            <Section style={warningBox}>
              <Text style={warningText}>
                <strong>📌 Lưu ý quan trọng:</strong>
              </Text>
              <Text style={warningText}>
                Doanh nghiệp của bạn hiện đang ở trạng thái{' '}
                <strong>chờ xác thực</strong>. Đội ngũ ACTA sẽ xem xét và xác
                thực thông tin doanh nghiệp của bạn trong thời gian sớm nhất.
              </Text>
            </Section>
          )}

          {/* Next Steps */}
          <Section style={stepsBox}>
            <Text style={text}>
              <strong>🚀 Các bước tiếp theo:</strong>
            </Text>
            <Text style={stepText}>
              1. <strong>Đăng nhập vào hệ thống</strong> để quản lý doanh nghiệp
              của bạn
            </Text>
            <Text style={stepText}>
              2. <strong>Hoàn thiện thông tin doanh nghiệp</strong> để tăng độ
              tin cậy
            </Text>
            <Text style={stepText}>
              3. <strong>Thêm sản phẩm/dịch vụ</strong> để bắt đầu kinh doanh
            </Text>
            <Text style={stepText}>
              4. <strong>Kết nối với khách hàng</strong> và mở rộng kinh doanh
            </Text>
          </Section>

          {/* CTA Button */}
          {dashboardUrl && (
            <Section style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>
                Truy cập Dashboard
              </Link>
            </Section>
          )}

          {/* Support Information */}
          <Section style={supportBox}>
            <Text style={text}>
              <strong>💬 Cần hỗ trợ?</strong>
            </Text>
            <Text style={supportText}>
              Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, đừng ngần ngại liên
              hệ với chúng tôi:
            </Text>
            <Text style={supportText}>
              • Email:{' '}
              <Link href="mailto:lienhe@acta.vn" style={supportLink}>
                lienhe@acta.vn
              </Link>
            </Text>
            <Text style={supportText}>• Hotline: 0912 880 330</Text>
            <Text style={supportText}>
              • Địa chỉ: 94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
            </Text>
          </Section>

          <Text style={infoText}>
            Chúng tôi rất mong được đồng hành cùng bạn trên hành trình phát
            triển kinh doanh!
          </Text>
        </Section>

        {/* Footer */}
        <Hr style={hr} />
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} Liên minh Cộng đồng thực chiến (ACTA)
          </Text>
          <Text style={footerText}>
            Affiliate Community's Tactical Alliance - Kết nối đỉnh cao, lợi
            nhuận bền vững
          </Text>
          <Text style={footerText}>Website: https://acta.vn</Text>
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

const h3 = {
  color: '#0066cc',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
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

const infoBox = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #0066cc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const infoRow = {
  marginBottom: '0',
};

const infoLabel = {
  width: '40%',
  verticalAlign: 'middle' as const,
};

const infoValue = {
  width: '60%',
  verticalAlign: 'middle' as const,
};

const infoLabelText = {
  color: '#666',
  fontSize: '14px',
  fontWeight: '500',
  margin: '8px 0',
};

const infoValueText = {
  color: '#333',
  fontSize: '15px',
  fontWeight: '600',
  margin: '8px 0',
  wordBreak: 'break-all' as const,
};

const statusVerifiedText = {
  color: '#28a745',
  fontSize: '15px',
  fontWeight: '700',
  margin: '8px 0',
};

const statusPendingText = {
  color: '#ffc107',
  fontSize: '15px',
  fontWeight: '700',
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

const stepsBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0066cc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const stepText = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
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

const supportBox = {
  backgroundColor: '#e8f5e9',
  border: '1px solid #4caf50',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const supportText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '4px 0',
};

const supportLink = {
  color: '#0066cc',
  textDecoration: 'underline',
  fontWeight: '600',
};

const infoText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '24px',
  fontStyle: 'italic',
  textAlign: 'center' as const,
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

export default BusinessCreatedEmail;
