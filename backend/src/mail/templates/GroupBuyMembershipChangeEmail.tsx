import {
  Html, Head, Preview, Body, Container, Heading, Text, Section, Hr, Img, Button,
} from '@react-email/components';

export type GroupBuyMembershipEvent = 'joined' | 'left' | 'kicked' | 'disbanded';

interface Props {
  recipientName?: string;
  // Display name of the person who joined / left / was kicked (omitted for disband).
  actorName?: string;
  productName: string;
  // Count of accepted members after the change (omitted for disband).
  memberCount?: number;
  groupUrl: string;
  event: GroupBuyMembershipEvent;
}

const headingByEvent: Record<GroupBuyMembershipEvent, string> = {
  joined: 'Có thành viên mới tham gia nhóm mua chung',
  left: 'Một thành viên đã rời nhóm mua chung',
  kicked: 'Một thành viên đã bị xóa khỏi nhóm mua chung',
  disbanded: 'Nhóm mua chung đã bị giải tán',
};

export function groupBuyMembershipSubject(
  data: Pick<Props, 'event' | 'productName'>,
): string {
  switch (data.event) {
    case 'joined':
      return `Thành viên mới tham gia nhóm mua chung: ${data.productName}`;
    case 'left':
      return `Một thành viên đã rời nhóm mua chung: ${data.productName}`;
    case 'kicked':
      return `Một thành viên đã bị xóa khỏi nhóm mua chung: ${data.productName}`;
    case 'disbanded':
      return `Nhóm mua chung đã giải tán: ${data.productName}`;
  }
}

function bodyLine(props: Props): string {
  const actor = props.actorName ?? 'Một thành viên';
  switch (props.event) {
    case 'joined':
      return `${actor} vừa tham gia nhóm mua chung sản phẩm "${props.productName}".`;
    case 'left':
      return `${actor} đã rời khỏi nhóm mua chung sản phẩm "${props.productName}".`;
    case 'kicked':
      return `${actor} đã bị xóa khỏi nhóm mua chung sản phẩm "${props.productName}".`;
    case 'disbanded':
      return `Nhóm mua chung sản phẩm "${props.productName}" đã bị trưởng nhóm giải tán. Nhóm này không còn hoạt động.`;
  }
}

export const GroupBuyMembershipChangeEmail = (props: Props) => {
  const { recipientName = 'bạn', productName, memberCount, groupUrl, event } = props;
  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>{bodyLine(props)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <div style={{ textAlign: 'center' as const }}>
              <a href="https://acta.vn" target="_blank" rel="noopener noreferrer">
                <Img
                  src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
                  alt="ACTA Logo"
                  width="120"
                  height="120"
                  style={{ margin: '0 auto', display: 'block' }}
                />
              </a>
            </div>
          </Section>
          <Section style={content}>
            <Heading style={h1}>{headingByEvent[event]}</Heading>
            <Text style={text}>
              Xin chào <strong>{recipientName}</strong>,
            </Text>
            <Text style={text}>{bodyLine(props)}</Text>
            <Section style={infoBox}>
              <Heading style={sectionTitle}>Thông tin nhóm</Heading>
              <div style={row}>
                <Text style={labelStyle}>Sản phẩm:</Text>
                <Text style={valueStyle}><strong>{productName}</strong></Text>
              </div>
              {typeof memberCount === 'number' && (
                <div style={row}>
                  <Text style={labelStyle}>Số thành viên hiện tại:</Text>
                  <Text style={valueStyle}>{memberCount}</Text>
                </div>
              )}
            </Section>
            {event !== 'disbanded' && (
              <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
                <Button href={groupUrl} style={ctaButton}>
                  Xem nhóm mua chung
                </Button>
              </Section>
            )}
            <Hr style={hr} />
            <Text style={footer}>
              Nếu cần hỗ trợ, vui lòng liên hệ:{' '}
              <a href="mailto:lienhe@acta.vn" style={link}>lienhe@acta.vn</a>{' '}
              hoặc gọi <strong>0912 880 330</strong>
            </Text>
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
};

export default GroupBuyMembershipChangeEmail;

// ---------------------------------------------------------------------------
// Style constants — mirrors GroupBuyInviteEmail convention.
// ---------------------------------------------------------------------------

const main = { backgroundColor: '#fefdf8', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' };
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px', maxWidth: '600px', boxShadow: '0 4px 20px rgba(124,58,237,0.08)', borderRadius: '12px', overflow: 'hidden' };
const header = { padding: '30px 40px', background: 'linear-gradient(135deg, #ede9fe 0%, #7c3aed 100%)', borderRadius: '12px 12px 0 0' };
const content = { padding: '40px' };
const h1 = { color: '#5b21b6', fontSize: '26px', fontWeight: 'bold', margin: '0 0 24px', textAlign: 'center' as const };
const text = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' };
const sectionTitle = { color: '#5b21b6', fontSize: '18px', fontWeight: 'bold', margin: '0 0 14px' };
const infoBox = { backgroundColor: '#f5f3ff', padding: '20px', borderRadius: '8px', margin: '24px 0', border: '1px solid #c4b5fd' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 12px' };
const labelStyle = { color: '#374151', fontSize: '15px', margin: '0', fontWeight: '600' as const, width: '50%' };
const valueStyle = { color: '#374151', fontSize: '15px', margin: '0', width: '50%' };
const ctaButton = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' };
const hr = { borderColor: '#ddbf94', margin: '32px 0' };
const footer = { color: '#6b7280', fontSize: '13px', lineHeight: '1.5', margin: '0' };
const link = { color: '#7c3aed', textDecoration: 'underline', fontWeight: '600' };
const footerSection = { padding: '20px 40px', background: 'linear-gradient(135deg, #faf8f3 0%, #f5f5dc 100%)', borderRadius: '0 0 12px 12px', borderTop: '1px solid #ddbf94' };
const footerText = { color: '#8b4513', fontSize: '12px', lineHeight: '1.4', margin: '0 0 6px', textAlign: 'center' as const };
