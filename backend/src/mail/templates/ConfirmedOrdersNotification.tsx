import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from '@react-email/components';

interface Props {
  name: string;
  totalOrders: string;
  urlLink?: string;
}

export const ConfirmedOrdersNotification = ({
  name = 'Admin',
  totalOrders = '0',
  urlLink = '',
}: Props) => (
  <Html>
    <Head />
    <Preview>Nhắc nhở: Đơn hàng đã xác nhận cần kiểm tra</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerText}>
            Liên minh Cộng đồng thực chiến (ACTA)
          </Heading>
        </Section>

        <Section style={content}>
          <Heading style={h2}>Xin chào {name}!</Heading>

          <Text style={paragraph}>
            Hệ thống đã phát hiện có{' '}
            <strong>{totalOrders} đơn hàng đã xác nhận</strong> cần được kiểm
            tra và xử lý trong hệ thống E-commerce.
          </Text>

          <Text style={paragraph}>
            Để xử lý các đơn hàng này, vui lòng thực hiện các bước sau:
          </Text>

          <Section style={stepsList}>
            <Text style={stepItem}>
              1. Nhấn vào nút bên dưới để truy cập trang quản trị
            </Text>
            <Text style={stepItem}>
              2. Vào phần Quản lý E-commerce → Đơn hàng
            </Text>
            <Text style={stepItem}>
              3. Kiểm tra và xử lý các đơn hàng đã xác nhận
            </Text>
            <Text style={stepItem}>
              4. Cập nhật trạng thái đơn hàng thành "Đang đóng gói" sau khi xác
              nhận
            </Text>
          </Section>

          {urlLink && (
            <Section style={buttonContainer}>
              <Button style={button} href={urlLink}>
                📦 Xem đơn hàng đã xác nhận
              </Button>
            </Section>
          )}

          <Section style={noteBox}>
            <Text style={noteText}>
              ⏰ Lưu ý: Đơn hàng đã xác nhận cần được xử lý kịp thời để đảm bảo
              trải nghiệm tốt cho khách hàng. Thời gian xử lý lý tưởng là trong
              vòng 24 giờ.
            </Text>
          </Section>

          <Section style={infoBox}>
            <Heading style={infoHeading}>📋 Các bước xử lý đơn hàng:</Heading>
            <Text style={infoItem}>
              ✓ <strong>Xác nhận:</strong> Kiểm tra thông tin đơn hàng và
              thanh toán
            </Text>
            <Text style={infoItem}>
              ✓ <strong>Đóng gói:</strong> Chuẩn bị hàng và đóng gói cẩn thận
            </Text>
            <Text style={infoItem}>
              ✓ <strong>Giao hàng:</strong> Chuyển cho đơn vị vận chuyển hoặc
              thông báo khách nhận tại kho
            </Text>
          </Section>

          <Text style={paragraph}>
            Nếu bạn cần hỗ trợ hoặc có thắc mắc, vui lòng liên hệ với đội kỹ
            thuật qua email:{' '}
            <Link href="mailto:lienhe@acta.vn" style={link}>
              lienhe@acta.vn
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Trân trọng,
            <br />
            <strong>Đội ngũ ACTA E-commerce</strong>
          </Text>
        </Section>

        <Section style={footerSection}>
          <Text style={footerText}>
            Email này được gửi tự động từ hệ thống ACTA.
            <br />
            Vui lòng không trả lời email này.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  textAlign: 'center' as const,
};

const headerText = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '30px',
  backgroundColor: '#ffffff',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const paragraph = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
};

const stepsList = {
  margin: '0 0 20px 0',
};

const stepItem = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '5px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#28a745',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
};

const noteBox = {
  backgroundColor: '#fff3cd',
  padding: '15px',
  borderRadius: '8px',
  margin: '0 0 20px 0',
  border: '1px solid #ffc107',
};

const noteText = {
  color: '#856404',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 0 20px 0',
  border: '1px solid #dee2e6',
};

const infoHeading = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const infoItem = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.8',
  margin: '8px 0',
};

const link = {
  color: '#007bff',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '20px 0',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const footerSection = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#666',
  margin: '0',
};

