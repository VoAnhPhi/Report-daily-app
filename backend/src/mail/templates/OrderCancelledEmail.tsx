import { Heading, Text, Hr, Img } from '@react-email/components';

interface OrderCancelledEmailProps {
  customerName: string;
  orderCode: string;
  cancelledAt: Date;
  refundAmount?: number;
  refundMethod?: string;
  refundEta?: string;
  cancellationReason?: string;
}

export const OrderCancelledEmail = ({
  customerName,
  orderCode,
  cancelledAt,
  refundAmount,
  refundMethod = 'Chuyển khoản ngân hàng',
  refundEta = '3-5 ngày làm việc',
  cancellationReason,
}: OrderCancelledEmailProps) => {
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div style={main}>
      <div style={container}>
        {/* Header */}
        <div style={header}>
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
        </div>

        {/* Main content */}
        <div style={content}>
          <Heading style={h1}>❌ Đơn hàng đã được hủy</Heading>

          <Text style={text}>
            Xin chào <strong>{customerName}</strong>,
          </Text>

          <Text style={text}>
            Đơn hàng <strong>{orderCode}</strong> của bạn đã được hủy thành công
            vào lúc <strong>{formatDate(cancelledAt)}</strong>.
          </Text>

          {cancellationReason && (
            <div style={reasonSection}>
              <Heading as="h2" style={sectionTitle}>
                📝 Lý do hủy đơn
              </Heading>
              <Text style={reasonText}>{cancellationReason}</Text>
            </div>
          )}

          {/* Refund Information */}
          {refundAmount && refundAmount > 0 && (
            <div style={refundSection}>
              <Heading as="h2" style={sectionTitle}>
                💰 Thông tin hoàn tiền
              </Heading>
              <div style={refundRow}>
                <Text style={refundLabel}>Số tiền hoàn:</Text>
                <Text style={refundValue}>{formatCurrency(refundAmount)}</Text>
              </div>
              <div style={refundRow}>
                <Text style={refundLabel}>Phương thức hoàn tiền:</Text>
                <Text style={refundValue}>{refundMethod}</Text>
              </div>
              <div style={refundRow}>
                <Text style={refundLabel}>Thời gian hoàn tiền dự kiến:</Text>
                <Text style={refundValue}>{refundEta}</Text>
              </div>
              <Text style={refundNote}>
                💡 <strong>Lưu ý:</strong> Tiền sẽ được hoàn về tài khoản/phương
                thức thanh toán ban đầu của bạn.
              </Text>
            </div>
          )}

          {/* Next Steps */}
          <div style={nextStepsSection}>
            <Heading as="h2" style={sectionTitle}>
              🔄 Bước tiếp theo
            </Heading>
            <Text style={stepText}>
              • Nếu bạn đã thanh toán, chúng tôi sẽ tiến hành hoàn tiền trong
              thời gian sớm nhất
            </Text>
            <Text style={stepText}>
              • Bạn có thể đặt lại đơn hàng mới bất kỳ lúc nào trên website
            </Text>
            <Text style={stepText}>
              • Liên hệ với chúng tôi nếu cần hỗ trợ thêm
            </Text>
          </div>

          <Hr style={hr} />

          <Text style={footer}>
            Chúng tôi rất tiếc vì sự bất tiện này. Nếu bạn có bất kỳ câu hỏi nào
            về việc hủy đơn hàng hoặc hoàn tiền, vui lòng liên hệ với chúng tôi.
          </Text>

          <Text style={footer}>
            Hỗ trợ khách hàng:{' '}
            <a href="mailto:lienhe@acta.vn" style={link}>
              lienhe@acta.vn
            </a>{' '}
            hoặc gọi <strong>0912 880 330</strong>
          </Text>
        </div>

        {/* Footer */}
        <div style={footerSection}>
          <Text style={footerText}>
            © 2025 ACTA - Affiliate Community's Tactical Alliance
          </Text>
          <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
          <Text style={footerText}>
            94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
          </Text>
          <Text style={footerText}>Website: https://acta.vn</Text>
        </div>
      </div>
    </div>
  );
};

// Styles with warning theme
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
  color: '#dc2626',
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

const reasonSection = {
  backgroundColor: '#fef3f2',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #fecaca',
};

const reasonText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0',
  fontStyle: 'italic',
};

const refundSection = {
  backgroundColor: '#f0f9ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #0ea5e9',
};

const refundRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '0 0 12px',
};

const refundLabel = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  fontWeight: '600',
};

const refundValue = {
  color: '#0ea5e9',
  fontSize: '16px',
  margin: '0',
  fontWeight: 'bold',
};

const refundNote = {
  color: '#0369a1',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '16px 0 0',
  padding: '12px',
  backgroundColor: '#e0f2fe',
  borderRadius: '6px',
  border: '1px solid #0ea5e9',
};

const nextStepsSection = {
  backgroundColor: '#faf8f3',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #ddbf94',
};

const stepText = {
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
