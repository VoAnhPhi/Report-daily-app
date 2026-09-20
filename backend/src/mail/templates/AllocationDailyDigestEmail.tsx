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

/** Một phiếu allocation trong digest — mọi nhãn/số đã format server-side. */
export interface AllocationDigestEntry {
  /** Họ tên member thụ hưởng. */
  memberName: string;
  /** Mã giới thiệu member (referenceId) — '—' nếu thiếu. */
  referenceId: string;
  /** Tên chính sách tiếng Việt (vd "Hái lộc cùng ACTA"). */
  policyLabel: string;
  /** Nhãn chế độ D6 ("Giải ngân" / "Cấp bù"). */
  modeLabel: string;
  /** Số tiền hiển thị (vi-VN, không ₫). */
  amountText: string;
}

export interface AllocationDailyDigestEmailProps {
  /** Tên hiển thị admin nhận digest. */
  adminName: string;
  /** Ngày VN của digest (vd "23/07/2026"). */
  dateLabel: string;
  /** Phiếu allocation TẠO trong ngày. */
  created: AllocationDigestEntry[];
  /** Phiếu allocation TẤT TOÁN trong ngày. */
  settled: AllocationDigestEntry[];
  /** Phiếu allocation HẾT HẠN trong ngày. */
  expired: AllocationDigestEntry[];
}

/** Một khối danh sách phiếu trong digest (tạo / tất toán / hết hạn). */
const DigestSection = ({
  title,
  accent,
  entries,
}: {
  title: string;
  accent: string;
  entries: AllocationDigestEntry[];
}) => {
  if (entries.length === 0) return null;
  return (
    <Section style={detailsSection}>
      <Text style={{ ...sectionTitle, color: accent }}>
        {title} ({entries.length})
      </Text>
      <table style={tableStyle} cellPadding={0} cellSpacing={0}>
        <thead>
          <tr>
            <th style={{ ...thStyle, borderBottom: `2px solid ${accent}` }}>
              Thành viên
            </th>
            <th style={{ ...thStyle, borderBottom: `2px solid ${accent}` }}>
              Chính sách · Chế độ
            </th>
            <th
              style={{
                ...thStyle,
                borderBottom: `2px solid ${accent}`,
                textAlign: 'right' as const,
              }}
            >
              Số tiền
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.referenceId}-${index}`}>
              <td style={tdStyle}>
                <div style={personName}>{entry.memberName || 'Không rõ tên'}</div>
                <div style={personMeta}>Mã: {entry.referenceId || '—'}</div>
              </td>
              <td style={tdStyle}>
                <div style={personMeta}>
                  {entry.policyLabel} · {entry.modeLabel}
                </div>
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' as const }}>
                <div style={personName}>{entry.amountText} ₫</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
};

/**
 * Cấp phát thu nhập (spec cap-phat-thu-nhap §5 ⑥ · D9) — digest hằng ngày gửi
 * MỌI admin active: phiếu allocation TẠO / TẤT TOÁN / HẾT HẠN trong ngày VN.
 * Khuôn `TvtcDailyDigestEmail`; cron chỉ gửi khi ngày có ≥1 sự kiện.
 */
export const AllocationDailyDigestEmail = ({
  adminName = 'Admin',
  dateLabel = '',
  created = [],
  settled = [],
  expired = [],
}: AllocationDailyDigestEmailProps) => {
  const total = created.length + settled.length + expired.length;
  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Tổng hợp cấp phát thu nhập trong ngày</title>
      </Head>
      <Preview>{`📋 Cấp phát thu nhập ${dateLabel} — ${String(total)} sự kiện phiếu`}</Preview>
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
            <Heading style={h1}>📋 Tổng hợp cấp phát thu nhập</Heading>
            <Text style={paragraph}>
              Chào <strong style={boldText}>{adminName}</strong>,
            </Text>
            <Text style={paragraph}>
              Trong ngày <strong style={highlightText}>{dateLabel}</strong>, hệ
              thống ghi nhận{' '}
              <strong style={highlightText}>{created.length}</strong> phiếu cấp
              phát được tạo,{' '}
              <strong style={highlightText}>{settled.length}</strong> phiếu tất
              toán và <strong style={highlightText}>{expired.length}</strong>{' '}
              phiếu hết hạn.
            </Text>

            <DigestSection
              title="Phiếu được tạo trong ngày"
              accent="#b8860b"
              entries={created}
            />
            <DigestSection
              title="Phiếu tất toán trong ngày"
              accent="#047857"
              entries={settled}
            />
            <DigestSection
              title="Phiếu hết hạn trong ngày"
              accent="#b91c1c"
              entries={expired}
            />

            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                Đây là email tự động — được gửi hằng ngày khi có ít nhất một
                phiếu cấp phát thu nhập được tạo, tất toán hoặc hết hạn.
              </Text>
            </Section>
          </Section>
          <Section style={bottomFooter}>
            <Text style={bottomFooterText}>
              © 2026 Liên minh Cộng đồng thực chiến (ACTA)
              <br />
              Email này được gửi tự động, vui lòng không reply.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AllocationDailyDigestEmail;

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

const sectionTitle = {
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 10px',
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
  fontSize: '13px',
  color: '#495057',
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
