import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Row,
  Column,
  Img,
  Button,
  Hr,
} from '@react-email/components';
import type { WalletResetWarningEmailProps } from '../../admin/wallet-reset-preview/warning/wallet-reset-warning-props.helper';

/**
 * Mail cảnh báo: số dư ví có thể bị đưa về 0 nếu không đạt điều kiện trước mốc reset.
 *
 * ⚠ Template CHỈ trình bày, KHÔNG tính toán và KHÔNG định dạng ngày. `totalVnd` do tầng gọi cộng
 * sẵn — cộng lại ở đây là mở đường cho mail in một số còn hệ thống reset một số khác. Ngày cũng
 * đã được định dạng sẵn theo giờ Việt Nam vì container chạy `TZ=UTC`.
 *
 * ⚠ Giọng văn phải LỊCH SỰ và dùng "có thể" / "dự kiến". Đây là thư gửi cho người đang có tiền
 * trong ví; một câu khẳng định chắc chắn về việc mất tiền, nếu sau đó chính sách đổi, là sự cố
 * niềm tin nặng hơn hẳn việc không gửi thư.
 *
 * ⚠ KHÔNG có link hủy nhận thư. Theo tiêu chí phân loại của hạ tầng mail cam kết
 * ("GIAO DỊCH ⇔ không gửi thì thành viên MẤT TIỀN"), đây là thư giao dịch: người không nhận được
 * sẽ không biết mình cần làm gì để giữ số dư.
 */

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} ₫`;
}

export const WalletResetWarningEmail = ({
  memberName,
  resetAnchorLabel,
  windowStartLabel,
  windowDays,
  trainingVnd,
  commissionVnd,
  totalVnd,
  conditions,
  requiresAllConditions,
  overviewUrl,
}: WalletResetWarningEmailProps) => (
  <Html lang="vi">
    <Head>
      <meta httpEquiv="Content-Language" content="vi" />
      <meta name="language" content="Vietnamese" />
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>
      Thông báo về số dư ví của bạn trước ngày {resetAnchorLabel}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <a href="https://acta.vn" target="_blank" rel="noopener noreferrer">
            <Img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA"
              width="120"
              height="120"
              style={logo}
            />
          </a>
        </Section>

        <Heading style={heading}>
          Thông báo về số dư ví của Quý thành viên
        </Heading>

        <Text style={paragraph}>Kính gửi {memberName},</Text>

        <Text style={paragraph}>
          ACTA xin trân trọng thông báo về một nội dung liên quan tới số dư ví
          của Quý thành viên. Theo chính sách duy trì hoạt động, vào ngày{' '}
          <strong>{resetAnchorLabel}</strong>, hệ thống sẽ rà soát các tài khoản
          chưa phát sinh hoạt động theo điều kiện quy định trong khoảng thời gian{' '}
          <strong>{windowDays} ngày</strong> gần nhất (tính từ ngày{' '}
          {windowStartLabel}).
        </Text>

        <Text style={paragraph}>
          Theo dữ liệu ghi nhận đến thời điểm hiện tại, tài khoản của Quý thành
          viên <strong>có thể</strong> thuộc diện rà soát này. Nếu đến ngày{' '}
          {resetAnchorLabel} mà điều kiện vẫn chưa được đáp ứng, số dư dưới đây{' '}
          <strong>có thể được đưa về 0</strong>.
        </Text>

        <Section style={amountBox}>
          <Row>
            <Column style={amountCell}>
              <Text style={amountLabel}>Ví rèn luyện</Text>
              <Text style={amountValue}>{formatVnd(trainingVnd)}</Text>
            </Column>
            <Column style={amountCell}>
              <Text style={amountLabel}>Ví hoa hồng</Text>
              <Text style={amountValue}>{formatVnd(commissionVnd)}</Text>
            </Column>
          </Row>
          <Hr style={divider} />
          <Text style={totalLabel}>Tổng số tiền có thể bị ảnh hưởng</Text>
          <Text style={totalValue}>{formatVnd(totalVnd)}</Text>
        </Section>

        <Heading as="h2" style={subheading}>
          Điều kiện cần đáp ứng
        </Heading>

        <Text style={paragraph}>
          {requiresAllConditions
            ? 'Quý thành viên cần đáp ứng cả hai điều kiện sau trong khoảng thời gian nêu trên:'
            : 'Quý thành viên chỉ cần đáp ứng một trong hai điều kiện sau trong khoảng thời gian nêu trên:'}
        </Text>

        <Section style={conditionBox}>
          {conditions.map((condition) => (
            <Text key={condition.label} style={conditionLine}>
              • <strong>{condition.label}</strong> — {condition.requirement}
            </Text>
          ))}
        </Section>

        <Section style={ctaWrap}>
          <Button style={cta} href={overviewUrl}>
            Xem tình trạng tài khoản của tôi
          </Button>
        </Section>

        <Text style={paragraph}>
          Nếu Quý thành viên đã đáp ứng đủ điều kiện nêu trên, xin vui lòng bỏ
          qua thư này. Số liệu trong thư được lấy tại thời điểm gửi và sẽ tiếp
          tục được cập nhật cho đến ngày rà soát.
        </Text>

        <Hr style={divider} />

        <Text style={footer}>
          Thư được gửi tự động từ hệ thống ACTA. Nếu cần hỗ trợ, Quý thành viên
          vui lòng liên hệ bộ phận chăm sóc khách hàng.
        </Text>
        <Text style={footer}>Trân trọng cảm ơn Quý thành viên.</Text>
      </Container>
    </Body>
  </Html>
);

export default WalletResetWarningEmail;

const main: React.CSSProperties = {
  backgroundColor: '#f4f5f7',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  padding: '24px 0',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '600px',
  padding: '32px',
};

const header: React.CSSProperties = { textAlign: 'center', marginBottom: '8px' };
const logo: React.CSSProperties = { margin: '0 auto', display: 'block' };

const heading: React.CSSProperties = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: '30px',
  margin: '8px 0 20px',
  textAlign: 'center',
};

const subheading: React.CSSProperties = {
  color: '#111827',
  fontSize: '17px',
  fontWeight: 700,
  margin: '28px 0 8px',
};

const paragraph: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 14px',
};

const amountBox: React.CSSProperties = {
  backgroundColor: '#fff7ed',
  border: '1px solid #fed7aa',
  borderRadius: '10px',
  margin: '20px 0',
  padding: '20px',
};

const amountCell: React.CSSProperties = { width: '50%', verticalAlign: 'top' };

const amountLabel: React.CSSProperties = {
  color: '#9a3412',
  fontSize: '13px',
  margin: '0 0 4px',
};

const amountValue: React.CSSProperties = {
  color: '#7c2d12',
  fontSize: '19px',
  fontWeight: 700,
  margin: 0,
};

const totalLabel: React.CSSProperties = {
  color: '#9a3412',
  fontSize: '13px',
  margin: '0 0 4px',
};

const totalValue: React.CSSProperties = {
  color: '#b91c1c',
  fontSize: '26px',
  fontWeight: 700,
  margin: 0,
};

const conditionBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '16px 18px',
};

const conditionLine: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 8px',
};

const ctaWrap: React.CSSProperties = { textAlign: 'center', margin: '26px 0' };

const cta: React.CSSProperties = {
  backgroundColor: '#0f766e',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '13px 26px',
  textDecoration: 'none',
};

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '18px 0',
};

const footer: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 6px',
  textAlign: 'center',
};
