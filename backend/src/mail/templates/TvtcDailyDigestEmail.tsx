import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Img,
} from '@react-email/components';

/** One newly-recognized TVTC member + their resolved upline (null at tree top). */
export interface TvtcDigestEntry {
  member: { referenceId: string; fullName: string; email: string };
  upline: { referenceId: string; fullName: string; email: string } | null;
}

export interface TvtcDailyDigestEmailProps {
  /** Recipient admin's display name. */
  adminName: string;
  /** VN-day the batch was awarded (formatted, e.g. "20/07/2026"). */
  awardedDateLabel: string;
  /** Every member who NEWLY became TVTC in this run + their upline. */
  entries: TvtcDigestEntry[];
}

export const TvtcDailyDigestEmail = ({
  adminName = 'Admin',
  awardedDateLabel = '',
  entries = [],
}: TvtcDailyDigestEmailProps) => {
  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Danh sách Thành viên tích cực (TVTC) mới</title>
      </Head>
      <Preview>{`🏅 ${entries.length} thành viên vừa được công nhận Thành viên tích cực (TVTC)`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA Logo"
              width="150"
              height="auto"
              style={logoImage}
            />
          </Section>
          <Section style={content}>
            <Heading style={h1}>
              🏅 Danh sách Thành viên tích cực (TVTC) mới
            </Heading>
            <Text style={paragraph}>
              Chào <strong style={boldText}>{adminName}</strong>,
            </Text>
            <Text style={paragraph}>
              Trong ngày <strong style={highlightText}>{awardedDateLabel}</strong>{' '}
              có <strong style={highlightText}>{entries.length}</strong> thành
              viên vừa đạt danh hiệu{' '}
              <strong style={highlightText}>Thành viên tích cực (TVTC)</strong>.
              Danh hiệu là trọn đời, cấp một lần. Dưới đây là danh sách thành
              viên và tuyến trên của họ.
            </Text>

            <Section style={detailsSection}>
              <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <thead>
                  <tr>
                    <th style={thStyle}>Thành viên (TVTC)</th>
                    <th style={thStyle}>Tuyến trên</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={entry.member.referenceId || index}>
                      <td style={tdStyle}>
                        <div style={personName}>
                          {entry.member.fullName || 'Không rõ tên'}
                        </div>
                        <div style={personMeta}>
                          Mã: {entry.member.referenceId || '—'}
                        </div>
                        <div style={personMeta}>
                          Email: {entry.member.email || '—'}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {entry.upline ? (
                          <>
                            <div style={personName}>
                              {entry.upline.fullName || 'Không rõ tên'}
                            </div>
                            <div style={personMeta}>
                              Mã: {entry.upline.referenceId || '—'}
                            </div>
                            <div style={personMeta}>
                              Email: {entry.upline.email || '—'}
                            </div>
                          </>
                        ) : (
                          <div style={personMeta}>—</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                Đây là email tự động — được gửi hằng ngày khi có thành viên mới
                đạt danh hiệu Thành viên tích cực (TVTC).
              </Text>
            </Section>
          </Section>
          <Section style={bottomFooter}>
            <Text style={bottomFooterText}>
              © 2024 Liên minh Cộng đồng thực chiến (ACTA)
              <br />
              Email này được gửi tự động, vui lòng không reply.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TvtcDailyDigestEmail;

const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: 'Arial, sans-serif',
  lineHeight: '1.6',
  color: '#333',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
};

const header = {
  padding: '30px 40px',
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
  borderRadius: '12px 12px 0 0',
};

const logoImage = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  backgroundColor: '#f8f9fa',
  padding: '30px',
  borderRadius: '10px',
  border: '1px solid #e9ecef',
};

const h1 = {
  color: '#b8860b',
  textAlign: 'center' as const,
  marginBottom: '25px',
  fontSize: '22px',
};

const paragraph = {
  fontSize: '16px',
  marginBottom: '20px',
};

const boldText = {
  fontWeight: 'bold',
};

const highlightText = {
  color: '#b8860b',
  fontWeight: 'bold',
};

const detailsSection = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '25px',
  border: '1px solid #dee2e6',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const thStyle = {
  textAlign: 'left' as const,
  fontSize: '14px',
  color: '#495057',
  borderBottom: '2px solid #b8860b',
  padding: '8px',
};

const tdStyle = {
  verticalAlign: 'top' as const,
  fontSize: '14px',
  padding: '10px 8px',
  borderBottom: '1px solid #dee2e6',
};

const personName = {
  fontWeight: 'bold',
  color: '#333',
};

const personMeta = {
  color: '#6c757d',
  fontSize: '13px',
};

const footerInfoSection = {
  fontSize: '14px',
  color: '#6c757d',
  textAlign: 'center' as const,
  borderTop: '1px solid #dee2e6',
  paddingTop: '20px',
};

const footerInfoText = {
  margin: '0 0 10px 0',
};

const bottomFooter = {
  textAlign: 'center' as const,
  marginTop: '30px',
  fontSize: '12px',
  color: '#6c757d',
};

const bottomFooterText = {
  margin: '0',
};
