import {
  Html, Head, Preview, Body, Container, Heading, Text, Section, Hr, Img,
} from '@react-email/components';

interface Props {
  userName?: string;
  walletAddress: string;
}

export const HalfWalletProcessingEmail = ({
  userName = 'bạn',
  walletAddress = '0x...',
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>Yêu cầu xác thực ví HALF của bạn đang được xử lý</Preview>
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
          <Heading style={h1}>⏳ Yêu cầu đang được xử lý</Heading>
          <Text style={text}>Xin chào <strong>{userName}</strong>,</Text>
          <Text style={text}>
            Yêu cầu xác thực ví HALF của bạn đã được tiếp nhận và <strong>đang trong quá trình xử lý</strong> bởi đội ngũ admin ACTA.
          </Text>
          <Section style={infoBox}>
            <Heading style={sectionTitle}>🔐 Thông tin ví của bạn</Heading>
            <div style={row}>
              <Text style={labelStyle}>Địa chỉ ví:</Text>
              <Text style={{ ...valueStyle, fontFamily: 'monospace', wordBreak: 'break-all' as const }}>{walletAddress}</Text>
            </div>
            <div style={row}>
              <Text style={labelStyle}>Trạng thái:</Text>
              <Text style={{ ...valueStyle, color: '#d97706' }}>Đang xử lý</Text>
            </div>
          </Section>
          <Section style={stepSection}>
            <Heading style={sectionTitle}>📌 Các bước tiếp theo</Heading>
            <Text style={stepText}>1. Admin sẽ chuyển một lượng nhỏ HALF vào ví của bạn để xác nhận quyền sở hữu.</Text>
            <Text style={stepText}>2. Bạn sẽ nhận được email thông báo khi admin hoàn tất.</Text>
            <Text style={stepText}>3. Đăng nhập vào ứng dụng để xác nhận đã nhận HALF và hoàn tất xác thực.</Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Nếu cần hỗ trợ, vui lòng liên hệ: <a href="mailto:lienhe@acta.vn" style={link}>lienhe@acta.vn</a></Text>
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
const sectionTitle = { color: '#5b21b6', fontSize: '18px', fontWeight: 'bold', margin: '0 0 14px' };
const infoBox = { backgroundColor: '#f5f3ff', padding: '20px', borderRadius: '8px', margin: '24px 0', border: '1px solid #c4b5fd' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 10px' };
const labelStyle = { color: '#374151', fontSize: '15px', margin: '0', fontWeight: '600' as const, width: '35%' };
const valueStyle = { color: '#5b21b6', fontSize: '15px', margin: '0', width: '65%' };
const stepSection = { backgroundColor: '#faf8f3', padding: '20px', borderRadius: '8px', margin: '24px 0', border: '1px solid #ddbf94' };
const stepText = { color: '#374151', fontSize: '15px', lineHeight: '1.6', margin: '0 0 10px' };
const hr = { borderColor: '#ddbf94', margin: '32px 0' };
const footer = { color: '#6b7280', fontSize: '13px', lineHeight: '1.5', margin: '0' };
const link = { color: '#7c3aed', textDecoration: 'underline', fontWeight: '600' };
const footerSection = { padding: '20px 40px', background: 'linear-gradient(135deg, #faf8f3 0%, #f5f5dc 100%)', borderRadius: '0 0 12px 12px', borderTop: '1px solid #ddbf94' };
const footerText = { color: '#8b4513', fontSize: '12px', lineHeight: '1.4', margin: '0 0 6px', textAlign: 'center' as const };

export default HalfWalletProcessingEmail;
