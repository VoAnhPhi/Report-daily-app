'use client';

import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Mã công việc ACTA: CV + 6 số ngày + 3 số thứ tự (xem `generateTaskCode`). */
const MA_VIEC = /\b(CV\d{9})\b/g;

/**
 * Khe dọc giữa hai khối. Khối đầu không đội thêm lề, nếu không mỗi câu trả lời
 * mở đầu bằng một khoảng trống thừa ngay dưới icon trợ lý.
 *
 * Dùng lề TRÊN cho từng khối thay vì `space-y-*` ở khung cha là có chủ đích:
 * `space-y-*` sinh ra bộ chọn `.space-y-2 > :not([hidden]) ~ :not([hidden])`
 * (độ đặc hiệu 0,3,0) nên nó ĐÈ mọi `mt-*` đặt trên chính khối con — tức tiêu
 * đề không thể tự xin thêm khoảng thở phía trên. Từng khối tự khai lề thì phân
 * cấp mới thấy được.
 */
const KHE_KHOI = 'mt-2 first:mt-0';

/**
 * Bộ dựng Markdown rút gọn cho câu trả lời của trợ lý "Nhân viên Nhàn".
 *
 * ⚠ KHÔNG thêm `react-markdown` hay bất kỳ thư viện dựng Markdown nào — kho này
 * cố ý không có, và lý do KHÔNG đổi dù tập cú pháp ở đây đã rộng ra: một trình
 * dựng đầy đủ là ~40KB, và quan trọng hơn là một bề mặt tấn công XSS mới (nó
 * hiểu cả HTML thô lẫn trong Markdown, việc chặn nằm ở cấu hình — cấu hình sai
 * một lần là chạy mã ngay trong phiên của super admin). Ở đây mọi thứ đi ra đều
 * là node React do chính tệp này tạo, KHÔNG có `dangerouslySetInnerHTML` ở bất
 * kỳ đâu, nên một câu trả lời chứa `<script>` hiện ra CHỮ `<script>` chứ không
 * chạy.
 *
 * Tập cú pháp phủ đúng những gì mục "CÁCH TRÌNH BÀY" trong lời hệ thống
 * (`acta-api/src/nhan-vien-nhan/services/nhan-agent.service.ts`) cho phép model
 * dùng — "Markdown gọn" cộng bảng khi thật sự so sánh nhiều cột:
 *   - tiêu đề `#` … `######`;
 *   - bảng có hàng ngăn `|---|---|`, hiểu cả căn lề `:---:` / `---:`;
 *   - gạch đầu dòng `-` `*` `•` và danh sách đánh số `1.` `2.`;
 *   - `**in đậm**`, `*in nghiêng*`, `` `mã nội dòng` ``, khối mã rào ```` ``` ````;
 *   - đường kẻ ngang `---`;
 *   - liên kết `[chữ](https://…)`;
 *   - và mã việc `CV260625010` thành chip bấm được — thứ này không phải
 *     Markdown, nhưng là lý do tồn tại của cả tệp.
 *
 * CỐ Ý BỎ, đừng "bổ sung cho đủ Markdown":
 *   - nhấn mạnh bằng `_gạch dưới_`: chính lời hệ thống dạy model các giá trị
 *     enum `in_progress`, `admin_internal`, `partner_task`, nên coi `_` là cú
 *     pháp thì mọi câu nhắc hai giá trị enum trong cùng một dòng sẽ hoá chữ
 *     nghiêng — sai chình ình ở đúng chỗ hay xuất hiện nhất. `**`/`*` không có
 *     rủi ro đó nên vẫn nhận.
 *   - danh sách lồng nhau, trích dẫn `>`, HTML thô: model không được bảo dùng.
 *   - tự bắt URL trần thành liên kết: nguồn tham khảo đã có khối "Nguồn tham
 *     khảo" riêng ở `nhan-message-item.tsx`, dựng từ dữ liệu CÓ CẤU TRÚC nên
 *     đáng tin hơn hẳn việc đoán ranh giới URL trong văn bản tiếng Việt (dấu
 *     chấm cuối câu, dấu phẩy, ngoặc đơn đều dính vào).
 */
export function NhanRichText({
  text,
  onOpenTaskCode,
  className,
}: {
  text: string;
  /** Bấm vào một mã việc thì mở thẻ chi tiết ngoài bảng. */
  onOpenTaskCode?: (code: string) => void;
  className?: string;
}) {
  const khoi = tachKhoi(text);

  return (
    // `min-w-0`: ngăn kéo chat là một cột flex, mà khối con của flex mặc định
    // có `min-width: auto` — thiếu dòng này thì cái bảng bên trong đẩy TOÀN BỘ
    // khung chat rộng ra thay vì tự cuộn ngang trong khung của nó.
    <div className={cn('min-w-0', className)}>
      {khoi.map((k, i) => {
        switch (k.loai) {
          case 'tieuDe':
            return (
              <TieuDe
                key={i}
                bac={k.bac}
                text={k.text}
                onOpenTaskCode={onOpenTaskCode}
              />
            );

          case 'ke':
            return (
              <hr key={i} className='my-3 border-0 border-t border-ws-line' />
            );

          case 'ma':
            return (
              <pre
                key={i}
                className={cn(
                  KHE_KHOI,
                  'overflow-x-auto rounded-ws-chip border border-ws-line bg-ws-surface-sunken px-2.5 py-2',
                )}
              >
                <code className='font-mono text-ws-micro leading-relaxed text-ws-ink-soft'>
                  {k.noiDung}
                </code>
              </pre>
            );

          case 'bang':
            return (
              <Bang
                key={i}
                dau={k.dau}
                hang={k.hang}
                canLe={k.canLe}
                onOpenTaskCode={onOpenTaskCode}
              />
            );

          case 'ds':
            return (
              <ul key={i} className={cn(KHE_KHOI, 'space-y-1')}>
                {k.muc.map((m, j) => (
                  <li key={j} className='flex gap-1.5'>
                    <span
                      aria-hidden
                      className='mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ws-ink-ghost'
                    />
                    <span className='min-w-0 flex-1'>
                      <DongChu text={m} onOpenTaskCode={onOpenTaskCode} />
                    </span>
                  </li>
                ))}
              </ul>
            );

          case 'stt':
            return (
              // `value` trên `<li>` giữ ĐÚNG con số model viết ra: nó hay đánh
              // tiếp một danh sách bị ngắt quãng (…"7." sau một đoạn giải
              // thích), và tự đánh lại từ 1 là bịa ra một thứ tự khác với thứ
              // tự nó đang nói tới trong câu chữ.
              <ol
                key={i}
                className={cn(
                  KHE_KHOI,
                  'list-decimal space-y-1 pl-5 marker:text-ws-ink-ghost',
                )}
              >
                {k.muc.map((m, j) => (
                  <li key={j} value={m.so} className='pl-0.5'>
                    <DongChu text={m.text} onOpenTaskCode={onOpenTaskCode} />
                  </li>
                ))}
              </ol>
            );

          default:
            return (
              <p
                key={i}
                className={cn(KHE_KHOI, 'whitespace-pre-line break-words')}
              >
                <DongChu text={k.text} onOpenTaskCode={onOpenTaskCode} />
              </p>
            );
        }
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ khối --- */

type CanLe = 'trai' | 'giua' | 'phai';

type Khoi =
  | { loai: 'doan'; text: string }
  | { loai: 'ds'; muc: string[] }
  | { loai: 'stt'; muc: { so: number; text: string }[] }
  | { loai: 'tieuDe'; bac: number; text: string }
  | { loai: 'bang'; dau: string[]; hang: string[][]; canLe: CanLe[] }
  | { loai: 'ma'; noiDung: string }
  | { loai: 'ke' };

/** `#` … `######` — tối đa 3 dấu cách thụt đầu, đúng luật Markdown. */
const DONG_TIEU_DE = /^ {0,3}(#{1,6})\s+(.*)$/;
/** Gạch đầu dòng. Bắt buộc có dấu cách sau dấu, nếu không `---` cũng lọt vào. */
const DONG_DS = /^\s{0,3}[-*•]\s+(.*)$/;
/** Danh sách đánh số: chấp nhận cả `1.` lẫn `1)`. */
const DONG_STT = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/;
/** Đường kẻ ngang: cả dòng chỉ có `---`, `***` hoặc `___`. */
const DONG_KE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
/** Rào khối mã. Bắt luôn nhãn ngôn ngữ (```ts) rồi bỏ đi — ta không tô màu. */
const DONG_RAO = /^ {0,3}(```|~~~)/;

/**
 * Cắt câu trả lời thành các khối.
 *
 * Duyệt theo CHỈ SỐ chứ không `for…of` vì hai khối phải nhìn được sang dòng
 * sau: khối mã nuốt mọi dòng tới rào đóng, còn bảng chỉ được coi là bảng khi
 * dòng NGAY SAU dòng tiêu đề là hàng ngăn `|---|---|` — đúng luật GFM. Thiếu
 * phép nhìn trước ấy thì mọi câu có dấu `|` đều bị hiểu nhầm thành bảng.
 *
 * Gom các dòng cùng loại thành MỘT khối (thay vì dựng từng dòng rời) để khoảng
 * cách giữa các mục trong một danh sách khác với khoảng cách giữa hai đoạn —
 * mắt phân biệt được đâu là một khối.
 */
function tachKhoi(text: string): Khoi[] {
  const dong = text.split('\n');
  const ra: Khoi[] = [];
  let doan: string[] = [];
  let i = 0;

  const xaDoan = () => {
    if (doan.length > 0) {
      ra.push({ loai: 'doan', text: doan.join('\n') });
      doan = [];
    }
  };

  while (i < dong.length) {
    const d = dong[i];

    // 1. Khối mã đứng trước MỌI luật khác: bên trong rào, `# `, `- `, `|` chỉ
    //    là ký tự, không phải cú pháp.
    const rao = DONG_RAO.exec(d);
    if (rao) {
      xaDoan();
      const than: string[] = [];
      i += 1;
      while (i < dong.length && !dong[i].trimStart().startsWith(rao[1])) {
        than.push(dong[i]);
        i += 1;
      }
      // Bỏ qua rào đóng. Model quên đóng rào thì vòng trên đã chạy hết văn bản
      // và `i` vượt mảng — cộng thêm 1 vẫn vô hại, đừng thêm nhánh cho nó.
      i += 1;
      ra.push({ loai: 'ma', noiDung: than.join('\n') });
      continue;
    }

    if (d.trim() === '') {
      xaDoan();
      i += 1;
      continue;
    }

    const tieuDe = DONG_TIEU_DE.exec(d);
    if (tieuDe) {
      xaDoan();
      ra.push({
        loai: 'tieuDe',
        bac: tieuDe[1].length,
        // Cắt cả kiểu tiêu đề đóng hai đầu (`## Tổng quan ##`).
        text: tieuDe[2].replace(/\s*#+\s*$/, '').trim(),
      });
      i += 1;
      continue;
    }

    if (DONG_KE.test(d)) {
      xaDoan();
      ra.push({ loai: 'ke' });
      i += 1;
      continue;
    }

    if (d.includes('|') && i + 1 < dong.length && laHangNgan(dong[i + 1])) {
      xaDoan();
      i = docBang(dong, i, ra);
      continue;
    }

    const mucDs = DONG_DS.exec(d);
    if (mucDs) {
      xaDoan();
      const muc: string[] = [];
      while (i < dong.length) {
        const m = DONG_DS.exec(dong[i]);
        if (!m) break;
        muc.push(m[1]);
        i += 1;
      }
      ra.push({ loai: 'ds', muc });
      continue;
    }

    const mucStt = DONG_STT.exec(d);
    if (mucStt) {
      xaDoan();
      const muc: { so: number; text: string }[] = [];
      while (i < dong.length) {
        const m = DONG_STT.exec(dong[i]);
        if (!m) break;
        muc.push({ so: Number(m[1]), text: m[2] });
        i += 1;
      }
      ra.push({ loai: 'stt', muc });
      continue;
    }

    doan.push(d);
    i += 1;
  }

  xaDoan();
  return ra;
}

/**
 * Đọc trọn một bảng bắt đầu ở `dau`, đẩy khối vào `ra`, trả về chỉ số dòng kế.
 *
 * Số cột lấy theo hàng DÀI NHẤT rồi đệm cho mọi hàng bằng nhau, thay vì cắt
 * theo hàng tiêu đề: một ô lỡ chứa dấu `|` chưa thoát sẽ đẻ thêm cột, và cắt đi
 * là mất dữ liệu người dùng cần đọc — thà thừa một cột trống còn hơn nuốt mất
 * một mã việc.
 */
function docBang(dong: string[], dau: number, ra: Khoi[]): number {
  const oTieuDe = tachO(dong[dau]);
  const oNgan = tachO(dong[dau + 1]);
  const hang: string[][] = [];

  let i = dau + 2;
  while (i < dong.length && dong[i].trim() !== '' && dong[i].includes('|')) {
    hang.push(tachO(dong[i]));
    i += 1;
  }

  let soCot = oTieuDe.length;
  for (const h of hang) soCot = Math.max(soCot, h.length);

  const dem = (o: string[]): string[] => {
    const ban = o.slice();
    while (ban.length < soCot) ban.push('');
    return ban;
  };

  const canLe: CanLe[] = [];
  for (let c = 0; c < soCot; c += 1) {
    const dinh = oNgan[c] ?? '';
    const traiCo = dinh.startsWith(':');
    const phaiCo = dinh.endsWith(':');
    canLe.push(traiCo && phaiCo ? 'giua' : phaiCo ? 'phai' : 'trai');
  }

  ra.push({ loai: 'bang', dau: dem(oTieuDe), hang: hang.map(dem), canLe });
  return i;
}

/** Dòng ngăn của bảng: mọi ô chỉ gồm `-`, có thể kèm `:` để căn lề. */
function laHangNgan(d: string): boolean {
  if (!d.includes('|')) return false;
  const o = tachO(d);
  return o.length > 0 && o.every((x) => /^:?-{2,}:?$/.test(x));
}

/**
 * Cắt một dòng bảng thành các ô.
 *
 * Quét từng ký tự chứ không `split('|')` vì hai lý do: `\|` là dấu gạch đứng
 * ĐÃ THOÁT nằm trong nội dung ô, và dấu `|` bên trong `` `mã` `` cũng là nội
 * dung — cả hai mà cắt nhầm thì bảng lệch cột từ đó về cuối.
 */
function tachO(dongBang: string): string[] {
  const o: string[] = [];
  let dem = '';
  let trongMa = false;

  for (let k = 0; k < dongBang.length; k += 1) {
    const c = dongBang[k];
    if (c === '\\' && dongBang[k + 1] === '|') {
      dem += '|';
      k += 1;
      continue;
    }
    if (c === '`') {
      trongMa = !trongMa;
      dem += c;
      continue;
    }
    if (c === '|' && !trongMa) {
      o.push(dem);
      dem = '';
      continue;
    }
    dem += c;
  }
  o.push(dem);

  // `| a | b |` cắt ra hai ô rỗng ở hai đầu — đó là viền bảng, không phải cột.
  if (o.length > 1 && o[0].trim() === '') o.shift();
  if (o.length > 1 && o[o.length - 1].trim() === '') o.pop();

  return o.map((x) => x.trim());
}

/* ----------------------------------------------------------------- dựng --- */

/**
 * Tiêu đề trong một tin nhắn chat.
 *
 * Hạ bậc thẻ xuống `h4`–`h6`: `#` của model là tiêu đề CỦA MỘT CÂU TRẢ LỜI,
 * còn `h1`/`h2` của trang đã thuộc về màn Công việc — dựng đúng bậc model viết
 * là phá dàn ý của cả trang. Cỡ chữ cũng không lấy mặc định của trình duyệt:
 * ngăn kéo chỉ rộng 440px, một `h1` mặc định (32px) chiếm gần hết bề ngang.
 * Ba bậc dưới đây bám thang chữ sẵn có, đủ để mắt thấy phân cấp mà không hét.
 */
function TieuDe({
  bac,
  text,
  onOpenTaskCode,
}: {
  bac: number;
  text: string;
  onOpenTaskCode?: (code: string) => void;
}) {
  const The = bac <= 2 ? 'h4' : bac === 3 ? 'h5' : 'h6';
  const co =
    bac <= 2
      ? 'text-ws-h2 text-ws-ink'
      : bac === 3
        ? 'text-ws-card-title text-ws-ink'
        : 'text-ws-body text-ws-ink-soft';

  return (
    <The
      className={cn(
        'mt-3 font-semibold leading-snug break-words first:mt-0',
        co,
      )}
    >
      <DongChu text={text} onOpenTaskCode={onOpenTaskCode} />
    </The>
  );
}

/**
 * Bảng so sánh.
 *
 * ⚠ Ngăn kéo chỉ 440px mà model hay dựng bảng 4–5 cột, nên bảng PHẢI tự cuộn
 * ngang trong khung riêng (`overflow-x-auto`) — nếu không nó đẩy cả khung chat
 * rộng ra và người dùng phải cuộn ngang toàn trang để đọc một ô.
 *
 * Cặp `w-max min-w-full` là thứ làm việc cuộn đó THẬT SỰ xảy ra: `w-max` cho
 * bảng rộng bằng nội dung (bảng rộng hơn khung ⇒ có thanh cuộn), `min-w-full`
 * kéo bảng ngắn phủ hết bề ngang cho khỏi hụt viền. Còn `max-w-[13rem]` bọc
 * trong từng ô là mức thoả hiệp: không có nó, một ô "tên việc" dài thành một
 * cột 500px và người dùng phải cuộn ngang để đọc một câu — có nó thì câu dài tự
 * xuống dòng, chỉ SỐ CỘT mới đẩy bảng ra ngoài khung.
 */
function Bang({
  dau,
  hang,
  canLe,
  onOpenTaskCode,
}: {
  dau: string[];
  hang: string[][];
  canLe: CanLe[];
  onOpenTaskCode?: (code: string) => void;
}) {
  const lop = (c: CanLe) =>
    c === 'phai' ? 'text-right' : c === 'giua' ? 'text-center' : 'text-left';

  return (
    <div
      className={cn(
        KHE_KHOI,
        'overflow-x-auto rounded-ws-chip border border-ws-line',
      )}
    >
      <table className='w-max min-w-full border-collapse text-ws-cell leading-snug'>
        <thead>
          <tr>
            {dau.map((o, i) => (
              <th
                key={i}
                scope='col'
                className={cn(
                  'border-b border-ws-line px-2 py-1.5 align-bottom font-semibold text-ws-ink',
                  'border-r border-r-ws-line-soft last:border-r-0',
                  lop(canLe[i] ?? 'trai'),
                )}
              >
                <div className='max-w-[13rem]'>
                  <DongChu text={o} onOpenTaskCode={onOpenTaskCode} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hang.map((h, i) => (
            <tr key={i}>
              {h.map((o, j) => (
                <td
                  key={j}
                  className={cn(
                    'px-2 py-1.5 align-top text-ws-ink-soft',
                    i > 0 && 'border-t border-ws-line-soft',
                    'border-r border-r-ws-line-soft last:border-r-0',
                    lop(canLe[j] ?? 'trai'),
                  )}
                >
                  <div className='max-w-[13rem]'>
                    <DongChu text={o} onOpenTaskCode={onOpenTaskCode} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------- nội dòng --- */

/**
 * Nguồn của biểu thức nhận cú pháp nội dòng. Thứ tự các nhánh CHÍNH LÀ độ ưu
 * tiên (regex thử từ trái sang tại mỗi vị trí), nên `**` phải đứng trước `*`,
 * còn mã nội dòng đứng đầu để `` `a * b` `` không hoá chữ nghiêng.
 */
const NGUON_INLINE = [
  '`([^`\\n]+)`', //                                1: `mã nội dòng`
  '\\[([^\\]\\n]*)\\]\\(\\s*([^()\\s]+)\\s*\\)', // 2,3: [chữ](đường-dẫn)
  '\\*\\*([^*]+)\\*\\*', //                         4: **in đậm**
  '\\*([^\\s*](?:[^*\\n]*[^\\s*])?)\\*', //         5: *in nghiêng*
].join('|');

/** Một dòng chữ: cú pháp nội dòng, rồi mã việc trong phần chữ trơn còn lại. */
function DongChu({
  text,
  onOpenTaskCode,
}: {
  text: string;
  onOpenTaskCode?: (code: string) => void;
}) {
  return <>{dungInline(text, onOpenTaskCode, true)}</>;
}

/**
 * Dựng chữ có cú pháp nội dòng thành node React.
 *
 * ⚠ Biểu thức được TẠO MỚI mỗi lần gọi chứ không đặt sẵn ở cấp mô-đun: hàm này
 * tự gọi lại chính nó (chữ trong `**đậm**`, nhãn của liên kết), mà một regex có
 * cờ `g` mang trạng thái `lastIndex` dùng chung — lời gọi lồng trong sẽ nhảy
 * cóc con trỏ của lời gọi ngoài và nuốt mất một quãng chữ giữa câu.
 *
 * `choPhepLienKet` tắt ở lời gọi lồng bên trong nhãn liên kết: `<a>` lồng `<a>`
 * là HTML không hợp lệ, trình duyệt tự gỡ ra theo cách không ai đoán được.
 */
function dungInline(
  text: string,
  onOpenTaskCode: ((code: string) => void) | undefined,
  choPhepLienKet: boolean,
): ReactNode[] {
  const bieuThuc = new RegExp(NGUON_INLINE, 'g');
  const ra: ReactNode[] = [];
  let viTri = 0;
  let khoa = 0;
  let khop: RegExpExecArray | null = null;

  const day = (nut: ReactNode) => {
    ra.push(<Fragment key={khoa}>{nut}</Fragment>);
    khoa += 1;
  };
  const dayChuTron = (chu: string) => {
    if (chu !== '') day(<MaViec text={chu} onOpenTaskCode={onOpenTaskCode} />);
  };

  while ((khop = bieuThuc.exec(text)) !== null) {
    const [tho, ma, nhan, dich, dam, nghieng] = khop;
    dayChuTron(text.slice(viTri, khop.index));
    viTri = khop.index + tho.length;

    if (ma !== undefined) {
      // Trong mã nội dòng KHÔNG dựng chip mã việc: `CV260625010` viết trong
      // dấu nháy ngược là model đang nói về chuỗi ký tự đó, không phải trỏ tới
      // một công việc để bấm mở.
      day(
        <code className='rounded-ws-check bg-ws-surface-sunken px-1 py-[1px] font-mono text-ws-micro text-ws-ink-soft'>
          {ma}
        </code>,
      );
      continue;
    }

    if (dich !== undefined) {
      if (choPhepLienKet && laLienKetAnToan(dich)) {
        day(
          <a
            href={dich}
            target='_blank'
            rel='noopener noreferrer'
            className='text-ws-accent underline decoration-ws-line-strong underline-offset-2 hover:text-ws-accent-hover'
          >
            {dungInline(nhan, onOpenTaskCode, false)}
          </a>,
        );
      } else {
        // Lược đồ lạ (`javascript:`, `data:`) thì hiện NGUYÊN VĂN cả cú pháp
        // Markdown, không bỏ đi: người dùng cần thấy trợ lý vừa đưa ra một
        // đường dẫn lạ, chứ không phải một khoảng trống. Cùng lối xử lý với
        // `urlAnToan` ở `nhan-message-item.tsx`.
        dayChuTron(tho);
      }
      continue;
    }

    if (dam !== undefined) {
      day(
        <strong className='font-semibold text-ws-ink'>
          {dungInline(dam, onOpenTaskCode, choPhepLienKet)}
        </strong>,
      );
      continue;
    }

    if (nghieng !== undefined) {
      day(<em>{dungInline(nghieng, onOpenTaskCode, choPhepLienKet)}</em>);
    }
  }

  dayChuTron(text.slice(viTri));
  return ra;
}

/**
 * Đường dẫn này có an toàn để đưa vào `href` không?
 *
 * ⚠ Chuỗi vào đây do MODEL sinh ra, và model đọc dữ liệu do người ngoài nhập
 * (mô tả việc, bình luận, trang web nó vừa tải) — một `javascript:` lọt qua là
 * chạy mã ngay trong phiên của super admin. Chỉ nhận http/https, và chặn luôn
 * thứ không phân tích nổi. Cùng luật với `urlAnToan` bên `nhan-message-item.tsx`
 * nhưng cố ý để riêng: bên kia lọc nguồn có cấu trúc, bên này lọc chữ trong câu
 * trả lời — gộp lại là buộc hai đường dữ liệu khác nhau vào một chỗ sửa.
 */
function laLienKetAnToan(u: string): boolean {
  try {
    const giaoThuc = new URL(u).protocol;
    return giaoThuc === 'http:' || giaoThuc === 'https:';
  } catch {
    return false;
  }
}

/** Biến mọi `CV260625010` thành chip bấm được. */
function MaViec({
  text,
  onOpenTaskCode,
}: {
  text: string;
  onOpenTaskCode?: (code: string) => void;
}): ReactNode {
  if (!onOpenTaskCode) return text;

  const phan = text.split(MA_VIEC);
  if (phan.length === 1) return text;

  return phan.map((p, i) =>
    // `String.split` với regex có nhóm bắt trả xen kẽ: chỉ số LẺ là phần khớp.
    i % 2 === 1 ? (
      <button
        key={i}
        type='button'
        onClick={() => onOpenTaskCode(p)}
        title={`Mở công việc ${p}`}
        /* Chip phải TRÔNG bấm được, không chỉ bấm được. Bản đầu chỉ đổi màu
           lúc rê chuột, mà rê chuột là thứ chỉ xảy ra SAU khi người ta đã đoán
           là bấm được — chủ dự án đã hỏi "cho phép bấm vào thẻ tag công việc"
           trong khi nó vốn đã bấm được từ đầu. Nên: con trỏ bàn tay, gạch chân
           mờ để mắt bắt được ngay ở trạng thái nghỉ, và vòng tiêu điểm cho bàn
           phím. */
        className='mx-[1px] cursor-pointer rounded-ws-chip bg-ws-surface-sunken px-1 py-[1px] font-mono text-ws-nano font-medium text-ws-ink-soft underline decoration-dotted decoration-from-font underline-offset-2 transition-colors hover:bg-ws-accent-bg hover:text-ws-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent'
      >
        {p}
      </button>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}
