/**
 * Email báo người dùng vừa được cộng THÙ LAO GIỚI THIỆU CỔ ĐÔNG.
 *
 * Gửi MỘT email cho mỗi lần một người trong nhóm giới thiệu lên cấp, dù họ vượt
 * một hay nhiều cấp cùng lúc — người nhận đọc một con số tổng, kèm bảng chia
 * từng cấp để tự nhẩm lại được (vd. lên thẳng x3: 3 × 200.000đ = 600.000đ).
 *
 * ⚠ Lời văn theo chủ dự án (2026-09-11): trong THƯ, Cổ đông lan tỏa đếm bằng
 * "danh hiệu", KHÔNG BAO GIỜ "cấp"; tiền "được cộng ngay vào ví" nhưng KHÔNG
 * hứa rút ngay. Khoá bởi `ShareholderReferralRewardEmail.spec.ts`.
 */

export type QuanHeGioiThieu = 'truc-tiep' | 'gian-tiep';

interface ShareholderReferralRewardEmailProps {
  recipientName: string;
  sourceName: string;
  sourceReferenceId?: string | null;
  relation: QuanHeGioiThieu;
  levels: number[];
  unitAmount: number;
  totalAmount: number;
  rewardedAt: Date;
}

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;

export const ShareholderReferralRewardEmail = ({
  recipientName,
  sourceName,
  sourceReferenceId,
  relation,
  levels,
  unitAmount,
  totalAmount,
  rewardedAt,
}: ShareholderReferralRewardEmailProps) => {
  const capCaoNhat = levels.length > 0 ? Math.max(...levels) : 0;
  const tenQuanHe =
    relation === 'truc-tiep'
      ? 'người bạn giới thiệu trực tiếp (F1)'
      : 'người bạn giới thiệu gián tiếp (F2)';
  const ngay = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(rewardedAt);

  return (
    <div style={main}>
      <div style={container}>
        <div style={header}>
          <a href="https://acta.vn" target="_blank" rel="noopener noreferrer">
            <img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA"
              width="120"
              height="120"
              style={logo}
            />
          </a>
        </div>

        <div style={content}>
          <h1 style={h1}>🎉 Chúc mừng! Bạn vừa nhận thù lao giới thiệu cổ đông</h1>

          <p style={text}>
            Xin chào <strong>{recipientName}</strong>,
          </p>
          <p style={text}>
            <strong>{sourceName}</strong>
            {sourceReferenceId ? ` (${sourceReferenceId})` : ''} — {tenQuanHe} —
            vừa lên danh hiệu <strong>Cổ đông lan tỏa x{capCaoNhat}</strong>. Cảm ơn bạn đã
            đồng hành cùng họ trên chặng đường này.
          </p>

          <div style={summary}>
            <p style={summaryLabel}>Số tiền bạn nhận được</p>
            <p style={summaryAmount}>{vnd(totalAmount)}</p>
            <p style={summaryNote}>Tiền được cộng ngay vào ví của bạn</p>
          </div>

          <div style={detail}>
            <p style={detailTitle}>Chi tiết từng danh hiệu</p>
            {levels.map((level) => (
              <div key={level} style={row}>
                <span style={rowLabel}>Lên danh hiệu Cổ đông lan tỏa x{level}</span>
                <span style={rowValue}>{vnd(unitAmount)}</span>
              </div>
            ))}
            <div style={{ ...row, ...rowTotal }}>
              <span style={rowLabel}>
                Tổng ({levels.length} danh hiệu × {vnd(unitAmount)})
              </span>
              <span style={rowValue}>{vnd(totalAmount)}</span>
            </div>
            <p style={detailFoot}>Thời điểm ghi nhận: {ngay}</p>
          </div>

          <div style={rule}>
            <p style={ruleTitle}>Thù lao được tính thế nào?</p>
            <p style={ruleText}>
              Mỗi lần một người trong nhóm của bạn lên thêm một danh hiệu
              Cổ đông lan tỏa (x1, x2, x3), bạn nhận <strong>200.000đ</strong> nếu
              họ là F1 của bạn, hoặc <strong>100.000đ</strong> nếu họ là F2. Mỗi
              danh hiệu chỉ tính một lần, và khoản thù lao này{' '}
              <strong>không bị đặt lại</strong>.
            </p>
          </div>

          <p style={cta}>
            Xem lịch sử thù lao tại{' '}
            <a href="https://hoahong.acta.vn" style={link}>
              hoahong.acta.vn
            </a>
          </p>

          <hr style={hr} />
          <p style={footer}>
            Cần hỗ trợ? Gửi thư tới{' '}
            <a href="mailto:lienhe@acta.vn" style={link}>
              lienhe@acta.vn
            </a>{' '}
            hoặc gọi <strong>0912 880 330</strong>.
          </p>
        </div>

        <div style={footerSection}>
          <p style={footerText}>ACTA - Affiliate Community's Tactical Alliance</p>
          <p style={footerText}>
            94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
          </p>
        </div>
      </div>
    </div>
  );
};

const main = {
  backgroundColor: '#fefdf8',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0 0 32px',
  maxWidth: '600px',
  borderRadius: '12px',
  overflow: 'hidden',
};
const header = {
  padding: '28px 40px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
};
const logo = { margin: '0 auto', display: 'block' };
const content = { padding: '32px 40px 8px' };
const h1 = {
  color: '#b45309',
  fontSize: '24px',
  fontWeight: 'bold',
  lineHeight: '1.35',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};
const text = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' };
const summary = {
  backgroundColor: '#fffbeb',
  border: '2px solid #f59e0b',
  borderRadius: '12px',
  padding: '24px 20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};
const summaryLabel = { color: '#92400e', fontSize: '15px', margin: '0 0 6px' };
const summaryAmount = { color: '#16a34a', fontSize: '36px', fontWeight: 'bold', margin: '0 0 6px' };
const summaryNote = { color: '#6b7280', fontSize: '14px', margin: '0' };
const detail = {
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '16px 20px',
  margin: '0 0 20px',
};
const detailTitle = { color: '#8b4513', fontSize: '17px', fontWeight: 'bold', margin: '0 0 10px' };
const row = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px dashed #e5e7eb',
};
const rowTotal = { borderBottom: 'none', fontWeight: 'bold' };
const rowLabel = { color: '#374151', fontSize: '15px' };
const rowValue = { color: '#16a34a', fontSize: '15px', fontWeight: 'bold' };
const detailFoot = { color: '#9ca3af', fontSize: '13px', margin: '10px 0 0' };
const rule = {
  backgroundColor: '#f8fafc',
  borderRadius: '10px',
  padding: '14px 18px',
  margin: '0 0 20px',
};
const ruleTitle = { color: '#1f2937', fontSize: '15px', fontWeight: 'bold', margin: '0 0 6px' };
const ruleText = { color: '#4b5563', fontSize: '14px', lineHeight: '1.6', margin: '0' };
const cta = { color: '#374151', fontSize: '15px', textAlign: 'center' as const, margin: '0 0 8px' };
const link = { color: '#cd853f', textDecoration: 'underline', fontWeight: '600' };
const hr = { borderColor: '#ddbf94', margin: '24px 0 16px' };
const footer = { color: '#6b7280', fontSize: '14px', lineHeight: '1.5', margin: '0' };
const footerSection = {
  padding: '16px 40px 0',
  borderTop: '1px solid #ddbf94',
  margin: '16px 0 0',
};
const footerText = { color: '#8b4513', fontSize: '12px', margin: '0 0 4px', textAlign: 'center' as const };
