import {
  Html, Head, Preview, Body, Container, Heading, Text, Section, Hr, Img,
} from '@react-email/components';

interface Props {
  userName?: string;
  amount: string;
  walletAddress: string;
  processedAt: string;
}

export const HalfManualSentEmail = ({
  userName = 'bạn',
  amount = '0',
  walletAddress = '0x...',
  processedAt = '',
}: Props) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>ACTA đã chuyển {amount} HALF đến ví của bạn!</Preview>
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
          <Heading style={h1}>💜 HALF đã được chuyển đến ví của bạn!</Heading>
          <Text style={text}>Xin chào <strong>{userName}</strong>,</Text>
          <Text style={text}>
            ACTA đã chuyển thành công HALF vào ví của bạn. Vui lòng kiểm tra số dư trong ví để xác nhận.
          </Text>
          <Section style={infoBox}>
            <Heading style={sectionTitle}>💰 Chi tiết giao dịch</Heading>
            <div style={row}>
              <Text style={labelStyle}>Số lượng HALF:</Text>
              <Text style={{ ...valueStyle, fontSize: '20px', fontWeight: 'bold', color: '#5b21b6' }}>{amount} HALF</Text>
            </div>
            <div style={row}>
              <Text style={labelStyle}>Địa chỉ ví nhận:</Text>
              <Text style={{ ...valueStyle, fontFamily: 'monospace', wordBreak: 'break-all' as const }}>{walletAddress}</Text>
            </div>
            <div style={row}>
              <Text style={labelStyle}>Thời gian:</Text>
              <Text style={valueStyle}>{processedAt}</Text>
            </div>
          </Section>
          <Section style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', margin: '24px 0', border: '1px solid #86efac', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '36px', margin: '0 0 8px' }}>✅</Text>
            <Text style={{ color: '#16a34a', fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px' }}>Giao dịch hoàn tất!</Text>
            <Text style={{ color: '#374151', fontSize: '15px', margin: '0' }}>
              Cảm ơn bạn đã tin tưởng và đồng hành cùng ACTA.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Nếu cần hỗ trợ, vui lòng liên hệ: <a href="mailto:lienhe@acta.vn" style={link}>lienhe@acta.vn</a> hoặc gọi <strong>0912 880 330</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2025 ACTA - Affiliate Community's Tactical Alliance</Text>
          <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
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
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 12px' };
const labelStyle = { color: '#374151', fontSize: '15px', margin: '0', fontWeight: '600' as const, width: '38%' };
const valueStyle = { color: '#374151', fontSize: '15px', margin: '0', width: '62%' };
const hr = { borderColor: '#ddbf94', margin: '32px 0' };
const footer = { color: '#6b7280', fontSize: '13px', lineHeight: '1.5', margin: '0' };
const link = { color: '#7c3aed', textDecoration: 'underline', fontWeight: '600' };
const footerSection = { padding: '20px 40px', background: 'linear-gradient(135deg, #faf8f3 0%, #f5f5dc 100%)', borderRadius: '0 0 12px 12px', borderTop: '1px solid #ddbf94' };
const footerText = { color: '#8b4513', fontSize: '12px', lineHeight: '1.4', margin: '0 0 6px', textAlign: 'center' as const };

export default HalfManualSentEmail;
