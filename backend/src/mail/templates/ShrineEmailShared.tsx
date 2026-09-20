/**
 * Mảnh dùng chung cho 7 mẫu thư ĐIỆN KIẾN CHỦ.
 *
 * `CompanyShell` nhận `contentHtml` rồi render qua `dangerouslySetInnerHTML`, nên
 * MỌI giá trị do người dùng nhập (tên hiển thị, biệt danh, lý do) phải đi qua
 * `escapeShrineHtml` trước khi nối chuỗi — nếu không, một biệt danh chứa `<script>`
 * sẽ nằm nguyên trong thư gửi đi.
 */

import { SHRINE_MEMBER_PATH } from '../../shrine/shrine.constants';

/** Thoát 5 ký tự nguy hiểm của HTML. */
export function escapeShrineHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const textStyle =
  'color:#4b3b2f;font-size:15px;line-height:1.7;margin:0 0 12px;';

/**
 * Gỡ dấu nháy bao quanh và khoảng trắng thừa khỏi một địa chỉ trước khi đặt vào
 * `href`.
 *
 * ⚠ ĐÂY LÀ BẢN VÁ CHO MỘT LỖI ĐÃ XẢY RA THẬT, không phải phòng xa. `ci/deploy.sh`
 * chạy `docker run --env-file`, và `--env-file` KHÔNG bóc dấu nháy như shell: một
 * dòng `SHRINE_PUBLIC_BASE_URL="https://shrines.acta.vn"` đi vào tiến trình với
 * hai dấu `"` NẰM TRONG giá trị. Kết quả là mọi lá thư ĐIỆN KIẾN CHỦ gửi đi mang
 * `href="&quot;https://shrines.acta.vn&quot;/ghi-danh/…"` — Gmail đọc ra một địa
 * chỉ tương đối vô nghĩa rồi bỏ luôn thuộc tính, nên cái nút vẫn hiện ra đẹp đẽ
 * mà bấm không đi đâu cả. Không có gì trong log báo hỏng.
 *
 * Nguồn đã được chuẩn hoá ở `ShrineNotifyService.portalUrl`; hàm này là lớp thứ
 * hai, đặt ĐÚNG tại chỗ đã sinh ra cái nút chết, để một người gọi khác truyền
 * vào chuỗi bẩn thì cũng không tái hiện được lỗi.
 *
 * Chỉ gỡ dấu nháy BAO QUANH — dấu nháy nằm giữa địa chỉ (hiếm, nhưng hợp lệ khi
 * đã mã hoá) được giữ nguyên.
 */
export function shrineSafeUrl(raw: string | null | undefined): string {
  let value = String(raw ?? '').trim();
  while (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

/** Đoạn văn thường, đã thoát HTML sẵn ở phía gọi. */
export function shrineParagraph(html: string): string {
  return `<p style="${textStyle}">${html}</p>`;
}

/** Nút bấm chính — Outlook không hỗ trợ gradient nên chỉ dùng nền đặc. */
export function shrineButton(url: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeShrineHtml(shrineSafeUrl(url))}" target="_blank" rel="noopener noreferrer" style="background-color:#8b4513;color:#ffffff;display:inline-block;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">${escapeShrineHtml(label)}</a></p>`;
}

/**
 * Nút bấm PHỤ — viền, nền trắng.
 *
 * ⚠ Tồn tại để giữ THỨ BẬC, không phải để có thêm một kiểu dáng. Hai nút cùng
 * nền nâu đặc đứng cạnh nhau thì người nhận thư phải đọc chữ mới biết cái nào
 * là việc chính, và phần lớn sẽ bấm cái trên cùng. Nút phụ phải trông ra là
 * phụ ngay từ cái liếc đầu tiên.
 *
 * ⚠ Đi qua ĐÚNG `shrineSafeUrl` + `escapeShrineHtml` như nút chính. Viết một
 * thẻ `<a>` thẳng tay ở nơi gọi là dựng lại đúng cái nút chết mà `shrineSafeUrl`
 * sinh ra để vá (`--env-file` không bóc dấu nháy ⇒ nút hiện đẹp mà bấm không đi
 * đâu, không log nào báo).
 *
 * ⚠ `border` viết dạng rút gọn chứ không `border-width/style/color` tách rời:
 * Outlook bỏ qua khá nhiều thuộc tính tách rời trong style nội tuyến.
 */
export function shrineButtonPhu(url: string, label: string): string {
  return `<p style="margin:16px 0 24px;"><a href="${escapeShrineHtml(shrineSafeUrl(url))}" target="_blank" rel="noopener noreferrer" style="background-color:#ffffff;color:#8b4513;display:inline-block;font-size:14px;font-weight:600;padding:11px 22px;border:1px solid #d8c4ac;border-radius:8px;text-decoration:none;">${escapeShrineHtml(label)}</a></p>`;
}

/**
 * Khối minh bạch dữ liệu — BẮT BUỘC trong thư mời và thư xác nhận đồng ý.
 *
 * Luật 91/2025 đòi đồng ý phải "đầy đủ thông tin": người ta phải biết chính xác
 * dữ liệu nào sẽ công khai, ai xem được, giữ bao lâu và rút lại bằng cách nào,
 * bằng tiếng Việt dễ hiểu chứ không phải bằng một liên kết tới điều khoản.
 */
export function shrineConsentNoticeHtml(portalUrl: string): string {
  // Chuẩn hoá NGAY ĐẦU hàm rồi mới nối `/toi`: nếu để nguyên chuỗi bẩn thì địa
  // chỉ trang thành viên thừa hưởng đúng cái dấu nháy đã giết những cái nút kia.
  const portal = shrineSafeUrl(portalUrl).replace(/\/+$/, '');
  const memberUrl = `${portal}${SHRINE_MEMBER_PATH}`;

  return [
    `<div style="background-color:#faf8f3;border:1px solid #ddbf94;border-radius:8px;padding:16px;margin:24px 0;">`,
    `<p style="color:#8b4513;font-size:15px;font-weight:700;margin:0 0 10px;">Bạn đang đồng ý điều gì</p>`,
    `<p style="${textStyle}"><strong>Dữ liệu sẽ công khai:</strong> đúng bốn thứ — tên hiển thị bạn tự chọn, vị trí ngôi sao trên bản đồ, tên vùng cánh, và NĂM ghi danh. Không có ngày đầy đủ, không số điện thoại, không email, không địa chỉ, không thông tin doanh thu, hoa hồng hay cấp bậc.</p>`,
    `<p style="${textStyle}"><strong>Ai xem được:</strong> bất kỳ ai truy cập trang ĐIỆN KIẾN CHỦ, không cần đăng nhập.</p>`,
    `<p style="${textStyle}"><strong>Giữ trong bao lâu:</strong> tới khi bạn rút tên hoặc tài khoản của bạn bị xoá — không có thời hạn tự động.</p>`,
    `<p style="${textStyle}"><strong>Rút lại bất cứ lúc nào:</strong> mở trang <a href="${escapeShrineHtml(memberUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">Ngôi sao của tôi</a>, đăng nhập bằng tài khoản ACTA rồi bấm “Rút tên”. Tên hiển thị bị xoá khỏi bản ghi công khai ngay lập tức và ngôi sao trở lại trạng thái chưa có chủ. Bạn không cần nêu lý do và không cần ai duyệt.</p>`,
    `<p style="${textStyle}">Trang ĐIỆN KIẾN CHỦ: <a href="${escapeShrineHtml(portal)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">${escapeShrineHtml(portal)}</a><br/>Trang thành viên (ghi danh · rút tên): <a href="${escapeShrineHtml(memberUrl)}" target="_blank" rel="noopener noreferrer" style="color:#cd853f;font-weight:600;">${escapeShrineHtml(memberUrl)}</a></p>`,
    `</div>`,
  ].join('');
}

/**
 * Tuyên bố miễn trừ trách nhiệm — đi kèm mọi thư nói tới "ngôi sao".
 *
 * Không có tổ chức thiên văn nào công nhận việc này, và toạ độ là số do hệ thống
 * sinh ra. Nói rõ trong thư để không ai hiểu nhầm đây là dịch vụ đăng ký sao.
 */
export function shrineDisclaimerHtml(): string {
  return `<p style="color:#6b7280;font-size:12px;line-height:1.6;margin:16px 0 0;">ĐIỆN KIẾN CHỦ <strong>không phải</strong> dịch vụ đăng ký sao thiên văn. Vị trí ngôi sao là toạ độ tổng hợp do hệ thống sinh ra, không tương ứng với thiên thể có thật nào và không được tổ chức thiên văn nào công nhận. Ghi danh là ghi nhận nội bộ trong cộng đồng ACTA, không tạo ra quyền tài sản.</p>`;
}
