import { CompanyShell } from './CompanyShell';
import {
  escapeShrineHtml,
  shrineButton,
  shrineButtonPhu,
  shrineParagraph,
} from './ShrineEmailShared';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  THƯ BÁO: ĐIỂM CẦU CỦA BẠN VỪA ĐƯỢC THÊM LÊN BẢN ĐỒ THỔ ĐỊA              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Người nhận thư này KHÔNG hề bấm nút nào để tạo điểm cầu — nó do đợt backfill
 * dựng ra từ hồ sơ KYC của họ. Vì thế lá thư phải trả lời trước ba câu hỏi mà
 * bất kỳ ai cũng sẽ hỏi khi thấy tên thật của mình xuất hiện trên một bản đồ
 * công khai, và phải trả lời NGAY trong màn hình đầu tiên, không bắt cuộn:
 *
 *   1. Cái gì vừa xuất hiện?      → tên điểm cầu + địa chỉ đang hiển thị
 *   2. Ai làm và làm lúc nào?     → `nguoiThucHien` + `thoiDiemTao`
 *   3. Tôi gỡ nó đi kiểu gì?      → nút chính dẫn thẳng tới màn có công tắc ẩn
 *
 * ⚠ VÌ SAO NÚT CHÍNH DẪN TỚI `/profile/dia-diem` CHỨ KHÔNG TỚI TRANG CÔNG KHAI:
 * công tắc ẩn nằm ở đó, và quan trọng hơn — sau khi ẩn, `resolveWarehouseBySlug`
 * lọc bằng `CHI_KHO_HIEN_TREN_BAN_DO` (có `hiddenOnMap: false`) nên trang công
 * khai trả 404. Nếu nút chính trỏ vào trang công khai thì người vừa ẩn xong bấm
 * lại chính cái nút trong thư sẽ rơi vào trang lỗi và tưởng mình làm hỏng thứ
 * gì. Liên kết công khai vẫn có, nhưng là liên kết PHỤ và chỉ để "xem khách
 * đang thấy gì".
 *
 * ⚠ `CompanyShell` render `contentHtml` qua `dangerouslySetInnerHTML`, nên MỌI
 * giá trị đi vào đây phải qua `escapeShrineHtml`. Tên điểm cầu chứa `fullName`
 * do người dùng tự nhập — đúng loại dữ liệu sẽ có dấu `<` sớm hay muộn.
 *
 * ⚠ Ba hàm `shrine*` dùng lại nguyên xi dù tên mang tiền tố của một tính năng
 * khác. Cố ý: `shrineSafeUrl` là BẢN VÁ cho một lỗi đã xảy ra thật (`--env-file`
 * không bóc dấu nháy ⇒ mọi nút trong thư hiện ra đẹp mà bấm không đi đâu, không
 * log nào báo). Chép một bản thứ hai ở đây là dựng lại đúng cái nút chết đó.
 */
export interface DiemCauMoiEmailProps {
  /** Tên người nhận, hiện ở câu chào. */
  tenNguoiNhan: string;
  /** Tên điểm cầu ĐANG hiển thị công khai. */
  tenDiemCau: string;
  /** Địa chỉ đang hiện dưới tên điểm; `null` khi điểm chưa có địa chỉ. */
  diaChiHienThi: string | null;
  /** Đã format sẵn theo giờ Việt Nam ở tầng service — template không tự format. */
  thoiDiemTao: string;
  /** "Liên Minh ACTA" khi do backfill chạy; tên quản trị viên khi do người tạo. */
  nguoiThucHien: string;
  /** Nút chính — màn "điểm cầu của tôi", kèm tham số mở hộp thoại hướng dẫn. */
  duongDanQuanLy: string;
  /** Liên kết PHỤ tới trang công khai. `null` khi điểm chưa lên bản đồ được. */
  duongDanCongKhai: string | null;
  /**
   * Tờ hướng dẫn ẩn điểm cầu (PDF trên UploadThing).
   *
   * ⚠ Là THAM SỐ chứ không đọc thẳng hằng, cho khớp hai liên kết trên: template
   * giữ nguyên tính thuần, và bài thử đổi được URL để kiểm mà không phải sửa
   * hằng thật.
   */
  duongDanHuongDanPdf: string;
}

/** Tiêu đề thư — tách hàm để service và bài test dùng chung đúng một chuỗi. */
export function diemCauMoiSubject(data: { tenDiemCau: string }): string {
  return `Điểm cầu "${data.tenDiemCau}" của bạn đã có trên bản đồ Thổ địa`;
}

const nhanStyle =
  'color:#8a7a6a;font-size:13px;line-height:1.5;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.4px;';
const giaTriStyle =
  'color:#3d2f24;font-size:15px;font-weight:600;line-height:1.6;margin:0 0 14px;';
const hopStyle =
  'background-color:#faf7f3;border:1px solid #ece3d8;border-radius:10px;padding:16px 18px;margin:0 0 20px;';

/** Một dòng "nhãn / giá trị" trong hộp tóm tắt. */
function dong(nhan: string, giaTri: string): string {
  return `<p style="${nhanStyle}">${escapeShrineHtml(nhan)}</p><p style="${giaTriStyle}">${escapeShrineHtml(giaTri)}</p>`;
}

export const DiemCauMoiEmail = ({
  tenNguoiNhan,
  tenDiemCau,
  diaChiHienThi,
  thoiDiemTao,
  nguoiThucHien,
  duongDanQuanLy,
  duongDanCongKhai,
  duongDanHuongDanPdf,
}: DiemCauMoiEmailProps) => {
  const cac_dong = [
    dong('Tên điểm cầu', tenDiemCau),
    // Điểm chưa có địa chỉ vẫn nằm trong danh sách nhưng không có ghim trên bản
    // đồ. Nói thẳng ra, thay vì bỏ trống dòng địa chỉ để người ta tự đoán.
    dong(
      'Địa chỉ đang hiển thị',
      diaChiHienThi?.trim() ||
        'Chưa có địa chỉ — điểm chưa hiện ghim trên bản đồ',
    ),
    dong('Thời gian thêm', thoiDiemTao),
    dong('Người thực hiện', nguoiThucHien),
  ].join('');

  const contentHtml = [
    shrineParagraph(
      `Xin chào <strong style="color:#8b4513;">${escapeShrineHtml(tenNguoiNhan)}</strong>,`,
    ),
    shrineParagraph(
      'ACTA vừa tạo cho bạn một <strong>điểm cầu</strong> trên bản đồ Thổ địa. Đây là điểm đại diện cho bạn để khách hàng quanh khu vực tìm thấy và ghé thăm. Bạn không cần làm gì thêm — điểm đã hoạt động.',
    ),
    // ⚠ ĐOẠN NÀY PHỤC VỤ HAI NGƯỜI ĐỌC CÙNG LÚC, và đó là lý do nó nằm ngay đây
    // chứ không nằm ở chân thư.
    //
    //   • Người nhận — họ vừa thấy tên mình xuất hiện trên một bản đồ công khai
    //     mà không bấm nút nào. Câu hỏi kế tiếp sau "cái gì vừa xuất hiện" luôn
    //     là "để làm gì, và tôi được gì".
    //   • Một người thứ ba hỏi lại họ — trưởng chợ, đối tác, hoặc cơ quan chức
    //     năng. Người nhận KHÔNG tự dựng điểm này, nên nếu bị hỏi họ không có gì
    //     trong tay để trả lời. Lá thư phải tự nó là câu trả lời, dẫn lại được.
    //
    // Vì thế đoạn phải nêu ĐỦ ba điều và không được rút gọn còn một: mục đích
    // (xúc tiến thương mại, kết nối), lợi ích cho người nhận (cơ hội kinh doanh,
    // tiếp cận khách hàng), và nguồn gốc (ACTA tạo ra, không phải người nhận tự
    // đăng). Bỏ vế cuối là bỏ đúng vế mà người bị hỏi cần nhất.
    shrineParagraph(
      'Vì sao ACTA làm việc này: bản đồ Thổ địa là một hoạt động <strong>xúc tiến thương mại</strong> do ACTA tổ chức, nhằm <strong>kết nối</strong> người bán với khách hàng quanh khu vực — góp phần nâng cao <strong>cơ hội kinh doanh</strong> và khả năng <strong>tiếp cận khách hàng</strong> của bạn. Điểm cầu chỉ hiển thị những thông tin cần thiết để khách tìm được bạn, và bạn toàn quyền ẩn hoặc cho hiện lại bất cứ lúc nào. Nếu có ai — kể cả cơ quan chức năng — hỏi về nguồn gốc điểm cầu này, bạn có thể dẫn lại chính lá thư này: đây là công cụ do ACTA tạo ra nhằm mục đích kết nối và xúc tiến thương mại, không phải do bạn tự đăng.',
    ),
    `<div style="${hopStyle}">${cac_dong}</div>`,
    shrineButton(duongDanQuanLy, 'Xem điểm cầu của tôi'),
    shrineParagraph(
      'Bấm nút trên để mở trang quản lý điểm cầu của bạn. Ở đó có <strong>hướng dẫn từng bước</strong> để ẩn điểm khỏi bản đồ nếu bạn không muốn hiển thị, và bạn có thể cho hiện lại bất cứ lúc nào.',
    ),
    // ⚠ Tờ PDF đứng SAU nút chính, và là nút PHỤ. Người muốn ẩn điểm ngay thì
    // đường ngắn nhất vẫn là bấm vào trang quản lý; tờ hướng dẫn dành cho người
    // muốn đọc trước khi bấm, hoặc muốn xem lại lúc không mở máy tính được.
    shrineButtonPhu(duongDanHuongDanPdf, 'Xem hướng dẫn ẩn điểm cầu (PDF)'),
    shrineParagraph(
      'Tờ hướng dẫn có ảnh chụp từng bước và <strong>số điện thoại hỗ trợ</strong> — gọi hoặc nhắn Zalo đều được, nếu bạn cần người làm cùng.',
    ),
    duongDanCongKhai
      ? shrineParagraph(
          `Muốn xem khách hàng đang nhìn thấy gì? <a href="${escapeShrineHtml(duongDanCongKhai)}" target="_blank" rel="noopener noreferrer" style="color:#8b4513;">Mở trang công khai của điểm cầu</a>.`,
        )
      : '',
  ].join('');

  return (
    <CompanyShell
      title={diemCauMoiSubject({ tenDiemCau })}
      previewText="Điểm cầu của bạn đã có trên bản đồ — và đây là cách ẩn nó đi nếu bạn muốn"
      greeting="Điểm cầu của bạn đã có trên bản đồ"
      contentHtml={contentHtml}
      footerNote="Bạn có thể ẩn điểm cầu này khỏi bản đồ bất cứ lúc nào, không cần nêu lý do. Ẩn điểm KHÔNG ảnh hưởng tới tài khoản, đơn hàng hay kho hàng của bạn."
    />
  );
};

export default DiemCauMoiEmail;
