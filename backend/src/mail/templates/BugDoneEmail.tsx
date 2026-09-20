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
import { BugDoneData } from '../queue/mail-job.types';

export function bugDoneSubject(data: BugDoneData): string {
  return `[${data.bugCode}] Lỗi đã được xử lý xong — ACTA`;
}

export function BugDoneEmail(props: BugDoneData) {
  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>{`Lỗi ${props.bugCode} đã được xử lý xong`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA Logo"
              width="120"
              height="120"
            />
          </Section>
          <Section style={content}>
            <Heading style={h1}>{`Lỗi ${props.bugCode} đã hoàn thành`}</Heading>
            <Text style={text}>Xin chào {props.creatorName},</Text>
            <Text style={text}>
              Báo lỗi <strong>{props.bugCode}</strong> bạn gửi đã được xử lý xong bởi{' '}
              {props.assigneeName}.
            </Text>
            <Hr style={hr} />
            <Text style={label}>Hoàn thành lúc</Text>
            <Text style={text}>{props.doneAt}</Text>
            {props.bugLink ? (
              <>
                <Text style={label}>Liên kết</Text>
                <Text style={text}>{props.bugLink}</Text>
              </>
            ) : null}
          </Section>
          {props.adminLink ? (
            <Section style={ctaSection}>
              <a href={props.adminLink} style={ctaButton}>
                Xem chi tiết lỗi
              </a>
            </Section>
          ) : null}
          <Section style={footerSection}>
            <Text style={footerText}>© 2025 ACTA</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BugDoneEmail;

const main = {
  backgroundColor: '#fefdf8',
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};
const container = {
  backgroundColor: '#ffffff',
  maxWidth: '600px',
  margin: '0 auto',
};
const header = {
  padding: '24px 40px',
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
  textAlign: 'center' as const,
};
const content = { padding: '24px 40px' };
const h1 = { fontSize: '20px', color: '#1f2937', margin: '0 0 16px' };
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6' };
const label = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  margin: '16px 0 4px',
};
const hr = { borderColor: '#e5e7eb', margin: '16px 0' };
const ctaSection = { padding: '4px 40px 12px' };
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#1f2937',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  padding: '10px 20px',
  borderRadius: '6px',
};
const footerSection = { padding: '16px 40px', textAlign: 'center' as const };
const footerText = { fontSize: '12px', color: '#9ca3af' };
