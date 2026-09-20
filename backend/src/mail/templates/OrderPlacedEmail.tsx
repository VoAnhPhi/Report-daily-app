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
  Row,
  Column,
} from '@react-email/components';
import { OrderPlacedData, OrderItemSummary } from '../queue/mail-job.types';

// ---------------------------------------------------------------------------
// Subject line — exported so the processor handler can use it without
// re-instantiating the component.
// ---------------------------------------------------------------------------

export function orderPlacedSubject(data: OrderPlacedData): string {
  return `Xác nhận đơn hàng ${data.orderCode} — ACTA`;
}

// ---------------------------------------------------------------------------
// VND formatter (reused in component)
// ---------------------------------------------------------------------------

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderPlacedEmail(props: OrderPlacedData) {
  const {
    customerName,
    orderCode,
    items,
    subtotal,
    shippingFee,
    discount,
    total,
    deliveryAddress,
    estimatedDelivery,
    pickupWarehouse,
  } = props;

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        Đơn hàng {orderCode} đã được xác nhận — cảm ơn bạn đã mua hàng tại ACTA!
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
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

          {/* Main content */}
          <Section style={content}>
            <Heading style={h1}>Xin chào {customerName}!</Heading>

            <Text style={text}>
              Cảm ơn bạn đã đặt hàng tại ACTA. Đơn hàng của bạn đã được xác nhận
              và đang được xử lý. Chúng tôi sẽ thông báo khi đơn hàng được giao cho
              đơn vị vận chuyển.
            </Text>

            {/* Order code highlight */}
            <Section style={orderCodeSection}>
              <Text style={orderCodeLabel}>Mã đơn hàng</Text>
              <Text style={orderCodeValue}>{orderCode}</Text>
            </Section>

            {/* Items table */}
            <Section style={itemsSection}>
              <Text style={sectionTitle}>Sản phẩm đã đặt</Text>

              {items.length === 0 ? (
                <Text style={emptyItemsText}>
                  (Không có sản phẩm trong đơn hàng)
                </Text>
              ) : (
                <>
                  {/* Header row */}
                  <Row style={tableHeaderRow}>
                    <Column style={colProduct}>
                      <Text style={tableHeaderCell}>Sản phẩm</Text>
                    </Column>
                    <Column style={colQty}>
                      <Text style={tableHeaderCell}>SL</Text>
                    </Column>
                    <Column style={colPrice}>
                      <Text style={tableHeaderCell}>Đơn giá</Text>
                    </Column>
                    <Column style={colTotal}>
                      <Text style={tableHeaderCell}>Thành tiền</Text>
                    </Column>
                  </Row>

                  {/* Item rows */}
                  {items.map((item: OrderItemSummary, index: number) => (
                    <Row
                      key={index}
                      style={index % 2 === 0 ? tableRowEven : tableRowOdd}
                    >
                      <Column style={colProduct}>
                        <Text style={tableCellText}>{item.productName}</Text>
                      </Column>
                      <Column style={colQty}>
                        <Text style={tableCellTextCenter}>{item.quantity}</Text>
                      </Column>
                      <Column style={colPrice}>
                        <Text style={tableCellTextRight}>
                          {formatVnd(item.unitPrice)}
                        </Text>
                      </Column>
                      <Column style={colTotal}>
                        <Text style={tableCellTextRight}>
                          {formatVnd(item.lineTotal)}
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </>
              )}
            </Section>

            {/* Order totals */}
            <Section style={totalsSection}>
              <Row>
                <Column style={totalsLabelCol}>
                  <Text style={totalsLabel}>Tạm tính:</Text>
                </Column>
                <Column style={totalsValueCol}>
                  <Text style={totalsValue}>{formatVnd(subtotal)}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={totalsLabelCol}>
                  <Text style={totalsLabel}>Phí vận chuyển:</Text>
                </Column>
                <Column style={totalsValueCol}>
                  <Text style={totalsValue}>{formatVnd(shippingFee)}</Text>
                </Column>
              </Row>
              {discount > 0 && (
                <Row>
                  <Column style={totalsLabelCol}>
                    <Text style={totalsLabel}>Giảm giá:</Text>
                  </Column>
                  <Column style={totalsValueCol}>
                    <Text style={discountValue}>-{formatVnd(discount)}</Text>
                  </Column>
                </Row>
              )}
              <Hr style={totalsDivider} />
              <Row>
                <Column style={totalsLabelCol}>
                  <Text style={grandTotalLabel}>Tổng cộng:</Text>
                </Column>
                <Column style={totalsValueCol}>
                  <Text style={grandTotalValue}>{formatVnd(total)}</Text>
                </Column>
              </Row>
            </Section>

            {/* Delivery info — đơn nhận tại kho hiện địa điểm đến lấy, đơn giao tận
                nhà hiện địa chỉ giao. Hai loại đơn cần hai thông tin khác hẳn nhau. */}
            {pickupWarehouse ? (
              <Section style={pickupSection}>
                <Text style={sectionTitle}>Địa điểm nhận hàng</Text>
                <Text style={pickupText}>
                  <strong>Kho:</strong> {pickupWarehouse.name}
                </Text>
                {pickupWarehouse.addressLine && (
                  <Text style={pickupText}>
                    <strong>Địa chỉ:</strong> {pickupWarehouse.addressLine}
                  </Text>
                )}
                {pickupWarehouse.phone && (
                  <Text style={pickupText}>
                    <strong>Điện thoại:</strong> {pickupWarehouse.phone}
                  </Text>
                )}
                <Text style={pickupNote}>
                  Vui lòng mang theo mã đơn hàng khi đến nhận. Nếu điểm nhận
                  hàng thay đổi, chúng tôi sẽ báo lại cho bạn.
                </Text>
              </Section>
            ) : (
              <Section style={deliverySection}>
                <Text style={sectionTitle}>Thông tin giao hàng</Text>
                <Text style={deliveryAddressText}>
                  <strong>Địa chỉ giao hàng:</strong> {deliveryAddress}
                </Text>
                {estimatedDelivery && (
                  <Text style={estimatedText}>
                    <strong>Thời gian dự kiến:</strong> {estimatedDelivery}
                  </Text>
                )}
              </Section>
            )}

            <Hr style={hr} />

            <Text style={footer}>
              Nếu có câu hỏi về đơn hàng, vui lòng liên hệ với chúng tôi tại{' '}
              <a
                href="mailto:lienhe@acta.vn"
                style={link}
                target="_blank"
                rel="noreferrer"
              >
                lienhe@acta.vn
              </a>
            </Text>

            <Text style={footer}>
              Hoặc ghé thăm{' '}
              <a
                href="https://acta.vn"
                style={link}
                target="_blank"
                rel="noreferrer"
              >
                acta.vn
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              © 2025 ACTA - Affiliate Community's Tactical Alliance
            </Text>
            <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
            <Text style={footerText}>
              94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
            </Text>
            <Text style={footerText}>Website: https://acta.vn</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderPlacedEmail;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '20px',
};

const orderCodeSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px 24px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px dashed #f59e0b',
};

const orderCodeLabel = {
  color: '#92400e',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const orderCodeValue = {
  color: '#78350f',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  fontFamily: 'Courier New, monospace',
};

const itemsSection = {
  margin: '24px 0',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const emptyItemsText = {
  color: '#6b7280',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  textAlign: 'center' as const,
  padding: '20px 0',
};

const tableHeaderRow = {
  backgroundColor: '#f3f4f6',
  borderRadius: '4px',
};

const tableHeaderCell = {
  color: '#374151',
  fontSize: '13px',
  fontWeight: '700',
  padding: '8px 4px',
  margin: '0',
};

const tableRowEven = {
  backgroundColor: '#ffffff',
};

const tableRowOdd = {
  backgroundColor: '#f9fafb',
};

const tableCellText = {
  color: '#374151',
  fontSize: '14px',
  padding: '8px 4px',
  margin: '0',
};

const tableCellTextCenter = {
  ...tableCellText,
  textAlign: 'center' as const,
};

const tableCellTextRight = {
  ...tableCellText,
  textAlign: 'right' as const,
};

const colProduct = { width: '45%' };
const colQty = { width: '10%' };
const colPrice = { width: '22%' };
const colTotal = { width: '23%' };

const totalsSection = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const totalsLabelCol = { width: '60%' };
const totalsValueCol = { width: '40%' };

const totalsLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '4px 0',
};

const totalsValue = {
  color: '#374151',
  fontSize: '14px',
  textAlign: 'right' as const,
  margin: '4px 0',
};

const discountValue = {
  color: '#16a34a',
  fontSize: '14px',
  textAlign: 'right' as const,
  margin: '4px 0',
};

const totalsDivider = {
  borderColor: '#e5e7eb',
  margin: '8px 0',
};

const grandTotalLabel = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '4px 0',
};

const grandTotalValue = {
  color: '#8b4513',
  fontSize: '18px',
  fontWeight: 'bold',
  textAlign: 'right' as const,
  margin: '4px 0',
};

const deliverySection = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const deliveryAddressText = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px 0',
};

const estimatedText = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
};

// Khối "nhận tại kho" — tông cam của thương hiệu, tách hẳn khỏi khối giao hàng màu
// xanh để khách liếc qua là biết đơn này phải tự đến lấy.
const pickupSection = {
  backgroundColor: '#fff7f0',
  border: '2px solid #f5c9ae',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const pickupText = {
  color: '#7c2d12',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px 0',
};

const pickupNote = {
  color: '#9a3412',
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '8px 0 0 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  marginBottom: '12px',
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

const link = {
  color: '#cd853f',
  textDecoration: 'underline',
};
