'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ArrowUp, Loader2, Square } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useNhanMentionSearch } from '@/hooks/queries/nhan-vien-nhan-queries';
import type {
  NhanMentionTask,
  NhanMentionUser,
  NhanViecKeoTha,
} from '@/types/nhan-vien-nhan.type';

/** Một mục trong danh sách gợi ý sau dấu `@`, hoặc một lệnh sau dấu `/`. */
type UngVien =
  | {
      kind: 'nguoi';
      id: string;
      nhan: string;
      phu: string;
      anh?: string | null;
      /** Tài khoản đã khoá — hiện ra để giải thích, nhưng KHÔNG chọn được. */
      daKhoa: boolean;
    }
  | { kind: 'viec'; id: string; nhan: string; phu: string }
  | { kind: 'lenh'; id: string; nhan: string; phu: string; ma: MaLenhNhan };

/**
 * Mục này có bấm/chèn được không.
 *
 * Chỉ có ĐÚNG MỘT lý do khiến một mục không chọn được: người đó có tài khoản bị
 * khoá. Dồn phép kiểm vào một hàm thay vì rải `uv.kind === 'nguoi' && uv.daKhoa`
 * ra bốn chỗ (vẽ danh sách, chuột, Enter/Tab, mũi tên) vì bốn chỗ đó PHẢI đồng ý
 * với nhau tuyệt đối: lệch một chỗ là hoặc mục chết vẫn chèn được, hoặc vệt chọn
 * dừng trên một mục mà Enter không làm gì — cả hai đều đọc như "phím Enter
 * hỏng". Khi có thêm lý do thứ hai (người đã nghỉ việc chẳng hạn) thì thêm vào
 * đây, và cả bốn chỗ kia tự đúng theo.
 */
function chonDuoc(uv: UngVien | undefined): boolean {
  if (!uv) return false;
  return uv.kind !== 'nguoi' || !uv.daKhoa;
}

/**
 * Mục chọn được kế tiếp theo chiều `buoc`, vòng vèo qua các mục đã khoá.
 *
 * ⚠ Đây là phần thay cho phép `% ungVien.length` cũ. Không được để con trỏ DỪNG
 * trên một mục không chọn được: người dùng thấy vệt sáng nằm đúng chỗ mình muốn
 * rồi bấm Enter, và không có gì xảy ra — không lỗi, không tiếng động, đúng kiểu
 * im lặng mà cả bản vá này sinh ra để dẹp.
 *
 * `tu < 0` nghĩa là hiện KHÔNG mục nào đang được chọn (cả danh sách đều khoá ở
 * lần đo trước). Lúc đó mũi tên xuống phải rơi vào mục 0 và mũi tên lên vào mục
 * cuối, nên gốc đếm đặt lệch một nhịp cho từng chiều.
 *
 * Duyệt tối đa đúng `n` bước rồi trả `-1`: danh sách toàn người bị khoá là có
 * thật (gõ đúng mã tham chiếu của một người đã khoá thì kết quả duy nhất là
 * người đó), và một vòng lặp không có điểm dừng ở đây sẽ treo cả tab.
 */
function buocToiChonDuoc(ds: UngVien[], tu: number, buoc: 1 | -1): number {
  const n = ds.length;
  if (n === 0) return -1;
  const goc = tu >= 0 ? tu : buoc === 1 ? -1 : 0;
  for (let b = 1; b <= n; b++) {
    const i = (((goc + buoc * b) % n) + n) % n;
    if (chonDuoc(ds[i])) return i;
  }
  return -1;
}

export interface NhanComposerGuiDi {
  noiDung: string;
  mentionedUserIds: string[];
  mentionedTaskIds: string[];
}

/** Mã của một lệnh gõ nhanh — dùng union thay chuỗi trần để khỏi gõ lệch tên. */
export type MaLenhNhan = 'clear' | 'usage' | 'help';

export interface LenhGachCheo {
  ma: MaLenhNhan;
  /** Vừa là chữ hiện trong danh sách, vừa là chữ người dùng gõ ra. */
  nhan: string;
  /** Mô tả một dòng, hiện ngay dưới tên lệnh trong danh sách và trong `/help`. */
  phu: string;
}

/**
 * Ba lệnh gõ nhanh.
 *
 * Phần mô tả phải nói thẳng hai điều người dùng dễ hiểu sai, vì hiểu sai ở đây
 * dẫn tới hai loại hoảng hốt khác nhau: `/clear` KHÔNG xoá dữ liệu (nó chỉ mở
 * một cuộc mới, cuộc cũ vẫn nằm trong Lịch sử), và `/usage` KHÔNG tốn lượt hỏi
 * (nó chỉ đếm trong CSDL, không đánh thức model — nên gõ được cả khi đã hết
 * lượt trong ngày).
 *
 * Xuất khẩu ra ngoài vì `/help` phải liệt kê đúng bộ mô tả này; hai bản chép
 * tay là hai bản sẽ lệch nhau ở lần sửa chữ thứ nhất.
 */
export const LENH_GACH_CHEO: readonly LenhGachCheo[] = [
  {
    ma: 'clear',
    nhan: '/clear',
    phu: 'Mở cuộc trò chuyện mới. Không xoá gì cả — cuộc cũ vẫn nằm nguyên trong Lịch sử.',
  },
  {
    ma: 'usage',
    nhan: '/usage',
    phu: 'Xem số lượt đã hỏi và chi phí ước tính hôm nay. Chỉ tra số liệu, KHÔNG tốn lượt hỏi nào.',
  },
  {
    ma: 'help',
    nhan: '/help',
    phu: 'Liệt kê các lệnh gõ nhanh.',
  },
];

/**
 * Ô soạn có đang ở trong ngữ cảnh LỆNH không, và người dùng đã gõ tới đâu.
 *
 * Điều kiện cố ý hẹp hơn hẳn dấu `@`: gạch chéo phải là ký tự ĐẦU TIÊN của cả ô
 * soạn, và từ đó tới con trỏ không được có khoảng trắng. Nới ra thành "đứng đầu
 * dòng hoặc sau khoảng trắng" như `@` thì mọi câu hỏi bình thường có gạch chéo
 * giữa chừng — "báo cáo quý 3/2026", "kho A/B", một đường dẫn tệp — đều bật
 * danh sách lệnh ngay giữa lúc đang gõ.
 *
 * Trả `null` = không ở trong ngữ cảnh lệnh; chuỗi rỗng = vừa gõ đúng dấu `/`.
 */
function nguCanhLenh(truocConTro: string): string | null {
  const khop = /^\/(\S{0,20})$/.exec(truocConTro);
  return khop ? khop[1] : null;
}

/**
 * `@Tên` này còn nguyên trong ô hay đã bị người dùng xoá/sửa?
 *
 * `giaTri.includes('@' + ten)` KHÔNG đủ: khi một tên là tiền tố của tên kia —
 * "An" và "Anh Tuấn" — thì một ô chỉ còn "@Anh Tuấn" vẫn khớp chuỗi "@An", và
 * phần nhắc của người tên An bị gửi kèm dù người dùng đã xoá nó. Nhắc nhầm
 * người ở đây kéo theo cả một thư hay một lượt giao việc sai địa chỉ, nên phải
 * đòi ranh giới: ngay sau tên phải là hết chuỗi hoặc một ký tự KHÔNG phải chữ
 * hay số.
 *
 * Nhận diện "chữ" bằng `toLowerCase() !== toUpperCase()` chứ không bằng
 * `\p{L}`: `target` của kho này thấp hơn ES6 nên cờ regex `u` không biên dịch
 * được, mà `[a-z]` thì trượt hết chữ tiếng Việt có dấu. Phép so hai cách viết
 * hoa/thường đúng cho mọi chữ có phân biệt hoa–thường, kể cả `ế`, `ạ`, `Đ`.
 */
function conTrongO(o: string, ten: string): boolean {
  const can = `@${ten}`;
  let tu = 0;
  for (;;) {
    const i = o.indexOf(can, tu);
    if (i === -1) return false;
    const sau = o.charAt(i + can.length);
    const laChuHoacSo =
      sau !== '' && (sau.toLowerCase() !== sau.toUpperCase() || /[0-9]/.test(sau));
    if (!laChuHoacSo) return true;
    tu = i + 1;
  }
}

/**
 * Gộp phần đã chọn của lượt gửi HỎNG vào phần người dùng đang chọn dở.
 *
 * Không thay nguyên bản đồ: lượt gửi có thể hỏng sau nhiều giây, và trong lúc
 * đó người dùng đã kịp gõ câu mới cùng chọn thêm người/việc. Đặt đè bản đồ cũ
 * lên là xoá sạch những lựa chọn vừa chọn — đúng cái lỗi mà phép khôi phục này
 * định tránh, chỉ là ngược chiều.
 *
 * Bỏ qua mục cũ nào có TÊN đã bị một id khác chiếm: hai người trùng tên mà giữ
 * cả hai id thì `conTrongO` bên dưới cho cả hai đi qua, và câu hỏi nhắc nhầm
 * thêm một người không liên quan. Ở đây người đang đứng trong ô soạn thắng.
 *
 * Duyệt bằng `forEach` chứ không `for...of`/spread: tsconfig của kho này chưa
 * bật `downlevelIteration`.
 */
function gopDaChon(
  dangCo: Map<string, string>,
  cu: Map<string, string>,
): Map<string, string> {
  const tenDangCo = new Set<string>();
  dangCo.forEach((ten) => tenDangCo.add(ten));
  const gop = new Map(dangCo);
  cu.forEach((ten, id) => {
    if (gop.has(id) || tenDangCo.has(ten)) return;
    gop.set(id, ten);
  });
  return gop;
}

/**
 * Ô soạn của khung chat: gợi ý `@` cho CẢ người lẫn công việc, và danh sách
 * lệnh gõ nhanh sau dấu `/` ở đầu ô.
 *
 * Hai danh sách dùng CHUNG một khuôn hiển thị và chung một bộ phím (mũi tên,
 * Enter/Tab chọn, Esc đóng) — cố ý như vậy: bắt người dùng học hai cách điều
 * khiển cho hai danh sách trông giống hệt nhau là cách chắc chắn để họ dùng sai
 * cả hai. Chỗ khác nhau duy nhất nằm ở việc CHỌN: chọn một người/việc thì chèn
 * chữ vào ô, còn chọn một lệnh thì chạy luôn và xoá ô.
 *
 * Vì sao không tái dùng `MentionTextarea` sẵn có: component đó nhận một mảng
 * `candidates` TĨNH và lọc phía trình duyệt theo `fullName`. Ở đây phạm vi là
 * toàn hệ thống (không giới hạn trong người tham gia một việc) nên phải tìm
 * phía máy chủ, và có hai LOẠI thực thể — ép công việc vào khuôn
 * `{id, fullName, avatarUrl}` thì ô nhập sẽ chèn ra chuỗi kiểu
 * "@CV260625010 — Tuyển dụng DEV" và phần hiển thị avatar thành vô nghĩa. Ở đây
 * giữ nguyên cách tương tác của component kia (portal, mũi tên, Enter/Tab/Esc)
 * để hai ô soạn trong cùng màn không dạy người dùng hai bộ phím khác nhau.
 */
export function NhanComposer({
  onGui,
  onDung,
  onLenh,
  viecKeoVao,
  onDaChenViecKeo,
  dangChay,
  dangLuu,
  disabled,
}: {
  /**
   * Trả Promise để ô soạn chỉ xoá chữ SAU khi gửi thành công.
   * ⚠ Hàm này PHẢI ném khi lượt gửi hỏng — đó là tín hiệu duy nhất để trả chữ
   * người dùng vừa gõ về chỗ cũ. Trả về được thì phải là gửi được thật: ô soạn
   * chỉ điền lại chữ cũ khi ô còn TRỐNG, nên một lần ném muộn và sai không làm
   * mất chữ, nhưng một lần nuốt lỗi thì mất hẳn.
   */
  onGui: (v: NhanComposerGuiDi) => Promise<void>;
  onDung: () => void;
  /**
   * Chạy một lệnh gõ nhanh. Ô soạn KHÔNG tự làm gì cả — nó chỉ nhận diện lệnh
   * rồi chuyển lên trên, vì cả ba lệnh đều đụng tới thứ nằm ngoài nó (hội thoại
   * đang mở, danh sách bong bóng của khung chat).
   */
  onLenh: (ma: MaLenhNhan) => void;
  /**
   * Việc vừa được KÉO THẢ từ bảng vào khung chat, chờ chèn vào ô soạn.
   *
   * Đi vào bằng prop chứ không bằng một tay cầm mệnh lệnh (`useImperativeHandle`)
   * để luồng dữ liệu chỉ có một chiều: trang giữ "việc vừa thả", ô soạn thấy nó
   * đổi thì chèn, rồi gọi `onDaChenViecKeo` để trang xoá đi. Mỗi lần thả là một
   * ĐỐI TƯỢNG MỚI nên thả hai lần cùng một việc vẫn chèn được hai lần.
   */
  viecKeoVao?: NhanViecKeoTha | null;
  /**
   * Báo đã chèn xong để trang trả `viecKeoVao` về `null`.
   *
   * ⚠ Bắt buộc phải xoá: ô soạn bị gỡ và dựng lại khi vượt mốc 1024px (khung
   * chat đổi giữa cột và toàn màn), và lúc dựng lại hiệu ứng chèn chạy lần nữa
   * — còn sót giá trị cũ là chèn lặp một phần nhắc mà người dùng không hề kéo
   * lại. Hàm này phải ỔN ĐỊNH giữa các lần kết xuất, nếu không hiệu ứng chạy lại
   * mỗi lần trang vẽ.
   */
  onDaChenViecKeo?: () => void;
  dangChay: boolean;
  /**
   * Đã bấm Dừng nhưng máy chủ còn ghi nốt lượt cũ. Ô soạn vẫn khoá (nếu không
   * hai lượt cùng ghi vào một hội thoại), và nút Dừng đổi thành chỉ báo chờ —
   * bấm thêm lần nữa không có gì để dừng.
   */
  dangLuu?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [giaTri, setGiaTri] = useState('');
  const [truyVan, setTruyVan] = useState<string | null>(null);
  /**
   * Phần đã gõ sau dấu `/` ở đầu ô soạn; `null` = không ở trong ngữ cảnh lệnh.
   *
   * Là một ô nhớ RIÊNG, không gộp vào `truyVan`: hai danh sách dùng chung khuôn
   * hiển thị và chung bộ phím, nhưng nguồn dữ liệu khác hẳn nhau (một cái hỏi
   * máy chủ, một cái lọc tại chỗ) và điều kiện mở cũng khác hẳn. Gộp thành một
   * ô nhớ kèm một cờ "loại" thì mọi chỗ đọc nó đều phải nhớ kiểm cờ trước — quên
   * một chỗ là gõ `/` xong bắn một truy vấn tìm người tên "/".
   */
  const [truyVanLenh, setTruyVanLenh] = useState<string | null>(null);
  const [neo, setNeo] = useState(0);
  const [dangChon, setDangChon] = useState(0);
  const [oNhap, setONhap] = useState<DOMRect | null>(null);

  /**
   * Id đã chọn qua dropdown — nguồn sự thật DUY NHẤT của phần nhắc. Không bao
   * giờ suy id từ chữ trong ô: người dùng có thể sửa tay tên đã chèn, và một
   * cái tên bị gõ lệch một chữ mà vẫn giao việc cho người đó là lỗi tệ hơn
   * nhiều so với việc mất phần nhắc.
   */
  const [nguoiDaChon, setNguoiDaChon] = useState<Map<string, string>>(new Map());
  const [viecDaChon, setViecDaChon] = useState<Map<string, string>>(new Map());

  const { data: goiY } = useNhanMentionSearch(truyVan ?? '');

  /**
   * Danh sách đang hiện: LỆNH hoặc gợi ý nhắc tên — không bao giờ cả hai.
   *
   * Hai ngữ cảnh đã loại trừ nhau ngay từ khâu nhận diện (dấu `/` phải nằm ở vị
   * trí 0 và không có khoảng trắng, nên không chuỗi nào vừa mở được lệnh vừa mở
   * được gợi ý `@`), nhưng vẫn ưu tiên lệnh một cách tường minh ở đây để người
   * đọc mã sau này khỏi phải tự chứng minh lại điều đó.
   */
  const ungVien: UngVien[] =
    truyVanLenh !== null
      ? LENH_GACH_CHEO.filter((l) =>
          // So phần sau dấu `/`: người dùng gõ "/us" thì "usage" phải khớp.
          l.nhan.slice(1).toLowerCase().startsWith(truyVanLenh.toLowerCase()),
        ).map((l) => ({
          kind: 'lenh' as const,
          id: l.ma,
          nhan: l.nhan,
          phu: l.phu,
          ma: l.ma,
        }))
      : [
          ...((goiY?.users ?? []) as NhanMentionUser[]).map((u) => ({
            kind: 'nguoi' as const,
            id: u.id,
            nhan: u.fullName,
            phu: u.referenceId,
            anh: u.avatarUrl,
            // Máy chủ đã xếp người còn hoạt động lên trước, nên các mục khoá
            // luôn nằm ở ĐUÔI danh sách — không nằm lẫn giữa chừng.
            daKhoa: u.daKhoa,
          })),
          ...((goiY?.tasks ?? []) as NhanMentionTask[]).map((t) => ({
            kind: 'viec' as const,
            id: t.id,
            nhan: t.code ?? t.title,
            phu: t.code ? t.title : 'Chưa có mã',
          })),
        ];

  /**
   * Mục chọn được ĐẦU TIÊN, hoặc `-1` khi cả danh sách đều không chọn được.
   *
   * `-1` là một trạng thái THẬT chứ không phải lỗi: gõ đúng mã tham chiếu của
   * một người đã bị khoá thì kết quả duy nhất trả về là chính người đó. Lúc ấy
   * `dangChon` cũng phải là `-1` để KHÔNG có vệt sáng nào — vẽ vệt sáng lên một
   * mục không bấm được là mời người dùng bấm Enter vào chỗ trống.
   */
  const dauChonDuoc = ungVien.findIndex((uv) => chonDuoc(uv));

  /**
   * "Vân tay" khả-chọn của danh sách hiện tại — chuỗi `0`/`1` theo từng mục.
   *
   * Cần một giá trị NGUYÊN THUỶ để làm phụ thuộc của hiệu ứng kẹp bên dưới:
   * `ungVien` là mảng dựng mới ở mỗi lần kết xuất nên đặt thẳng nó vào mảng phụ
   * thuộc là hiệu ứng chạy vô hạn. Chỉ `ungVien.length` thì chưa đủ nữa: bây giờ
   * một danh sách CÙNG ĐỘ DÀI vẫn có thể đổi từ "mục 0 chọn được" sang "mục 0 đã
   * khoá", và vệt chọn phải dời theo.
   */
  const vanTayChonDuoc = ungVien
    .map((uv) => (chonDuoc(uv) ? '1' : '0'))
    .join('');

  /**
   * Đọc `dauChonDuoc` MỚI NHẤT từ trong một hiệu ứng không nhận nó làm phụ
   * thuộc. Đặt nó vào mảng phụ thuộc của hiệu ứng "từ khoá đổi" ngay bên dưới sẽ
   * kéo vệt chọn về đầu mỗi lần DỮ LIỆU về, tức ngay giữa lúc người dùng đang
   * bấm mũi tên — đúng thứ mà chú thích của hiệu ứng kẹp cấm.
   */
  const dauChonDuocRef = useRef(dauChonDuoc);
  dauChonDuocRef.current = dauChonDuoc;

  /**
   * Từ khoá đổi ⇒ về đầu danh sách. "Đầu" ở đây là mục CHỌN ĐƯỢC đầu tiên chứ
   * không còn là chỉ số 0: mục 0 có thể là một tài khoản đã khoá (khi cả danh
   * sách chỉ toàn người bị khoá), và dừng ở đó là một mục chết ngay từ nhịp đầu.
   */
  useEffect(() => {
    setDangChon(dauChonDuocRef.current);
  }, [truyVan, truyVanLenh]);

  /**
   * Kẹp chỉ số đang chọn vào trong biên khi danh sách CO LẠI — và dời nó đi khi
   * mục đang chọn trở thành một mục KHÔNG chọn được.
   *
   * ⚠ Danh sách đổi ĐỘC LẬP với từ khoá: truy vấn giữ `placeholderData` bản cũ
   * để khỏi nhấp nháy, nên có một nhịp mà `truyVan` chưa đổi (hiệu ứng trên
   * không chạy) trong khi dữ liệu đã thay bằng bộ ngắn hơn. Người dùng vừa mũi
   * tên xuống mục thứ 6 rồi danh sách rút còn 2 mục thì `ungVien[5]` là
   * `undefined` — mà `preventDefault()` đã chạy trước đó, nên phím Enter vừa
   * không chèn được vừa không gửi được: ô soạn "chết" cho tới khi bấm Esc.
   * Chỉ kẹp khi tràn hoặc khi mục đó đã khoá, KHÔNG đặt về đầu mỗi lần dữ liệu
   * về, nếu không vệt chọn nhảy về đầu ngay giữa lúc người dùng đang bấm mũi tên.
   */
  useEffect(() => {
    setDangChon((i) =>
      i >= 0 && i < ungVien.length && chonDuoc(ungVien[i]) ? i : dauChonDuoc,
    );
  }, [ungVien.length, vanTayChonDuoc, dauChonDuoc]);

  /**
   * Danh sách gợi ý vẽ qua portal ở toạ độ `fixed`, nên nó KHÔNG tự đi theo ô
   * nhập khi trang cuộn hay cửa sổ đổi cỡ — nó sẽ đứng lơ lửng giữa màn hình.
   * Đo lại ở mỗi lần cuộn/đổi cỡ trong lúc còn mở. `capture: true` để bắt được
   * cả cuộn ở khung con (panel này nằm trong một vùng cuộn riêng).
   */
  useEffect(() => {
    if (truyVan === null && truyVanLenh === null) return;
    const doLai = () => {
      const el = ref.current;
      if (el) setONhap(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', doLai, true);
    window.addEventListener('resize', doLai);
    return () => {
      window.removeEventListener('scroll', doLai, true);
      window.removeEventListener('resize', doLai);
    };
  }, [truyVan, truyVanLenh]);

  // Ô nhập tự cao theo nội dung, trần 160px rồi mới cuộn.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [giaTri]);

  const capNhat = useCallback((v: string) => {
    setGiaTri(v);
    const el = ref.current;
    const vitri = el?.selectionStart ?? v.length;
    const truoc = v.slice(0, vitri);

    // Lệnh xét TRƯỚC và đóng hẳn gợi ý `@`: chỉ một danh sách được mở tại một
    // thời điểm, nếu không hai bộ ứng viên cùng tranh phím mũi tên.
    const qLenh = nguCanhLenh(truoc);
    if (qLenh !== null) {
      setTruyVanLenh(qLenh);
      setTruyVan(null);
      if (el) setONhap(el.getBoundingClientRect());
      return;
    }
    setTruyVanLenh(null);

    // `@` chỉ mở gợi ý khi đứng đầu dòng hoặc sau khoảng trắng — nếu không thì
    // mọi địa chỉ email gõ vào đều bật dropdown.
    const khop = /(?:^|\s)@([^\s@]{0,40})$/.exec(truoc);
    if (khop) {
      setTruyVan(khop[1]);
      setNeo(vitri - khop[1].length - 1);
      if (el) setONhap(el.getBoundingClientRect());
    } else {
      setTruyVan(null);
    }
  }, []);

  /**
   * Chèn phần nhắc của một việc vừa được KÉO THẢ vào khung chat.
   *
   * Nối vào ĐUÔI chứ không chèn tại con trỏ: lúc thả, tiêu điểm đang ở trên
   * bảng chứ không ở trong ô soạn, nên `selectionStart` là vị trí cũ từ lần gõ
   * trước — chèn vào đó sẽ cắt ngang giữa câu người dùng đang soạn dở. Đuôi là
   * chỗ duy nhất đoán được đúng ý.
   *
   * Ghi vào `viecDaChon` y như khi chọn từ danh sách `@`, nên phần nhắc đi kèm
   * lượt gửi qua đúng đường cũ (`mentionedTaskIds`) và cũng tự biến mất nếu
   * người dùng xoá chữ `@Mã` khỏi ô — không có nhánh xử lý thứ hai nào cả.
   */
  useEffect(() => {
    if (!viecKeoVao) return;
    const { id, nhan } = viecKeoVao;
    setGiaTri((v) => {
      const can = v === '' || /\s$/.test(v) ? v : `${v} `;
      return `${can}@${nhan} `;
    });
    setViecDaChon((m) => new Map(m).set(id, nhan));
    setTruyVan(null);
    setTruyVanLenh(null);
    // Trả tiêu điểm về ô soạn và đặt con trỏ ở cuối: người dùng vừa buông chuột
    // trên bảng, và việc kế tiếp của họ là gõ câu hỏi chứ không phải bấm lại
    // vào ô. Ở frame kế để React kịp vẽ chuỗi mới vào DOM.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    onDaChenViecKeo?.();
  }, [viecKeoVao, onDaChenViecKeo]);

  const chen = useCallback(
    (uv: UngVien) => {
      /**
       * Chốt chặn cuối cho mục KHÔNG chọn được.
       *
       * Ba đường vào (`onMouseDown`, Enter, Tab) đều đã tự kiểm, nên nhánh này
       * lẽ ra không bao giờ chạy. Nó vẫn ở đây vì hậu quả của một lần lọt là
       * loại nặng nhất mà cả tính năng này sinh ra để tránh: phần nhắc đi kèm
       * lượt gửi, trợ lý soạn một đề xuất giao việc cho một tài khoản không đăng
       * nhập được, người dùng bấm Xác nhận, và công việc rơi vào hư không —
       * không lỗi, không cảnh báo, đúng kiểu "ghi đúng nhưng không ai nhìn
       * thấy". Một dòng `return` rẻ hơn nhiều so với việc tin rằng cả ba đường
       * kia sẽ không bao giờ được sửa lệch nhau.
       */
      if (!chonDuoc(uv)) return;

      /**
       * Lệnh CHẠY NGAY, không chèn chữ vào ô soạn.
       *
       * Cách kia (chèn `/usage ` rồi bắt người dùng bấm Enter thêm lần nữa) chỉ
       * thêm một bước mà không thêm thông tin gì: danh sách đã hiện đúng lệnh
       * đang chọn kèm mô tả, nên lần Enter thứ hai không phải một lần xác nhận,
       * chỉ là một lần gõ thừa. Xoá ô soạn để phần lệnh không sót lại rồi bị gửi
       * lên model như một câu hỏi ở lượt sau.
       */
      if (uv.kind === 'lenh') {
        setGiaTri('');
        setTruyVan(null);
        setTruyVanLenh(null);
        requestAnimationFrame(() => ref.current?.focus());
        onLenh(uv.ma);
        return;
      }

      const el = ref.current;
      const vitri = el?.selectionStart ?? giaTri.length;
      const moi = `${giaTri.slice(0, neo)}@${uv.nhan} ${giaTri.slice(vitri)}`;
      setGiaTri(moi);
      setTruyVan(null);
      if (uv.kind === 'nguoi') {
        setNguoiDaChon((m) => new Map(m).set(uv.id, uv.nhan));
      } else {
        setViecDaChon((m) => new Map(m).set(uv.id, uv.nhan));
      }
      // Trả con trỏ về ngay sau phần vừa chèn, ở frame kế để React kịp vẽ.
      requestAnimationFrame(() => {
        const v = neo + uv.nhan.length + 2;
        el?.focus();
        el?.setSelectionRange(v, v);
      });
    },
    [giaTri, neo, onLenh],
  );

  const gui = async () => {
    const noiDung = giaTri.trim();
    if (noiDung === '' || dangChay || disabled) return;

    /**
     * Lưới chắn cuối: ô soạn chỉ chứa đúng một lệnh thì CHẠY lệnh, đừng gửi.
     *
     * Đường đi lọt vào đây: người dùng gõ trọn `/usage` rồi thêm một dấu cách
     * (danh sách đóng lại vì ngữ cảnh lệnh đòi không có khoảng trắng), hoặc dán
     * nguyên chữ `/help` từ chỗ khác vào rồi bấm Enter. Không có nhánh này thì
     * chuỗi đó bay lên model như một câu hỏi thật: vừa tốn một lượt, vừa nhận về
     * một câu trả lời ngơ ngác cho thứ người dùng tưởng là lệnh của hệ thống.
     */
    const lenh = LENH_GACH_CHEO.find((l) => l.nhan === noiDung.toLowerCase());
    if (lenh) {
      setGiaTri('');
      setTruyVan(null);
      setTruyVanLenh(null);
      onLenh(lenh.ma);
      return;
    }

    // Chụp lại để khôi phục nếu gửi hỏng — mất một câu vừa gõ dài là thứ người
    // dùng không tha thứ, và đúng lúc mạng chập là lúc dễ xảy ra nhất.
    // ⚠ "Khôi phục" ở đây là ĐIỀN VÀO CHỖ TRỐNG, không phải đặt đè: xem nhánh
    // `catch` bên dưới.
    const chuCu = giaTri;
    const nguoiCu = nguoiDaChon;
    const viecCu = viecDaChon;
    const daGui = {
      noiDung,
      // Chỉ gửi id mà chuỗi tương ứng CÒN trong ô: người dùng xoá "@Mai Thy"
      // đi thì phần nhắc đó phải biến mất theo, không được gửi lén.
      // `Array.from` chứ không spread: tsconfig của kho này chưa bật
      // `downlevelIteration`, nên `[...map]` là lỗi biên dịch.
      mentionedUserIds: Array.from(nguoiDaChon)
        .filter(([, ten]) => conTrongO(giaTri, ten))
        .map(([id]) => id),
      mentionedTaskIds: Array.from(viecDaChon)
        .filter(([, ten]) => conTrongO(giaTri, ten))
        .map(([id]) => id),
    };

    // Xoá lạc quan để ô nhập phản hồi tức thì, rồi trả lại nguyên trạng nếu
    // lượt gửi ném lỗi.
    setGiaTri('');
    setNguoiDaChon(new Map());
    setViecDaChon(new Map());
    setTruyVan(null);
    try {
      await onGui(daGui);
    } catch {
      /**
       * ⚠ Chỉ trả chữ cũ về khi ô soạn VẪN ĐANG TRỐNG.
       *
       * Một lượt gửi có thể hỏng sau nhiều giây (mạng chập, máy chủ 409), mà
       * người dùng thì đã gõ câu tiếp theo ngay sau khi ô nhập trống. Đặt đè
       * `setGiaTri(chuCu)` lúc đó là xoá trắng câu họ vừa gõ — cùng một mất mát
       * với thứ phép khôi phục này sinh ra để tránh, chỉ đổi chiều nạn nhân.
       *
       * Dùng dạng hàm chứ không so `giaTri` của closure: `giaTri` ở đây là giá
       * trị tại lần kết xuất đã gọi `gui`, tức luôn là chữ CŨ. Hơn nữa lệnh
       * `setGiaTri('')` phía trên có thể chưa kịp đi qua một vòng kết xuất khi
       * `onGui` ném ngay lập tức, nên đọc ô nhập từ DOM cũng sai nốt. Chỉ dạng
       * hàm mới thấy đúng giá trị tại lúc áp dụng, theo đúng thứ tự xếp hàng.
       */
      setGiaTri((v) => (v === '' ? chuCu : v));
      setNguoiDaChon((m) => gopDaChon(m, nguoiCu));
      setViecDaChon((m) => gopDaChon(m, viecCu));
    }
  };

  const onPhim = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cùng MỘT nhánh phím cho cả hai danh sách (nhắc tên và lệnh): người dùng
    // chỉ phải học một bộ phím, và mọi sửa chữa về sau chỉ có một chỗ để sai.
    if ((truyVan !== null || truyVanLenh !== null) && ungVien.length > 0) {
      // Mũi tên ĐI QUA mục đã khoá chứ không dừng lại — xem `buocToiChonDuoc`.
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDangChon((i) => buocToiChonDuoc(ungVien, i, 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDangChon((i) => buocToiChonDuoc(ungVien, i, -1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        // Kẹp lại một lần nữa ngay tại chỗ dùng: hiệu ứng kẹp ở trên chạy SAU
        // khi kết xuất, nên vẫn có đúng một nhịp mà `dangChon` còn trỏ ra ngoài
        // biên. Ném ở đây là hỏng cả phím Enter lẫn phép chèn.
        const chon =
          dangChon >= 0 && dangChon < ungVien.length
            ? ungVien[dangChon]
            : undefined;
        if (chonDuoc(chon) && chon) {
          e.preventDefault();
          chen(chon);
          return;
        }
        /**
         * ⚠ KHÔNG `preventDefault()` khi không có gì chọn được, và KHÔNG `return`
         * — cố ý rơi xuống nhánh "Enter gửi" bên dưới.
         *
         * Đường vào duy nhất: cả danh sách chỉ toàn tài khoản đã khoá (gõ đúng
         * mã tham chiếu của một người đã bị khoá thì họ là kết quả duy nhất).
         * Chặn phím ở đây là dựng lại đúng cái bẫy mà hiệu ứng kẹp phía trên vừa
         * gỡ: ô soạn nuốt Enter, không chèn được mà cũng không gửi được, và người
         * dùng phải tự đoán ra là phải bấm Esc. Để phím đi tiếp thì tệ nhất cũng
         * chỉ là câu hỏi được gửi lên nguyên văn — trợ lý sẽ hỏi lại, đó là hành
         * vi đúng.
         */
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setTruyVan(null);
        setTruyVanLenh(null);
        return;
      }
    }
    // Enter gửi, Shift+Enter xuống dòng — cùng quy ước với ô bình luận việc.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void gui();
    }
  };

  const moGoiY =
    (truyVan !== null || truyVanLenh !== null) &&
    ungVien.length > 0 &&
    oNhap !== null;

  return (
    <div className='shrink-0 border-t border-ws-line bg-ws-surface p-2.5'>
      <div className='flex items-end gap-2 rounded-ws-control border border-ws-line-strong bg-ws-surface px-2.5 py-1.5 focus-within:border-ws-focus'>
        <textarea
          ref={ref}
          rows={1}
          value={giaTri}
          disabled={disabled}
          onChange={(e) => capNhat(e.target.value)}
          onKeyDown={onPhim}
          // Rời tiêu điểm thì đóng gợi ý. An toàn vì mục trong danh sách chọn
          // bằng `onMouseDown` + `preventDefault`, tức chưa kịp mất tiêu điểm.
          onBlur={() => {
            setTruyVan(null);
            setTruyVanLenh(null);
          }}
          /**
           * ⚠ Con trỏ dời chỗ mà KHÔNG có sự kiện nhập (bấm chuột vào giữa
           * dòng, mũi tên trái/phải, Home/End) thì `neo` — vị trí dấu `@`, chỉ
           * được tính trong `capNhat` — trở nên lỗi thời. Chèn lúc đó sẽ cắt
           * chuỗi ở đúng chỗ cũ và làm hỏng câu người dùng đang gõ. `onSelect`
           * bắt mọi lần con trỏ đổi vị trí; tính lại ngữ cảnh `@`, không còn ở
           * trong đó thì đóng hẳn.
           */
          onSelect={() => {
            const el = ref.current;
            if (!el) return;
            const truoc = el.value.slice(0, el.selectionStart ?? 0);

            // Danh sách LỆNH cũng phải theo con trỏ: bấm chuột ra giữa câu khi
            // đang mở danh sách lệnh mà không đóng thì Enter sẽ chạy một lệnh
            // người dùng không còn nhìn thấy ngữ cảnh của nó.
            if (truyVanLenh !== null) {
              setTruyVanLenh(nguCanhLenh(truoc));
              return;
            }

            if (truyVan === null) return;
            const khop = /(?:^|\s)@([^\s@]{0,40})$/.exec(truoc);
            if (!khop) {
              setTruyVan(null);
              return;
            }
            setTruyVan(khop[1]);
            setNeo((el.selectionStart ?? 0) - khop[1].length - 1);
          }}
          placeholder='Hỏi Nhân viên Nhàn… gõ @ để nhắc người/việc, gõ / để xem lệnh'
          className='ws-scroll max-h-[160px] min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-ws-body leading-relaxed text-ws-ink outline-none placeholder:text-ws-ink-ghost disabled:opacity-60'
        />
        {dangChay ? (
          <button
            type='button'
            onClick={onDung}
            disabled={dangLuu}
            title={dangLuu ? 'Đang lưu câu trả lời' : 'Dừng'}
            aria-label={
              dangLuu ? 'Đang lưu câu trả lời' : 'Dừng trả lời'
            }
            className='mb-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-ws-check bg-ws-surface-sunken text-ws-ink-soft transition-colors hover:bg-ws-line-soft disabled:cursor-default disabled:hover:bg-ws-surface-sunken'
          >
            {dangLuu ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Square className='h-3 w-3 fill-current' />
            )}
          </button>
        ) : (
          <button
            type='button'
            onClick={() => void gui()}
            disabled={giaTri.trim() === '' || disabled}
            title='Gửi'
            aria-label='Gửi câu hỏi'
            className='mb-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-ws-check bg-ws-solid text-ws-solid-ink transition-opacity hover:opacity-90 disabled:opacity-25'
          >
            <ArrowUp className='h-3.5 w-3.5' />
          </button>
        )}
      </div>

      {moGoiY &&
        createPortal(
          // `ws-scope` phải đặt lại ở đây: portal vẽ ra thẳng `document.body`,
          // ngoài phạm vi lớp bọc, nên không có nó thì dropdown mang bảng màu cũ.
          <ul
            className='ws-scope ws-scroll fixed z-[100] max-h-[240px] overflow-y-auto rounded-ws-block border border-ws-line bg-ws-surface py-1 shadow-ws-lifted'
            style={{
              left: oNhap.left,
              width: oNhap.width,
              // Mở LÊN TRÊN ô nhập: ô nhập nằm sát đáy panel nên mở xuống là ra
              // ngoài màn hình.
              bottom: window.innerHeight - oNhap.top + 6,
            }}
          >
            {/* Cả danh sách không có gì chọn được ⇒ nói thẳng vì sao. Không có
                dòng này thì màn hình chỉ còn vài cái tên mờ mà bấm không ăn,
                đọc y hệt một danh sách hỏng — mà đây lại đúng là cảnh mà bản vá
                này sinh ra để phục vụ: người dùng gõ đúng mã tham chiếu của một
                người CÓ THẬT nhưng đã bị khoá. */}
            {dauChonDuoc === -1 && (
              <li className='px-2.5 py-1.5 text-ws-nano leading-snug text-ws-ink-ghost'>
                Chỉ tìm thấy tài khoản đã khoá. Tài khoản đã khoá không đăng nhập
                được nên không nhận việc được — hãy mở khoá tài khoản đó, hoặc
                chọn người khác.
              </li>
            )}
            {ungVien.map((uv, i) => {
              const duocChon = chonDuoc(uv);
              return (
                <li key={`${uv.kind}-${uv.id}`}>
                  <button
                    type='button'
                    /**
                     * ⚠ KHÔNG dùng thuộc tính `disabled` cho mục đã khoá.
                     *
                     * Trình duyệt không phát sự kiện chuột trên một nút `disabled`,
                     * nên cú `mousedown` rơi thẳng xuống nền — textarea mất tiêu
                     * điểm, `onBlur` đóng luôn cả danh sách, và người dùng vừa bấm
                     * vào một cái tên thì thấy mọi thứ biến mất mà không có lời
                     * giải thích nào. Giữ nút "sống" rồi `preventDefault()` để tiêu
                     * điểm ở nguyên trong ô soạn: bấm vào mục khoá thì KHÔNG có gì
                     * xảy ra, và cái nhãn nói vì sao vẫn còn đó cho họ đọc.
                     *
                     * `aria-disabled` để trình đọc màn hình vẫn nghe được là mục
                     * này không chọn được, dù DOM không có `disabled`.
                     */
                    aria-disabled={!duocChon}
                    // `onMouseDown` chứ không `onClick`: click làm textarea mất
                    // focus trước, con trỏ nhảy và phần chèn rơi sai vị trí.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      chen(uv);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors',
                      duocChon
                        ? i === dangChon
                          ? 'bg-ws-surface-alt'
                          : 'hover:bg-ws-surface-alt'
                        : // Mờ + con trỏ mặc định: hai tín hiệu "không bấm được"
                          // đọc được ngay trước cả khi kịp đọc cái nhãn.
                          'cursor-default opacity-50',
                    )}
                  >
                    {uv.kind === 'nguoi' ? (
                      uv.anh ? (
                        <Image
                          src={uv.anh}
                          alt=''
                          width={20}
                          height={20}
                          className='h-5 w-5 shrink-0 rounded-full object-cover'
                        />
                      ) : (
                        <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ws-ava-a-bg text-ws-nano font-semibold text-ws-ava-a-fg'>
                          {uv.nhan.charAt(0).toUpperCase()}
                        </span>
                      )
                    ) : (
                      /* Huy hiệu hai chữ, cùng khuôn cho cả việc lẫn lệnh — mắt
                         phân biệt bằng chữ trong huy hiệu chứ không phải bằng một
                         hình dạng thứ ba. `/` cho lệnh trùng đúng ký tự vừa gõ. */
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-ws-check text-ws-nano',
                          uv.kind === 'lenh'
                            ? 'bg-ws-accent-bg font-semibold text-ws-accent'
                            : 'bg-ws-surface-sunken text-ws-ink-faint',
                        )}
                      >
                        {uv.kind === 'lenh' ? '/' : 'CV'}
                      </span>
                    )}
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-ws-meta font-medium text-ws-ink'>
                        {uv.nhan}
                      </span>
                      {/* Mô tả lệnh là câu trọn vẹn (nó nói rõ `/clear` không xoá
                          gì, `/usage` không tốn lượt) nên phải XUỐNG DÒNG chứ
                          không cắt cụt — cắt mất đúng nửa sau là nửa mang thông
                          tin. Gợi ý nhắc tên thì vẫn cắt một dòng như cũ. */}
                      <span
                        className={cn(
                          'block text-ws-nano leading-snug text-ws-ink-ghost',
                          uv.kind === 'lenh' ? 'whitespace-normal' : 'truncate',
                        )}
                      >
                        {uv.phu}
                      </span>
                      {/* Nhãn phải nằm ngay dưới cái tên, không phải trong một
                          chú giải hiện khi rê chuột: người dùng đang tìm lý do
                          vì sao bấm không ăn, và một lý do chỉ hiện khi rê chuột
                          thì trên cảm ứng không bao giờ hiện. */}
                      {uv.kind === 'nguoi' && uv.daKhoa && (
                        <span className='mt-0.5 inline-block rounded-ws-chip bg-ws-surface-sunken px-1 py-px text-ws-nano font-semibold text-ws-ink-faint'>
                          tài khoản đã khoá
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
