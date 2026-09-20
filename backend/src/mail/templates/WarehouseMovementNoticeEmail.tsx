import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/**
 * Mail báo chủ kho CTV có hàng chuyển vào kho của họ.
 *
 * Gửi ở CẢ HAI thời điểm — lúc phiếu vừa tạo và lúc phiếu được duyệt — chỉ khác
 * `statusLabel` và câu dẫn. Một mẫu cho cả hai để giao diện không trôi khỏi
 * nhau, và để sửa một chỗ là đủ.
 *
 * Mail này chỉ THÔNG BÁO: hành động duy nhất là "Xem chi tiết" dẫn vào trang
 * phiếu trong admin. Duyệt nằm trong trang quản trị, sau khi đăng nhập.
 */
interface Props {
  managerName: string;
  destinationWarehouseName: string;
  sourceWarehouseName?: string;
  submitterName: string;
  movementLabel: string;
  productName: string;
  quantityLabel: string;
  note?: string;
  /** 'Đang chờ duyệt' | 'Đã được duyệt'. */
  statusLabel: string;
  /** true khi phiếu đã duyệt — đổi câu dẫn, không đổi bố cục. */
  isApproved?: boolean;
  /**
   * Trang chi tiết KHO trong admin — không phải trang phiếu duyệt. Chủ kho CTV
   * không có quyền mở trang phiếu; lý do đầy đủ nằm ở `buildWarehouseDetailUrl`
   * trong `warehouse-reviews.service.ts`.
   */
  warehouseUrl: string;
}

export const WarehouseMovementNoticeEmail = ({
  managerName = 'Quý quản lý kho',
  destinationWarehouseName = '',
  sourceWarehouseName,
  submitterName = '',
  movementLabel = '',
  productName = '',
  quantityLabel = '',
  note,
  statusLabel = '',
  isApproved = false,
  warehouseUrl = '',
}: Props) => (
  <Html>
    <Head />
    <Preview>Thông báo biến động hàng hóa tại kho bạn quản lý</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerText}>
            Liên minh Cộng đồng thực chiến (ACTA)
          </Heading>
        </Section>

        <Section style={content}>
          <Heading style={h2}>Kính gửi {managerName},</Heading>

          <Text style={paragraph}>
            {isApproved ? (
              <>
                Yêu cầu <strong>{movementLabel}</strong> cho kho{' '}
                <strong>{destinationWarehouseName}</strong> mà bạn đang quản lý
                đã được duyệt. Tồn kho của bạn đã được cập nhật.
              </>
            ) : (
              <>
                Có một yêu cầu <strong>{movementLabel}</strong> đang chờ duyệt
                cho kho <strong>{destinationWarehouseName}</strong> mà bạn đang
                quản lý.
              </>
            )}
          </Text>

          <Section style={infoBox}>
            <Text style={infoRow}>
              <strong>Trạng thái:</strong> {statusLabel}
            </Text>
            <Text style={infoRow}>
              <strong>Sản phẩm:</strong> {productName}
            </Text>
            <Text style={infoRow}>
              <strong>Số lượng:</strong> {quantityLabel}
            </Text>
            {sourceWarehouseName && (
              <Text style={infoRow}>
                <strong>Kho gửi:</strong> {sourceWarehouseName}
              </Text>
            )}
            <Text style={infoRow}>
              <strong>Kho nhận:</strong> {destinationWarehouseName}
            </Text>
            <Text style={infoRow}>
              <strong>Người gửi yêu cầu:</strong> {submitterName}
            </Text>
          </Section>

          {note && (
            <Section style={noteBox}>
              <Text style={noteText}>
                <strong>Ghi chú:</strong> {note}
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={warehouseUrl}>
              Xem chi tiết
            </Button>
          </Section>

          <Text style={paragraph}>
            {isApproved
              ? 'Bấm nút trên để mở kho của bạn và kiểm tra tồn kho vừa được cập nhật.'
              : 'Bấm nút trên để mở kho của bạn. Số lượng nêu trên sẽ vào tồn kho sau khi yêu cầu được duyệt.'}{' '}
            Bạn cần đăng nhập bằng tài khoản của mình.
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

const infoBox = {
  backgroundColor: '#f8f9fa',
  padding: '15px',
  borderRadius: '8px',
  margin: '0 0 20px 0',
  border: '1px solid #e6e6e6',
};

const infoRow = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 6px 0',
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
  margin: '0',
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
