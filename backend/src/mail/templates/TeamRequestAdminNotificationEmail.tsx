import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface TeamRequestAdminNotificationEmailProps {
  adminName: string;
  userName: string;
  userEmail: string;
  userReferenceId: string;
  teamName: string;
  requestType: 'join' | 'leave' | 'cancel';
  requestTime: string;
}

export const TeamRequestAdminNotificationEmail = ({
  adminName,
  userName,
  userEmail,
  userReferenceId,
  teamName,
  requestType,
  requestTime,
}: TeamRequestAdminNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {requestType === 'join'
        ? `${userName} vừa gửi yêu cầu tham gia nhóm ${teamName}`
        : requestType === 'cancel'
          ? `${userName} vừa huỷ yêu cầu tham gia nhóm ${teamName}`
          : `${userName} vừa gửi yêu cầu rời khỏi nhóm ${teamName}`}
    </Preview>
    <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f6f9fc', padding: '20px' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '40px' }}>
        <Heading style={{ color: '#1a1a1a', fontSize: '24px', marginBottom: '24px' }}>
          {requestType === 'join'
            ? '🔔 Yêu cầu tham gia nhóm mới'
            : requestType === 'cancel'
              ? '❌ Huỷ yêu cầu tham gia nhóm'
              : '🔔 Yêu cầu rời khỏi nhóm'}
        </Heading>

        <Text style={{ color: '#555', fontSize: '16px' }}>
          Xin chào {adminName},
        </Text>

        <Text style={{ color: '#555', fontSize: '16px' }}>
          {requestType === 'join'
            ? `Người dùng ${userName} vừa gửi yêu cầu tham gia nhóm ${teamName}.`
            : requestType === 'cancel'
              ? `Người dùng ${userName} vừa huỷ yêu cầu tham gia nhóm ${teamName}.`
              : `Người dùng ${userName} vừa gửi yêu cầu rời khỏi nhóm ${teamName}.`}
        </Text>

        <Hr style={{ border: '1px solid #eee', margin: '24px 0' }} />

        <Section style={{ backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <Text style={{ margin: '4px 0', color: '#333', fontSize: '14px' }}>
            Người dùng: {userName}
          </Text>
          <Text style={{ margin: '4px 0', color: '#333', fontSize: '14px' }}>
            Email: {userEmail}
          </Text>
          <Text style={{ margin: '4px 0', color: '#333', fontSize: '14px' }}>
            Mã tham chiếu: {userReferenceId}
          </Text>
          <Text style={{ margin: '4px 0', color: '#333', fontSize: '14px' }}>
            Nhóm: {teamName}
          </Text>
          <Text style={{ margin: '4px 0', color: '#333', fontSize: '14px' }}>
            Thời gian: {requestTime}
          </Text>
        </Section>

        <Text style={{ color: '#555', fontSize: '14px' }}>
          Vui lòng truy cập trang quản lý để xem xét và xử lý yêu cầu này.
        </Text>

        <Hr style={{ border: '1px solid #eee', margin: '24px 0' }} />

        <Text style={{ color: '#999', fontSize: '12px', textAlign: 'center' as const }}>
          © {new Date().getFullYear()} Liên minh Cộng đồng thực chiến (ACTA)
        </Text>
      </Container>
    </Body>
  </Html>
);
