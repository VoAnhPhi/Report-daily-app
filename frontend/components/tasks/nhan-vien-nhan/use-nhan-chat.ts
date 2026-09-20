'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { APIError } from '@/app/api';
import { streamNhanChat } from '@/app/api/nhan-vien-nhan';
import { nhanKeys } from '@/hooks/queries/nhan-vien-nhan-queries';
import type {
  NhanConversationDetail,
  NhanGiaiDoan,
  NhanMessageDto,
  NhanSource,
  NhanToolTrace,
} from '@/types/nhan-vien-nhan.type';

/** Lượt trả lời đang chảy về, chưa có trong CSDL. */
export interface LuotDangChay {
  /**
   * Số thứ tự tăng dần của lượt trong vòng đời hook.
   *
   * ⚠ Đây là chốt chống tranh chấp, không phải số trang trí. Một lượt bị bỏ dở
   * (bấm Dừng, đổi hội thoại) vẫn còn `onEvent` và cả đoạn chờ máy chủ ghi nốt
   * chạy tiếp SAU khi người dùng đã mở lượt mới. Không có mã lượt thì những
   * đoạn mã "muộn" đó sẽ ghi đè trạng thái của lượt MỚI — tệ nhất là dòng dọn
   * dẹp cuối cùng xoá sạch câu trả lời đang chảy của lượt mới.
   */
  luot: number;
  /**
   * Hội thoại mà lượt này thuộc về.
   *
   * ⚠ Không có trường này thì bong bóng của hội thoại CŨ hiện trong hội thoại
   * MỚI, ô soạn của hội thoại mới bị khoá, và nút Gửi biến thành nút Dừng của
   * một lượt không thuộc về nó.
   */
  hoiThoaiId: string;
  cauHoi: string;
  vanBan: string;
  giaiDoan: NhanGiaiDoan;
  model: string;
  toolTrace: NhanToolTrace[];
  nguon: NhanSource[];
  /**
   * Luồng phía trình duyệt đã đứt (bấm Dừng / sự kiện `loi`) nhưng máy chủ VẪN
   * đang chạy nốt lượt và sẽ ghi câu trả lời xuống CSDL. Trong lúc này ô soạn
   * phải tiếp tục khoá, nếu không người dùng gửi câu thứ hai và hai lượt cùng
   * ghi vào một hội thoại — thứ tự hiển thị thành Hỏi 1 → Hỏi 2 → Trả lời 1 →
   * Trả lời 2 và không sửa được lúc đọc.
   */
  dangLuu: boolean;
}

/** Bao lâu hỏi lại máy chủ một lần khi chờ nó ghi nốt lượt đã bị bỏ dở. */
const NHIP_CHO_GHI_MS = 1_500;
/** Trần số lần hỏi lại — quá mốc này thì mở khoá ô soạn, đừng giam người dùng. */
const SO_LAN_CHO_GHI = 12;

/**
 * Bản ghi giả cho CÂU HỎI của một lượt.
 *
 * Máy chủ ghi câu hỏi xuống CSDL trước khi gọi model nhưng KHÔNG phát nó ra
 * dòng SSE (sự kiện `xong` chỉ mang bản ghi trả lời). Vì vậy khi vá cache sau
 * `xong`, phần câu hỏi phải tự dựng lại ở đây, nếu không cả lượt hiện ra thiếu
 * đầu cho tới lần nạp lại kế tiếp.
 *
 * `id` bám theo id của bản ghi trả lời nên gọi hai lần vẫn ra đúng một khoá —
 * không đẻ thêm dòng trùng nếu sự kiện `xong` về hai lần.
 */
function cauHoiTam(
  conversationId: string,
  noiDung: string,
  idTraLoi: string,
): NhanMessageDto {
  return {
    id: `tam-hoi-${idTraLoi}`,
    conversationId,
    role: 'user',
    content: noiDung,
    toolTrace: [],
    sources: [],
    mentionedUserIds: [],
    mentionedTaskIds: [],
    proposals: [],
    createdAt: new Date().toISOString(),
    taiVe: null,
  };
}

/**
 * Vá cả lượt hỏi–đáp vào cache NGAY khi có sự kiện `xong`.
 *
 * ⚠ Vì sao không chỉ `invalidateQueries` rồi đợi: xoá trạng thái đang chảy diễn
 * ra tức thì, còn bản ghi thật phải đi hết một vòng mạng mới về. Khoảng giữa hai
 * mốc đó, khung chat không còn bong bóng tạm mà cũng chưa có bản ghi mới, nên cả
 * lượt vừa hỏi vừa đáp nhấp nháy biến mất một nhịp — với lượt ĐẦU TIÊN của một
 * hội thoại thì danh sách rỗng lại kéo panel về màn Chào. Máy chủ đã gửi sẵn bản
 * ghi trong `data.message`; dùng nó là hết nhấp nháy.
 */
function vaLuotVaoCache(
  qc: QueryClient,
  conversationId: string,
  cauHoi: string,
  banGhi: NhanMessageDto,
): void {
  qc.setQueryData<NhanConversationDetail>(
    nhanKeys.conversation(conversationId),
    (cu) => {
      if (!cu) return cu;

      // Bỏ bản ghi trả lời nếu đã có sẵn (sự kiện `xong` về hai lần, hoặc một
      // lần nạp lại chen ngang) — vá phải bình phương, không được nhân đôi.
      const conLai = cu.messages.filter((m) => m.id !== banGhi.id);

      /**
       * Câu hỏi CÓ THỂ đã lọt vào cache: máy chủ ghi nó trước khi gọi model, nên
       * một lần nạp lại chen ngang giữa lượt sẽ kéo về bản THẬT. Chỉ xét phần
       * ĐUÔI — các tin đứng sau lượt trả lời cuối cùng — để một câu hỏi giống hệt
       * hỏi lại ở lượt sau không bị nhận nhầm là đã có.
       */
      const viTriTraLoiCuoi = conLai.map((m) => m.role).lastIndexOf('assistant');
      const duoi = conLai.slice(viTriTraLoiCuoi + 1);
      const daCoCauHoi = duoi.some(
        (m) => m.role === 'user' && m.content === cauHoi,
      );

      return {
        ...cu,
        messages: daCoCauHoi
          ? [...conLai, banGhi]
          : [...conLai, cauHoiTam(conversationId, cauHoi, banGhi.id), banGhi],
      };
    },
  );
}

/**
 * Trạng thái một lượt chat đang chảy.
 *
 * Tách khỏi TanStack Query là cố ý: trong lúc phát trực tiếp, nguồn sự thật là
 * dòng SSE chứ không phải cache truy vấn. Nhét từng ký tự vào cache sẽ bắn ra
 * hàng nghìn lần vẽ lại cho MỌI thứ đang theo dõi khoá đó. Khi có sự kiện
 * `xong`, ta vá bản ghi thật vào cache đúng một lần và trạng thái cục bộ này
 * biến mất, nhường lại cho dữ liệu máy chủ.
 */
export function useNhanChat(hoiThoaiDangXem: string | null) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [dangChay, setDangChay] = useState<LuotDangChay | null>(null);
  const huyRef = useRef<AbortController | null>(null);
  /** Khung chat còn gắn không — mọi vòng chờ phải tự thoát khi nó bị gỡ. */
  const conSongRef = useRef(true);
  /** Mã lượt gần nhất; tăng một đơn vị ở mỗi lần gửi. */
  const soLuotRef = useRef(0);

  /**
   * Hội thoại người dùng ĐANG mở, đọc được từ trong các vòng chờ bất đồng bộ.
   *
   * ⚠ Phải là ref chứ không phải giá trị closure: đoạn chờ máy chủ ghi nốt lượt
   * bắt đầu chạy từ một lần kết xuất CŨ và sống tiếp hàng chục giây, nên nó chỉ
   * thấy được hội thoại tại thời điểm bấm Gửi. Muốn biết người dùng đã rời đi
   * hay chưa thì phải hỏi một ô nhớ luôn mang giá trị mới nhất.
   */
  const dangXemRef = useRef(hoiThoaiDangXem);
  useEffect(() => {
    dangXemRef.current = hoiThoaiDangXem;
  }, [hoiThoaiDangXem]);

  /**
   * Dọn lúc gỡ khung chat.
   *
   * ⚠ Không có hàm dọn này thì đóng panel (hoặc rời màn) giữa lúc đang phát
   * trực tiếp sẽ để nguyên một kết nối SSE mở: `fetch` không tự huỷ theo vòng
   * đời component, nên trình duyệt giữ luôn một luồng chết cho tới khi máy chủ
   * đóng — mở ra đóng vào vài lần là rò đủ để chạm trần kết nối của tên miền.
   */
  useEffect(() => {
    conSongRef.current = true;
    return () => {
      conSongRef.current = false;
      huyRef.current?.abort();
      huyRef.current = null;
    };
  }, []);

  const dung = useCallback(() => {
    huyRef.current?.abort();
    huyRef.current = null;
    // KHÔNG xoá `dangChay` ở đây. Đóng kết nối làm máy chủ hủy lời gọi model,
    // NHƯNG nó vẫn ghi phần chữ đã sinh được xuống CSDL rồi mới nhả khoá
    // một-lượt-mỗi-hội-thoại. Giữ nguyên phần đã hiện để đoạn chờ ghi thay bằng
    // bản ghi thật: xoá ngay là câu trả lời dở nhấp nháy rồi mất (bản đã lưu
    // chỉ hiện lại sau khi tải lại trang), mà ô soạn mở khoá sớm thì câu kế
    // tiếp đâm vào khoá của máy chủ và nhận 409.
    setDangChay((v) => (v ? { ...v, giaiDoan: 'dang_viet', dangLuu: true } : v));
  }, []);

  /**
   * Chờ máy chủ ghi xong một lượt đã bị bỏ dở phía trình duyệt.
   *
   * Bấm Dừng đóng kết nối; máy chủ bắt `close` và hủy lời gọi model, nhưng nó
   * VẪN ghi câu hỏi + phần trả lời đã sinh được, và chỉ nhả khoá
   * một-lượt-mỗi-hội-thoại sau khi ghi xong. Hai việc đó mất một nhịp mạng, mà
   * đúng nhịp đó là lúc màn hình không còn bong bóng tạm cũng chưa có bản ghi
   * thật. Vì vậy hỏi lại theo nhịp cho tới khi thấy đủ số lượt rồi mới mở khoá
   * ô soạn — mở sớm là câu kế tiếp đâm vào khoá và nhận 409. Có trần thời gian
   * để một lượt hỏng phía máy chủ không giam người dùng mãi.
   *
   * ⚠ Trần thời gian là ĐƯỜNG CÙNG, không phải nhịp làm việc bình thường: mỗi
   * lần chạm trần là người dùng ngồi im 18 giây. Hai chốt bên dưới giữ cho vòng
   * lặp thoát đúng lúc thay vì đếm hết vòng.
   */
  const choMayChuGhiXong = useCallback(
    async (conversationId: string, soTinDich: number): Promise<void> => {
      const khoa = nhanKeys.conversation(conversationId);
      for (let i = 0; i < SO_LAN_CHO_GHI; i += 1) {
        await new Promise<void>((xong) => {
          setTimeout(xong, NHIP_CHO_GHI_MS);
        });
        if (!conSongRef.current) return;
        /**
         * Người dùng đã rời hội thoại này (chọn cuộc khác, hoặc bấm "Cuộc trò
         * chuyện mới") — thoát ngay, đừng đếm hết 12 nhịp.
         *
         * Chờ tiếp không còn cứu được gì: mục đích của vòng chờ là giữ khoá ô
         * soạn cho tới khi máy chủ nhả khoá một-lượt-mỗi-hội-thoại, mà khoá đó
         * là khoá của hội thoại NÀY. Câu hỏi kế tiếp sẽ đi vào hội thoại khác,
         * tức khoá khác, nên không có 409 nào để tránh — chỉ còn cái giá là ô
         * soạn bị khoá thêm mười mấy giây mà giao diện không hề nói vì sao.
         */
        if (dangXemRef.current !== conversationId) return;
        /**
         * ⚠ `refetchType: 'all'` chứ không để mặc định ('active').
         *
         * Vòng lặp này đo tiến độ của máy chủ bằng chính cache của truy vấn chi
         * tiết, nên nó chỉ đúng khi lệnh nạp lại THẬT SỰ chạy. Mặc định của
         * `invalidateQueries` chỉ nạp lại truy vấn còn người theo dõi: khi khung
         * chat đã chuyển sang hội thoại khác thì truy vấn của hội thoại NÀY mất
         * hết observer, thành inactive, và lệnh mặc định chỉ đánh dấu "cũ" rồi
         * trả về ngay — `getQueryData` ngay dưới đọc lại đúng bản cache cũ,
         * không bao giờ đủ số tin, nên vòng lặp đếm hết trần 18 giây dù máy chủ
         * đã ghi xong từ nhịp đầu.
         *
         * Chốt thoát sớm ở trên đã cắt phần lớn trường hợp đó, nhưng nó dựa vào
         * một ô nhớ được cập nhật bằng hiệu ứng (tức chậm hơn lần kết xuất đã
         * làm truy vấn thành inactive một nhịp), còn dòng này thì không dựa vào
         * gì cả. Đây là chỗ rẻ để phòng thủ hai lớp.
         */
        await qc.invalidateQueries({ queryKey: khoa, refetchType: 'all' });
        if (!conSongRef.current) return;
        const chiTiet = qc.getQueryData<NhanConversationDetail>(khoa);
        // Cache của hội thoại này không còn (bị xoá, hoặc đã bị dọn) — chờ tiếp
        // cũng chẳng ai thấy kết quả.
        if (!chiTiet) return;
        if (chiTiet.messages.length >= soTinDich) return;
      }
    },
    [qc],
  );

  /**
   * `conversationId` là THAM SỐ chứ không phải closure: khung chat có nhánh
   * "chưa có hội thoại thì tạo rồi gửi luôn", mà id vừa tạo chưa kịp đi qua một
   * vòng render. Nhận thẳng id làm nhánh đó khỏi phải đợi frame.
   *
   * ⚠ Hàm này NÉM LẠI lỗi thật (sau khi đã hiện thông báo) — ô soạn bắt lỗi đó
   * để trả chữ người dùng vừa gõ về chỗ cũ. Nuốt lỗi ở đây là mất trắng một câu
   * dài vừa soạn. Riêng đường "người dùng bấm Dừng" thì KHÔNG ném: câu hỏi đã
   * gửi đi rồi, trả chữ về ô soạn chỉ làm người dùng tưởng chưa gửi được.
   *
   * Ngoại lệ về THÔNG BÁO (không phải về việc ném): lỗi 429 — chạm trần hạn mức
   * — không toast ở đây, vì khung chat dựng cho nó một bong bóng đọc kỹ được.
   * Xem nhánh `catch` bên dưới.
   */
  const gui = useCallback(
    async (
      conversationId: string,
      dauVao: {
        noiDung: string;
        mentionedUserIds: string[];
        mentionedTaskIds: string[];
      },
    ) => {
      const accessToken = session?.accessToken;
      if (!accessToken || !conversationId) {
        const loi = new Error('Phiên đăng nhập đã hết hạn, hãy tải lại trang.');
        toast.error(loi.message);
        throw loi;
      }

      const luotNay = soLuotRef.current + 1;
      soLuotRef.current = luotNay;

      /** Chỉ đụng vào trạng thái nếu nó VẪN là của lượt này. */
      const capNhat = (
        f: (v: LuotDangChay) => LuotDangChay | null,
      ): void => {
        setDangChay((v) => (v && v.luot === luotNay ? f(v) : v));
      };
      const ketThuc = () => capNhat(() => null);

      // Số tin nhắn hội thoại PHẢI đạt tới sau lượt này: một câu hỏi + một câu
      // trả lời. Đọc trước khi gửi để đoạn chờ ghi có mốc mà so.
      const truoc = qc.getQueryData<NhanConversationDetail>(
        nhanKeys.conversation(conversationId),
      );
      const soTinDich = (truoc?.messages.length ?? 0) + 2;

      const ac = new AbortController();
      huyRef.current = ac;
      let daXong = false;
      let coLoi = false;
      setDangChay({
        luot: luotNay,
        hoiThoaiId: conversationId,
        cauHoi: dauVao.noiDung,
        vanBan: '',
        giaiDoan: 'dang_nghi',
        model: '',
        toolTrace: [],
        nguon: [],
        dangLuu: false,
      });

      try {
        await streamNhanChat({
          accessToken,
          conversationId,
          body: dauVao,
          signal: ac.signal,
          onEvent: (sk) => {
            switch (sk.event) {
              case 'trang_thai':
                capNhat((v) => ({
                  ...v,
                  giaiDoan: sk.data.giaiDoan,
                  model: sk.data.model,
                }));
                break;
              case 'chu':
                capNhat((v) => ({ ...v, vanBan: v.vanBan + sk.data.delta }));
                break;
              case 'cong_cu':
                capNhat((v) => ({
                  ...v,
                  toolTrace: [
                    ...v.toolTrace,
                    {
                      ten: sk.data.ten,
                      nhan: sk.data.nhan,
                      tomTat: sk.data.tomTat,
                      thanhCong: sk.data.thanhCong ?? true,
                    },
                  ],
                }));
                break;
              case 'nguon':
                capNhat((v) =>
                  v.nguon.some((n) => n.url === sk.data.url)
                    ? v
                    : { ...v, nguon: [...v.nguon, sk.data] },
                );
                break;
              case 'de_xuat':
                // Thẻ đề xuất chỉ hiện sau khi bản ghi thật về (sự kiện `xong`
                // mang kèm cả mảng đề xuất). Bắt nhánh này để union được xử lý
                // đủ, chứ không có việc gì phải làm ngay.
                break;
              case 'xong':
                daXong = true;
                // Vá bản ghi thật TRƯỚC khi xoá bong bóng tạm — đổi chỗ hai
                // dòng này là lượt vừa xong nhấp nháy biến mất một nhịp.
                vaLuotVaoCache(
                  qc,
                  conversationId,
                  dauVao.noiDung,
                  sk.data.message,
                );
                ketThuc();
                // Nạp lại để thay bản câu hỏi tự dựng bằng bản ghi thật và cập
                // nhật tiêu đề/thời điểm trong danh sách lịch sử. Chạy ngầm,
                // không nhấp nháy vì cache đã đúng nội dung.
                void qc.invalidateQueries({
                  queryKey: nhanKeys.conversations(),
                });
                break;
              case 'loi':
                coLoi = true;
                toast.error(sk.data.thongDiep);
                break;
            }
          },
        });
      } catch (error: unknown) {
        huyRef.current = null;
        ketThuc();
        // Máy chủ có thể đã ghi được câu hỏi (nó ghi trước khi gọi model) nên
        // nạp lại để màn hình khớp với thứ thật sự nằm trong CSDL.
        void qc.invalidateQueries({ queryKey: nhanKeys.conversations() });

        // Người bấm Dừng cũng ném AbortError — đó không phải lỗi để báo, và
        // càng không phải lý do trả chữ về ô soạn.
        const laHuy =
          error instanceof DOMException && error.name === 'AbortError';
        if (laHuy) return;

        /**
         * 429 KHÔNG toast ở đây — khung chat sẽ dựng một bong bóng cho nó.
         *
         * Đây là lúc người dùng chạm trần hạn mức (theo ngày hoặc theo phút);
         * máy chủ đã soạn sẵn một câu tiếng Việt nói rõ đã dùng bao nhiêu và bao
         * giờ được làm mới. Đẩy câu đó vào một toast biến mất sau vài giây là
         * cách chắc chắn nhất để người dùng không đọc kịp rồi hỏi lại lần nữa —
         * và lần nữa cũng 429. Bong bóng nằm đúng chỗ câu trả lời lẽ ra phải
         * hiện ra, đọc bao lâu cũng được, kèm gợi ý gõ `/usage`.
         *
         * Vẫn NÉM LẠI như mọi lỗi khác: đó là tín hiệu để ô soạn trả câu hỏi về
         * chỗ cũ, và cũng là đường để khung chat biết mà dựng bong bóng.
         */
        const laVuotTran = error instanceof APIError && error.statusCode === 429;
        if (!laVuotTran) {
          toast.error(
            error instanceof Error ? error.message : 'Không gửi được câu hỏi',
          );
        }
        throw error;
      }

      huyRef.current = null;

      /**
       * ⚠ Tới đây mà `daXong` vẫn false nghĩa là luồng kết thúc SẠCH nhưng
       * KHÔNG có sự kiện `xong`. Đúng hai đường đi lọt vào đây:
       *
       *   • Bấm Dừng — `streamNhanChat` nuốt `AbortError` và resolve bình
       *     thường, nên không nhánh `catch` nào chạy. Máy chủ hủy lời gọi model
       *     nhưng VẪN ghi lượt (phần chữ đã sinh được) rồi mới nhả khoá, nên
       *     phải chờ nó ghi xong. Xoá trạng thái ngay tại đây là vừa mất câu
       *     trả lời dở trên màn hình — bản đã lưu chỉ hiện lại sau khi tải lại
       *     trang — vừa mời người dùng gửi câu kế tiếp vào đúng lúc khoá của
       *     máy chủ còn giữ, tức nhận 409. (Vòng chờ tự thoát sớm khi người
       *     dùng đã rời hội thoại này — xem `choMayChuGhiXong`.)
       *
       *   • Một sự kiện `loi` do bộ điều khiển phát ở nhánh `catch` bao ngoài:
       *     header đã bay đi từ đầu nên không đổi được mã trạng thái nữa, lỗi
       *     đành về dưới dạng một sự kiện trên phản hồi 200 kết thúc sạch.
       *     Đường này lượt CHẾT hẳn, không có bản ghi trả lời nào sắp tới —
       *     chờ chỉ tổ giam ô soạn vô ích. (Lỗi do chính tác tử phát thì luôn
       *     có `xong` đi kèm, nên không rơi vào đây.)
       */
      if (!daXong) {
        if (!coLoi) {
          capNhat((v) => ({ ...v, dangLuu: true }));
          await choMayChuGhiXong(conversationId, soTinDich);
        }
        // Nạp lại trong CẢ hai trường hợp: máy chủ đã ghi ít nhất câu hỏi (nó
        // ghi trước khi gọi model), nên bỏ qua bước này là màn hình lệch hẳn
        // với CSDL cho tới lần tải trang sau.
        void qc.invalidateQueries({ queryKey: nhanKeys.conversations() });
      }
      ketThuc();
    },
    [choMayChuGhiXong, qc, session?.accessToken],
  );

  return { dangChay, gui, dung };
}

/**
 * Bản ghi giả cho lượt đang chảy, để phần hiển thị chỉ cần biết một kiểu.
 * `id` mang tiền tố `tam-` nên không bao giờ đụng uuid thật từ máy chủ.
 */
export function luotTamThoi(
  conversationId: string,
  d: LuotDangChay,
): { cauHoi: NhanMessageDto; traLoi: NhanMessageDto } {
  const chung = {
    conversationId,
    sources: [] as NhanSource[],
    mentionedUserIds: [],
    mentionedTaskIds: [],
    proposals: [],
    createdAt: new Date().toISOString(),
    taiVe: null,
  };
  return {
    cauHoi: {
      ...chung,
      id: 'tam-cau-hoi',
      role: 'user',
      content: d.cauHoi,
      toolTrace: [],
    },
    traLoi: {
      ...chung,
      id: 'tam-tra-loi',
      role: 'assistant',
      content: d.vanBan,
      toolTrace: d.toolTrace,
      sources: d.nguon,
      model: d.model || null,
    },
  };
}
