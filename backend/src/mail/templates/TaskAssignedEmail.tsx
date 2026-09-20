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
import { TaskAssignedData } from '../queue/mail-job.types';

export function taskAssignedSubject(data: TaskAssignedData): string {
  return data.role === 'main'
    ? `Bạn được giao phụ trách: ${data.taskTitle} — ACTA`
    : `Bạn được thêm hỗ trợ công việc: ${data.taskTitle} — ACTA`;
}

export function TaskAssignedEmail(props: TaskAssignedData) {
  const isMain = props.role === 'main';
  const badgeText = isMain ? 'NGƯỜI PHỤ TRÁCH' : 'NGƯỜI HỖ TRỢ';
  const badgeStyle = isMain ? badgeMain : badgeSupport;
  const heading = isMain
    ? 'Bạn được giao phụ trách công việc'
    : 'Bạn được thêm hỗ trợ công việc';
  const intro = isMain
    ? 'Bạn là người phụ trách chính của công việc dưới đây. Vui lòng kiểm tra và bắt đầu thực hiện.'
    : 'Bạn vừa được thêm làm người hỗ trợ cho công việc dưới đây.';

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>{`Công việc ${props.taskTitle} vừa được giao cho bạn`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA"
              width="96"
              height="96"
              style={logo}
            />
          </Section>

          {/* Body */}
          <Section style={content}>
            <span style={badgeStyle}>{badgeText}</span>

            <Heading style={h1}>{heading}</Heading>
            <Text style={lead}>{intro}</Text>

            {/* Task card */}
            <Section style={card}>
              <Text style={cardTitle}>{props.taskTitle}</Text>
              <Hr style={cardHr} />
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={metaTable}
              >
                <tbody>
                  <tr>
                    <td style={tdLabel}>Người giao</td>
                    <td style={tdValue}>{props.assignerName}</td>
                  </tr>
                  {props.dueDate ? (
                    <tr>
                      <td style={tdLabel}>Hạn chót</td>
                      <td style={tdValue}>
                        <span style={duePill}>📅 {props.dueDate}</span>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </Section>

            {/* CTA */}
            {props.taskUrl ? (
              <Section style={ctaSection}>
                <a href={props.taskUrl} style={ctaButton}>
                  Xem công việc
                </a>
              </Section>
            ) : null}

            <Text style={hint}>
              Nếu nút không hoạt động, mở liên kết: {props.taskUrl}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Hr style={footerHr} />
            <Text style={footerText}>
              Email tự động từ hệ thống ACTA — vui lòng không trả lời email này.
            </Text>
            <Text style={footerText}>© 2025 ACTA</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default TaskAssignedEmail;

/* ----------------------------- styles ----------------------------- */

const main = {
  backgroundColor: '#f4f1e9',
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  padding: '24px 0',
};
const container = {
  backgroundColor: '#ffffff',
  maxWidth: '560px',
  margin: '0 auto',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '1px solid #ece6d8',
};
const header = {
  padding: '28px 40px',
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
  textAlign: 'center' as const,
};
const logo = { margin: '0 auto', display: 'block' };

const content = { padding: '28px 40px 8px' };

const badgeBase = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  padding: '4px 12px',
  borderRadius: '999px',
  marginBottom: '14px',
};
const badgeMain = {
  ...badgeBase,
  color: '#047857',
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
};
const badgeSupport = {
  ...badgeBase,
  color: '#1d4ed8',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
};

const h1 = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 8px',
  lineHeight: '1.3',
};
const lead = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const card = {
  backgroundColor: '#fbf9f3',
  border: '1px solid #ece5d4',
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '0 0 24px',
};
const cardTitle = {
  fontSize: '17px',
  fontWeight: 700,
  color: '#1f2937',
  margin: '0',
  lineHeight: '1.4',
};
const cardHr = { borderColor: '#ece5d4', margin: '12px 0' };

const metaTable = { borderCollapse: 'collapse' as const };
const tdLabel = {
  fontSize: '12px',
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.3px',
  padding: '6px 0',
  width: '120px',
  verticalAlign: 'top' as const,
  whiteSpace: 'nowrap' as const,
};
const tdValue = {
  fontSize: '14px',
  color: '#374151',
  fontWeight: 600,
  padding: '6px 0',
  verticalAlign: 'top' as const,
};
const duePill = {
  display: 'inline-block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#b45309',
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '3px 10px',
};

const ctaSection = { textAlign: 'center' as const, margin: '4px 0 8px' };
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#1f2937',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  padding: '12px 32px',
  borderRadius: '10px',
};
const hint = {
  fontSize: '11px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '12px 0 0',
  wordBreak: 'break-all' as const,
};

const footerSection = { padding: '8px 40px 24px', textAlign: 'center' as const };
const footerHr = { borderColor: '#f0ece1', margin: '8px 0 14px' };
const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '2px 0',
  lineHeight: '1.5',
};
