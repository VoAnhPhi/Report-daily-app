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

interface ProductReviewSubmittedEmailProps {
  productName: string;
  reviewType: 'create' | 'update' | 'delete';
  submitterName: string;
  reviewUrl: string;
}

const reviewTypeLabels: Record<'create' | 'update' | 'delete', string> = {
  create: 'tạo mới',
  update: 'cập nhật',
  delete: 'xóa',
};

export const ProductReviewSubmittedEmail = ({
  productName = 'Sản phẩm',
  reviewType = 'create',
  submitterName = 'Người dùng',
  reviewUrl = 'https://admin.acta.vn/e-commerce/reviews',
}: ProductReviewSubmittedEmailProps) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>Yêu cầu duyệt sản phẩm mới trên ACTA</Preview>
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
          <Heading style={h1}>Yêu cầu duyệt sản phẩm</Heading>

          <Text style={text}>
            <strong style={highlightText}>{submitterName}</strong> đã gửi yêu
            cầu{' '}
            <strong style={highlightText}>
              {reviewTypeLabels[reviewType]}
            </strong>{' '}
            sản phẩm{' '}
            <strong style={highlightText}>&ldquo;{productName}&rdquo;</strong>
          </Text>

          <Text style={text}>
            Vui lòng xem xét và phê duyệt yêu cầu này trong hệ thống quản
            trị ACTA.
          </Text>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <a href={reviewUrl} style={button}>
              Xem chi tiết
            </a>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Bạn nhận được email này vì bạn có quyền duyệt sản phẩm trên hệ
            thống ACTA.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            © 2025 ACTA - Affiliate Community&apos;s Tactical Alliance
          </Text>
          <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
          <Text style={footerText}>Số điện thoại: 0912 880 330</Text>
          <Text style={footerText}>
            Địa chỉ: 94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
          </Text>
          <Text style={footerText}>Website: https://acta.vn</Text>
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

const highlightText = {
  color: '#8b4513',
  fontWeight: 'bold',
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

export default ProductReviewSubmittedEmail;
