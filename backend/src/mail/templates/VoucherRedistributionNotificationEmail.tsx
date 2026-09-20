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
  additionalUsage: number;
  totalUsage: number;
  wasStatusUpdated?: boolean;
  voucherDescription?: string;
}

export const VoucherRedistributionNotificationEmail = ({
  userName = 'Khách hàng',
  voucherName = 'Voucher đặc biệt',
  voucherCode = 'VOUCHER123',
  voucherValue = 'Giảm 10%',
  validFrom = '01/01/2024',
  validTo = '31/12/2024',
  minOrderAmount = '200.000₫',
  additionalUsage = 1,
  totalUsage = 2,
  wasStatusUpdated = false,
  voucherDescription = 'Voucher đặc biệt dành cho bạn',
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      🎁 Tin vui! Voucher {voucherName} của bạn đã được tăng số lần sử dụng
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>🎁 Tin vui!</Heading>
          <Text style={headerText}>
            Voucher của bạn đã được tăng số lần sử dụng
          </Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Xin chào {userName},</Text>

          <Text style={paragraph}>
            Chúng tôi có tin vui cho bạn! Voucher <strong>{voucherName}</strong>{' '}
            mà bạn đã sở hữu đã được tăng thêm{' '}
            <strong>{additionalUsage} lần sử dụng</strong>.
          </Text>

          <Text style={paragraph}>
            Bây giờ bạn có thể sử dụng voucher này tối đa{' '}
            <strong>{totalUsage} lần</strong> thay vì chỉ{' '}
            {totalUsage - additionalUsage} lần như trước đây.
          </Text>

          {wasStatusUpdated && (
            <Text style={statusUpdateText}>
              🎉 <strong>Tin vui thêm:</strong> Voucher của bạn đã được kích
              hoạt lại và có thể sử dụng ngay!
            </Text>
          )}

          <Section style={voucherCard}>
            <Row>
              <Column style={voucherInfo}>
                <Text style={voucherTitle}>{voucherName}</Text>
                <Text style={voucherCodeStyle}>Mã: {voucherCode}</Text>
                <Text style={voucherValueStyle}>{voucherValue}</Text>
                {voucherDescription && (
                  <Text style={voucherDescriptionStyle}>
                    {voucherDescription}
                  </Text>
                )}
              </Column>
            </Row>

            <Hr style={divider} />

            <Row>
              <Column style={voucherDetails}>
                <Text style={detailItem}>
                  <strong>Đơn tối thiểu:</strong> {minOrderAmount}
                </Text>
                <Text style={detailItem}>
                  <strong>Hiệu lực từ:</strong> {validFrom}
                </Text>
                <Text style={detailItem}>
                  <strong>Hết hạn:</strong> {validTo}
                </Text>
                <Text style={detailItem}>
                  <strong>Số lần sử dụng:</strong> {totalUsage} lần
                </Text>
              </Column>
            </Row>
          </Section>

          <Text style={paragraph}>
            Hãy nhanh tay sử dụng voucher này để không bỏ lỡ cơ hội tiết kiệm
            chi phí mua sắm nhé!
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href="https://e-commerce.acta.vn">
              Mua sắm ngay
            </Button>
          </Section>

          <Text style={paragraph}>
            Nếu bạn có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ với chúng tôi
            qua email{' '}
            <a href="mailto:lienhe@acta.vn" style={link}>
              lienhe@acta.vn
            </a>
            .
          </Text>

          <Text style={signature}>
            Trân trọng,
            <br />
            Đội ngũ Acta
          </Text>
        </Section>

        <Hr style={footerDivider} />

        <Section style={footer}>
          <Text style={footerText}>
            © 2024 Liên minh Cộng đồng thực chiến (ACTA). Tất cả quyền được bảo
            lưu.
          </Text>
          <Text style={footerText}>
            Email này được gửi tự động, vui lòng không trả lời trực tiếp.
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
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#2563eb',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const headerText = {
  color: '#ffffff',
  fontSize: '16px',
  margin: '0',
  opacity: 0.9,
};

const content = {
  padding: '32px 24px',
};

const greeting = {
  fontSize: '18px',
  lineHeight: '28px',
  marginBottom: '24px',
  color: '#1f2937',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
  color: '#374151',
};

const statusUpdateText = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
  color: '#059669',
  backgroundColor: '#f0fdf4',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #bbf7d0',
};

const voucherCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const voucherInfo = {
  textAlign: 'center' as const,
};

const voucherTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 8px',
};

const voucherCodeStyle = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '0 0 8px',
  fontFamily: 'monospace',
};

const voucherValueStyle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#059669',
  margin: '0 0 8px',
};

const voucherDescriptionStyle = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  fontStyle: 'italic' as const,
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
};

const voucherDetails = {
  textAlign: 'left' as const,
};

const detailItem = {
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
  color: '#374151',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const signature = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0 0',
  color: '#374151',
};

const footerDivider = {
  borderColor: '#e2e8f0',
  margin: '32px 0 0',
};

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#6b7280',
  margin: '0 0 8px',
};
