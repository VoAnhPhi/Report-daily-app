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
import { TaskDeadlineData } from '../queue/mail-job.types';

type Variant = 'due-soon' | 'overdue';

export function taskDeadlineSubject(
  variant: Variant,
  data: TaskDeadlineData,
): string {
  return variant === 'overdue'
    ? `[QUÁ HẠN] Công việc ${data.taskTitle} — ACTA`
    : `[SẮP HẾT HẠN] Công việc ${data.taskTitle} — ACTA`;
}

export function TaskDeadlineEmail(
  props: TaskDeadlineData & { variant: Variant },
) {
  const isOverdue = props.variant === 'overdue';
  const heading = isOverdue
    ? 'Công việc đã quá hạn'
    : 'Công việc sắp đến hạn';
  const intro = isOverdue
    ? 'Công việc dưới đây đã quá hạn xử lý. Vui lòng kiểm tra và cập nhật.'
    : 'Công việc dưới đây sắp đến hạn. Vui lòng hoàn tất đúng hạn.';
  const badgeStyle = isOverdue ? badgeOverdue : badgeDueSoon;
  const badgeText = isOverdue ? 'ĐÃ QUÁ HẠN' : 'SẮP HẾT HẠN';
  const dueStyle = isOverdue ? duePillOverdue : duePillSoon;

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>{`${heading}: ${props.taskTitle} (hạn ${props.dueDate})`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA"
              width="96"
              height="96"
              style={logo}
            />
          </Section>

          <Section style={content}>
            <span style={badgeStyle}>{badgeText}</span>
            <Heading style={h1}>{heading}</Heading>
            <Text style={lead}>{intro}</Text>

            <Section style={card}>
              <Text style={cardTitle}>{props.taskTitle}</Text>
              <Hr style={cardHr} />
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{ borderCollapse: 'collapse' as const }}
              >
                <tbody>
                  <tr>
                    <td style={tdLabel}>Hạn chót</td>
                    <td style={tdValue}>
                      <span style={dueStyle}>📅 {props.dueDate}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {props.taskUrl ? (
              <Section style={ctaSection}>
                <a href={props.taskUrl} style={ctaButton}>
                  Xem công việc
                </a>
              </Section>
            ) : null}
          </Section>

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

export default TaskDeadlineEmail;

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
const badgeDueSoon = {
  ...badgeBase,
  color: '#b45309',
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
};
const badgeOverdue = {
  ...badgeBase,
  color: '#b91c1c',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
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
const duePillSoon = {
  display: 'inline-block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#b45309',
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '3px 10px',
};
const duePillOverdue = {
  display: 'inline-block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#b91c1c',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
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
const footerSection = { padding: '8px 40px 24px', textAlign: 'center' as const };
const footerHr = { borderColor: '#f0ece1', margin: '8px 0 14px' };
const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '2px 0',
  lineHeight: '1.5',
};
