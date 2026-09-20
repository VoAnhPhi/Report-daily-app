'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Gauge,
  History,
  Loader2,
  MessageSquarePlus,
  Plus,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { useMedia } from 'react-use';
import { toast } from 'sonner';

import { APIError } from '@/app/api';
import { cn } from '@/lib/utils';
import {
  useCreateNhanConversation,
  useDeleteNhanConversation,
  useNhanConversation,
  useNhanConversations,
  useNhanUsage,
} from '@/hooks/queries/nhan-vien-nhan-queries';
import type {
  NhanConversationSummary,
  NhanGiaiDoan,
  NhanMessageDto,
  NhanUsageResponse,
  NhanViecKeoTha,
} from '@/types/nhan-vien-nhan.type';
import { ActaAiIcon } from './acta-ai-icon';
import {
  LENH_GACH_CHEO,
  NhanComposer,
  type MaLenhNhan,
  type NhanComposerGuiDi,
} from './nhan-composer';
import { NhanMessageItem } from './nhan-message-item';
import { luotTamThoi, useNhanChat } from './use-nhan-chat';

const GOI_Y_MO_DAU: readonly string[] = [
  'Hôm nay có những việc nào còn tồn đọng?',
  'Việc nào đang quá hạn mà chưa ai đụng tới?',
  'Lập báo cáo Excel tình hình công việc của nhóm tuần này',
  'Tình hình công việc của từng thành viên trong tháng ra sao?',
];

/**
 * Khoá tạm cho hội thoại CHƯA có id (màn Chào / vừa bấm "Cuộc trò chuyện mới").
 * Không phải uuid nên không bao giờ đụng id thật của một hội thoại.
 */
const KHOA_HOI_THOAI_MOI = 'moi';

/**
 * Một bong bóng do CHÍNH TRÌNH DUYỆT dựng ra.
 *
 * ⚠ Những thứ này KHÔNG nằm trong bảng `nhan_messages` và không bao giờ được
 * gửi lên máy chủ — đừng đi tìm bản ghi của chúng khi gỡ lỗi, và cũng đừng chờ
 * chúng hiện lại sau khi tải lại trang. Chúng là câu trả lời cho một lệnh gõ
 * nhanh (`/usage`, `/help`) hoặc một lời giải thích cho một lần bị từ chối, tức
 * là ghi chú của giao diện chứ không phải một lượt trao đổi với trợ lý.
 *
 * Vì không có mốc thời gian thật để xen kẽ với các lượt thật, chúng luôn nằm ở
 * CUỐI khung và bị dọn sạch mỗi khi người dùng gửi câu hỏi mới hoặc đổi hội
 * thoại — để không bao giờ có một ghi chú cũ trôi nổi bên dưới một câu trả lời
 * mới hơn nó, làm sai thứ tự đọc.
 */
type BongBongHeThong =
  | { id: number; kieu: 'dangTaiMucDung' }
  | { id: number; kieu: 'mucDung'; duLieu: NhanUsageResponse }
  | { id: number; kieu: 'troGiup' }
  | { id: number; kieu: 'vuotTran'; chu: string };

/**
 * Khung chat Nhân viên Nhàn — ngăn kéo bên phải, ĐẨY bảng chứ không đè lên.
 *
 * Không dùng `Sheet`: sheet của kho này là một Radix Dialog, tức có lớp phủ và
 * bẫy tiêu điểm, nên trong lúc mở thì không bấm được vào bảng việc. Cả tính
 * năng lại xoay quanh chuyện vừa đọc câu trả lời vừa nhìn/bấm đúng thẻ việc mà
 * nó nói tới, nên panel phải là một `<aside>` thường nằm cùng hàng flex với
 * vùng bảng — đúng lối cột đối tác 380px đang dùng ở màn này.
 *
 * Dưới 1024px thì `<aside>` ẩn hẳn và panel chuyển sang phủ toàn màn: bảng và
 * chat cạnh nhau trong 400px thì không đọc được cái nào.
 */
export function NhanPanel({
  open,
  onClose,
  onOpenTaskCode,
  viecDangKeo,
  onConTroTrongVungTha,
  viecKeoVao,
  onDaChenViecKeo,
}: {
  open: boolean;
  onClose: () => void;
  onOpenTaskCode: (code: string) => void;
  /**
   * Thẻ việc đang được kéo trên bảng, `null` khi không kéo gì.
   *
   * Chỉ để BẬT vùng thả — panel không tự biết chuyện gì đang xảy ra trên bảng
   * vì hai bên nằm ở hai nhánh cây khác nhau và `DragDropContext` của thư viện
   * kéo thả chỉ bao quanh bảng (xem chú thích dài ở `page.tsx`).
   */
  viecDangKeo: NhanViecKeoTha | null;
  /**
   * Báo lên trang: con trỏ có đang nằm trong vùng thả của panel không.
   *
   * Panel là nơi DUY NHẤT biết vùng thả nằm ở đâu (nó vẽ ra vùng đó), còn trang
   * là nơi duy nhất nhận được tin "đã buông chuột mà không rơi vào cột nào".
   * Hai mẩu tin đó phải gặp nhau, và đây là chiều rẻ hơn: một giá trị đúng/sai
   * đi lên, thay vì một tham chiếu DOM đi xuống.
   *
   * ⚠ PHẢI ổn định giữa các lần kết xuất — nó nằm trong danh sách phụ thuộc của
   * hiệu ứng gắn/gỡ trình nghe con trỏ.
   */
  onConTroTrongVungTha: (trong: boolean) => void;
  /** Việc vừa thả vào panel, chuyển thẳng xuống ô soạn. */
  viecKeoVao: NhanViecKeoTha | null;
  onDaChenViecKeo: () => void;
}) {
  const [hoiThoaiId, setHoiThoaiId] = useState<string | null>(null);
  const [moLichSu, setMoLichSu] = useState(false);
  const [bongBong, setBongBong] = useState<BongBongHeThong[]>([]);
  /** Số thứ tự bong bóng — chỉ để làm khoá React, không mang nghĩa gì khác. */
  const soBongRef = useRef(0);

  const danhSach = useNhanConversations();
  const chiTiet = useNhanConversation(hoiThoaiId ?? '');
  const taoMoi = useCreateNhanConversation();
  const xoa = useDeleteNhanConversation();
  const mucDung = useNhanUsage();
  // Truyền hội thoại đang mở vào hook: các vòng chờ bất đồng bộ trong đó phải
  // biết người dùng đã rời đi để thoát sớm thay vì giam ô soạn.
  const { dangChay, gui, dung } = useNhanChat(hoiThoaiId);

  const hoiThoai: NhanConversationSummary[] = useMemo(
    () => danhSach.data?.pages.flatMap((p) => p.data) ?? [],
    [danhSach.data],
  );

  /**
   * Đã tự chọn hội thoại cho LẦN MỞ này chưa.
   *
   * ⚠ Không có cờ này thì nút "Cuộc trò chuyện mới" CHẾT: nó đặt `hoiThoaiId`
   * về null, hiệu ứng bên dưới thấy null liền chọn lại hội thoại gần nhất, và
   * người dùng không bao giờ ra được màn trống. Cờ đặt lại khi đóng panel, nên
   * mở lại vẫn rơi đúng vào cuộc gần nhất.
   */
  const daTuChonRef = useRef(false);

  /**
   * Mở panel thì bám vào hội thoại gần nhất — MỘT lần cho mỗi lần mở. KHÔNG tự
   * tạo hội thoại rỗng ở đây: bấm mở rồi đóng mà đã đẻ ra một bản ghi thì danh
   * sách lịch sử đầy mục trống. Hội thoại chỉ sinh ra khi có câu hỏi đầu tiên.
   */
  useEffect(() => {
    if (!open) {
      daTuChonRef.current = false;
      return;
    }
    if (daTuChonRef.current || hoiThoaiId || hoiThoai.length === 0) return;
    daTuChonRef.current = true;
    setHoiThoaiId(hoiThoai[0].id);
  }, [open, hoiThoaiId, hoiThoai]);

  /**
   * Chặn gửi chồng, khoá THEO TỪNG HỘI THOẠI.
   *
   * Không có khoá này thì bấm hai lần liên tiếp vào một gợi ý mở đầu sẽ tạo HAI
   * hội thoại và bắn hai lượt song song — cả hai cùng tính tiền. Dùng ref chứ
   * không state: quyết định phải đúng ngay trong lần bấm thứ hai, không đợi
   * được một vòng render.
   *
   * ⚠ Vì sao là một TẬP khoá chứ không phải một cờ đúng/sai như bản đầu: cờ
   * toàn cục chặn nhầm cả những lượt KHÔNG liên quan. Rời hội thoại A giữa lượt
   * thì lượt đó còn một đoạn chờ máy chủ ghi nốt chạy tiếp phía sau; suốt lúc
   * ấy cờ toàn cục vẫn bật, nên câu hỏi ĐẦU TIÊN của hội thoại B bị đá ra —
   * trong khi giao diện của B không hề khoá ô soạn (lượt đang chảy không phải
   * của B), tức người dùng gõ được, bấm được, mà không gửi được. Khoá của máy
   * chủ là khoá một-lượt-mỗi-HỘI-THOẠI, nên khoá phía trình duyệt phải cùng
   * đơn vị đo thì mới chặn đúng thứ cần chặn.
   *
   * Hội thoại chưa có id (người dùng vừa bấm "Cuộc trò chuyện mới") khoá tạm
   * dưới tên `moi`, rồi ĐỔI sang id thật ngay khi máy chủ trả id về.
   */
  const dangGuiRef = useRef<Set<string>>(new Set());

  /**
   * ⚠ NÉM lỗi chứ không `return` câm, và cũng không nuốt lỗi của `gui`.
   *
   * Ô soạn xoá chữ ngay khi bấm Gửi (để phản hồi tức thì) và chỉ trả chữ về khi
   * `onGui` ném. Một nhánh `return` im lặng ở đây, hay một `catch` nuốt lỗi ở
   * `gui`, đều được ô soạn đọc là "gửi xong rồi" — và câu người dùng vừa gõ
   * biến mất không dấu vết.
   */
  const guiCauHoi = async (v: NhanComposerGuiDi) => {
    let khoa = hoiThoaiId ?? KHOA_HOI_THOAI_MOI;
    if (dangGuiRef.current.has(khoa)) {
      const nhac = 'Đang gửi câu hỏi trước, vui lòng đợi một chút.';
      toast.warning(nhac);
      throw new Error(nhac);
    }
    // Dọn ghi chú của giao diện: chúng luôn nằm cuối khung, nên để lại là có một
    // bảng mức dùng cũ nằm BÊN DƯỚI câu trả lời vừa về — đọc thành ra máy vừa
    // trả lời xong lại tự dán thêm số liệu cũ.
    setBongBong([]);
    dangGuiRef.current.add(khoa);
    try {
      let id = hoiThoaiId;
      if (!id) {
        // Người dùng vừa chủ động mở cuộc mới; đừng để hiệu ứng trên kéo họ
        // ngược về cuộc cũ khi danh sách được làm mới.
        daTuChonRef.current = true;
        const moi = await taoMoi.mutateAsync();
        id = moi.id;
        setHoiThoaiId(moi.id);
        /**
         * Dời khoá từ chỗ tạm sang id thật NGAY khi có id.
         *
         * Giữ nguyên `moi` thì chính người dùng này bấm "Cuộc trò chuyện mới"
         * giữa lượt sẽ quay lại đúng khoá đó và bị chặn — đúng cái bẫy mà khoá
         * theo hội thoại sinh ra để gỡ. Đổi ở đây an toàn vì suốt lúc chờ máy
         * chủ tạo hội thoại, khoá `moi` vẫn giữ, tức hai lần bấm liên tiếp vào
         * một gợi ý mở đầu vẫn không đẻ ra hai hội thoại.
         */
        dangGuiRef.current.delete(khoa);
        khoa = id;
        dangGuiRef.current.add(khoa);
      }
      // `gui` nhận id qua tham số nên nhánh vừa-tạo không phải chờ một vòng
      // render để `hoiThoaiId` kịp cập nhật.
      await gui(id, v);
    } catch (loi: unknown) {
      /**
       * Hết lượt trong ngày (hoặc gửi quá nhanh) — máy chủ trả 429 kèm một câu
       * tiếng Việt đã soạn sẵn.
       *
       * Hiện nó thành BONG BÓNG trong khung chat chứ không phải toast, vì hai lẽ:
       * toast biến mất sau vài giây trong khi đây là thứ người dùng cần đọc kỹ
       * (nó nói rõ mốc làm mới), và nó nằm đúng chỗ câu trả lời lẽ ra phải xuất
       * hiện, nên không ai phải đoán câu hỏi của mình đã đi đâu.
       *
       * Chỉ đọc MÃ 429, không đọc lời văn: máy chủ có hai loại trần (theo ngày
       * và theo phút) với hai câu khác nhau, và cả hai đều tự nói ra tình trạng
       * của mình. Dò chuỗi để phân loại là tự hẹn một ngày hỏng khi ai đó sửa
       * câu chữ ở máy chủ.
       */
      if (loi instanceof APIError && loi.statusCode === 429) {
        themBong({
          id: (soBongRef.current += 1),
          kieu: 'vuotTran',
          chu: loi.message,
        });
      }
      // NÉM LẠI trong mọi trường hợp: ô soạn dựa vào đúng tín hiệu này để trả
      // câu người dùng vừa gõ về chỗ cũ.
      throw loi;
    } finally {
      dangGuiRef.current.delete(khoa);
    }
  };

  const themBong = (b: BongBongHeThong) => {
    setBongBong((v) => [...v, b]);
  };

  /**
   * Mở một cuộc trò chuyện mới — dùng chung cho nút `+` và lệnh `/clear`.
   *
   * Gộp làm một hàm chứ không chép đôi: hai lối vào phải làm ĐÚNG một việc, nếu
   * không sẽ có ngày `/clear` quên dừng lượt đang chảy (hoặc quên dọn ghi chú)
   * và người dùng mang theo một lượt vô chủ sang cuộc mới.
   */
  const moHoiThoaiMoi = () => {
    roiHoiThoai();
    daTuChonRef.current = true;
    setHoiThoaiId(null);
    setMoLichSu(false);
    setBongBong([]);
  };

  /**
   * Chạy một lệnh gõ nhanh.
   *
   * ⚠ Cả ba lệnh đều KHÔNG gọi model và không ghi gì vào hội thoại: `/clear` chỉ
   * đổi hội thoại đang mở, còn `/usage` và `/help` chỉ dựng bong bóng phía trình
   * duyệt. Vì vậy chúng được phép chạy cả khi người dùng đã hết lượt trong ngày
   * — đó chính là lúc `/usage` có ích nhất.
   */
  const chayLenh = (ma: MaLenhNhan) => {
    if (ma === 'clear') {
      moHoiThoaiMoi();
      return;
    }
    if (ma === 'help') {
      themBong({ id: (soBongRef.current += 1), kieu: 'troGiup' });
      return;
    }

    // `/usage`: đặt sẵn một bong bóng "đang lấy số liệu" rồi THAY nó tại chỗ khi
    // có kết quả. Đợi rồi mới hiện thì suốt lúc chờ màn hình không nhúc nhích,
    // và người dùng gõ lại lệnh lần nữa vì tưởng phím Enter không ăn.
    const id = (soBongRef.current += 1);
    themBong({ id, kieu: 'dangTaiMucDung' });
    mucDung
      .mutateAsync()
      .then((duLieu) => {
        setBongBong((v) =>
          v.map((b) => (b.id === id ? { id, kieu: 'mucDung', duLieu } : b)),
        );
      })
      .catch(() => {
        // Hook đã hiện toast lỗi; gỡ bong bóng chờ để nó không quay mãi.
        setBongBong((v) => v.filter((b) => b.id !== id));
      });
  };

  /**
   * MỘT thân duy nhất được dựng, chọn theo khổ màn.
   *
   * Trước đó bản này dựng cả hai nhánh rồi để CSS `hidden lg:block` giấu một
   * cái đi — nhưng "ẩn" bằng CSS thì React VẪN gắn component: hai ô soạn, hai
   * hiệu ứng bám đáy tranh nhau cuộn, và hai portal gợi ý `@` cùng bắn vào
   * `document.body`. Mốc 1024px trùng đúng breakpoint `lg` của phần bố cục
   * ngay dưới; `true` là giá trị lúc chưa đo được (kết xuất phía máy chủ) —
   * cùng khuôn `ResponsiveModal` đang dùng.
   */
  const laManRong = useMedia('(min-width: 1024px)', true);

  /**
   * Lượt đang chảy có thuộc về hội thoại ĐANG MỞ không.
   *
   * ⚠ Thiếu phép so này thì bong bóng tạm của hội thoại A hiện trong hội thoại
   * B, ô soạn của B bị khoá, và nút Gửi của B biến thành nút Dừng của một lượt
   * không phải của nó.
   */
  const luotCuaManNay =
    dangChay && hoiThoaiId && dangChay.hoiThoaiId === hoiThoaiId
      ? dangChay
      : null;

  /**
   * Rời khỏi hội thoại đang có lượt chạy thì DỪNG hẳn lượt đó.
   *
   * Bỏ mặc nó chạy tiếp là để một lượt vô chủ vừa tốn tiền vừa ghi vào một hội
   * thoại người dùng không còn nhìn; nói rõ bằng một dòng thông báo, vì câu trả
   * lời đang chảy biến mất khỏi màn hình mà im lặng thì trông như mất dữ liệu.
   */
  const roiHoiThoai = () => {
    // `dangLuu` nghĩa là đã dừng rồi, chỉ còn đợi máy chủ ghi nốt — dừng lần
    // nữa không có gì để cắt, mà báo lần nữa thì thành phiền.
    if (!dangChay || dangChay.dangLuu) return;
    dung();
    toast.info('Đã dừng câu trả lời ở cuộc trò chuyện trước.');
  };

  /**
   * Vùng thả của kéo–thả thẻ việc, và vì sao nó phải TỰ ĐO CON TRỎ.
   *
   * Bảng việc dùng `@hello-pangea/dnd`, mà một `Droppable` chỉ ghép được với
   * `DragDropContext` bao quanh nó — context đó nằm bên trong `TaskBoard`, còn
   * panel này là anh em ở cấp trang. Muốn panel là một ô thả THẬT thì phải nhấc
   * context lên `page.tsx`, tức đụng vào `onDragEnd` đang gánh cả luồng đổi
   * trạng thái việc (có nhánh riêng cho cột "Hoàn thành" đòi bằng chứng, có
   * nhánh cùng-cột hiện gợi ý). Đổi lấy một vùng thả không đáng cái giá đó.
   *
   * Nên ở đây là một lớp THỦ CÔNG có chủ đích, không phải mã thừa ai đó quên
   * dọn: trong lúc bảng báo "đang kéo", panel theo dõi con trỏ và tự đối chiếu
   * với khung của vùng thả. Bảng vẫn là bên quyết định: chỉ khi nó báo đã thả ra
   * NGOÀI mọi cột (`destination === null`) thì trang mới hỏi tới kết quả đo này
   * — nhờ vậy không bao giờ có chuyện một cú thả vừa đổi trạng thái việc vừa
   * chèn phần nhắc.
   *
   * Nghe ở `window` với `capture: true` để chắc chắn chạy trước trình nghe của
   * thư viện kéo thả, và `passive: true` để không bao giờ chen vào việc của nó.
   */
  const vungThaRef = useRef<HTMLDivElement | null>(null);
  const [conTroTrongVung, setConTroTrongVung] = useState(false);

  // Dưới 1024px panel chiếm trọn màn nên KHÔNG có bảng nào để kéo — không dựng
  // gì ở nhánh đó, kể cả trình nghe con trỏ.
  const dangKeoThe = viecDangKeo !== null && open && laManRong;

  useEffect(() => {
    if (!dangKeoThe) return;
    const theoDoi = (e: MouseEvent | TouchEvent) => {
      const diem = 'touches' in e ? e.touches[0] : e;
      if (!diem) return;
      const o = vungThaRef.current?.getBoundingClientRect();
      const trong =
        !!o &&
        diem.clientX >= o.left &&
        diem.clientX <= o.right &&
        diem.clientY >= o.top &&
        diem.clientY <= o.bottom;
      // Chỉ đặt khi giá trị ĐỔI: `mousemove` bắn mỗi khung hình, đặt vô điều
      // kiện là vẽ lại cả panel suốt lúc kéo.
      setConTroTrongVung((v) => (v === trong ? v : trong));
      onConTroTrongVungTha(trong);
    };
    window.addEventListener('mousemove', theoDoi, {
      capture: true,
      passive: true,
    });
    window.addEventListener('touchmove', theoDoi, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener('mousemove', theoDoi, true);
      window.removeEventListener('touchmove', theoDoi, true);
      // Trả cờ về false khi thôi kéo: một giá trị `true` sót lại sẽ khiến cú kéo
      // SAU thả ở đâu cũng tính là thả vào panel.
      setConTroTrongVung(false);
      onConTroTrongVungTha(false);
    };
  }, [dangKeoThe, onConTroTrongVungTha]);

  /**
   * Thả một việc trong lúc đang mở Lịch sử thì quay về khung chat.
   *
   * Ô soạn vẫn nằm trong DOM khi mở Lịch sử (chỉ bị `display:none`), nên phần
   * nhắc vẫn chèn vào đúng chỗ — nhưng người dùng đang nhìn danh sách hội thoại
   * và không thấy gì xảy ra cả, còn lệnh trả tiêu điểm về ô soạn thì im lặng
   * trượt vì không focus được một phần tử đang bị ẩn.
   */
  useEffect(() => {
    if (viecKeoVao) setMoLichSu(false);
  }, [viecKeoVao]);

  const than = (
    <ThanPanel
      hoiThoaiId={hoiThoaiId}
      luot={chiTiet.data?.messages ?? []}
      tam={
        luotCuaManNay && hoiThoaiId
          ? luotTamThoi(hoiThoaiId, luotCuaManNay)
          : null
      }
      dangTaiLuot={chiTiet.isLoading && hoiThoaiId !== null}
      dangChay={luotCuaManNay !== null}
      dangLuu={luotCuaManNay?.dangLuu ?? false}
      giaiDoan={luotCuaManNay?.giaiDoan}
      moLichSu={moLichSu}
      onToggleLichSu={() => setMoLichSu((v) => !v)}
      hoiThoai={hoiThoai}
      dangTaiLichSu={danhSach.isLoading}
      onChonHoiThoai={(id) => {
        if (id !== hoiThoaiId) roiHoiThoai();
        daTuChonRef.current = true;
        setHoiThoaiId(id);
        setMoLichSu(false);
        // Ghi chú của giao diện thuộc về cuộc vừa rời, không mang sang cuộc mới.
        setBongBong([]);
      }}
      onHoiThoaiMoi={moHoiThoaiMoi}
      onXoa={async (id) => {
        // Xoá đúng hội thoại đang có lượt chạy thì phải cắt luồng trước, không
        // thì nó vẫn chảy về một hội thoại đã bị xoá.
        if (dangChay?.hoiThoaiId === id) dung();
        await xoa.mutateAsync(id);
        if (id === hoiThoaiId) setHoiThoaiId(null);
      }}
      onGui={guiCauHoi}
      onDung={dung}
      onLenh={chayLenh}
      bongBong={bongBong}
      viecKeoVao={viecKeoVao}
      onDaChenViecKeo={onDaChenViecKeo}
      onClose={onClose}
      onOpenTaskCode={onOpenTaskCode}
    />
  );

  return (
    <>
      {/* ≥1024px: cột thật, đẩy bảng hẹp lại. Giữ trong DOM khi đóng để có gì
          mà chuyển động; khi thu lại thì khoá tương tác và ẩn khỏi trình đọc
          màn hình — cùng khuôn với cột lọc của màn này. */}
      <aside
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={cn(
          'hidden shrink-0 overflow-hidden transition-[width] duration-[240ms] ease-out lg:block',
          'motion-reduce:transition-none',
          open ? 'w-[440px] border-l border-ws-line' : 'pointer-events-none w-0',
        )}
      >
        <div className='relative flex h-full w-[440px] flex-col bg-ws-surface'>
          {laManRong && than}

          {/* Vùng thả nằm ĐÈ lên cả panel, nhưng `pointer-events-none`: nó chỉ
              là thứ để nhìn. Mọi phép đo đều làm bằng toạ độ (xem chú thích ở
              hiệu ứng theo dõi con trỏ), nên nếu nó bắt được sự kiện chuột thì
              chỉ có hại — thư viện kéo thả sẽ thấy con trỏ rơi lên một phần tử
              lạ ngay giữa lúc đang đo. */}
          {dangKeoThe && (
            <div className='pointer-events-none absolute inset-0 z-30 p-3'>
              <div
                ref={vungThaRef}
                className={cn(
                  'flex h-full w-full flex-col items-center justify-center gap-2 rounded-ws-block border-2 border-dashed p-4 text-center transition-colors duration-150',
                  conTroTrongVung
                    ? 'border-ws-done-edge bg-ws-done-bg/95'
                    : 'border-ws-line-strong bg-ws-surface/95',
                )}
              >
                <MessageSquarePlus
                  className={cn(
                    'h-7 w-7',
                    conTroTrongVung ? 'text-ws-done-edge' : 'text-ws-ink-ghost',
                  )}
                />
                <p className='text-ws-h2 font-semibold text-ws-ink'>
                  Thả vào đây để nhắc công việc này
                </p>
                <p className='max-w-[85%] truncate text-ws-meta text-ws-ink-soft'>
                  {viecDangKeo.nhan}
                </p>
                <p className='text-ws-nano text-ws-ink-ghost'>
                  Việc sẽ được thêm vào ô soạn, chưa gửi đi.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* <1024px: phủ toàn màn. `ws-scope` phải đặt lại vì khối này nằm ngoài
          cây bọc của màn khi trình duyệt nâng nó lên lớp fixed. */}
      {open && !laManRong && (
        <div className='ws-scope fixed inset-0 z-50 flex flex-col bg-ws-surface'>
          {than}
        </div>
      )}
    </>
  );
}

function ThanPanel({
  hoiThoaiId,
  luot,
  tam,
  dangTaiLuot,
  dangChay,
  dangLuu,
  giaiDoan,
  moLichSu,
  onToggleLichSu,
  hoiThoai,
  dangTaiLichSu,
  onChonHoiThoai,
  onHoiThoaiMoi,
  onXoa,
  onGui,
  onDung,
  onLenh,
  bongBong,
  viecKeoVao,
  onDaChenViecKeo,
  onClose,
  onOpenTaskCode,
}: {
  hoiThoaiId: string | null;
  luot: NhanMessageDto[];
  tam: { cauHoi: NhanMessageDto; traLoi: NhanMessageDto } | null;
  dangTaiLuot: boolean;
  dangChay: boolean;
  /** Luồng đã đứt nhưng máy chủ còn ghi nốt — ô soạn vẫn phải khoá. */
  dangLuu: boolean;
  giaiDoan?: NhanGiaiDoan;
  moLichSu: boolean;
  onToggleLichSu: () => void;
  hoiThoai: NhanConversationSummary[];
  dangTaiLichSu: boolean;
  onChonHoiThoai: (id: string) => void;
  onHoiThoaiMoi: () => void;
  onXoa: (id: string) => Promise<void>;
  onGui: (v: NhanComposerGuiDi) => Promise<void>;
  onDung: () => void;
  onLenh: (ma: MaLenhNhan) => void;
  /** Ghi chú phía trình duyệt — không phải tin nhắn, xem `BongBongHeThong`. */
  bongBong: BongBongHeThong[];
  viecKeoVao: NhanViecKeoTha | null;
  onDaChenViecKeo: () => void;
  onClose: () => void;
  onOpenTaskCode: (code: string) => void;
}) {
  const khungRef = useRef<HTMLDivElement>(null);

  /**
   * Khoảng cách từ đáy khung, ĐO Ở LẦN CUỘN GẦN NHẤT — không đo trong hiệu ứng.
   *
   * ⚠ Đây là mấu chốt. Hiệu ứng chạy SAU khi React đã nhét nội dung mới vào
   * DOM, nên lúc đó `scrollHeight` đã phình ra còn `scrollTop` giữ nguyên: một
   * người đang ở sát đáy bỗng "cách đáy" đúng bằng chiều cao mẩu chữ vừa về,
   * vượt ngưỡng, và thế là hết tự cuộn ngay từ mẩu thứ hai. Ghi lại khoảng cách
   * ở sự kiện `scroll` — tức TRƯỚC khi kết xuất — mới là con số phản ánh ý định
   * của người đọc.
   */
  const cachDayRef = useRef(0);

  /** Đã cuộn đáy cho lần đổ đầy ĐẦU TIÊN của hội thoại nào rồi. */
  const daCuonDayRef = useRef<string | null>(null);

  useEffect(() => {
    const khung = khungRef.current;
    if (!khung) return;
    const ghiNho = () => {
      cachDayRef.current =
        khung.scrollHeight - khung.scrollTop - khung.clientHeight;
    };
    khung.addEventListener('scroll', ghiNho, { passive: true });
    return () => khung.removeEventListener('scroll', ghiNho);
  }, []);

  /**
   * Mở một hội thoại thì nhảy thẳng xuống ĐÁY, VÔ ĐIỀU KIỆN.
   *
   * Lịch sử đổ vào một khung đang ở `scrollTop = 0`, nên nếu áp cùng ngưỡng
   * "gần đáy" như lúc chữ chảy về thì khung đứng nguyên ở ĐẦU lịch sử và người
   * dùng phải tự cuộn hàng chục lượt mới thấy đoạn vừa nói. Đây là hai trường
   * hợp khác hẳn nhau, phải tách: lần đổ đầu tiên luôn cuộn, các mẩu chữ về
   * sau mới hỏi ý người đọc.
   *
   * `useLayoutEffect` chứ không `useEffect`: cuộn phải xong TRƯỚC khi trình
   * duyệt vẽ, nếu không người dùng thấy một khung nhấp nháy ở đầu lịch sử rồi
   * mới nhảy xuống.
   */
  useLayoutEffect(() => {
    if (daCuonDayRef.current === hoiThoaiId) return;
    // Đổi hội thoại: khoảng cách đo được của hội thoại cũ không còn nghĩa gì.
    cachDayRef.current = 0;
    if (moLichSu) return; // khung đang ẩn, `scrollHeight` bằng 0 — đợi lúc hiện
    const khung = khungRef.current;
    if (!khung || !hoiThoaiId || luot.length === 0) return;
    daCuonDayRef.current = hoiThoaiId;
    khung.scrollTop = khung.scrollHeight;
  }, [hoiThoaiId, luot.length, moLichSu]);

  /**
   * Bám đáy khi có nội dung mới — NHƯNG chỉ khi người đọc đang ở gần đáy.
   *
   * Bám vô điều kiện thì mỗi mẩu chữ chảy về lại giật người dùng xuống cuối,
   * nên không ai cuộn ngược lên đọc lại được đoạn trên trong lúc trợ lý đang
   * viết. Ngưỡng 120px đủ rộng để một cú cuộn nhỏ vẫn tính là "đang ở đáy".
   * Gán thẳng `scrollTop` chứ không `scrollIntoView({behavior:'smooth'})`: chữ
   * về từng mảnh nên cuộn mượt biến thành một cú giật liên tục.
   */
  useEffect(() => {
    if (moLichSu) return;
    const khung = khungRef.current;
    if (!khung) return;
    if (cachDayRef.current > 120) return;
    khung.scrollTop = khung.scrollHeight;
    // `bongBong.length` cũng nằm ở đây: bảng mức dùng của `/usage` cao gần hết
    // khung, nên không cuộn theo là người dùng gõ lệnh xong không thấy gì đổi.
  }, [luot.length, tam?.traLoi.content, bongBong.length, moLichSu]);

  /**
   * ⚠ Ghi chú giao diện KHÔNG được tính vào đây.
   *
   * Cám dỗ là thêm `&& bongBong.length === 0` cho "sạch màn hình", nhưng làm vậy
   * là gõ `/usage` trên một hội thoại chưa có gì thì màn Chào biến mất, mang
   * theo cả bốn câu gợi ý mở đầu — người dùng còn lại một bảng số liệu trên nền
   * trắng, không còn lối vào nào. Màn Chào ở trên, ghi chú ở dưới: đọc đúng thứ
   * tự và không mất gì.
   */
  const rong = luot.length === 0 && !tam && !dangTaiLuot;

  return (
    <>
      <header className='flex shrink-0 items-center gap-1 border-b border-ws-line px-3 py-2.5'>
        <ActaAiIcon className='mr-1 h-[19px] w-[19px]' />
        <span className='min-w-0 flex-1 truncate text-ws-h2 font-semibold text-ws-ink'>
          Nhân viên Nhàn
        </span>
        <NutDau
          onClick={onToggleLichSu}
          nhan='Lịch sử trò chuyện'
          dangBat={moLichSu}
        >
          <History className='h-4 w-4' />
        </NutDau>
        <NutDau onClick={onHoiThoaiMoi} nhan='Cuộc trò chuyện mới'>
          <Plus className='h-4 w-4' />
        </NutDau>
        <NutDau onClick={onClose} nhan='Đóng trợ lý'>
          <X className='h-4 w-4' />
        </NutDau>
      </header>

      {moLichSu && (
        <LichSu
          hoiThoai={hoiThoai}
          dangTai={dangTaiLichSu}
          dangChon={hoiThoaiId}
          onChon={onChonHoiThoai}
          onXoa={onXoa}
        />
      )}

      {/**
       * ⚠ Khung chat LUÔN nằm trong DOM, chỉ ẩn bằng CSS khi mở lịch sử.
       *
       * Trước đây đây là một biểu thức ba ngôi, nên mỗi lần bật/tắt lịch sử là
       * React GỠ hẳn khung cuộn rồi dựng lại — `scrollTop` về 0 và người dùng
       * quay lại thấy mình đứng ở đầu lịch sử. Ẩn bằng `hidden` (tức
       * `display:none`) giữ nguyên vị trí cuộn, đồng thời vẫn lấy phần tử ra
       * khỏi thứ tự Tab và khỏi cây trợ năng, nên không cần `inert`.
       */}
      <div
        ref={khungRef}
        className={cn(
          'ws-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3',
          moLichSu && 'hidden',
        )}
      >
        {dangTaiLuot && (
          <div className='flex justify-center py-6'>
            <Loader2 className='h-4 w-4 animate-spin text-ws-ink-ghost' />
          </div>
        )}

        {rong && (
          <ManChao
            onChon={(c) =>
              void onGui({
                noiDung: c,
                mentionedUserIds: [],
                mentionedTaskIds: [],
              }).catch(() => undefined)
            }
          />
        )}

        {luot.map((m) => (
          <NhanMessageItem
            key={m.id}
            message={m}
            conversationId={hoiThoaiId ?? ''}
            onOpenTaskCode={onOpenTaskCode}
          />
        ))}

        {tam && (
          <>
            <NhanMessageItem
              message={tam.cauHoi}
              conversationId={hoiThoaiId ?? ''}
            />
            <NhanMessageItem
              message={tam.traLoi}
              conversationId={hoiThoaiId ?? ''}
              onOpenTaskCode={onOpenTaskCode}
            />
            {tam.traLoi.content === '' && !dangLuu && (
              <DangLam giaiDoan={giaiDoan} />
            )}
            {/* Luồng đã đứt nhưng máy chủ còn chạy nốt — nói rõ vì sao ô soạn
                vẫn khoá, im lặng ở đây thì người dùng tưởng giao diện treo. */}
            {dangLuu && (
              <p className='pl-[26px] text-ws-meta text-ws-ink-ghost'>
                Đang lưu câu trả lời…
              </p>
            )}
          </>
        )}

        {/* Ghi chú của giao diện luôn ở CUỐI khung — xem `BongBongHeThong` để
            biết vì sao chúng không xen kẽ theo thời gian với các lượt thật. */}
        {bongBong.map((b) => (
          <BongBongHeThongItem key={b.id} bong={b} />
        ))}
      </div>

      {/* Ô soạn cũng LUÔN nằm trong DOM: gỡ đi để mở lịch sử là xoá luôn câu
          người dùng đang gõ dở. */}
      <div className={cn('shrink-0', moLichSu && 'hidden')}>
        <NhanComposer
          onGui={onGui}
          onDung={onDung}
          onLenh={onLenh}
          viecKeoVao={viecKeoVao}
          onDaChenViecKeo={onDaChenViecKeo}
          dangChay={dangChay}
          dangLuu={dangLuu}
        />
      </div>
    </>
  );
}

function NutDau({
  onClick,
  nhan,
  dangBat,
  children,
}: {
  onClick: () => void;
  nhan: string;
  dangBat?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      title={nhan}
      aria-label={nhan}
      aria-pressed={dangBat}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-ws-check transition-colors',
        dangBat
          ? 'bg-ws-surface-sunken text-ws-ink'
          : 'text-ws-ink-soft hover:bg-ws-surface-alt',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Ba chấm kèm TÊN GIAI ĐOẠN, không chỉ chấm suông. Một lượt có tra web có thể
 * im lặng 20–30 giây; "Đang tra dữ liệu" khác hẳn "Đang suy nghĩ" ở chỗ nó nói
 * cho người dùng biết máy chưa treo.
 */
function DangLam({ giaiDoan }: { giaiDoan?: NhanGiaiDoan }) {
  const chu =
    giaiDoan === 'dang_dung_cong_cu'
      ? 'Đang tra dữ liệu'
      : giaiDoan === 'dang_viet'
        ? 'Đang viết'
        : 'Đang suy nghĩ';
  return (
    <p className='flex items-center gap-1.5 pl-[26px] text-ws-meta text-ws-ink-ghost'>
      <span className='flex gap-[3px]'>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className='h-1 w-1 animate-pulse rounded-full bg-ws-ink-ghost'
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      {chu}…
    </p>
  );
}

function ManChao({ onChon }: { onChon: (cau: string) => void }) {
  return (
    <div className='px-1 py-4'>
      <ActaAiIcon className='h-9 w-9' />
      <p className='mt-3 text-ws-h2 font-semibold text-ws-ink'>
        Chào anh/chị, tôi là Nhân viên Nhàn.
      </p>
      <p className='mt-1 text-ws-meta leading-relaxed text-ws-ink-soft'>
        Tôi tra được công việc và đối tác, lập báo cáo, tìm thông tin trên web,
        và soạn sẵn thao tác cho anh/chị duyệt. Mọi thay đổi dữ liệu đều chờ
        anh/chị bấm Xác nhận mới chạy.
      </p>
      <ul className='mt-3 space-y-1.5'>
        {GOI_Y_MO_DAU.map((c) => (
          <li key={c}>
            <button
              type='button'
              onClick={() => onChon(c)}
              className='w-full rounded-ws-nav border border-ws-line-soft bg-ws-surface-alt px-2.5 py-2 text-left text-ws-meta leading-snug text-ws-ink-soft transition-colors hover:border-ws-line hover:text-ws-ink'
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LichSu({
  hoiThoai,
  dangTai,
  dangChon,
  onChon,
  onXoa,
}: {
  hoiThoai: NhanConversationSummary[];
  dangTai: boolean;
  dangChon: string | null;
  onChon: (id: string) => void;
  onXoa: (id: string) => Promise<void>;
}) {
  return (
    <div className='ws-scroll min-h-0 flex-1 overflow-y-auto p-2'>
      {dangTai ? (
        <div className='flex justify-center py-6'>
          <Loader2 className='h-4 w-4 animate-spin text-ws-ink-ghost' />
        </div>
      ) : hoiThoai.length === 0 ? (
        <p className='px-2 py-6 text-center text-ws-meta text-ws-ink-ghost'>
          Chưa có cuộc trò chuyện nào.
        </p>
      ) : (
        <ul className='space-y-0.5'>
          {hoiThoai.map((c) => (
            <li key={c.id} className='group flex items-center gap-1'>
              <button
                type='button'
                onClick={() => onChon(c.id)}
                className={cn(
                  'min-w-0 flex-1 rounded-ws-nav px-2.5 py-2 text-left transition-colors',
                  c.id === dangChon
                    ? 'bg-ws-surface-sunken'
                    : 'hover:bg-ws-surface-alt',
                )}
              >
                <span className='block truncate text-ws-meta font-medium text-ws-ink'>
                  {c.title ?? 'Cuộc trò chuyện mới'}
                </span>
                <span className='block text-ws-nano text-ws-ink-ghost'>
                  {ngayVN(c.lastMessageAt)} · {c.messageCount} lượt
                </span>
              </button>
              {/* Hiện khi rê chuột HOẶC khi nhận tiêu điểm bàn phím —
                  `opacity-0` suông là một nút bấm được mà mắt không thấy. */}
              <button
                type='button'
                onClick={() => void onXoa(c.id)}
                title='Xóa cuộc trò chuyện'
                aria-label={`Xóa cuộc trò chuyện ${c.title ?? 'chưa đặt tên'}`}
                className='flex h-7 w-7 shrink-0 items-center justify-center rounded-ws-check text-ws-ink-ghost opacity-0 transition-opacity hover:bg-ws-surface-alt hover:text-ws-void-fg focus-visible:opacity-100 group-hover:opacity-100'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ngayVN(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}

/** Số nguyên kiểu Việt Nam: 2.000.000 chứ không phải 2,000,000. */
const soVN = new Intl.NumberFormat('vi-VN');

/**
 * Tiền: hai chữ số thập phân là sàn, sáu là trần.
 *
 * Trần phải là 6 vì máy chủ trả tới 6 chữ số, mà mức dùng một ngày nhẹ có thể
 * chỉ là 0,0004 USD — làm tròn về 2 chữ số là hiện "0,00 USD" cho một người vừa
 * hỏi mười mấy câu, tức là nói dối theo hướng dễ chịu. Sàn 2 để con số nào cũng
 * đọc ra dạng tiền quen mắt.
 */
const tienUSD = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

/**
 * "00:00 ngày 26/08/2026" — dựng từ HAI bộ định dạng rồi ghép tay.
 *
 * Một `Intl.DateTimeFormat` gộp cả ngày lẫn giờ sẽ tự chọn thứ tự và dấu ngăn
 * theo miền, nên không chèn được chữ "ngày" vào đúng chỗ. Ghép tay thì câu chữ
 * là của mình, còn múi giờ vẫn do `Intl` lo — và múi giờ mới là chỗ dễ sai:
 * mốc làm mới do máy chủ tính theo giờ Việt Nam, đọc bằng giờ máy là lệch hẳn
 * một ngày với ai đang ngồi ở múi giờ khác.
 */
function mocLamMoiVN(iso: string): string {
  const d = new Date(iso);
  const gio = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
  const ngay = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
  return `${gio} ngày ${ngay}`;
}

/**
 * Khung chung của mọi ghi chú giao diện.
 *
 * Cố ý KHÔNG giống bong bóng của người dùng lẫn khối trả lời của trợ lý: đây
 * không phải một lượt trao đổi, và một ghi chú trông y hệt câu trả lời sẽ khiến
 * người đọc tưởng trợ lý vừa nói ra những con số này (rồi đi tìm nó trong lịch
 * sử hội thoại). Nền chìm + viền nhạt là mã hình của "phần mềm đang nói", giống
 * dòng "Đang lưu câu trả lời…" ngay phía trên.
 */
function KhungGhiChu({
  icon,
  tieuDe,
  children,
}: {
  icon: React.ReactNode;
  tieuDe: string;
  children?: React.ReactNode;
}) {
  return (
    <div className='rounded-ws-block border border-ws-line bg-ws-surface-alt px-3 py-2.5'>
      <p className='flex items-center gap-1.5 text-ws-meta font-semibold text-ws-ink'>
        <span className='shrink-0 text-ws-ink-soft'>{icon}</span>
        {tieuDe}
      </p>
      {children}
    </div>
  );
}

/** Một dòng "nhãn — giá trị" trong bảng mức dùng. */
function DongSo({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className='flex items-baseline justify-between gap-3 py-[3px]'>
      <span className='shrink-0 text-ws-meta text-ws-ink-soft'>{nhan}</span>
      <span className='min-w-0 text-right text-ws-meta font-medium tabular-nums text-ws-ink'>
        {giaTri}
      </span>
    </div>
  );
}

function BongBongHeThongItem({ bong }: { bong: BongBongHeThong }) {
  if (bong.kieu === 'dangTaiMucDung') {
    return (
      <KhungGhiChu
        icon={<Loader2 className='h-3.5 w-3.5 animate-spin' />}
        tieuDe='Đang lấy số liệu mức dùng…'
      />
    );
  }

  if (bong.kieu === 'troGiup') {
    return (
      <KhungGhiChu icon={<Terminal className='h-3.5 w-3.5' />} tieuDe='Lệnh gõ nhanh'>
        <ul className='mt-1.5 space-y-1.5'>
          {LENH_GACH_CHEO.map((l) => (
            <li key={l.ma}>
              <p className='text-ws-meta font-medium text-ws-ink'>{l.nhan}</p>
              <p className='text-ws-nano leading-snug text-ws-ink-soft'>
                {l.phu}
              </p>
            </li>
          ))}
        </ul>
        <p className='mt-2 text-ws-nano leading-snug text-ws-ink-ghost'>
          Gõ dấu <span className='font-medium'>/</span> ở đầu ô soạn để mở danh
          sách này. Kết quả của các lệnh chỉ hiện ở đây và không được lưu vào
          cuộc trò chuyện.
        </p>
      </KhungGhiChu>
    );
  }

  if (bong.kieu === 'vuotTran') {
    return (
      <div className='rounded-ws-block border border-ws-void-fg/25 bg-ws-void-bg px-3 py-2.5'>
        <p className='flex gap-1.5 text-ws-meta leading-snug text-ws-void-fg'>
          <AlertCircle className='mt-[2px] h-3.5 w-3.5 shrink-0' />
          {/* Câu chữ NGUYÊN VĂN của máy chủ: nó đã nói rõ đã dùng bao nhiêu trên
              bao nhiêu và làm mới lúc nào. Viết lại ở đây là tự hẹn một ngày hai
              bên nói hai kiểu. */}
          <span>{bong.chu}</span>
        </p>
        <p className='mt-1.5 pl-5 text-ws-nano leading-snug text-ws-ink-soft'>
          Gõ <span className='font-medium'>/usage</span> để xem chi tiết mức dùng
          hôm nay — lệnh đó chỉ tra số liệu nên không tốn thêm lượt nào.
        </p>
      </div>
    );
  }

  return <BangMucDung d={bong.duLieu} />;
}

/**
 * Bảng mức dùng trong ngày.
 *
 * ⚠ Hai chỗ dễ vẽ ra điều sai sự thật, cả hai đều đã có bài kiểm ở máy chủ giữ
 * ý nghĩa, nên đừng "đơn giản hoá" lại:
 *  • `tranNgay === 0` là KHÔNG giới hạn — không phải "trần bằng không".
 *  • `conLai === null` đi kèm đúng trường hợp đó, và nó KHÔNG phải "còn 0 lượt".
 *    Rơi về `conLai ?? 0` là báo hết lượt cho một người đang không bị giới hạn.
 */
function BangMucDung({ d }: { d: NhanUsageResponse }) {
  const khongGioiHan = d.tranNgay === 0;

  return (
    <KhungGhiChu
      icon={<Gauge className='h-3.5 w-3.5' />}
      tieuDe='Mức dùng của bạn hôm nay'
    >
      <div className='mt-1.5 divide-y divide-ws-line-soft'>
        <DongSo
          nhan='Lượt đã hỏi'
          giaTri={
            khongGioiHan
              ? `${soVN.format(d.luotHomNay)} lượt (không giới hạn)`
              : `${soVN.format(d.luotHomNay)}/${soVN.format(d.tranNgay)} lượt · còn ${soVN.format(d.conLai ?? 0)}`
          }
        />
        <DongSo nhan='Token vào' giaTri={soVN.format(d.tokenVaoHomNay)} />
        <DongSo nhan='Token ra' giaTri={soVN.format(d.tokenRaHomNay)} />
        <DongSo
          nhan='Chi phí ước tính'
          giaTri={`${tienUSD.format(d.chiPhiUocTinhUSD)} USD`}
        />
        <DongSo nhan='Làm mới lúc' giaTri={mocLamMoiVN(d.mocReset)} />
      </div>

      {/* Ghi chú của máy chủ hiện NGUYÊN VĂN: dòng đầu là lời cảnh báo "ước tính
          chứ không phải hoá đơn", dòng sau (nếu có) báo trong ngày có model
          nằm ngoài bảng giá. Tóm tắt lại ở đây là làm nhẹ đi đúng phần cảnh
          báo. */}
      {/* Khoá theo chỉ số: danh sách này chỉ được vẽ ra rồi thôi, không bao giờ
          xáo trộn hay chèn thêm, nên chỉ số là khoá ổn định — mà nội dung thì
          không, hai dòng ghi chú trùng chữ sẽ thành hai khoá trùng nhau. */}
      {d.ghiChu.map((c, i) => (
        <p
          key={i}
          className='mt-2 text-ws-nano leading-snug text-ws-ink-ghost'
        >
          {c}
        </p>
      ))}
    </KhungGhiChu>
  );
}
