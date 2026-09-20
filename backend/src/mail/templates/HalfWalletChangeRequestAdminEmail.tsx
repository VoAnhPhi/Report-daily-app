import {
  Html, Head, Preview, Body, Container, Heading, Text, Section, Hr, Img,
} from '@react-email/components';

interface Props {
  adminName: string;
  userName: string;
  newWalletAddress: string;
  currentWalletAddress?: string;
  reason: string;
}

export const HalfWalletChangeRequestAdminEmail = ({
  adminName = 'Admin',
  userName = 'Người dùng',
  newWalletAddress = '0x...',
  currentWalletAddress,
  reason = '',
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>Yêu cầu đổi ví HALF từ {userName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <div style={{ textAlign: 'center' as const }}>
            <a href="https://acta.vn" target="_blank" rel="noopener noreferrer">
              <Img src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b" alt="ACTA Logo" width="120" height="120" style={{ margin: '0 auto', display: 'block' }} />
            </a>
          </div>
        </Section>
        <Section style={content}>
          <Heading style={h1}>🔄 Yêu cầu đổi ví HALF</Heading>
          <Text style={text}>Xin chào <strong>{adminName}</strong>,</Text>
          <Text style={text}>
            Người dùng <strong>{userName}</strong> đã có ví HALF được xác thực và vừa gửi yêu cầu <strong>đổi sang ví mới</strong>. Yêu cầu đang chờ được xử lý.
          </Text>
          <Section style={infoBox}>
            <Heading style={sectionTitle}>📋 Thông tin yêu cầu</Heading>
            <div style={row}>
              <Text style={label}>Người dùng:</Text>
              <Text style={value}>{userName}</Text>
            </div>
            {currentWalletAddress && (
              <div style={row}>
                <Text style={label}>Ví hiện tại:</Text>
                <Text style={{ ...value, fontFamily: 'monospace', wordBreak: 'break-all' as const, color: '#dc2626' }}>{currentWalletAddress}</Text>
              </div>
            )}
            <div style={row}>
              <Text style={label}>Ví mới:</Text>
              <Text style={{ ...value, fontFamily: 'monospace', wordBreak: 'break-all' as const }}>{newWalletAddress}</Text>
            </div>
            <div style={row}>
              <Text style={label}>Lý do:</Text>
              <Text style={value}>{reason}</Text>
            </div>
          </Section>
          <Section style={actionSection}>
            <Text style={actionText}>Vui lòng đăng nhập vào <strong>trang quản trị</strong> để xem xét và xử lý yêu cầu này.</Text>
            <div style={{ textAlign: 'center' as const, marginTop: '16px' }}>
              <a href="https://admin.acta.vn/e-commerce/half" style={button}>Vào trang quản trị</a>
            </div>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Đây là email tự động từ hệ thống ACTA. Vui lòng không trả lời email này.</Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2025 ACTA - Affiliate Community's Tactical Alliance</Text>
          <Text style={footerText}>94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam</Text>
          <Text style={footerText}>Website: https://acta.vn</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: '#fefdf8', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' };
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px', maxWidth: '600px', boxShadow: '0 4px 20px rgba(124,58,237,0.08)', borderRadius: '12px', overflow: 'hidden' };
const header = { padding: '30px 40px', background: 'linear-gradient(135deg, #ede9fe 0%, #7c3aed 100%)', borderRadius: '12px 12px 0 0' };
const content = { padding: '40px' };
const h1 = { color: '#5b21b6', fontSize: '26px', fontWeight: 'bold', margin: '0 0 24px', textAlign: 'center' as const };
const text = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' };
const sectionTitle = { color: '#5b21b6', fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' };
const infoBox = { backgroundColor: '#f5f3ff', padding: '20px', borderRadius: '8px', margin: '24px 0', border: '1px solid #c4b5fd' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 10px' };
const label = { color: '#374151', fontSize: '15px', margin: '0', fontWeight: '600' as const, width: '35%' };
const value = { color: '#5b21b6', fontSize: '15px', margin: '0', width: '65%' };
const actionSection = { backgroundColor: '#faf8f3', padding: '20px', borderRadius: '8px', margin: '24px 0', border: '1px solid #ddbf94' };
const actionText = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0' };
const button = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 28px', textDecoration: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', display: 'inline-block' };
const hr = { borderColor: '#ddbf94', margin: '32px 0' };
const footer = { color: '#6b7280', fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px' };
const footerSection = { padding: '20px 40px', background: 'linear-gradient(135deg, #faf8f3 0%, #f5f5dc 100%)', borderRadius: '0 0 12px 12px', borderTop: '1px solid #ddbf94' };
const footerText = { color: '#8b4513', fontSize: '12px', lineHeight: '1.4', margin: '0 0 6px', textAlign: 'center' as const };

export default HalfWalletChangeRequestAdminEmail;
