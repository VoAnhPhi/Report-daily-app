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
import {
  MIN_SUBORDINATE_KYC_COUNT,
  SHARING_LEVEL_1_THRESHOLD,
  SHARING_LEVEL_2_THRESHOLD,
  SHARING_LEVEL_3_THRESHOLD,
} from '../../recognized-users/constants/shareholder-gate.constants';

// Ngưỡng in trong thư lấy từ CÙNG hằng số mà calculateSharingLevel dùng — lời văn
// không thể lệch khỏi luật tính danh hiệu.
const DIEM_X1 = SHARING_LEVEL_1_THRESHOLD.toLocaleString('vi-VN');
const DIEM_X2 = SHARING_LEVEL_2_THRESHOLD.toLocaleString('vi-VN');
const DIEM_X3 = SHARING_LEVEL_3_THRESHOLD.toLocaleString('vi-VN');

/** Người không được chào là Cổ Đông Cộng Đồng mới (xem `laCoDongMoi`) mà có danh hiệu lan tỏa để nêu. */
const noiVuaDatDanhHieuLanToa = (
  laCoDongMoi: boolean,
  sharingLevel: number,
): boolean => !laCoDongMoi && sharingLevel >= 1;

/**
 * Tiêu đề thư công nhận — cùng luật với lời chào trong thư: người không được chào là Cổ Đông Cộng Đồng
 * mới thì tiêu đề nói "vừa đạt danh hiệu Cổ đông lan tỏa xN", không kèm thứ hạng.
 */
export const tieuDeThuCongNhan = ({
  rank,
  sharingLevel,
  laCoDongMoi = true,
}: {
  rank: number | null;
  sharingLevel: number;
  laCoDongMoi?: boolean;
}): string =>
  noiVuaDatDanhHieuLanToa(laCoDongMoi, sharingLevel)
    ? `🎉 Chúc mừng! Bạn vừa đạt danh hiệu Cổ đông lan tỏa x${sharingLevel}`
    : `🎉 Chúc mừng! Bạn đã trở thành Cổ Đông Cộng Đồng${rank !== null ? ` #${rank}` : ''}`;

interface RecognizedUserEmailProps {
  name: string;
  rank: number | null;
  orderPoints: number;
  kycCount: number;
  sharingLevel: number;
  /**
   * Điểm chính = điểm mua hàng + điểm KYC trực tiếp + điểm tiếp thị liên kết
   * (`sharingCompositePoints`) — con số quyết định danh hiệu Cổ đông lan tỏa.
   * Nơi gọi cũ không truyền ⇒ thư lùi về dòng "Điểm mua hàng" (nhãn đúng với
   * con số `orderPoints`), không bao giờ gắn nhãn "Điểm chính" cho nó.
   */
  sharingCompositePoints?: number;
  /**
   * `false` ⇒ KHÔNG chào người nhận là Cổ Đông Cộng Đồng mới: họ đã là cổ đông nhờ danh hiệu khác, hoặc
   * nơi gọi không đọc được điều đó. Thư khi ấy nói "vừa đạt danh hiệu Cổ đông lan tỏa xN" — câu đúng với
   * MỌI người vừa đạt — và không in thứ hạng. Nơi gọi cũ không truyền ⇒ `true` (lời chào như trước).
   */
  laCoDongMoi?: boolean;
}

export const RecognizedUserEmail = ({
  name = 'Khách hàng',
  rank = null,
  orderPoints = 0,
  kycCount = 0,
  sharingLevel = 1,
  sharingCompositePoints,
  laCoDongMoi = true,
}: RecognizedUserEmailProps) => {
  const vuaDatDanhHieuLanToa = noiVuaDatDanhHieuLanToa(
    laCoDongMoi,
    sharingLevel,
  );
  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        {vuaDatDanhHieuLanToa
          ? `Chúc mừng! Bạn vừa đạt danh hiệu Cổ đông lan tỏa x${sharingLevel} tại ACTA!`
          : `Chúc mừng! Bạn đã trở thành Cổ Đông Cộng Đồng${rank !== null ? ` #${String(rank)}` : ''} của ACTA!`}
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
            <Heading style={h1}>🎉 Chúc mừng {name}! 🎉</Heading>

            {/* Người đã là Cổ Đông Cộng Đồng nhờ danh hiệu khác không được chào "đã chính thức trở thành". */}
            {vuaDatDanhHieuLanToa ? (
              <Text style={text}>
                Bạn vừa đạt danh hiệu{' '}
                <strong style={highlightText}>{`Cổ đông lan tỏa x${sharingLevel}`}</strong> tại{' '}
                <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong> — danh hiệu này được tính vào
                chương trình <strong>đồng chia quỹ cộng đồng hàng tháng</strong>.
              </Text>
            ) : (
              <Text style={text}>
                Bạn đã chính thức trở thành{' '}
                <strong style={highlightText}>Cổ Đông Cộng Đồng</strong> của{' '}
                <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong> —
                đủ điều kiện tham gia chương trình{' '}
                <strong>đồng chia quỹ cộng đồng hàng tháng</strong>.
              </Text>
            )}

            {/* sharingLevel < 1 ⇒ người nhận được công nhận nhờ điểm nghiệp vụ. Thư không
                nhận professionalLevel nên không in hậu tố "xN" cho danh hiệu này. */}
            {sharingLevel < 1 && (
              <Text style={text}>
                Bạn được công nhận danh hiệu{' '}
                <strong style={highlightText}>Cổ đông chuyên gia</strong>.
              </Text>
            )}

            {/* Rank Badge */}
            {rank !== null && !vuaDatDanhHieuLanToa && (
              <Section style={rankBadgeSection}>
                <div style={rankBadge}>
                  <Text style={rankBadgeTitle}>Thứ hạng của bạn</Text>
                  <Text style={rankNumber}>#{String(rank)}</Text>
                  <Text style={rankSubtitle}>Cổ Đông Cộng Đồng</Text>
                </div>
              </Section>
            )}

            {/* Achievement criteria */}
            <Section style={criteriaSection}>
              {/* sharingLevel < 1 = người chỉ đạt Cổ đông chuyên gia: chưa đạt tiêu chí lan tỏa
                  nào, nên khối này là TIẾN ĐỘ — và không bao giờ in "x0". */}
              <Text style={criteriaTitle}>
                {sharingLevel >= 1
                  ? `✅ Tiêu chí đạt được (danh hiệu Cổ đông lan tỏa x${sharingLevel}):`
                  : '📊 Tiến độ danh hiệu Cổ đông lan tỏa:'}
              </Text>
              {sharingCompositePoints !== undefined ? (
                <Text style={criteriaText}>
                  • Điểm chính:{' '}
                  <strong>{sharingCompositePoints.toLocaleString('vi-VN')}</strong>{' '}
                  điểm (điểm mua hàng + điểm KYC trực tiếp + điểm tiếp thị liên kết) — Cổ đông lan tỏa x1 cần từ {DIEM_X1} điểm chính
                </Text>
              ) : (
                <Text style={criteriaText}>
                  • Điểm mua hàng:{' '}
                  <strong>{orderPoints.toLocaleString('vi-VN')}</strong>{' '}
                  điểm — Cổ đông lan tỏa x1 cần từ {DIEM_X1} điểm chính (điểm mua hàng + điểm KYC trực tiếp + điểm tiếp thị liên kết)
                </Text>
              )}
              <Text style={criteriaText}>
                • KYC trực tiếp:{' '}
                <strong>{kycCount} người</strong>{' '}
                {sharingLevel === 1
                  ? kycCount < MIN_SUBORDINATE_KYC_COUNT
                    ? `(cần tối thiểu ${MIN_SUBORDINATE_KYC_COUNT} người để lên Cổ đông lan tỏa x2)`
                    : `(đã đủ ${MIN_SUBORDINATE_KYC_COUNT} người — Cổ đông lan tỏa x2 cần thêm từ ${DIEM_X2} điểm chính)`
                  : `(Cổ đông lan tỏa x2 và Cổ đông lan tỏa x3 cần tối thiểu ${MIN_SUBORDINATE_KYC_COUNT} người)`}
              </Text>
              {sharingLevel >= 2 && (
                <Text style={criteriaText}>
                  {`• Đạt danh hiệu Cổ đông lan tỏa x${sharingLevel} — từ ${sharingLevel === 2 ? DIEM_X2 : DIEM_X3} điểm chính và có ít nhất ${MIN_SUBORDINATE_KYC_COUNT} KYC trực tiếp`}
                </Text>
              )}
            </Section>

            <Hr style={hr} />

            {/* Distribution policy */}
            <Section style={benefitsSection}>
              <Text style={benefitsTitle}>💰 Quyền lợi đồng chia quỹ cộng đồng:</Text>
              <Text style={benefitText}>
                • <strong>Lịch phân phối:</strong> Vào ngày 5 hàng tháng
              </Text>
              <Text style={benefitText}>
                • <strong>Quỹ phân phối:</strong> Tổng hoa hồng F0 phát sinh trong chu kỳ (từ ngày 5 tháng trước → ngày 5 tháng này)
              </Text>
              <Text style={benefitText}>
                • <strong>Cách tính phần nhận:</strong> Số tiền / cổ phần = Tổng quỹ ÷ Tổng số cổ phần của tất cả cổ đông đủ điều kiện
              </Text>
              {sharingLevel >= 1 && (
                <Text style={benefitText}>
                  • <strong>Danh hiệu hiện tại của bạn:</strong>{' '}
                  {`Cổ đông lan tỏa x${sharingLevel} → được tính ${sharingLevel} cổ phần từ danh hiệu này`}
                </Text>
              )}
              <Text style={benefitText}>
                • <strong>Điều kiện nhận:</strong> Đã được công nhận trước ngày bắt đầu chu kỳ &amp; tài khoản đang hoạt động
              </Text>
              <Text style={benefitText}>
                • <strong>Tiền về đâu:</strong> Tự động cộng vào ví affiliate của bạn sau mỗi kỳ phân phối
              </Text>
            </Section>

            <Text style={text}>
              {sharingLevel < 1
                ? `Hãy tích lũy điểm chính để đạt danh hiệu Cổ đông lan tỏa x1 (từ ${DIEM_X1} điểm chính) và tăng phần nhận trong mỗi kỳ phân phối.`
                : sharingLevel < 3
                  ? 'Hãy tiếp tục tích lũy điểm chính và KYC trực tiếp để lên danh hiệu tiếp theo (danh hiệu cao nhất là Cổ đông lan tỏa x3) và tăng phần nhận trong mỗi kỳ phân phối.'
                  : 'Bạn đã đạt danh hiệu cao nhất: Cổ đông lan tỏa x3.'}
            </Text>

            <Text style={footer}>
              Nếu có câu hỏi, vui lòng liên hệ đội hỗ trợ tại{' '}
              <a href="mailto:lienhe@acta.vn" style={link} target="_blank" rel="noreferrer">
                lienhe@acta.vn
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>© 2025 ACTA - Affiliate Community's Tactical Alliance</Text>
            <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
            <Text style={footerText}>Số điện thoại: 0912 880 330</Text>
            <Text style={footerText}>Địa chỉ: 94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam</Text>
            <Text style={footerText}>Website: https://acta.vn</Text>
            <Text style={footerText}>
              {vuaDatDanhHieuLanToa
                ? `Bạn nhận được email này vì vừa đạt danh hiệu Cổ đông lan tỏa x${sharingLevel} tại ACTA.`
                : 'Bạn nhận được email này vì đã trở thành Cổ Đông Cộng Đồng của ACTA.'}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#fefdf8',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const logoContainer = { textAlign: 'center' as const };

const logoImage = { margin: '0 auto', display: 'block' };

const content = { padding: '40px' };

const h1 = {
  color: '#8b4513',
  fontSize: '32px',
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

const highlightText = { color: '#9333ea', fontWeight: 'bold' };

const rankBadgeSection = { margin: '32px 0', textAlign: 'center' as const };

const rankBadge = {
  display: 'inline-block',
  background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
  borderRadius: '16px',
  padding: '24px 48px',
  boxShadow: '0 8px 24px rgba(147, 51, 234, 0.3)',
};

const rankBadgeTitle = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const rankNumber = {
  color: '#ffffff',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '1',
};

const rankSubtitle = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  margin: '8px 0 0',
};

const criteriaSection = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #86efac',
  borderRadius: '12px',
  padding: '20px',
  margin: '24px 0',
};

const criteriaTitle = {
  color: '#166534',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const criteriaText = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const benefitsSection = {
  backgroundColor: '#faf5ff',
  border: '2px solid #d8b4fe',
  borderRadius: '12px',
  padding: '20px',
  margin: '24px 0',
};

const benefitsTitle = {
  color: '#581c87',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const benefitText = {
  color: '#581c87',
  fontSize: '15px',
  lineHeight: '1.8',
  margin: '0 0 10px',
};

const hr = { borderColor: '#ddbf94', margin: '32px 0' };

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
};

const link = { color: '#cd853f', textDecoration: 'underline', fontWeight: '600' };

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