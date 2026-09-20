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

interface OrderItemVariantAxis {
  axisId: string;
  axisName: string;
  optionId: string;
  optionLabel: string;
}

interface OrderItemVariantSnapshot {
  familyId?: string | null;
  familyName?: string | null;
  axes: OrderItemVariantAxis[];
}

interface OrderItem {
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
    thumbnail?: string;
    code: string;
  };
  // §22 frozen variant snapshot — render axes (Size: XL / Color: Xanh) under
  // the product name. Null/empty for products without a ProductFamily.
  variantSnapshot?: OrderItemVariantSnapshot | null;
}

// Phone masking: keep first 4 + last 2 digits, replace middle 4 with ****
// Example: 0901234567 → 0901****67
const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
};

interface GiftSummary {
  recipientName: string;
  // Raw recipient phone — this template masks it before render.
  // Buyers (the only audience for this email) see masked output: 0901****67.
  recipientPhone: string;
  giftTemplateName?: string;
  giftMessagePreview?: string;
  anonymousSender: boolean;
  senderDisplayName?: string;
  preferredDeliveryDate?: Date;
  preferredDeliveryTimeStart?: string;
  preferredDeliveryTimeEnd?: string;
}

interface OrderSuccessEmailProps {
  customerName: string;
  orderCode: string;
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  vatAmount: number;
  totalWithVat: number;
  estimatedDelivery?: Date;
  customerInfo: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1?: string;
    province?: string;
    district?: string;
    ward?: string;
  };
  trackingNumber?: string;
  giftSummary?: GiftSummary;
  groupBuy?: {
    leaderName: string;
    total: number;
    members: Array<{ name: string; contribution: number | null; isLeader: boolean }>;
  } | null;
}

export const OrderSuccessEmail = ({
  customerName,
  orderCode,
  orderId,
  items,
  subtotal,
  shippingFee,
  discount,
  total,
  vatAmount,
  totalWithVat,
  estimatedDelivery,
  customerInfo,
  trackingNumber,
  giftSummary,
  groupBuy,
}: OrderSuccessEmailProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Đang cập nhật';
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatShortDate = (date: Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const buildGiftDeliveryLine = (gs: GiftSummary): string | null => {
    if (!gs.preferredDeliveryDate) return null;
    const datePart = `ngày ${formatShortDate(gs.preferredDeliveryDate)}`;
    if (gs.preferredDeliveryTimeStart && gs.preferredDeliveryTimeEnd) {
      return `${datePart}, khung ${gs.preferredDeliveryTimeStart}–${gs.preferredDeliveryTimeEnd}`;
    }
    return datePart;
  };

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        🎉 Đặt hàng thành công! Đơn hàng {orderCode} đã được xác nhận và đang
        được xử lý.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
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
            <Heading style={h1}>🎉 Đặt hàng thành công!</Heading>

            <Text style={text}>
              Xin chào <strong>{customerName}</strong>,
            </Text>

            <Text style={text}>
              Cảm ơn bạn đã đặt hàng tại <strong>ACTA</strong>! Đơn hàng của bạn
              đã được xác nhận thành công và đang được xử lý.
            </Text>

            {/* Order Info */}
            <Section style={orderInfoSection}>
              <Heading as="h2" style={sectionTitle}>
                📋 Thông tin đơn hàng
              </Heading>
              <Row>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>Mã đơn hàng:</Text>
                  <Text style={infoValue}>{orderCode}</Text>
                </Column>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>Ngày đặt:</Text>
                  <Text style={infoValue}>{formatDate(new Date())}</Text>
                </Column>
              </Row>
              {trackingNumber && (
                <Row>
                  <Column>
                    <Text style={infoLabel}>Mã vận đơn:</Text>
                    <Text style={infoValue}>{trackingNumber}</Text>
                  </Column>
                </Row>
              )}
            </Section>

            {/* Group-buy badge + participants — only when groupBuy is present */}
            {groupBuy && (
              <Section style={groupBuySection}>
                <Heading as="h2" style={groupBuyTitle}>
                  👥 Đơn mua chung
                </Heading>
                <Text style={groupBuyRow}>
                  <strong>Nhóm trưởng:</strong> {groupBuy.leaderName}
                </Text>
                <Text style={groupBuyRow}>
                  <strong>Tổng đơn:</strong>{' '}
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(groupBuy.total)}
                </Text>
                <Hr style={groupBuyDivider} />
                <Text style={groupBuyMemberHeader}>
                  <strong>Danh sách thành viên:</strong>
                </Text>
                {groupBuy.members.map((m, i) => (
                  <Text key={i} style={groupBuyMemberRow}>
                    {m.isLeader ? '★ ' : '• '}
                    <strong>{m.name}</strong>
                    {m.isLeader ? ' (Nhóm trưởng)' : ''}
                    {m.contribution !== null && m.contribution !== undefined
                      ? ` — ${new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(m.contribution)}`
                      : ''}
                  </Text>
                ))}
              </Section>
            )}

            {/* Gift Summary Card — buyer-facing, shown only when giftSummary is present */}
            {giftSummary && (
              <Section style={giftSummarySection}>
                <Heading as="h2" style={giftSummaryTitle}>
                  🎁 Đơn hàng quà tặng
                </Heading>
                <Text style={giftSummaryRow}>
                  <strong>Người nhận:</strong> {giftSummary.recipientName} (
                  {maskPhone(giftSummary.recipientPhone)})
                </Text>
                {giftSummary.giftTemplateName && (
                  <Text style={giftSummaryRow}>
                    <strong>Template:</strong> {giftSummary.giftTemplateName}
                  </Text>
                )}
                {giftSummary.giftMessagePreview && (
                  <Text style={giftSummaryMessageRow}>
                    <strong>Lời nhắn:</strong>{' '}
                    <em>
                      {giftSummary.giftMessagePreview.length > 120
                        ? `${giftSummary.giftMessagePreview.slice(0, 120)}…`
                        : giftSummary.giftMessagePreview}
                    </em>
                  </Text>
                )}
                {giftSummary.anonymousSender && (
                  <Text style={giftSummaryRow}>
                    <strong>Ẩn danh:</strong> Có (hiển thị &ldquo;
                    {giftSummary.senderDisplayName || 'Một người gửi đặc biệt'}
                    &rdquo;)
                  </Text>
                )}
                {buildGiftDeliveryLine(giftSummary) && (
                  <Text style={giftSummaryRow}>
                    <strong>Mong muốn giao:</strong>{' '}
                    {buildGiftDeliveryLine(giftSummary)}
                  </Text>
                )}
              </Section>
            )}

            {/* Order Items */}
            <Section style={itemsSection}>
              <Heading as="h2" style={sectionTitle}>
                🛍️ Chi tiết sản phẩm
              </Heading>
              {items.map((item, index) => (
                <div key={item.orderItemId} style={itemRow}>
                  <Row>
                    <Column style={itemImageColumn}>
                      {item.product.thumbnail && (
                        <Img
                          src={item.product.thumbnail || '/placeholder.svg'}
                          alt={item.product.name}
                          width="150"
                          height="150"
                          style={itemImage}
                        />
                      )}
                    </Column>
                    <Column style={itemDetailsColumn}>
                      <Text style={itemName}>{item.product.name}</Text>
                      {item.variantSnapshot &&
                        item.variantSnapshot.axes &&
                        item.variantSnapshot.axes.length > 0 && (
                          <Text style={itemVariant}>
                            {item.variantSnapshot.axes
                              .map((a) => `${a.axisName}: ${a.optionLabel}`)
                              .join(' / ')}
                          </Text>
                        )}
                      <Text style={itemCode}>Mã SP: {item.product.code}</Text>
                      <Text style={itemQuantity}>
                        Số lượng: {item.quantity}
                      </Text>
                    </Column>
                    <Column style={itemPriceColumn}>
                      <Text style={itemPrice}>
                        {formatCurrency(item.unitPrice)}
                      </Text>
                      <Text style={itemTotal}>
                        {formatCurrency(item.lineTotal)}
                      </Text>
                    </Column>
                  </Row>
                  {index < items.length - 1 && <Hr style={itemDivider} />}
                </div>
              ))}
            </Section>

            {/* Order Summary */}
            <Section style={summarySection}>
              <Heading as="h2" style={sectionTitle}>
                💰 Tóm tắt đơn hàng
              </Heading>
              <div style={summaryRow}>
                <Text style={summaryLabel}>Tạm tính:</Text>
                <Text style={summaryValue}>{formatCurrency(subtotal)}</Text>
              </div>
              <div style={summaryRow}>
                <Text style={summaryLabel}>Phí vận chuyển:</Text>
                <Text style={summaryValue}>{formatCurrency(shippingFee)}</Text>
              </div>
              {discount > 0 && (
                <div style={summaryRow}>
                  <Text style={summaryLabel}>Giảm giá:</Text>
                  <Text style={summaryValueDiscount}>
                    -{formatCurrency(discount)}
                  </Text>
                </div>
              )}
              <Hr style={summaryDivider} />
              <div style={summaryRow}>
                <Text style={summaryLabel}>Tổng tiền (chưa VAT):</Text>
                <Text style={summaryValue}>
                  {formatCurrency(Math.max(0, total - vatAmount))}
                </Text>
              </div>
              <div style={summaryRow}>
                <Text style={summaryLabel}>VAT:</Text>
                <Text style={summaryValue}>{formatCurrency(vatAmount)}</Text>
              </div>
              <div style={summaryRowTotal}>
                <Text style={summaryLabelTotal}>Tổng cộng (có VAT):</Text>
                <Text style={summaryValueTotal}>
                  {formatCurrency(totalWithVat)}
                </Text>
              </div>
            </Section>

            {/* Delivery Info */}
            <Section style={deliverySection}>
              <Heading as="h2" style={sectionTitle}>
                🚚 Thông tin giao hàng
              </Heading>
              {estimatedDelivery && (
                <Text style={deliveryText}>
                  <strong>Dự kiến giao hàng:</strong>{' '}
                  {formatDate(estimatedDelivery)}
                </Text>
              )}
              <Text style={deliveryText}>
                <strong>Người nhận:</strong> {customerInfo.fullName}
              </Text>
              <Text style={deliveryText}>
                <strong>Số điện thoại:</strong> {customerInfo.phone}
              </Text>
              {customerInfo.email ? (
                <Text style={deliveryText}>
                  <strong>Email:</strong> {customerInfo.email}
                </Text>
              ) : null}
              <Text style={deliveryText}>
                <strong>Địa chỉ:</strong> {customerInfo.addressLine1},{' '}
                {customerInfo.ward}, {customerInfo.district},{' '}
                {customerInfo.province}
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Chúng tôi sẽ thông báo cho bạn khi đơn hàng được giao đến đơn vị
              vận chuyển và khi giao hàng thành công.
            </Text>

            <Text style={footer}>
              Nếu bạn có bất kỳ câu hỏi nào về đơn hàng, vui lòng liên hệ với
              chúng tôi tại{' '}
              <a href="mailto:lienhe@acta.vn" style={link}>
                lienhe@acta.vn
              </a>{' '}
              hoặc gọi <strong>0912 880 330</strong>.
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
};

// Styles
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
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const sectionTitle = {
  color: '#8b4513',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const orderInfoSection = {
  backgroundColor: '#faf8f3',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #ddbf94',
};

const infoColumn = {
  width: '50%',
  paddingRight: '10px',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
  fontWeight: '600',
};

const infoValue = {
  color: '#374151',
  fontSize: '16px',
  margin: '0 0 12px',
  fontWeight: 'bold',
};

const itemsSection = {
  backgroundColor: '#ffffff',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
};

const itemRow = {
  margin: '0 0 16px',
};

const itemImageColumn = {
  width: '80px',
  paddingRight: '16px',
};

const itemDetailsColumn = {
  width: 'auto',
  paddingRight: '16px',
};

const itemPriceColumn = {
  width: '120px',
  textAlign: 'right' as const,
};

const itemImage = {
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
};

const itemName = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const itemVariant = {
  color: '#8b4513',
  fontSize: '13px',
  fontStyle: 'italic' as const,
  margin: '0 0 4px',
};

const itemCode = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
};

const itemQuantity = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const itemPrice = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
};

const itemTotal = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const itemDivider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const summarySection = {
  backgroundColor: '#faf8f3',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #ddbf94',
};

const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '0 0 8px',
};

const summaryRowTotal = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '16px 0 0',
  padding: '16px 0 0',
  borderTop: '2px solid #ddbf94',
};

const summaryLabel = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
};

const summaryValue = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  fontWeight: '600',
};

const summaryValueDiscount = {
  color: '#dc2626',
  fontSize: '16px',
  margin: '0',
  fontWeight: '600',
};

const summaryLabelTotal = {
  color: '#8b4513',
  fontSize: '18px',
  margin: '0',
  fontWeight: 'bold',
};

const summaryValueTotal = {
  color: '#8b4513',
  fontSize: '18px',
  margin: '0',
  fontWeight: 'bold',
};

const summaryDivider = {
  borderColor: '#ddbf94',
  margin: '12px 0',
};

const deliverySection = {
  backgroundColor: '#f0f9ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #0ea5e9',
};

const deliveryText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 8px',
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

const giftSummarySection = {
  backgroundColor: '#fdf4ff',
  border: '1px solid #d8b4fe',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const giftSummaryTitle = {
  color: '#7e22ce',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 14px',
};

const giftSummaryRow = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const giftSummaryMessageRow = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
  fontStyle: 'italic' as const,
};

const groupBuySection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const groupBuyTitle = {
  color: '#166534',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 14px',
};

const groupBuyRow = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const groupBuyDivider = {
  borderColor: '#86efac',
  margin: '12px 0',
};

const groupBuyMemberHeader = {
  color: '#374151',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const groupBuyMemberRow = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 6px',
};
