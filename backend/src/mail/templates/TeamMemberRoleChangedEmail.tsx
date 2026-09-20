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

interface TeamMemberRoleChangedEmailProps {
  userName: string;
  teamName: string;
  oldRole: string;
  newRole: string;
}

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'leader':
      return 'Trưởng nhóm';
    case 'chief':
      return 'Phó nhóm';
    case 'member':
      return 'Thành viên';
    default:
      return role;
  }
};

export const TeamMemberRoleChangedEmail = ({
  userName = 'Thành viên',
  teamName = 'Team',
  oldRole = 'member',
  newRole = 'member',
}: TeamMemberRoleChangedEmailProps) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>Chức vụ của bạn trong team {teamName} đã được thay đổi</Preview>
    <Body style={main}>
      <Container style={container}>
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

        <Section style={content}>
          <Heading style={h1}>Chức vụ của bạn đã được thay đổi</Heading>

          <Text style={text}>
            Xin chào <strong>{userName}</strong>,
          </Text>

          <Text style={text}>
            Chức vụ của bạn trong team <strong>{teamName}</strong> đã được cập
            nhật.
          </Text>

          <Section style={roleChangeBox}>
            <Text style={roleChangeLabel}>Thay đổi chức vụ:</Text>
            <Text style={roleChangeText}>
              <span style={oldRoleStyle}>{getRoleLabel(oldRole)}</span>
              <span style={arrow}> → </span>
              <span style={newRoleStyle}>{getRoleLabel(newRole)}</span>
            </Text>
          </Section>

          <Text style={text}>
            {newRole === 'leader' && (
              <>
                Chúc mừng bạn đã được bổ nhiệm làm <strong>Trưởng nhóm</strong>!
                Với vai trò mới này, bạn sẽ có nhiều trách nhiệm hơn trong việc
                quản lý và điều hành team.
              </>
            )}
            {newRole === 'chief' && (
              <>
                Bạn đã được bổ nhiệm làm <strong>Phó nhóm</strong>. Với vai trò
                này, bạn sẽ hỗ trợ Trưởng nhóm trong việc quản lý team.
              </>
            )}
            {newRole === 'member' && (
              <>
                Bạn hiện là <strong>Thành viên</strong> của team. Hãy tiếp tục
                đóng góp tích cực cho team nhé!
              </>
            )}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Nếu bạn có bất kỳ câu hỏi nào về thay đổi này, vui lòng liên hệ với
            đội hỗ trợ của chúng tôi.
          </Text>

          <Text style={footer}>
            Chúng tôi luôn sẵn sàng hỗ trợ bạn tại{' '}
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
            Bạn nhận được email này từ hệ thống ACTA.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

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

const roleChangeBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const roleChangeLabel = {
  color: '#0369a1',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const roleChangeText = {
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0',
};

const oldRoleStyle = {
  color: '#6b7280',
  textDecoration: 'line-through',
  marginRight: '8px',
};

const arrow = {
  color: '#0369a1',
  margin: '0 8px',
};

const newRoleStyle = {
  color: '#059669',
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
