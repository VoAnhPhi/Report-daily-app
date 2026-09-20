import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface Props {
  submitterName: string;
  reviewerName: string;
  reviewType: string;
  targetType: string;
  targetName: string;
  reviewNote?: string;
  urlLink?: string;
}

export const WarehouseReviewApprovedEmail = ({
  submitterName = '',
  reviewerName = '',
  reviewType = '',
  targetType = '',
  targetName = '',
  reviewNote,
  urlLink = '',
}: Props) => (
  <Html>
    <Head />
    <Preview>Yêu cầu duyệt kho hàng đã được phê duyệt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerText}>
            Liên minh Cộng đồng thực chiến (ACTA)
          </Heading>
        </Section>

        <Section style={content}>
          <Heading style={h2}>Xin chào {submitterName}!</Heading>

          <Heading style={h2}>Yêu cầu đã được duyệt ✓</Heading>

          <Text style={paragraph}>
            Yêu cầu <strong>{reviewType}</strong> {targetType} &quot;
            <strong>{targetName}</strong>&quot; của bạn đã được{' '}
            <strong>{reviewerName}</strong> phê duyệt.
          </Text>

          {reviewNote && (
            <Section style={noteBox}>
              <Text style={noteText}>
                <strong>Nhận xét:</strong> {reviewNote}
              </Text>
            </Section>
          )}

          {urlLink && (
            <Section style={buttonContainer}>
              <Button style={button} href={urlLink}>
                Xem chi tiết
              </Button>
            </Section>
          )}

          <Section style={successBox}>
            <Text style={successText}>
              Thay đổi đã được áp dụng vào hệ thống.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Trân trọng,
            <br />
            <strong>Đội ngũ ACTA E-commerce</strong>
          </Text>
        </Section>

        <Section style={footerSection}>
          <Text style={footerText}>
            Email này được gửi tự động từ hệ thống ACTA.
            <br />
            Vui lòng không trả lời email này.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  textAlign: 'center' as const,
};

const headerText = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '30px',
  backgroundColor: '#ffffff',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const paragraph = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#28a745',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
};

const noteBox = {
  backgroundColor: '#fff3cd',
  padding: '15px',
  borderRadius: '8px',
  margin: '0 0 20px 0',
  border: '1px solid #ffc107',
};

const noteText = {
  color: '#856404',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const successBox = {
  backgroundColor: '#d4edda',
  padding: '15px',
  borderRadius: '8px',
  margin: '0 0 20px 0',
  border: '1px solid #c3e6cb',
};

const successText = {
  color: '#155724',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '20px 0',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const footerSection = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#666',
  margin: '0',
};
