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

interface AccountDeletedEmailProps {
  name: string;
  email: string;
  referenceId: string;
  deletedAt: Date;
  deletedData?: {
    business?: boolean;
    posts?: number;
    comments?: number;
    orders?: number;
    referrals?: number;
  };
}

export const AccountDeletedEmail = ({
  name = 'Khách hàng',
  email = 'user@example.com',
  referenceId = 'us-12345',
  deletedAt = new Date(),
  deletedData,
}: AccountDeletedEmailProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        Tài khoản của bạn đã được xóa khỏi hệ thống ACTA theo yêu cầu.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with ACTA logo */}
          <Section style={header}>
            <div style={logoContainer}>
              <a
                href="https://acta.vn"
                target="_blank"
                rel="noopener noreferrer"
              >
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
            <Heading style={h1}>Xác nhận xóa tài khoản</Heading>

            <Text style={text}>
              Kính gửi <strong>{name}</strong>,
            </Text>

            <Text style={text}>
              Chúng tôi xác nhận rằng tài khoản của bạn tại{' '}
              <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong> đã được{' '}
              <strong style={deletedText}>xóa vĩnh viễn</strong> khỏi hệ thống
              vào lúc <strong>{formatDate(deletedAt)}</strong>.
            </Text>

            {/* Account Information */}
            <Section style={infoSection}>
              <Heading style={sectionTitle}>
                📋 Thông tin tài khoản đã xóa
              </Heading>

              <Section style={infoBox}>
                <Text style={infoLabel}>Họ và tên:</Text>
                <Text style={infoValue}>{name}</Text>

                <Text style={infoLabel}>Email:</Text>
                <Text style={infoValue}>{email}</Text>

                <Text style={infoLabel}>Mã tài khoản:</Text>
                <Text style={infoValue}>{referenceId}</Text>

                <Text style={infoLabel}>Thời gian xóa:</Text>
                <Text style={infoValue}>{formatDate(deletedAt)}</Text>
              </Section>
            </Section>

            {/* Deleted Data Summary */}
            <Section style={deletedDataSection}>
              <Heading style={sectionTitle}>🗑️ Dữ liệu đã xóa</Heading>

              <Text style={text}>
                Các dữ liệu sau đây đã được xóa vĩnh viễn cùng với tài khoản của
                bạn:
              </Text>

              <Section style={dataList}>
                {deletedData?.business ? (
                  <Text style={dataItem}>
                    • Thông tin doanh nghiệp và sản phẩm liên quan
                  </Text>
                ) : null}
                {deletedData?.posts && deletedData.posts > 0 ? (
                  <Text style={dataItem}>• {deletedData.posts} bài viết</Text>
                ) : null}
                {deletedData?.comments && deletedData.comments > 0 ? (
                  <Text style={dataItem}>
                    • {deletedData.comments} bình luận
                  </Text>
                ) : null}
                {deletedData?.orders && deletedData.orders > 0 ? (
                  <Text style={dataItem}>
                    • Lịch sử {deletedData.orders} đơn hàng
                  </Text>
                ) : null}
                {deletedData?.referrals && deletedData.referrals > 0 ? (
                  <Text style={dataItem}>
                    • Cấu trúc giới thiệu ({deletedData.referrals} người được
                    giới thiệu)
                  </Text>
                ) : null}
                <Text style={dataItem}>• Tin nhắn và tương tác cá nhân</Text>
                <Text style={dataItem}>• Lịch sử giao dịch và ví điện tử</Text>
                <Text style={dataItem}>
                  • Dữ liệu gamification và thành tựu
                </Text>
                <Text style={dataItem}>
                  • Danh sách theo dõi và người theo dõi
                </Text>
                <Text style={dataItem}>• Voucher và ưu đãi cá nhân</Text>
              </Section>
            </Section>

            {/* Important Notes */}
            <Section style={warningSection}>
              <Heading style={warningSectionTitle}>⚠️ Lưu ý quan trọng</Heading>

              <Text style={warningText}>
                • Việc xóa tài khoản là <strong>vĩnh viễn</strong> và{' '}
                <strong>không thể hoàn tác</strong>
              </Text>
              <Text style={warningText}>
                • Bạn không thể đăng nhập lại với địa chỉ email này
              </Text>
              <Text style={warningText}>
                • Tất cả dữ liệu cá nhân và hoạt động đã bị xóa khỏi hệ thống
              </Text>
              <Text style={warningText}>
                • Một số dữ liệu có thể được giữ lại theo quy định pháp luật về
                giao dịch và thuế
              </Text>
            </Section>

            {/* Rejoin Section */}
            <Section style={rejoinSection}>
              <Heading style={sectionTitle}>🔄 Muốn quay lại?</Heading>

              <Text style={text}>
                Nếu bạn muốn quay lại cộng đồng ACTA, bạn có thể đăng ký tài
                khoản mới bất cứ lúc nào tại{' '}
                <a href="https://acta.vn" style={link}>
                  acta.vn
                </a>
              </Text>

              <Text style={text}>
                Tuy nhiên, bạn sẽ phải bắt đầu lại từ đầu vì tất cả dữ liệu cũ
                đã bị xóa vĩnh viễn.
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Feedback Section */}
            <Section style={feedbackSection}>
              <Text style={feedbackText}>
                <strong>💬 Phản hồi của bạn rất quan trọng</strong>
              </Text>
              <Text style={feedbackText}>
                Chúng tôi rất tiếc khi bạn quyết định rời khỏi ACTA. Nếu bạn có
                thời gian, hãy chia sẻ lý do để chúng tôi có thể cải thiện dịch
                vụ tốt hơn.
              </Text>
              <Text style={feedbackText}>
                Liên hệ với chúng tôi tại:{' '}
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

            <Text style={footer}>
              Cảm ơn bạn đã từng là một phần của cộng đồng ACTA. Chúc bạn mọi
              điều tốt đẹp!
            </Text>
          </Section>

          {/* Footer */}
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
              Bạn nhận được email này vì tài khoản của bạn đã được xóa khỏi hệ
              thống ACTA.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles with beige theme (consistent with existing templates)
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

const deletedText = {
  color: '#dc2626',
  fontWeight: 'bold',
};

const sectionTitle = {
  color: '#8b4513',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const infoSection = {
  margin: '32px 0',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #ddbf94',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 4px',
};

const infoValue = {
  color: '#374151',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0 0 8px',
  wordBreak: 'break-all' as const,
};

const deletedDataSection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
};

const dataList = {
  margin: '16px 0 0',
  padding: '0 0 0 20px',
};

const dataItem = {
  color: '#7f1d1d',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const warningSection = {
  backgroundColor: '#fffbeb',
  border: '2px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
};

const warningSectionTitle = {
  color: '#d97706',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const warningText = {
  color: '#92400e',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const rejoinSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #7dd3fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
};

const feedbackSection = {
  backgroundColor: '#e8f5e9',
  border: '1px solid #4caf50',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const feedbackText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '4px 0',
};

const link = {
  color: '#cd853f',
  textDecoration: 'underline',
  fontWeight: '600',
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
  textAlign: 'center' as const,
  fontStyle: 'italic',
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

export default AccountDeletedEmail;
