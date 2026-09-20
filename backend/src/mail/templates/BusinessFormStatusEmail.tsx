import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/** Status transitions that map to user-facing emails. */
export type BusinessFormEmailTransition =
  | 'in_review'
  | 'needs_more_info'
  | 'approved'
  | 'rejected'
  | 'admin-create';

const TRANSITION_LABEL: Record<BusinessFormEmailTransition, string> = {
  in_review: 'Đang xem xét',
  needs_more_info: 'Cần bổ sung thông tin',
  approved: 'Đã được phê duyệt',
  rejected: 'Đã bị từ chối',
  'admin-create': 'Đã được phê duyệt',
};

const TRANSITION_HEADLINE: Record<BusinessFormEmailTransition, string> = {
  in_review:
    'ACTA đang xem xét hồ sơ đăng ký doanh nghiệp của bạn',
  needs_more_info:
    'ACTA cần bạn bổ sung thêm thông tin cho form đăng ký',
  approved:
    'Chúc mừng! Form đăng ký doanh nghiệp đã được phê duyệt',
  rejected: 'Form đăng ký doanh nghiệp đã bị từ chối',
  'admin-create':
    'Hồ sơ đăng ký doanh nghiệp của bạn đã được tạo và phê duyệt',
};

const TRANSITION_INTRO: Record<BusinessFormEmailTransition, string> = {
  in_review:
    'Chúng tôi đã tiếp nhận form đăng ký và đang trong quá trình xem xét. Bạn sẽ nhận được thông báo tiếp theo khi có cập nhật.',
  needs_more_info:
    'Để tiếp tục xử lý hồ sơ, vui lòng cập nhật các nội dung dưới đây và gửi lại form.',
  approved:
    'Form đăng ký của bạn đã được ACTA phê duyệt. Bạn có thể tiếp tục các bước tiếp theo trên hệ thống.',
  rejected:
    'Rất tiếc, form đăng ký của bạn không được phê duyệt. Mã số thuế (MST) đã được giải phóng để bạn có thể đăng ký lại nếu muốn.',
  'admin-create':
    'Đại diện ACTA đã tạo hồ sơ thay bạn và đánh dấu là đã phê duyệt. Bạn có thể đăng nhập để xem chi tiết.',
};

const ACCENT: Record<BusinessFormEmailTransition, string> = {
  in_review: '#1d4ed8',
  needs_more_info: '#c2410c',
  approved: '#047857',
  rejected: '#be123c',
  'admin-create': '#047857',
};

export interface BusinessFormFieldFlagSummary {
  /** Vietnamese label for the field. */
  label: string;
  /** Admin-supplied reason. */
  reason: string;
}

export interface BusinessFormStatusEmailProps {
  transition: BusinessFormEmailTransition;
  /** Recipient (the form submitter). */
  userName: string;

  companyName: string;
  taxCode: string;
  /** Reviewer full name — populated for approved / rejected. */
  reviewerName?: string | null;
  /** Admin's overall note — populated for needs_more_info / rejected. */
  adminNote?: string | null;
  /** Field-level flags for needs_more_info. */
  fieldFlags?: BusinessFormFieldFlagSummary[];
  /** Deep link to the form on acta-social (edit page for revising). */
  formUrl: string;
}

/**
 * Single email template that handles every business-form transition by
 * branching on `transition`. Keeps the visual layout consistent and avoids
 * having four near-duplicate templates.
 */
export const BusinessFormStatusEmail = ({
  transition,
  userName,
  companyName,
  taxCode,
  reviewerName,
  adminNote,
  fieldFlags,
  formUrl,
}: BusinessFormStatusEmailProps) => {
  const isNeedsMoreInfo = transition === 'needs_more_info';
  const isRejected = transition === 'rejected';
  const showFlags = isNeedsMoreInfo && fieldFlags && fieldFlags.length > 0;
  const accent = ACCENT[transition];

  const ctaLabel = isNeedsMoreInfo
    ? 'Mở form & cập nhật'
    : isRejected
      ? 'Xem form'
      : 'Xem chi tiết';

  return (
    <Html lang='vi'>
      <Head>
        <meta httpEquiv='Content-Language' content='vi' />
        <meta name='language' content='Vietnamese' />
        <meta name='google' content='notranslate' />
      </Head>
      <Preview>
        {`[ACTA] ${TRANSITION_LABEL[transition]} — ${companyName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <div style={logoContainer}>
              <a
                href='https://acta.vn'
                target='_blank'
                rel='noopener noreferrer'
              >
                <Img
                  src='https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b'
                  alt='ACTA Logo'
                  width='150'
                  height='150'
                  style={logoImage}
                />
              </a>
            </div>
          </Section>

          <Section style={content}>
            <Heading style={{ ...h1, color: accent }}>
              {TRANSITION_HEADLINE[transition]}
            </Heading>

            <Text style={text}>
              Xin chào <strong>{userName}</strong>,
            </Text>
            <Text style={text}>{TRANSITION_INTRO[transition]}</Text>

            <Section style={infoBox}>
              <Text style={infoLabel}>Tên doanh nghiệp</Text>
              <Text style={infoValue}>{companyName}</Text>

              <Text style={infoLabel}>Mã số thuế (MST)</Text>
              <Text style={infoValue}>{taxCode}</Text>

              {reviewerName && (
                <>
                  <Text style={infoLabel}>
                    {transition === 'approved' || transition === 'admin-create'
                      ? 'Người phê duyệt'
                      : transition === 'rejected'
                        ? 'Người xử lý'
                        : 'Người phụ trách'}
                  </Text>
                  <Text style={infoValue}>{reviewerName}</Text>
                </>
              )}
            </Section>

            {showFlags && (
              <Section style={flagsSection}>
                <Heading style={sectionTitle}>
                  Các nội dung cần bổ sung ({fieldFlags!.length})
                </Heading>
                {fieldFlags!.map((f, idx) => (
                  <Section key={idx} style={flagRow}>
                    <Text style={flagLabel}>{f.label}</Text>
                    <Text style={flagReason}>{f.reason}</Text>
                  </Section>
                ))}
              </Section>
            )}

            {adminNote && (
              <Section style={noteBox}>
                <Text style={noteLabel}>
                  {isRejected ? 'Lý do từ chối' : 'Ghi chú từ ACTA'}
                </Text>
                <Text style={noteText}>{adminNote}</Text>
              </Section>
            )}

            <Section style={buttonContainer}>
              <a href={formUrl} style={{ ...button, backgroundColor: accent }}>
                {ctaLabel}
              </a>
            </Section>

            <Hr style={hr} />

            <Section style={supportSection}>
              <Text style={supportTitle}>Cần hỗ trợ?</Text>
              <Text style={supportText}>
                Email:{' '}
                <a href='mailto:lienhe@acta.vn' style={supportLink}>
                  lienhe@acta.vn
                </a>
                {'   '}· Hotline: 0912 880 330
              </Text>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              © 2025 ACTA - Affiliate Community's Tactical Alliance
            </Text>
            <Text style={footerText}>
              Bạn nhận được email này vì đã đăng ký doanh nghiệp / hợp tác với
              ACTA.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

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
};

const logoContainer = {
  textAlign: 'center' as const,
};

const logoImage = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  padding: '32px 40px',
};

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
  textAlign: 'left' as const,
};

const text = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const infoBox = {
  background: '#fafaf5',
  border: '1px solid #ede9d8',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 0',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '8px 0 2px',
};

const infoValue = {
  color: '#111827',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
};

const flagsSection = {
  marginTop: '20px',
};

const sectionTitle = {
  color: '#9a3412',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  margin: '0 0 12px',
};

const flagRow = {
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  borderRadius: '6px',
  padding: '10px 14px',
  margin: '0 0 8px',
};

const flagLabel = {
  color: '#9a3412',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  margin: '0 0 4px',
};

const flagReason = {
  color: '#7c2d12',
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap' as const,
};

const noteBox = {
  background: '#fef9c3',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0',
};

const noteLabel = {
  color: '#92400e',
  fontSize: '12px',
  fontWeight: 'bold' as const,
  margin: '0 0 4px',
};

const noteText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0 8px',
};

const button = {
  display: 'inline-block',
  padding: '12px 28px',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const supportSection = {
  marginTop: '8px',
};

const supportTitle = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 4px',
};

const supportText = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '4px 0',
};

const supportLink = {
  color: '#1d4ed8',
  textDecoration: 'none',
};

const footerSection = {
  background: '#faf6ec',
  padding: '16px 40px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '4px 0',
};
