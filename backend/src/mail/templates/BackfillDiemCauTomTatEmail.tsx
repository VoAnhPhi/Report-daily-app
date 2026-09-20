import { CompanyShell } from './CompanyShell';
import { escapeShrineHtml, shrineParagraph } from './ShrineEmailShared';

/**
 * Thư TÓM TẮT gửi ban quản trị khi chạy đợt backfill điểm cầu ở chế độ xem thử.
 *
 * ⚠ Thư này KHÔNG thay được thư người dùng. Nó chỉ nói "đợt chạy sẽ tạo bao
 * nhiêu điểm, bỏ qua bao nhiêu, vì sao". Bản thân lá thư mà người dùng sẽ nhận
 * được gửi RIÊNG, y nguyên từng byte, tới cùng danh sách quản trị — vì cách duy
 * nhất để biết một lá thư trông thế nào trong Gmail là nhìn chính nó, không phải
 * nhìn ảnh chụp hay bản mô tả của nó.
 *
 * ⚠ `cheDoGuiThu` là trường QUAN TRỌNG NHẤT trong bảng, và nó tồn tại vì một lỗ
 * có thật: ngoài production, nếu `MAIL_REDIRECT_TO` không được đặt thì
 * `mail-delivery.guard` KHÔNG gọi Resend, chỉ log rồi trả về một id giả
 * (`mail-skipped-non-production`) để "callers keep their happy path". Nghĩa là
 * một đợt xem thử có thể báo "đã gửi 12 thư" trong khi không lá nào rời máy chủ.
 * In thẳng chế độ ra đây để người đọc biết mình đang nhìn bằng chứng gì.
 */
export interface BackfillDiemCauTomTatEmailProps {
  /** `chạy thử` | `chạy thật` — nói ngay ở dòng đầu, không bắt đoán. */
  cheDo: string;
  /** `send` | `redirect` | `skip` — đọc từ `resolveMailDeliveryMode()`. */
  cheDoGuiThu: string;
  /** Câu giải thích hệ quả của `cheDoGuiThu`, viết sẵn ở tầng service. */
  giaiThichGuiThu: string;
  /** Số tài khoản đủ điều kiện tạo điểm cầu trong đợt này. */
  soDiemSeTao: number;
  /** Số tài khoản bị bỏ qua, kèm lý do gộp theo nhóm. */
  cacLyDoBoQua: { lyDo: string; so: number }[];
  /** Máy chủ CSDL đang trỏ tới — để không ai nhầm dev với prod. */
  mayChuCsdl: string;
  thoiDiemChay: string;
}

export function backfillDiemCauTomTatSubject(data: { cheDo: string }): string {
  return `[Thổ địa] Đợt tạo điểm cầu từ hồ sơ KYC — ${data.cheDo}`;
}

const nhanStyle =
  'color:#8a7a6a;font-size:13px;line-height:1.5;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;';
const giaTriStyle =
  'color:#3d2f24;font-size:15px;font-weight:600;line-height:1.6;margin:0 0 14px;';
const hopStyle =
  'background-color:#faf7f3;border:1px solid #ece3d8;border-radius:10px;padding:16px 18px;margin:0 0 20px;';
const canhBaoStyle =
  'background-color:#fff6e5;border:1px solid #f0d9a8;border-radius:10px;padding:14px 18px;margin:0 0 20px;color:#6b4f1d;font-size:14px;line-height:1.7;';

function dong(nhan: string, giaTri: string): string {
  return `<p style="${nhanStyle}">${escapeShrineHtml(nhan)}</p><p style="${giaTriStyle}">${escapeShrineHtml(giaTri)}</p>`;
}

export const BackfillDiemCauTomTatEmail = ({
  cheDo,
  cheDoGuiThu,
  giaiThichGuiThu,
  soDiemSeTao,
  cacLyDoBoQua,
  mayChuCsdl,
  thoiDiemChay,
}: BackfillDiemCauTomTatEmailProps) => {
  const bo_qua =
    cacLyDoBoQua.length === 0
      ? '<p style="color:#3d2f24;font-size:15px;margin:0;">Không bỏ qua tài khoản nào.</p>'
      : cacLyDoBoQua
          .map(
            (m) =>
              `<p style="color:#3d2f24;font-size:15px;line-height:1.7;margin:0 0 6px;">• ${escapeShrineHtml(m.lyDo)}: <strong>${m.so}</strong></p>`,
          )
          .join('');

  const contentHtml = [
    shrineParagraph(
      `Đợt tạo điểm cầu từ hồ sơ KYC vừa chạy ở chế độ <strong>${escapeShrineHtml(cheDo)}</strong>.`,
    ),
    `<div style="${canhBaoStyle}"><strong>Chế độ gửi thư: ${escapeShrineHtml(cheDoGuiThu)}.</strong><br />${escapeShrineHtml(giaiThichGuiThu)}</div>`,
    `<div style="${hopStyle}">${[
      dong('Số điểm cầu sẽ tạo', String(soDiemSeTao)),
      dong('Máy chủ CSDL', mayChuCsdl),
      dong('Thời điểm chạy', thoiDiemChay),
    ].join('')}</div>`,
    `<p style="${nhanStyle}">Bỏ qua</p><div style="${hopStyle}">${bo_qua}</div>`,
    shrineParagraph(
      'Ngay sau thư này, bạn sẽ nhận thêm <strong>một lá thư mẫu</strong> — chính là lá thư người dùng sẽ thấy, không sửa một chữ nào. Hãy đọc lá đó để duyệt nội dung.',
    ),
  ].join('');

  return (
    <CompanyShell
      title={backfillDiemCauTomTatSubject({ cheDo })}
      previewText={`Đợt tạo điểm cầu — ${cheDo} — ${soDiemSeTao} điểm`}
      greeting="Đợt tạo điểm cầu từ hồ sơ KYC"
      contentHtml={contentHtml}
      footerNote="Thư nội bộ, chỉ gửi cho ban quản trị ACTA."
    />
  );
};

export default BackfillDiemCauTomTatEmail;
