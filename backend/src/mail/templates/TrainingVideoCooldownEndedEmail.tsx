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
import { TrainingCooldownEndedData } from '../queue/mail-job.types';

// ---------------------------------------------------------------------------
// Subject helper (exported so the handler can reuse it)
// ---------------------------------------------------------------------------

export function trainingVideoCooldownEndedSubject(
  data: TrainingCooldownEndedData,
): string {
  return `Video "${data.videoTitle}" đã hết làm lạnh — vào xem lại để nhận thưởng!`;
}

// ---------------------------------------------------------------------------
// Template component (Phase 54 D-10 — kích-cầu video ghi đè hết làm lạnh)
//
// Marketing-safe money display: chỉ nêu HỆ SỐ (pointsReward) + cách diễn đạt
// theo cấp; KHÔNG tính VND chính xác per-user (P53 level multiplier).
// Thumbnail: render <Img> CHỈ khi thumbnailUrl có giá trị; degrade text-only.
// All copy tiếng Việt có dấu (§5).
// ---------------------------------------------------------------------------

export function TrainingVideoCooldownEndedEmail(
  props: TrainingCooldownEndedData,
) {
  const { recipientName, videoTitle, pointsReward, description, thumbnailUrl, videoUrl } =
    props;

  const fmt = new Intl.NumberFormat('vi-VN');

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview style={{ fontWeight: 'bold' }}>
        {`Video "${videoTitle}" đã hết thời gian làm lạnh — vào xem lại để nhận thưởng ngay!`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
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
            <Heading style={h1}>Xin chào {recipientName}!</Heading>

            <Text style={text}>
              🔥 Video rèn luyện <strong>{videoTitle}</strong> đã hết thời gian làm
              lạnh. Bạn có thể vào xem lại ngay bây giờ để tiếp tục nhận thưởng rèn
              luyện!
            </Text>

            {/* Mux thumbnail — chỉ render khi có thumbnailUrl */}
            {thumbnailUrl && (
              <Section style={thumbnailSection}>
                <Img
                  src={thumbnailUrl}
                  alt={videoTitle}
                  width="520"
                  style={thumbnailImage}
                />
              </Section>
            )}

            {/* Hệ số điểm thưởng — marketing-safe (KHÔNG VND per-user) */}
            <Section style={rewardSection}>
              <Text style={rewardLabel}>🏆 Hệ số điểm thưởng:</Text>
              <Text style={rewardValue}>x{fmt.format(pointsReward)}</Text>
              <Text style={rewardNote}>
                Bạn nhận tiền thưởng theo cấp rèn luyện hiện tại của mình.
              </Text>
            </Section>

            {description && (
              <>
                <Hr style={hr} />
                <Text style={sectionTitle}>📋 Nội dung video</Text>
                <Text style={text}>{description}</Text>
              </>
            )}

            <Hr style={hr} />

            {/* CTA deep-link tới feed social */}
            <Section style={ctaSection}>
              <Button href={videoUrl} style={ctaButton}>
                Vào xem lại ngay
              </Button>
            </Section>

            <Text style={footer}>
              💬 Cần hỗ trợ? Liên hệ với chúng tôi tại{' '}
              <a
                href="mailto:lienhe@acta.vn"
                style={link}
                target="_blank"
                rel="noreferrer"
              >
                lienhe@acta.vn
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              © 2025 ACTA - Affiliate Community's Tactical Alliance
            </Text>
            <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
            <Text style={footerText}>
              94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
            </Text>
            <Text style={footerText}>Website: https://acta.vn</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  color: '#333333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '20px',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '20px 0 12px 0',
};

const thumbnailSection = {
  margin: '20px 0',
  textAlign: 'center' as const,
};

const thumbnailImage = {
  margin: '0 auto',
  display: 'block',
  borderRadius: '8px',
  maxWidth: '100%',
};

// Reward section — amber-tinted, prominent
const rewardSection = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px solid #d97706',
};

const rewardLabel = {
  color: '#b45309',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const rewardValue = {
  color: '#92400e',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0',
  letterSpacing: '-0.5px',
};

const rewardNote = {
  color: '#92400e',
  fontSize: '13px',
  lineHeight: '18px',
  margin: '8px 0 0 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const ctaButton = {
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '14px 32px',
  borderRadius: '8px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  marginBottom: '12px',
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

const link = {
  color: '#1a56db',
  textDecoration: 'underline',
};

export default TrainingVideoCooldownEndedEmail;
