import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Img,
  Button,
  Link,
} from '@react-email/components';

/**
 * Một dòng tiêu chí trong bảng phân tích. Shape KHỚP
 * `CommitmentRecapCriterionLine` (`commitment-cycle-recap-payload.service.ts`) —
 * template CHỈ trình bày, KHÔNG tính toán: mọi ngưỡng/khoảng-thiếu đã được service
 * lấy từ `appliedThresholds` của ảnh chụp BẤT BIẾN (§22). Tự tính lại ở đây sẽ đọc
 * hằng chính sách HIỆN HÀNH và in sai luật cho những kỳ chốt trước lần đổi ngưỡng.
 */
export interface CommitmentRecapCriterionLineProps {
  key?: string;
  label: string;
  achieved: number;
  requiredTier1: number;
  requiredTier2: number;
  metTier1: boolean;
  metTier2: boolean;
  /** `null` = chưa có kỳ trước để so sánh (KHÁC hẳn "kỳ trước bằng 0"). */
  previousAchieved: number | null;
}

export interface CommitmentRecapTierLineProps {
  tier: number;
  floorVnd: number;
  met: boolean;
  missingLabels: string[];
}

export interface CommitmentCycleRecapEmailProps {
  memberName: string;
  cycleStartLabel: string;
  cycleEndLabel: string;
  awardedTier: number | null;
  floorVnd: number;
  settlementBaseVnd: number;
  expectedTopUpVnd: number;
  criteria: CommitmentRecapCriterionLineProps[];
  tiers: CommitmentRecapTierLineProps[];
  tvtcCurrentTotal: number;
  tvtcCurrentF1: number;
  tvtcNewInCycle: number;
  selfBecameTvtcInCycle: boolean;
  nextStep: string;
  criteriaVersion: number;
  /**
   * Dư nợ tạm ứng cam kết còn lại (VND), đọc LIVE lúc gửi mail.
   *
   * `0` ⇒ ẩn HOÀN TOÀN mục dư nợ. Không render "Dư nợ tạm ứng: 0₫" cho người không
   * nợ: đó là giới thiệu một khái niệm tài chính đáng lo cho đúng những người nó
   * không liên quan, ngay trong lá mail vốn để tạo động lực.
   */
  advanceDebtVnd: number;
  /** Link tuyệt đối tới trang Khởi nghiệp cùng ACTA trên cổng affiliate. */
  overviewUrl: string;
  /**
   * Link hủy nhận mail. `null` khi không mint được token — chân mail sẽ KHÔNG hiện
   * mục hủy thay vì hiện một nút chết.
   */
  unsubscribeUrl: string | null;
}

/** "15.000.000₫" — locale VN, không thập phân (mọi số tiền chính sách là đồng chẵn). */
const vnd = (value: number): string =>
  `${Math.round(value).toLocaleString('vi-VN')}₫`;

/**
 * CommitmentCycleRecapEmail (Phase 113, REV-6 D-R6-07) — mail TỔNG KẾT KỲ gửi cho
 * member đúng ngày mốc neo của họ, sau khi kỳ vừa đóng đã được đối soát.
 *
 * Chủ ý biên tập: đây là thời điểm ĐỘNG LỰC CAO NHẤT của cả chính sách và trước
 * REV-6 nó HOÀN TOÀN im lặng. Vì vậy mail KHÔNG dừng ở đạt/trượt mà trả lời bốn câu
 * hỏi member thật sự có: (1) kỳ vừa rồi tôi được gì, (2) tôi thiếu đúng bao nhiêu,
 * (3) tôi đang tiến hay lùi so với kỳ trước, (4) tuyến dưới tôi lớn thêm bao nhiêu.
 *
 * ⚠ Từ ngữ về tiền phải giữ mức "dự kiến": quyết định phát phiếu bù sàn là của admin
 * (D-112-03) — mail hứa chắc một con số rồi phiếu không được phát là sự cố niềm tin.
 */
export const CommitmentCycleRecapEmail = ({
  memberName = 'Quý thành viên',
  cycleStartLabel = '',
  cycleEndLabel = '',
  awardedTier = null,
  floorVnd = 0,
  settlementBaseVnd = 0,
  expectedTopUpVnd = 0,
  criteria = [],
  tiers = [],
  tvtcCurrentTotal = 0,
  tvtcCurrentF1 = 0,
  tvtcNewInCycle = 0,
  selfBecameTvtcInCycle = false,
  nextStep = '',
  criteriaVersion = 0,
  advanceDebtVnd = 0,
  overviewUrl = '',
  unsubscribeUrl = null,
}: CommitmentCycleRecapEmailProps) => {
  const achieved = awardedTier !== null;
  const hasAdvanceDebt = advanceDebtVnd > 0;
  const cycleLabel = `${cycleStartLabel} – ${cycleEndLabel}`;

  return (
    <Html lang="vi">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Tổng kết kỳ Khởi nghiệp cùng ACTA</title>
      </Head>
      <Preview>
        {achieved
          ? `🎉 Kỳ ${cycleLabel}: bạn đã đạt Mốc Sàn ${awardedTier}`
          : `Kỳ ${cycleLabel}: tổng kết kết quả và khoảng còn thiếu của bạn`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
              alt="ACTA Logo"
              width="150"
              height="auto"
              style={logoImage}
            />
          </Section>

          <Section style={content}>
            <Heading style={h1}>
              {achieved
                ? '🎉 Tổng kết kỳ — Bạn đã chạm Mốc Sàn'
                : '📊 Tổng kết kỳ Khởi nghiệp cùng ACTA'}
            </Heading>

            <Text style={paragraph}>
              Chào <strong style={boldText}>{memberName}</strong>,
            </Text>
            <Text style={paragraph}>
              Kỳ <strong style={highlightText}>{cycleLabel}</strong> của bạn vừa
              khép lại. Dưới đây là toàn bộ kết quả và số liệu của kỳ này.
            </Text>

            {/* ── Khối 1: kết quả kỳ + tiền dự kiến ────────────────────────── */}
            <Section style={achieved ? resultBoxWin : resultBoxMiss}>
              <Text style={resultHeadline}>
                {achieved
                  ? `Đạt Mốc Sàn ${awardedTier} — ${vnd(floorVnd)}`
                  : 'Kỳ này chưa chạm Mốc Sàn'}
              </Text>
              <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={tdLabel}>Thu nhập tính trong kỳ</td>
                    <td style={tdValue}>{vnd(settlementBaseVnd)}</td>
                  </tr>
                  {achieved ? (
                    <>
                      <tr>
                        <td style={tdLabel}>Mốc Sàn được áp dụng</td>
                        <td style={tdValue}>{vnd(floorVnd)}</td>
                      </tr>
                      <tr>
                        <td style={tdLabel}>
                          <strong style={boldText}>
                            Phần bù sàn dự kiến
                          </strong>
                        </td>
                        <td style={tdValueStrong}>{vnd(expectedTopUpVnd)}</td>
                      </tr>
                    </>
                  ) : null}
                </tbody>
              </table>
              {achieved ? (
                <Text style={noteText}>
                  Đây là số liệu <strong style={boldText}>dự kiến</strong> theo
                  kết quả đối soát kỳ. Phiếu bù sàn sẽ được quản trị viên phát
                  riêng; bạn sẽ nhận thông báo khi phiếu sẵn sàng để nhận.
                </Text>
              ) : null}
            </Section>

            {/* ── Khối 2: dư nợ tạm ứng (ẨN HẲN khi không nợ) ──────────────── */}
            {/*
              Đặt NGAY SAU khối tiền, không đẩy xuống cuối mail: "Phần bù sàn dự
              kiến" ở trên là số TRƯỚC khi trừ dư nợ (D-R6-06 — trần bằng Mốc Sàn,
              trừ dư nợ tạm ứng). Member đọc một con số rồi nhận ít hơn mà lời giải
              thích nằm cách đó ba khối là đúng công thức tạo khiếu nại.
            */}
            {hasAdvanceDebt ? (
              <Section style={debtBox}>
                <Text style={debtHeadline}>
                  Dư nợ tạm ứng còn lại: {vnd(advanceDebtVnd)}
                </Text>
                <Text style={debtBody}>
                  Đây là phần bạn đã được tạm ứng trước từ chính sách và sẽ được{' '}
                  <strong style={boldText}>trừ dần</strong> vào các khoản chi trả
                  của những kỳ tới, cho tới khi hết.
                </Text>
                {achieved ? (
                  <Text style={debtBody}>
                    Vì vậy, phần bù sàn dự kiến{' '}
                    <strong style={boldText}>{vnd(expectedTopUpVnd)}</strong> ở
                    trên là số <strong style={boldText}>trước</strong> khi trừ dư
                    nợ; số thực nhận có thể thấp hơn.
                  </Text>
                ) : null}
                <Text style={debtNote}>
                  Số dư nợ hiển thị tại thời điểm gửi email. Số liệu cập nhật
                  nhất luôn nằm trên trang Khởi nghiệp cùng ACTA.
                </Text>
              </Section>
            ) : null}

            {/* ── Khối 3: bảng ba tiêu chí ─────────────────────────────────── */}
            <Heading style={h2}>Chi tiết ba tiêu chí trong kỳ</Heading>
            <Section style={detailsSection}>
              <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tiêu chí</th>
                    <th style={thStyleNum}>Đạt</th>
                    <th style={thStyleNum}>Mốc 1</th>
                    <th style={thStyleNum}>Mốc 2</th>
                    <th style={thStyleNum}>Kỳ trước</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.label}>
                      <td style={tdStyle}>{c.label}</td>
                      <td style={tdStyleNum}>
                        <strong style={boldText}>{c.achieved}</strong>
                      </td>
                      <td style={c.metTier1 ? tdStyleOk : tdStyleMiss}>
                        {c.metTier1 ? '✓' : `${c.requiredTier1}`}
                      </td>
                      <td style={c.metTier2 ? tdStyleOk : tdStyleMiss}>
                        {c.metTier2 ? '✓' : `${c.requiredTier2}`}
                      </td>
                      <td style={tdStyleNum}>
                        {c.previousAchieved === null
                          ? '—'
                          : renderTrend(c.achieved, c.previousAchieved)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Text style={legendText}>
                Cột “Mốc 1” / “Mốc 2” hiện dấu ✓ khi bạn đã đạt, hoặc hiện{' '}
                <em>số cần có</em> khi chưa đạt. Cột “Kỳ trước” là con số cùng
                tiêu chí ở kỳ liền trước; “—” nghĩa là chưa có kỳ trước để so
                sánh.
              </Text>
            </Section>

            {/* ── Khối 4: kết quả từng Mốc Sàn ─────────────────────────────── */}
            <Section style={detailsSection}>
              {tiers.map((t) => (
                <Text key={t.tier} style={tierLine}>
                  <strong style={boldText}>
                    Mốc Sàn {t.tier} ({vnd(t.floorVnd)}):
                  </strong>{' '}
                  {t.met ? (
                    <span style={okText}>đã đạt</span>
                  ) : (
                    <span style={missText}>
                      chưa đạt — còn thiếu {t.missingLabels.join(', ')}
                    </span>
                  )}
                </Text>
              ))}
            </Section>

            {/* ── Khối 5: TVTC (số liệu HIỆN TẠI, không thuộc kỳ đã đóng) ──── */}
            <Heading style={h2}>Đội ngũ Thành viên tích cực (TVTC)</Heading>
            <Section style={detailsSection}>
              {selfBecameTvtcInCycle ? (
                <Text style={celebrateText}>
                  🏅 Chúc mừng! Trong kỳ này chính bạn đã được công nhận{' '}
                  <strong style={boldText}>Thành viên tích cực (TVTC)</strong> —
                  danh hiệu trọn đời.
                </Text>
              ) : null}
              <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={tdLabel}>
                      TVTC trong tuyến dưới (F1+F2) hiện tại
                    </td>
                    <td style={tdValueStrong}>{tvtcCurrentTotal}</td>
                  </tr>
                  <tr>
                    <td style={tdLabel}>— trong đó ở tuyến F1</td>
                    <td style={tdValue}>{tvtcCurrentF1}</td>
                  </tr>
                  <tr>
                    <td style={tdLabel}>TVTC mới phát sinh trong kỳ này</td>
                    <td style={tdValueStrong}>+{tvtcNewInCycle}</td>
                  </tr>
                </tbody>
              </table>
              <Text style={legendText}>
                “Hiện tại” là số TVTC bạn đang có tại thời điểm gửi mail (danh
                hiệu là trọn đời). “Trong kỳ này” chỉ đếm những người được công
                nhận trong khoảng {cycleLabel} — người được công nhận sau đó sẽ
                được tính cho kỳ kế tiếp.
              </Text>
            </Section>

            {/* ── Khối 6: việc cần làm kỳ tới ──────────────────────────────── */}
            <Section style={nextStepBox}>
              <Text style={nextStepText}>{nextStep}</Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={overviewUrl}>
                Xem chi tiết trên trang Khởi nghiệp cùng ACTA
              </Button>
            </Section>

            <Section style={footerInfoSection}>
              <Text style={footerInfoText}>
                Đây là email tự động, gửi một lần sau khi mỗi kỳ của bạn khép
                lại theo ngày mốc neo. Số liệu trong mail được chốt tại thời
                điểm kỳ đóng và không thay đổi về sau (phiên bản tiêu chí{' '}
                {criteriaVersion}).
              </Text>
              {unsubscribeUrl ? (
                <Text style={footerInfoText}>
                  Không muốn nhận email tổng kết kỳ nữa?{' '}
                  <Link style={unsubscribeLink} href={unsubscribeUrl}>
                    Hủy nhận email
                  </Link>
                  . Các thông báo về phiếu bù sàn và hạn nhận phiếu vẫn được gửi
                  vì liên quan trực tiếp tới quyền lợi của bạn.
                </Text>
              ) : null}
            </Section>
          </Section>

          <Section style={bottomFooter}>
            <Text style={bottomFooterText}>
              © 2024 Liên minh Cộng đồng thực chiến (ACTA)
              <br />
              Email này được gửi tự động, vui lòng không reply.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CommitmentCycleRecapEmail;

/**
 * Cột xu hướng: số kỳ trước kèm mũi tên. Viết dạng "12 ▲" chứ không chỉ mũi tên —
 * member cần biết mốc so sánh là bao nhiêu, không chỉ biết là tăng hay giảm.
 */
function renderTrend(achieved: number, previous: number): string {
  if (achieved > previous) return `${previous} ▲`;
  if (achieved < previous) return `${previous} ▼`;
  return `${previous} =`;
}

const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: 'Arial, sans-serif',
  lineHeight: '1.6',
  color: '#333',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
};

const header = {
  padding: '30px 40px',
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
  borderRadius: '12px 12px 0 0',
};

const logoImage = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  backgroundColor: '#f8f9fa',
  padding: '30px',
  borderRadius: '10px',
  border: '1px solid #e9ecef',
};

const h1 = {
  color: '#b8860b',
  textAlign: 'center' as const,
  marginBottom: '25px',
  fontSize: '22px',
};

const h2 = {
  color: '#495057',
  fontSize: '17px',
  marginTop: '28px',
  marginBottom: '12px',
};

const paragraph = {
  fontSize: '16px',
  marginBottom: '20px',
};

const boldText = {
  fontWeight: 'bold',
};

const highlightText = {
  color: '#b8860b',
  fontWeight: 'bold',
};

const resultBoxWin = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '10px',
};

const resultBoxMiss = {
  backgroundColor: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '10px',
};

const resultHeadline = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#b8860b',
  margin: '0 0 12px 0',
};

const noteText = {
  fontSize: '13px',
  color: '#6c757d',
  margin: '12px 0 0 0',
};

/**
 * Hộp dư nợ tạm ứng — tông CẢNH BÁO NHẸ (cam), cố ý KHÁC hộp "đạt" (xanh) và hộp
 * "việc cần làm" (xanh dương). Đây là thông tin về một khoản PHẢI TRẢ; dùng lại tông
 * trung tính của các khối số liệu sẽ khiến nó trôi qua mắt đúng người cần đọc kỹ nhất.
 */
const debtBox = {
  backgroundColor: '#fff7ed',
  border: '1px solid #fdba74',
  borderRadius: '8px',
  padding: '18px',
  marginBottom: '10px',
};

const debtHeadline = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#b45309',
  margin: '0 0 10px 0',
};

const debtBody = {
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const debtNote = {
  fontSize: '12px',
  color: '#6c757d',
  margin: '8px 0 0 0',
};

const detailsSection = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '10px',
  border: '1px solid #dee2e6',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const thStyle = {
  textAlign: 'left' as const,
  fontSize: '13px',
  color: '#495057',
  borderBottom: '2px solid #b8860b',
  padding: '8px 6px',
};

const thStyleNum = {
  ...thStyle,
  textAlign: 'center' as const,
};

const tdStyle = {
  verticalAlign: 'top' as const,
  fontSize: '14px',
  padding: '10px 6px',
  borderBottom: '1px solid #dee2e6',
};

const tdStyleNum = {
  ...tdStyle,
  textAlign: 'center' as const,
};

const tdStyleOk = {
  ...tdStyleNum,
  color: '#15803d',
  fontWeight: 'bold',
};

const tdStyleMiss = {
  ...tdStyleNum,
  color: '#b45309',
};

const tdLabel = {
  fontSize: '14px',
  color: '#495057',
  padding: '6px 0',
};

const tdValue = {
  fontSize: '14px',
  textAlign: 'right' as const,
  padding: '6px 0',
};

const tdValueStrong = {
  ...tdValue,
  fontWeight: 'bold',
  color: '#b8860b',
};

const tierLine = {
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const okText = {
  color: '#15803d',
};

const missText = {
  color: '#b45309',
};

const celebrateText = {
  fontSize: '15px',
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '6px',
  padding: '12px',
  margin: '0 0 14px 0',
};

const nextStepBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '18px',
  marginBottom: '10px',
};

const nextStepText = {
  fontSize: '15px',
  margin: '0',
  color: '#1e3a8a',
};

const ctaSection = {
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '10px',
};

const ctaButton = {
  backgroundColor: '#b8860b',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
};

const legendText = {
  fontSize: '12px',
  color: '#6c757d',
  margin: '12px 0 0 0',
};

const footerInfoSection = {
  fontSize: '14px',
  color: '#6c757d',
  textAlign: 'center' as const,
  borderTop: '1px solid #dee2e6',
  paddingTop: '20px',
  marginTop: '20px',
};

const footerInfoText = {
  margin: '0 0 10px 0',
  fontSize: '13px',
};

const unsubscribeLink = {
  color: '#6c757d',
  textDecoration: 'underline',
};

const bottomFooter = {
  textAlign: 'center' as const,
  marginTop: '30px',
  fontSize: '12px',
  color: '#6c757d',
};

const bottomFooterText = {
  margin: '0',
};
