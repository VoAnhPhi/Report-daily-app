type CommissionLevel = 'F0' | 'F1' | 'F2' | 'F4' | 'F5';

interface CommissionDetail {
  productName: string;
  productCode: string;
  quantity: number;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  categoryName: string;
}

interface LevelInfo {
  title: string;
  description: string;
  emoji: string;
  color: string;
  levelName: string;
}

interface AffiliateCommissionEmailProps {
  recipientName: string;
  commissionLevel?: CommissionLevel;
  buyerName: string;
  orderCode: string;
  orderDate: Date;
  commissions: CommissionDetail[];
  totalCommissionAmount: number;
  expectedPaymentDate?: Date;
  customerType?: 'guest' | 'member'; // Loại khách hàng: khách vãng lai hoặc thành viên
  referralTreeInfo?: {
    directReferrals: number;
    totalReferrals: number;
  };
  paymentInfo?: {
    provider: string;
    method: string;
    amount: number;
    status: string;
    providerRef?: string;
    succeededAt?: Date;
  };
  orderPaymentInfo?: {
    method: string;
    status: string;
    amount: number;
    transDate?: Date;
    bankAccount?: string;
  };
  orderTotals?: {
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
  };
  deliveryInfo?: {
    type: string;
    receiver: string;
    contactNumber?: string;
    province?: string;
    district?: string;
    ward?: string;
    address?: string;
  };
}

export const AffiliateCommissionEmail = ({
  recipientName,
  commissionLevel,
  buyerName,
  orderCode,
  orderDate,
  commissions,
  totalCommissionAmount,
  expectedPaymentDate,
  customerType,
  referralTreeInfo,
  paymentInfo,
  orderPaymentInfo,
  orderTotals,
  deliveryInfo,
}: AffiliateCommissionEmailProps) => {
  const showReferralTreeInfo =
    Boolean(referralTreeInfo) &&
    commissionLevel !== 'F4' &&
    commissionLevel !== 'F5';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getPaymentMethodName = (method: string) => {
    const methodNames = {
      transfer: 'Chuyển khoản',
      cash: 'Tiền mặt',
      card: 'Thẻ',
    };
    return methodNames[method as keyof typeof methodNames] || method;
  };

  const getPaymentProviderName = (provider: string) => {
    const providerNames = {
      vietqr: 'Chuyển khoản ngân hàng',
      vnpay: 'Chuyển khoản ngân hàng',
      cash: 'Tiền mặt',
      stripe: 'Stripe',
    };
    return providerNames[provider as keyof typeof providerNames] || provider;
  };

  const getDeliveryTypeName = (type: string) => {
    const typeNames = {
      warehouse_pickup: 'Nhận tại kho',
      prepaid_ship: 'Giao hàng trả trước',
      ship_cod: 'Giao hàng thu tiền (COD)',
    };
    return typeNames[type as keyof typeof typeNames] || type;
  };

  const getCustomerTypeName = (type?: 'guest' | 'member') => {
    if (!type) return 'Không xác định';
    return type === 'guest' ? '👤 Khách vãng lai' : '⭐ Thành viên hệ thống';
  };

  const getLevelName = (level?: string): string => {
    if (!level) return 'không xác định';

    const levelNames: Record<CommissionLevel, string> = {
      F0: 'ngân sách hỗ trợ cộng đồng',
      F1: 'gián tiếp',
      F2: 'trực tiếp',
      F4: 'Các Thành viên tích cực',
      F5: 'Người giới thiệu doanh nghiệp',
    };

    return levelNames[level as CommissionLevel] || level;
  };

  const defaultLevelInfo: LevelInfo = {
    title: '🎉 Bạn vừa nhận được chiết khấu!',
    description: 'Bạn vừa nhận được chiết khấu từ đơn hàng',
    emoji: '💰',
    color: '#16a34a',
    levelName: getLevelName(commissionLevel),
  };

  const getLevelInfo = (level?: string): LevelInfo => {
    switch (level) {
      case 'F2':
        return {
          title:
            '🎉 Bạn vừa nhận được chiết khấu từ người bạn giới thiệu trực tiếp!',
          description:
            'Người bạn giới thiệu trực tiếp vừa hoàn thành đơn mua hàng',
          emoji: '🛍️',
          color: '#16a34a',
          levelName: getLevelName(level),
        };
      case 'F1':
        return {
          title:
            '💰 Bạn vừa nhận được chiết khấu từ người bạn giới thiệu gián tiếp!',
          description:
            'Người bạn giới thiệu gián tiếp vừa hoàn thành đơn mua hàng',
          emoji: '👥',
          color: '#0ea5e9',
          levelName: getLevelName(level),
        };
      case 'F0':
        return {
          title:
            '🌟 Ngân sách hỗ trợ cộng đồng hệ thống vừa nhận thêm nguồn tiền bổ sung từ đơn hàng!',
          description:
            'Ngân sách hỗ trợ cộng đồng hệ thống vừa nhận thêm nguồn tiền bổ sung từ đơn hàng',
          emoji: '🌳',
          color: '#8b5cf6',
          levelName: getLevelName(level),
        };
      case 'F5':
        return {
          title:
            '🏆 Bạn vừa nhận được chiết khấu từ đơn hàng sản phẩm tài trợ!',
          description: 'Có khách hàng vừa hoàn thành đơn mua hàng',
          emoji: '🏅',
          color: '#b45309',
          levelName: getLevelName(level),
        };
      case 'F4':
        return {
          title:
            '🎯 Bạn vừa nhận được chiết khấu từ đơn hàng sản phẩm tài trợ!',
          description: 'Có khách hàng vừa hoàn thành đơn mua hàng',
          emoji: '🎁',
          color: '#7c3aed',
          levelName: getLevelName(level),
        };
      default:
        return defaultLevelInfo;
    }
  };

  const levelInfo = getLevelInfo(commissionLevel);

  return (
    <div style={main}>
      <div style={container}>
        {/* Header */}
        <div style={header}>
          <div style={logoContainer}>
            <a href="https://acta.vn" target="_blank" rel="noopener noreferrer">
              <img
                src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
                alt="ACTA Logo"
                width="150"
                height="150"
                style={logoImage}
              />
            </a>
          </div>
        </div>

        {/* Main content */}
        <div style={content}>
          <h1 style={{ ...h1, color: levelInfo.color }}>{levelInfo.title}</h1>

          <p style={text}>
            Xin chào <strong>{recipientName}</strong>,
          </p>

          <p style={text}>
            {levelInfo.description}. Bạn vừa nhận được chiết khấu từ đơn hàng{' '}
            <strong>{orderCode} </strong>
            của <strong>{buyerName}</strong> vào ngày{' '}
            <strong>{formatDate(orderDate)}</strong>.
          </p>

          {/* Commission Summary */}
          <div style={{ ...summarySection, borderColor: levelInfo.color }}>
            <div style={summaryHeader}>
              <p style={summaryIcon}>{levelInfo.emoji}</p>
              <h2 style={{ ...summaryTitle, color: levelInfo.color }}>
                Tổng chiết khấu nhận được
              </h2>
            </div>
            <p style={summaryAmount}>{formatCurrency(totalCommissionAmount)}</p>
            <p style={summaryLevel}>
              Cấp độ: <strong>{levelInfo.levelName}</strong>
            </p>
          </div>

          {/* Commission Details */}
          <div style={detailsSection}>
            <h2 style={sectionTitle}>📊 Chi tiết chiết khấu</h2>
            {commissions.map((commission, index) => (
              <div key={index} style={commissionRow}>
                <div style={{ display: 'flex' }}>
                  <div style={productColumn}>
                    <p style={productName}>{commission.productName}</p>
                    <p style={productCode}>Mã SP: {commission.productCode}</p>
                    <p style={categoryName}>
                      Danh mục: {commission.categoryName}
                    </p>
                  </div>
                  <div style={amountColumn}>
                    <p style={quantity}>SL: {commission.quantity}</p>
                    <p style={baseAmount}>
                      Cơ sở: {formatCurrency(commission.baseAmount)}
                    </p>
                    <p style={commissionAmount}>
                      {formatCurrency(commission.commissionAmount)}
                    </p>
                  </div>
                </div>
                {index < commissions.length - 1 && (
                  <hr style={commissionDivider} />
                )}
              </div>
            ))}
          </div>

          {/* Order Information */}
          <div style={orderSection}>
            <h2 style={sectionTitle}>📋 Thông tin đơn hàng</h2>
            <div style={orderRow}>
              <p style={orderLabel}>Mã đơn hàng:</p>
              <p style={orderValue}>{orderCode}</p>
            </div>
            <div style={orderRow}>
              <p style={orderLabel}>Người mua:</p>
              <p style={orderValue}>{buyerName}</p>
            </div>
            <div style={orderRow}>
              <p style={orderLabel}>Loại khách hàng:</p>
              <p style={orderValue}>{getCustomerTypeName(customerType)}</p>
            </div>
            {deliveryInfo && (
              <div style={orderRow}>
                <p style={orderLabel}>Phương thức nhận hàng:</p>
                <p style={orderValue}>
                  {deliveryInfo.type === 'prepaid_ship'
                    ? '🚚 Giao hàng tận nơi'
                    : deliveryInfo.type === 'warehouse_pickup'
                      ? '🏪 Nhận hàng tại kho'
                      : getDeliveryTypeName(deliveryInfo.type)}
                </p>
              </div>
            )}
            <div style={orderRow}>
              <p style={orderLabel}>Ngày đặt hàng:</p>
              <p style={orderValue}>{formatDate(orderDate)}</p>
            </div>
            <div style={orderRow}>
              <p style={orderLabel}>Cấp độ chiết khấu:</p>
              <p style={orderValue}>{levelInfo.levelName}</p>
            </div>
          </div>

          {/* Payment Information */}
          {paymentInfo && (
            <div style={paymentSection}>
              <h2 style={sectionTitle}>💳 Thông tin thanh toán</h2>
              <div style={orderRow}>
                <p style={orderLabel}>Phương thức thanh toán:</p>
                <p style={orderValue}>
                  {getPaymentMethodName(
                    orderPaymentInfo?.method || paymentInfo.method,
                  )}
                </p>
              </div>
              {paymentInfo.provider && (
                <div style={orderRow}>
                  <p style={orderLabel}>Nhà cung cấp:</p>
                  <p style={orderValue}>
                    {getPaymentProviderName(paymentInfo.provider)}
                  </p>
                </div>
              )}
              <div style={orderRow}>
                <p style={orderLabel}>Số tiền thanh toán:</p>
                <p style={orderValue}>{formatCurrency(paymentInfo.amount)}</p>
              </div>
              <div style={orderRow}>
                <p style={orderLabel}>Trạng thái:</p>
                <p style={orderValue}>
                  {paymentInfo.status === 'succeeded'
                    ? '✅ Thành công'
                    : paymentInfo.status}
                </p>
              </div>
              {paymentInfo.providerRef && (
                <div style={orderRow}>
                  <p style={orderLabel}>Mã giao dịch:</p>
                  <p style={orderValue}>{paymentInfo.providerRef}</p>
                </div>
              )}
              {paymentInfo.succeededAt && (
                <div style={orderRow}>
                  <p style={orderLabel}>Thời gian thanh toán:</p>
                  <p style={orderValue}>
                    {formatDate(paymentInfo.succeededAt)}
                  </p>
                </div>
              )}
              {orderTotals && (
                <div style={orderRow}>
                  <p style={orderLabel}>Tổng giá trị đơn hàng:</p>
                  <p style={orderValue}>{formatCurrency(orderTotals.total)}</p>
                </div>
              )}
              {expectedPaymentDate && (
                <p style={paymentNote}>
                  💡 <strong>Lưu ý:</strong> Chiết khấu sẽ được thanh toán sau
                  khi đơn hàng hoàn thành và qua thời gian bảo hành (nếu có).
                  <br />
                  <strong>Dự kiến thanh toán:</strong>{' '}
                  {formatDate(expectedPaymentDate)}
                </p>
              )}
            </div>
          )}

          {/* Delivery Information */}
          {deliveryInfo && (
            <div style={deliverySection}>
              <h2 style={sectionTitle}>🚚 Thông tin giao hàng</h2>
              <div style={orderRow}>
                <p style={orderLabel}>Phương thức giao hàng:</p>
                <p style={orderValue}>
                  {getDeliveryTypeName(deliveryInfo.type)}
                </p>
              </div>
              <div style={orderRow}>
                <p style={orderLabel}>Người nhận:</p>
                <p style={orderValue}>{deliveryInfo.receiver}</p>
              </div>
              {deliveryInfo.contactNumber && (
                <div style={orderRow}>
                  <p style={orderLabel}>Số điện thoại:</p>
                  <p style={orderValue}>{deliveryInfo.contactNumber}</p>
                </div>
              )}
              {(deliveryInfo.address ||
                deliveryInfo.ward ||
                deliveryInfo.district ||
                deliveryInfo.province) && (
                <div style={orderRow}>
                  <p style={orderLabel}>Địa chỉ:</p>
                  <p style={orderValue}>
                    {[
                      deliveryInfo.address,
                      deliveryInfo.ward,
                      deliveryInfo.district,
                      deliveryInfo.province,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Referral Tree Info */}
          {showReferralTreeInfo && (
            <div style={treeSection}>
              <h2 style={sectionTitle}>🌳 Thông tin nhóm giới thiệu</h2>
              <div style={treeRow}>
                <p style={treeLabel}>Số người giới thiệu trực tiếp:</p>
                <p style={treeValue}>
                  {referralTreeInfo!.directReferrals} người
                </p>
              </div>
              <div style={treeRow}>
                <p style={treeLabel}>Tổng số người giới thiệu gián tiếp:</p>
                <p style={treeValue}>
                  {referralTreeInfo!.totalReferrals} người
                </p>
              </div>
              <p style={treeNote}>
                🚀 Tiếp tục mở rộng nhóm giới thiệu để nhận thêm nhiều chiết
                khấu hấp dẫn!
              </p>
            </div>
          )}

          <hr style={hr} />

          <p style={footer}>
            Cảm ơn bạn đã là một phần của cộng đồng ACTA! Hãy tiếp tục chia sẻ
            và giới thiệu để nhận thêm nhiều chiết khấu hấp dẫn.
          </p>

          <p style={footer}>
            Nếu có thắc mắc về chiết khấu, liên hệ:{' '}
            <a href="mailto:lienhe@acta.vn" style={link}>
              lienhe@acta.vn
            </a>{' '}
            hoặc gọi <strong>0912 880 330</strong>
          </p>
        </div>

        {/* Footer */}
        <div style={footerSection}>
          <p style={footerText}>
            © 2025 ACTA - Affiliate Community's Tactical Alliance
          </p>
          <p style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</p>
          <p style={footerText}>
            94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
          </p>
          <p style={footerText}>Website: https://acta.vn</p>
        </div>
      </div>
    </div>
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

const summarySection = {
  backgroundColor: '#f8fafc',
  padding: '30px 20px',
  borderRadius: '12px',
  margin: '24px 0',
  border: '2px solid',
  textAlign: 'center' as const,
};

const summaryHeader = {
  marginBottom: '16px',
};

const summaryIcon = {
  fontSize: '48px',
  margin: '0 0 8px',
  display: 'block',
};

const summaryTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const summaryAmount = {
  color: '#16a34a',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '16px 0 8px',
};

const summaryLevel = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0',
};

const sectionTitle = {
  color: '#8b4513',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const detailsSection = {
  backgroundColor: '#ffffff',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
};

const commissionRow = {
  margin: '0 0 16px',
};

const productColumn = {
  width: '60%',
  paddingRight: '16px',
};

const amountColumn = {
  width: '40%',
  textAlign: 'right' as const,
};

const productName = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const productCode = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
};

const categoryName = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const quantity = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
};

const baseAmount = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
};

const commissionAmount = {
  color: '#16a34a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const commissionDivider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const orderSection = {
  backgroundColor: '#faf8f3',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #ddbf94',
};

const orderRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '0 0 8px',
};

const orderLabel = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  fontWeight: '600',
};

const orderValue = {
  color: '#8b4513',
  fontSize: '16px',
  margin: '0',
  fontWeight: 'bold',
};

const paymentSection = {
  backgroundColor: '#f0f9ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #0ea5e9',
};

const paymentText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 12px',
};

const paymentNote = {
  color: '#0369a1',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
  padding: '12px',
  backgroundColor: '#e0f2fe',
  borderRadius: '6px',
  border: '1px solid #0ea5e9',
};

const deliverySection = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #22c55e',
};

const treeSection = {
  backgroundColor: '#f3f4f6',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #9ca3af',
};

const treeRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '0 0 8px',
};

const treeLabel = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  fontWeight: '600',
};

const treeValue = {
  color: '#8b5cf6',
  fontSize: '16px',
  margin: '0',
  fontWeight: 'bold',
};

const treeNote = {
  color: '#7c3aed',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '12px 0 0',
  padding: '12px',
  backgroundColor: '#f3e8ff',
  borderRadius: '6px',
  border: '1px solid #8b5cf6',
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
