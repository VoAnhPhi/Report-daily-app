import { APIRouters } from '../APIRouters';
import { api, APIError } from '../index';
import { AuthUser } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-url';
import {
  NhanChatPayload,
  NhanConversationDetail,
  NhanConversationListResponse,
  NhanConversationSummary,
  NhanDoiNguoiPhuTrachPayload,
  NhanMentionSearchResult,
  NhanProposalDto,
  NhanStreamEvent,
  NhanUsageResponse,
} from '@/types/nhan-vien-nhan.type';

export interface GetNhanConversationsQuery {
  /** Số hội thoại mỗi lần lấy. Backend mặc định 30. */
  limit?: number;
  /** Con trỏ ISO lấy từ `nextCursor` của trang trước; bỏ trống = trang đầu. */
  cursor?: string;
}

/**
 * Client HTTP cho trợ lý "Nhân viên Nhàn". Chỉ gói các route JSON — route chat
 * (SSE) và route tải Excel (nhị phân) nằm ngoài, xem cuối tệp.
 */
export const createNhanVienNhanApis = ({
  accessToken,
  user,
}: {
  accessToken?: string;
  user?: AuthUser;
}) => {
  return {
    get: {
      /** Danh sách hội thoại, phân trang bằng con trỏ (mới nhất trước). */
      getConversations: async (
        query?: GetNhanConversationsQuery,
      ): Promise<NhanConversationListResponse> => {
        const params = new URLSearchParams();
        if (query?.limit) params.set('limit', String(query.limit));
        if (query?.cursor) params.set('cursor', query.cursor);
        const url = `${APIRouters.nhanVienNhan.conversations}${
          params.toString() ? `?${params.toString()}` : ''
        }`;

        const response = await api.get<NhanConversationListResponse>(url, {
          accessToken,
          user,
        });
        return response.data;
      },
      /** Một hội thoại kèm TOÀN BỘ lượt trao đổi (backend không phân trang tin nhắn). */
      getConversation: async (
        id: string,
      ): Promise<NhanConversationDetail> => {
        const response = await api.get<NhanConversationDetail>(
          APIRouters.nhanVienNhan.conversationById(id),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      /**
       * Gợi ý cho ô soạn khi gõ `@` — trả về CẢ người lẫn việc trong một lần
       * gọi, nên UI chỉ cần một truy vấn duy nhất cho mọi loại nhắc tên.
       */
      searchMentions: async (
        q: string,
        limit: number = 8,
      ): Promise<NhanMentionSearchResult> => {
        const params = new URLSearchParams();
        params.set('q', q);
        params.set('limit', String(limit));
        const response = await api.get<NhanMentionSearchResult>(
          `${APIRouters.nhanVienNhan.mentions}?${params.toString()}`,
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      /**
       * Mức dùng trong ngày của chính người gọi — nguồn của lệnh `/usage`.
       *
       * ⚠ Bản thân lời gọi này KHÔNG tốn một lượt hỏi nào: nó chỉ đếm trong CSDL
       * chứ không đánh thức model. Đó là lý do lệnh `/usage` được phép gõ ngay
       * cả khi người dùng đã chạm trần ngày.
       */
      getUsage: async (): Promise<NhanUsageResponse> => {
        const response = await api.get<NhanUsageResponse>(
          APIRouters.nhanVienNhan.usage,
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
    },
    post: {
      /** Mở hội thoại rỗng. Tiêu đề do backend đặt sau lượt chat đầu tiên. */
      createConversation: async (): Promise<NhanConversationSummary> => {
        const response = await api.post<NhanConversationSummary>(
          APIRouters.nhanVienNhan.conversations,
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      /** Chấp thuận một đề xuất — đây mới là lúc dữ liệu thật bị ghi. */
      confirmProposal: async (
        proposalId: string,
      ): Promise<NhanProposalDto> => {
        const response = await api.post<NhanProposalDto>(
          APIRouters.nhanVienNhan.proposalConfirm(proposalId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      cancelProposal: async (proposalId: string): Promise<NhanProposalDto> => {
        const response = await api.post<NhanProposalDto>(
          APIRouters.nhanVienNhan.proposalCancel(proposalId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
    },
    patch: {
      /** Đổi tên hội thoại (người dùng tự đặt, ghi đè tiêu đề backend sinh ra). */
      renameConversation: async (
        id: string,
        title: string,
      ): Promise<NhanConversationSummary> => {
        const response = await api.patch<NhanConversationSummary>(
          APIRouters.nhanVienNhan.conversationById(id),
          {
            accessToken,
            user,
            data: { title },
          },
        );
        return response.data;
      },
      /**
       * Đổi người phụ trách chính của một đề xuất CHƯA chạy.
       *
       * Trả về đúng hình dạng như `confirmProposal`/`cancelProposal` — cả bản
       * ghi đề xuất đã cập nhật, đã đi qua `NhanProposalResponseDto` — chứ
       * không phải một mẩu `{ ok: true }`. Đó là chỗ dựa để giao diện THAY
       * nguyên bản ghi cũ bằng bản trả về: dòng "Phụ trách chính" và danh sách
       * cảnh báo đã được máy chủ tính lại trong cùng một lần ghi, nên client
       * tuyệt đối không tự vẽ lại hai thứ đó. Vẽ lại là mở đường cho thẻ nói
       * một đằng còn thứ sắp chạy lại là một nẻo.
       *
       * Lỗi đi ra ngoài NGUYÊN VẸN dưới dạng `APIError` (giữ nguyên câu tiếng
       * Việt của máy chủ và mã HTTP): 400 khi bản nháp không còn chờ duyệt / đã
       * quá hạn / sai loại / người nhận không tồn tại hoặc đã bị khoá, 403 khi
       * bản nháp không thuộc về người đang hỏi, 404 khi không tìm thấy. Nuốt
       * chúng lại thành một câu chung chung ở tầng này là lấy mất của người
       * dùng thứ duy nhất nói cho họ biết phải làm gì tiếp.
       */
      doiNguoiPhuTrachProposal: async (
        proposalId: string,
        nguoiPhuTrachId: string,
      ): Promise<NhanProposalDto> => {
        const payload: NhanDoiNguoiPhuTrachPayload = { nguoiPhuTrachId };
        const response = await api.patch<NhanProposalDto>(
          APIRouters.nhanVienNhan.proposalAssignee(proposalId),
          {
            accessToken,
            user,
            data: payload,
          },
        );
        return response.data;
      },
    },
    delete: {
      deleteConversation: async (id: string): Promise<{ ok: true }> => {
        const response = await api.delete<{ ok: true }>(
          APIRouters.nhanVienNhan.conversationById(id),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
    },
  };
};

/* ------------------------------------------------------------------ *
 * Luồng chat (SSE)
 *
 * KHÔNG dùng được `EventSource`: nó chỉ biết GET và không đính kèm được header
 * `Authorization` (chuẩn EventSource không có chỗ cho header), trong khi route
 * này là POST + JWT super-admin. Cũng không đi qua axios được: axios chỉ trả
 * kết quả khi phản hồi đã xong, tức mất sạch ý nghĩa của streaming.
 *
 * => Tự đọc `fetch().body` bằng reader + tự tách khung SSE.
 * ------------------------------------------------------------------ */

/** Thông điệp lỗi mặc định khi không moi được câu tiếng Việt nào từ backend. */
const LOI_MAC_DINH = 'Không kết nối được với Nhân viên Nhàn. Vui lòng thử lại.';

/**
 * Moi thông điệp lỗi tiếng Việt ra khỏi thân phản hồi lỗi.
 * Nest trả `{ message: string }` hoặc `{ message: string[] }` (lỗi validate),
 * nhưng khi sập sớm (proxy/gateway) thân có thể là HTML thuần — nên phải thử
 * JSON.parse trong try/catch chứ không tin vào content-type.
 */
const docThongDiepLoi = (raw: string): string => {
  if (!raw || !raw.trim()) return LOI_MAC_DINH;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const message = (parsed as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
      if (Array.isArray(message)) {
        const joined = message.filter((m) => typeof m === 'string').join(', ');
        if (joined.trim()) return joined;
      }
    }
  } catch {
    // Không phải JSON — rơi xuống nhánh dưới.
  }
  // Thân không phải JSON: chỉ nhận khi nó ngắn và không phải HTML, tránh dội cả
  // trang lỗi của nginx vào toast.
  const goc = raw.trim();
  if (goc.length <= 200 && !goc.startsWith('<')) return goc;
  return LOI_MAC_DINH;
};

/**
 * Dựng sự kiện đã phân loại từ tên + JSON đã giải mã.
 * Trả `null` cho tên lạ: backend có thể thêm sự kiện mới (heartbeat, telemetry)
 * bất cứ lúc nào — bỏ qua thì client cũ vẫn chạy, còn ném lỗi thì đứt luồng.
 */
const dungSuKien = (
  ten: string,
  duLieu: unknown,
): NhanStreamEvent | null => {
  switch (ten) {
    case 'trang_thai':
      return {
        event: 'trang_thai',
        data: duLieu as Extract<
          NhanStreamEvent,
          { event: 'trang_thai' }
        >['data'],
      };
    case 'cong_cu':
      return {
        event: 'cong_cu',
        data: duLieu as Extract<NhanStreamEvent, { event: 'cong_cu' }>['data'],
      };
    case 'chu':
      return {
        event: 'chu',
        data: duLieu as Extract<NhanStreamEvent, { event: 'chu' }>['data'],
      };
    case 'nguon':
      return {
        event: 'nguon',
        data: duLieu as Extract<NhanStreamEvent, { event: 'nguon' }>['data'],
      };
    case 'de_xuat':
      return {
        event: 'de_xuat',
        data: duLieu as Extract<NhanStreamEvent, { event: 'de_xuat' }>['data'],
      };
    case 'xong':
      return {
        event: 'xong',
        data: duLieu as Extract<NhanStreamEvent, { event: 'xong' }>['data'],
      };
    case 'loi':
      return {
        event: 'loi',
        data: duLieu as Extract<NhanStreamEvent, { event: 'loi' }>['data'],
      };
    default:
      return null;
  }
};

/**
 * Tách MỘT khung SSE (đã cắt theo `\n\n`) thành sự kiện.
 *
 * Theo chuẩn SSE: dòng bắt đầu bằng `:` là chú thích (server dùng làm nhịp tim
 * giữ kết nối qua proxy) — bỏ. Nhiều dòng `data:` trong cùng khung phải NỐI
 * bằng `\n` chứ không phải ghi đè nhau. Sau `data:` có đúng một dấu cách tuỳ
 * chọn cần bỏ (bỏ nhiều hơn sẽ ăn mất khoảng trắng đầu của `delta`).
 */
const phanTichKhung = (khung: string): NhanStreamEvent | null => {
  let ten = '';
  const duLieuDong: string[] = [];

  for (const dong of khung.split('\n')) {
    if (!dong || dong.startsWith(':')) continue;
    if (dong.startsWith('event:')) {
      ten = dong.slice('event:'.length).trim();
      continue;
    }
    if (dong.startsWith('data:')) {
      const phan = dong.slice('data:'.length);
      duLieuDong.push(phan.startsWith(' ') ? phan.slice(1) : phan);
    }
    // `id:` / `retry:` không dùng ở luồng này — bỏ qua có chủ đích.
  }

  if (!ten || duLieuDong.length === 0) return null;

  const raw = duLieuDong.join('\n');
  try {
    return dungSuKien(ten, JSON.parse(raw) as unknown);
  } catch {
    // Một khung hỏng không được phép giết cả luồng — bỏ khung, đọc tiếp.
    console.warn('[nhan-vien-nhan] Bỏ qua khung SSE không đọc được:', ten);
    return null;
  }
};

/**
 * Cắt mọi khung ĐÃ HOÀN CHỈNH trong bộ đệm, phát ra ngoài, trả lại phần đuôi
 * còn dở. Chuẩn hoá `\r\n` trước vì một số proxy viết lại xuống dòng kiểu CRLF,
 * khi đó tách theo `\n\n` sẽ không bao giờ khớp và luồng "đứng hình".
 */
const xuLyDem = (
  dem: string,
  onEvent: (event: NhanStreamEvent) => void,
): string => {
  const chuanHoa = dem.replace(/\r\n/g, '\n');
  const phan = chuanHoa.split('\n\n');
  // Phần tử cuối luôn là khung chưa trọn (hoặc chuỗi rỗng) — giữ lại.
  const con = phan.pop() ?? '';
  for (const khung of phan) {
    if (!khung.trim()) continue;
    const suKien = phanTichKhung(khung);
    if (suKien) onEvent(suKien);
  }
  return con;
};

/** Nhận diện hủy chủ động qua AbortController (fetch ném `AbortError`). */
const laHuyBo = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === 'AbortError';
};

export async function streamNhanChat(opts: {
  accessToken: string;
  conversationId: string;
  body: NhanChatPayload;
  signal?: AbortSignal;
  onEvent: (event: NhanStreamEvent) => void;
}): Promise<void> {
  const { accessToken, conversationId, body, signal, onEvent } = opts;

  const url = `${getApiBaseUrl()}${APIRouters.nhanVienNhan.chat(conversationId)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal,
      // Luồng dài — chặn mọi lớp cache ở giữa, nếu không proxy có thể gom đủ
      // phản hồi rồi mới trả một cục, mất hiệu ứng chữ chạy.
      cache: 'no-store',
    });
  } catch (error: unknown) {
    if (laHuyBo(error)) return; // người dùng bấm dừng — không phải lỗi
    throw new Error(
      error instanceof Error && error.message
        ? `Không gọi được Nhân viên Nhàn: ${error.message}`
        : LOI_MAC_DINH,
    );
  }

  if (!response.ok) {
    // Lỗi ở đây là JSON/HTML thường, KHÔNG phải SSE — đọc trọn thân rồi moi câu
    // tiếng Việt ra. Đọc bằng .text() an toàn vì thân lỗi luôn hữu hạn.
    const raw = await response.text().catch(() => '');
    /**
     * Ném `APIError` (có `statusCode`) chứ không `Error` trần.
     *
     * Trần hạn mức ngày về đây dưới dạng 429 kèm một câu tiếng Việt tử tế; khung
     * chat phải phân biệt được "hết lượt hôm nay" với "mạng hỏng" để hiện một
     * bong bóng gợi ý `/usage` thay vì một toast đỏ. Nhận diện bằng cách dò chuỗi
     * trong `message` là cách chắc chắn sẽ sai vào ngày ai đó sửa câu chữ ở máy
     * chủ — mã trạng thái thì không đổi theo lời văn.
     *
     * Dùng lại `APIError` sẵn có (chứ không đẻ một lớp lỗi thứ hai) để cả kho
     * chỉ có MỘT cách hỏi "lỗi này mang mã HTTP nào".
     */
    throw new APIError(docThongDiepLoi(raw), response.status);
  }

  if (!response.body) {
    throw new Error('Máy chủ không trả về luồng dữ liệu.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  // Bộ đệm khung dở: một lần `read()` KHÔNG tương ứng một khung SSE. Ranh giới
  // gói TCP có thể cắt ngang giữa `data: {"del` và `ta":"xin"}`, nên phải giữ
  // phần đuôi chưa thấy `\n\n` lại và ghép với lần đọc kế. Đây chính là chỗ dễ
  // sai nhất của SSE tự phân tích: xử lý từng chunk độc lập sẽ mất chữ ngẫu
  // nhiên khi mạng chậm.
  let dem = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (value) {
        // `stream: true` để TextDecoder giữ lại byte UTF-8 dở dang — tiếng Việt
        // có dấu là 2–3 byte, cắt giữa ký tự sẽ ra "" nếu giải mã từng chunk rời.
        dem += decoder.decode(value, { stream: true });
        dem = xuLyDem(dem, onEvent);
      }

      if (done) {
        // Xả nốt byte còn kẹt trong decoder rồi vét khung cuối (một số server
        // đóng kết nối mà không gửi `\n\n` sau khung `xong`).
        dem += decoder.decode();
        dem = xuLyDem(dem, onEvent);
        const con = dem.trim();
        if (con) {
          const suKien = phanTichKhung(con);
          if (suKien) onEvent(suKien);
        }
        break;
      }
    }
  } catch (error: unknown) {
    if (laHuyBo(error)) return; // hủy giữa chừng là hành vi bình thường
    throw new Error(
      error instanceof Error && error.message
        ? `Luồng trả lời bị gián đoạn: ${error.message}`
        : 'Luồng trả lời bị gián đoạn.',
    );
  } finally {
    // Nhả kết nối kể cả khi thoát sớm; `cancel` có thể ném nếu stream đã đóng.
    reader.cancel().catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ *
 * Tải Excel của một lượt trả lời
 * ------------------------------------------------------------------ */

/** Tên tệp dùng khi backend không gửi `Content-Disposition` hợp lệ. */
const TEN_TEP_MAC_DINH = 'nhan-vien-nhan.xlsx';

/**
 * Moi tên tệp từ header `Content-Disposition`.
 * Ưu tiên `filename*=UTF-8''…` (RFC 5987) vì tên tệp tiếng Việt có dấu chỉ đi
 * qua được ở dạng percent-encode; `filename="…"` chỉ là bản dự phòng ASCII.
 */
const docTenTep = (
  contentDisposition: string | null,
  duPhong?: string,
): string => {
  if (!contentDisposition) return duPhong || TEN_TEP_MAC_DINH;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8?.[1]) {
    try {
      const ten = decodeURIComponent(utf8[1].trim());
      if (ten) return ten;
    } catch {
      // Percent-encode hỏng — rơi xuống `filename=`.
    }
  }

  const thuong = /filename="?([^";]+)"?/i.exec(contentDisposition);
  const ten = thuong?.[1]?.trim();
  return ten || duPhong || TEN_TEP_MAC_DINH;
};

/**
 * Tải tệp Excel do Nhàn dựng cho một lượt trả lời.
 *
 * Vì sao KHÔNG dùng `downloadFile` ở `lib/utils/download-utils.ts`: helper đó
 * nhận một URL công khai và `fetch` trần, không đính header `Authorization` —
 * route này là super-admin nên sẽ trả 401 và helper lại "dự phòng" bằng cách mở
 * tab mới, tức người dùng thấy một tab trắng thay vì lỗi. Ở đây phải tự gọi
 * fetch có token rồi mới lưu blob, nên helper mới nằm cạnh chính API của nó.
 */
export async function taiExcelTuLuot(opts: {
  accessToken: string;
  messageId: string;
  /**
   * Tên tệp máy chủ đã báo trong `NhanMessageDto.taiVe`. Dùng khi
   * `content-disposition` không đọc được — hiếm, nhưng nếu xảy ra thì người
   * dùng nhận một tệp tên chung chung thay vì đúng tên đã hiện trên nút.
   */
  tenTepDuPhong?: string;
}): Promise<void> {
  const { accessToken, messageId, tenTepDuPhong } = opts;

  const url = `${getApiBaseUrl()}${APIRouters.nhanVienNhan.messageExport(messageId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    throw new Error(
      raw ? docThongDiepLoi(raw) : 'Không tải được tệp Excel. Vui lòng thử lại.',
    );
  }

  const tenTep = docTenTep(
    response.headers.get('content-disposition'),
    tenTepDuPhong,
  );
  const blob = await response.blob();

  // Lưu qua object URL: thẻ <a download> trỏ thẳng vào API sẽ mất header
  // Authorization (trình duyệt điều hướng chứ không fetch) → 401.
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = tenTep;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Thu hồi trễ: Safari cần object URL còn sống một nhịp sau click.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
