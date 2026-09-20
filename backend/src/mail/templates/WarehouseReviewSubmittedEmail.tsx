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
  adminName: string;
  submitterName: string;
  reviewType: string;
  targetType: string;
  targetName: string;
  note?: string;
  urlLink?: string;
}

export const WarehouseReviewSubmittedEmail = ({
  adminName = 'Admin',
  submitterName = '',
  reviewType = '',
  targetType = '',
  targetName = '',
  note,
  urlLink = '',
}: Props) => (
  <Html>
    <Head />
    <Preview>Yêu cầu duyệt kho hàng mới cần xử lý</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerText}>
            Liên minh Cộng đồng thực chiến (ACTA)
          </Heading>
        </Section>

        <Section style={content}>
          <Heading style={h2}>Xin chào {adminName}!</Heading>

          <Heading style={h2}>Yêu cầu duyệt kho hàng</Heading>

          <Text style={paragraph}>
            <strong>{submitterName}</strong> đã gửi yêu cầu{' '}
            <strong>{reviewType}</strong> {targetType}:{' '}
            <strong>{targetName}</strong>
          </Text>

          {note && (
            <Section style={noteBox}>
              <Text style={noteText}>
                <strong>Ghi chú:</strong> {note}
              </Text>
            </Section>
          )}

          {urlLink && (
            <Section style={buttonContainer}>
              <Button style={button} href={urlLink}>
                Xem yêu cầu duyệt
              </Button>
            </Section>
          )}

          <Section style={noteBox}>
            <Text style={noteText}>
              Vui lòng xem xét và duyệt/từ chối yêu cầu này kịp thời.
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
