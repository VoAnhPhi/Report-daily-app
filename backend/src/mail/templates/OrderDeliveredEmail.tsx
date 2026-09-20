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
import { OrderDeliveredData } from '../queue/mail-job.types';

// ---------------------------------------------------------------------------
// Subject helper (exported so handler can reuse it)
// ---------------------------------------------------------------------------

export function orderDeliveredSubject(data: OrderDeliveredData): string {
  return `Đơn hàng ${data.orderCode} đã được giao thành công`;
}

// ---------------------------------------------------------------------------
// Template component
// ---------------------------------------------------------------------------

export function OrderDeliveredEmail(props: OrderDeliveredData) {
  const {
    customerName,
    orderCode,
    items,
    subtotal,
    shippingFee,
    discount,
    total,
    deliveryAddress,
    deliveredAt,
    trackingCode,
  } = props;

  const fmtCurrency = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });

  // Format deliveredAt as a vi-VN readable date-time string
  const deliveredAtFormatted = deliveredAt
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(deliveredAt))
    : 'Không xác định';

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview style={{ fontWeight: 'bold' }}>
        {`Đơn hàng ${orderCode} đã được giao thành công — cảm ơn bạn đã mua sắm tại ACTA!`}
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
              Đơn hàng <strong>{orderCode}</strong> của bạn đã được giao thành công.
              Cảm ơn bạn đã tin tưởng và mua sắm tại ACTA!
            </Text>

            {/* Delivery confirmation info */}
            <Section style={deliverySection}>
              <Text style={deliveryLabel}>Thời gian giao hàng:</Text>
              <Text style={deliveryValue}>{deliveredAtFormatted}</Text>

              <Text style={deliveryLabel}>Địa chỉ nhận hàng:</Text>
              <Text style={deliveryValue}>{deliveryAddress}</Text>

              {trackingCode && (
                <>
                  <Text style={deliveryLabel}>Mã vận đơn:</Text>
                  <Text style={deliveryValue}>{trackingCode}</Text>
                </>
              )}
            </Section>

            <Hr style={hr} />

            {/* Order summary */}
            <Text style={sectionTitle}>Thông tin đơn hàng: {orderCode}</Text>

            {/* Items table */}
            {items.length > 0 && (
              <Section style={tableContainer}>
                <Row style={tableHeaderRow}>
                  <Column style={tableHeaderCell}>Sản phẩm</Column>
                  <Column style={tableHeaderCellRight}>SL</Column>
                  <Column style={tableHeaderCellRight}>Thành tiền</Column>
                </Row>
                {items.map((item, idx) => (
                  <Row key={idx} style={tableRow}>
                    <Column style={tableCell}>{item.productName}</Column>
                    <Column style={tableCellRight}>{item.quantity}</Column>
                    <Column style={tableCellRight}>
                      {fmtCurrency.format(item.lineTotal)}
                    </Column>
                  </Row>
                ))}
              </Section>
            )}

            {/* Totals */}
            <Section style={totalsContainer}>
              <Row style={totalRow}>
                <Column style={totalLabel}>Tạm tính:</Column>
                <Column style={totalValue}>{fmtCurrency.format(subtotal)}</Column>
              </Row>
              {shippingFee > 0 && (
                <Row style={totalRow}>
                  <Column style={totalLabel}>Phí vận chuyển:</Column>
                  <Column style={totalValue}>{fmtCurrency.format(shippingFee)}</Column>
                </Row>
              )}
              {discount > 0 && (
                <Row style={totalRow}>
                  <Column style={totalLabel}>Giảm giá:</Column>
                  <Column style={totalValue}>-{fmtCurrency.format(discount)}</Column>
                </Row>
              )}
              <Row style={grandTotalRow}>
                <Column style={grandTotalLabel}>Tổng cộng:</Column>
                <Column style={grandTotalValue}>{fmtCurrency.format(total)}</Column>
              </Row>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Cần hỗ trợ? Liên hệ với chúng tôi tại{' '}
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
  color: '#333333',
  fontSize: '24px',
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

const deliverySection = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '2px solid #16a34a',
};

const deliveryLabel = {
  color: '#15803d',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 0 2px 0',
};

const deliveryValue = {
  color: '#166534',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '20px 0 12px 0',
};

const tableContainer = {
  margin: '16px 0',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  overflow: 'hidden',
};

const tableHeaderRow = {
  backgroundColor: '#f3f4f6',
};

const tableHeaderCell = {
  color: '#374151',
  fontSize: '13px',
  fontWeight: '600',
  padding: '10px 12px',
  textAlign: 'left' as const,
};

const tableHeaderCellRight = {
  ...tableHeaderCell,
  textAlign: 'right' as const,
};

const tableRow = {
  borderTop: '1px solid #e5e7eb',
};

const tableCell = {
  color: '#4b5563',
  fontSize: '14px',
  padding: '10px 12px',
  textAlign: 'left' as const,
};

const tableCellRight = {
  ...tableCell,
  textAlign: 'right' as const,
};

const totalsContainer = {
  margin: '16px 0',
  padding: '0 8px',
};

const totalRow = {
  margin: '4px 0',
};

const totalLabel = {
  color: '#6b7280',
  fontSize: '14px',
  padding: '4px 0',
};

const totalValue = {
  color: '#374151',
  fontSize: '14px',
  textAlign: 'right' as const,
  padding: '4px 0',
};

const grandTotalRow = {
  borderTop: '2px solid #e5e7eb',
  marginTop: '8px',
};

const grandTotalLabel = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '8px 0 4px',
};

const grandTotalValue = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: 'bold',
  textAlign: 'right' as const,
  padding: '8px 0 4px',
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
  color: '#1a56db',
  textDecoration: 'underline',
};

export default OrderDeliveredEmail;
