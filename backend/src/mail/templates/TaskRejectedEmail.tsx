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
  Button,
} from '@react-email/components';

interface TaskRejectedEmailProps {
  userName: string;
  taskTitle: string;
  rejectionReason: string;
  rejectedAt: Date;
  gamificationUrl?: string;
  supportEmail?: string;
}

export const TaskRejectedEmail = ({
  userName = 'Người dùng',
  taskTitle = 'Nhiệm vụ',
  rejectionReason = 'Bằng chứng không hợp lệ',
  rejectedAt = new Date(),
  gamificationUrl = 'https://acta.vn/gamification',
  supportEmail = 'lienhe@acta.vn',
}: TaskRejectedEmailProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        Nhiệm vụ "{taskTitle}" của bạn đã bị từ chối. Vui lòng xem lý do và nộp
        lại bằng chứng.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with ACTA logo */}
          <Section style={header}>
            <div style={logoContainer}>
              <a
                href="https://acta.vn"
                target="_blank"
                rel="noopener noreferrer"
              >
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
            <Heading style={h1}>Nhiệm vụ bị từ chối ❌</Heading>

            <Text style={text}>
              Xin chào <strong>{userName}</strong>,
            </Text>

            <Text style={text}>
              Chúng tôi rất tiếc phải thông báo rằng nhiệm vụ của bạn không được
              chấp nhận. Chúng tôi đã xem xét kỹ lưỡng bằng chứng bạn đã nộp và
              quyết định này dựa trên tiêu chí đánh giá của chúng tôi.
            </Text>

            {/* Task Details */}
            <Section style={taskSection}>
              <Text style={taskTitleStyle}>Thông tin nhiệm vụ</Text>

              <Section style={detailRow}>
                <Text style={detailLabel}>Tên nhiệm vụ:</Text>
                <Text style={detailValue}>{taskTitle}</Text>
              </Section>

              <Section style={detailRow}>
                <Text style={detailLabel}>Ngày từ chối:</Text>
                <Text style={detailValue}>{formatDate(rejectedAt)}</Text>
              </Section>
            </Section>

            {/* Rejection Reason */}
            <Section style={reasonSection}>
              <Text style={reasonTitle}>Lý do từ chối:</Text>
              <Text style={reasonText}>{rejectionReason}</Text>
            </Section>

            {/* Next Steps */}
            <Section style={nextStepsSection}>
              <Text style={nextStepsTitle}>Bước tiếp theo:</Text>
              <Text style={nextStepsText}>
                • Bạn có thể nộp lại bằng chứng mới cho nhiệm vụ này
              </Text>
              <Text style={nextStepsText}>
                • Đảm bảo bằng chứng mới đáp ứng đầy đủ yêu cầu của nhiệm vụ
              </Text>
              <Text style={nextStepsText}>
                • Kiểm tra kỹ lại mô tả nhiệm vụ để đảm bảo bạn hiểu rõ yêu cầu
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonSection}>
              <Button style={button} href={gamificationUrl}>
                Xem chi tiết nhiệm vụ
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Chúng tôi khuyến khích bạn nộp lại bằng chứng mới để hoàn thành
              nhiệm vụ và nhận phần thưởng.
            </Text>

            <Text style={footer}>
              Nếu bạn có bất kỳ câu hỏi nào hoặc muốn thảo luận thêm về quyết
              định này, vui lòng liên hệ với đội hỗ trợ của chúng tôi tại{' '}
              <a
                href={`mailto:${supportEmail}`}
                style={link}
                target="_blank"
                rel="noreferrer"
              >
                {supportEmail}
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
              Bạn nhận được email này vì nhiệm vụ của bạn đã được xem xét tại hệ
              thống ACTA.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

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

const taskSection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const taskTitleStyle = {
  color: '#dc2626',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '12px',
  flexWrap: 'wrap' as const,
};

const detailLabel = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  minWidth: '140px',
};

const detailValue = {
  color: '#1f2937',
  fontSize: '14px',
  margin: '0',
  textAlign: 'right' as const,
  flex: '1',
};

const reasonSection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const reasonTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const reasonText = {
  color: '#7f1d1d',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0',
  fontStyle: 'italic',
};

const nextStepsSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #7dd3fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const nextStepsTitle = {
  color: '#0c4a6e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const nextStepsText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px',
  paddingLeft: '16px',
  position: 'relative' as const,
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#cd853f',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
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
