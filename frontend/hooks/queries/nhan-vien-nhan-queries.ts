'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { taskKeys } from './task-queries';
import {
  createNhanVienNhanApis,
  GetNhanConversationsQuery,
} from '@/app/api/nhan-vien-nhan';
import type { NhanConversationDetail } from '@/types/nhan-vien-nhan.type';

/**
 * Khóa cache của trợ lý "Nhân viên Nhàn".
 * Xếp theo tầng để `invalidateQueries` khớp TIỀN TỐ: dọn `conversations()` là
 * dọn cả danh sách lẫn từng chi tiết, không phải liệt kê từng khóa con.
 */
export const nhanKeys = {
  all: ['nhan-vien-nhan'] as const,
  conversations: () => [...nhanKeys.all, 'conversations'] as const,
  /** Danh sách cuộn vô hạn — `limit` vào khóa vì đổi limit là đổi hẳn trang. */
  conversationList: (limit?: number) =>
    [...nhanKeys.conversations(), 'list', limit ?? null] as const,
  conversation: (id: string) =>
    [...nhanKeys.conversations(), 'detail', id] as const,
  mentions: () => [...nhanKeys.all, 'mentions'] as const,
  mentionSearch: (q: string) => [...nhanKeys.mentions(), q] as const,
};

/** Client API Nhàn gắn token phiên hiện tại — gom boilerplate cho mọi hook. */
function useNhanApis() {
  const { data: session } = useSession();
  return createNhanVienNhanApis({
    accessToken: session?.accessToken,
    user: session?.user,
  });
}

/**
 * Rút thông điệp lỗi để hiện toast. `APIError` ở `app/api/index.ts` đã nhét câu
 * tiếng Việt của backend vào `message`, nên `instanceof Error` là đủ — dùng
 * `unknown` thay vì `any` vì cổng CI chặn `any` mới.
 */
function thongDiepLoi(err: unknown, macDinh: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return macDinh;
}

/**
 * Danh sách hội thoại, cuộn tới đâu tải tới đó.
 * Phân trang bằng CON TRỎ chứ không phải số trang: hội thoại được đẩy lên đầu
 * mỗi lần có tin nhắn mới, đánh số trang sẽ khiến bản ghi trượt qua lại giữa
 * các trang. `nextCursor === null` là hết.
 */
export function useNhanConversations(limit: number = 30) {
  const { data: session } = useSession();
  const apis = useNhanApis();

  return useInfiniteQuery({
    queryKey: nhanKeys.conversationList(limit),
    queryFn: async ({ pageParam }) => {
      const query: GetNhanConversationsQuery = { limit };
      if (pageParam) query.cursor = pageParam;
      return apis.get.getConversations(query);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: !!session?.accessToken,
    staleTime: 60 * 1000,
  });
}

/**
 * Một hội thoại kèm toàn bộ tin nhắn.
 * `staleTime: 0` có chủ đích: luồng SSE ghi thẳng vào cache khi chat, nên sau
 * mỗi lượt dữ liệu server mới là nguồn đúng — giữ cache "tươi" lâu sẽ che mất
 * các đề xuất vừa đổi trạng thái.
 */
export function useNhanConversation(id: string) {
  const { data: session } = useSession();
  const apis = useNhanApis();

  return useQuery({
    queryKey: nhanKeys.conversation(id),
    queryFn: async () => apis.get.getConversation(id),
    enabled: !!id && !!session?.accessToken,
    staleTime: 0,
  });
}

/** Mở hội thoại mới (rỗng). Trả về bản tóm tắt để UI chuyển sang ngay. */
export function useCreateNhanConversation() {
  const apis = useNhanApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => apis.post.createConversation(),
    onSuccess: () => {
      // Chỉ dọn nhánh hội thoại — không đụng gợi ý nhắc tên (dữ liệu khác hẳn).
      queryClient.invalidateQueries({ queryKey: nhanKeys.conversations() });
    },
    onError: (err: unknown) => {
      toast.error(thongDiepLoi(err, 'Không thể tạo cuộc trò chuyện mới'));
    },
  });
}

/** Đổi tên hội thoại. */
export function useRenameNhanConversation() {
  const apis = useNhanApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) =>
      apis.patch.renameConversation(id, title),
    onSuccess: (data) => {
      // Vá thẳng chi tiết để tiêu đề đổi ngay, rồi mới làm mới danh sách.
      queryClient.setQueryData(
        nhanKeys.conversation(data.id),
        (old: unknown) =>
          old && typeof old === 'object'
            ? { ...(old as object), conversation: data }
            : old,
      );
      queryClient.invalidateQueries({ queryKey: nhanKeys.conversations() });
      toast.success('Đã đổi tên cuộc trò chuyện');
    },
    onError: (err: unknown) => {
      toast.error(thongDiepLoi(err, 'Không thể đổi tên cuộc trò chuyện'));
    },
  });
}

/** Xóa hội thoại. */
export function useDeleteNhanConversation() {
  const apis = useNhanApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => apis.delete.deleteConversation(id),
    onSuccess: (_data, id) => {
      // `removeQueries` chứ không `invalidateQueries`: hội thoại không còn nên
      // refetch chi tiết chỉ tổ nhận 404 rồi hiện lỗi thừa.
      queryClient.removeQueries({ queryKey: nhanKeys.conversation(id) });
      queryClient.invalidateQueries({ queryKey: nhanKeys.conversations() });
      toast.success('Đã xóa cuộc trò chuyện');
    },
    onError: (err: unknown) => {
      toast.error(thongDiepLoi(err, 'Không thể xóa cuộc trò chuyện'));
    },
  });
}

/**
 * Xác nhận một đề xuất — đây mới là lúc Nhàn thật sự ghi dữ liệu.
 * Truyền kèm `conversationId` để chỉ làm mới đúng hội thoại đang mở; thiếu thì
 * đành dọn cả nhánh (đề xuất đổi trạng thái nằm trong tin nhắn của hội thoại).
 */
export function useConfirmNhanProposal() {
  const apis = useNhanApis();
  const queryClient = useQueryClient();

  return useMutation({
    /**
     * ⚠ KHÔNG tự thử lại. QueryClient toàn cục đặt `mutations.retry:
     * failureCount < 1` với `retryDelay: 1000`, còn axios cắt ở 15 giây — mà
     * một đề xuất đổi 40 việc chạy tuần tự thì quá 15 giây là bình thường.
     * Hệ quả: yêu cầu bị huỷ phía client rồi TỰ bắn lại, dù máy chủ vẫn đang
     * chạy. Máy chủ đã có compare-and-set nên lần hai không ghi trùng, nhưng
     * nó trả 400 và người dùng nhận thông báo lỗi cho một việc ĐÃ thành công.
     * Một thao tác ghi thì không bao giờ được tự phát lại.
     */
    retry: false,
    mutationFn: async ({
      proposalId,
    }: {
      proposalId: string;
      conversationId?: string;
    }) => apis.post.confirmProposal(proposalId),
    onSuccess: (_data, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: conversationId
          ? nhanKeys.conversation(conversationId)
          : nhanKeys.conversations(),
      });
      /**
       * ⚠ Dọn cả nhánh `['tasks']`. Đây là route DUY NHẤT ghi vào miền công
       * việc, và bảng việc đang nằm ngay cạnh khung chat (panel là anh em cùng
       * hàng flex, không phải modal, nên bảng không hề bị gỡ đi và không tự
       * nạp lại — QueryClient của ứng dụng tắt `refetchOnMount` lẫn
       * `refetchOnWindowFocus`). Thiếu dòng này thì trợ lý hủy 40 việc xong mà
       * bảng ngay bên cạnh vẫn hiện chúng nguyên vẹn.
       *
       * Dọn cả nhánh chứ không theo `affectedIds`: khoá danh sách nhúng cả đối
       * tượng bộ lọc, và việc VỪA tạo thì chưa có khoá chi tiết nào — dọn theo
       * id sẽ không bao giờ làm mới đúng cái bảng đang hỏng.
       */
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Đã xác nhận và thực hiện đề xuất');
    },
    onError: (err: unknown) => {
      toast.error(thongDiepLoi(err, 'Không thể xác nhận đề xuất'));
    },
  });
}

/**
 * Đổi người phụ trách chính của một bản nháp CHƯA chạy.
 *
 * Vì sao tính năng này tồn tại: phạm vi danh sách việc ở máy chủ là "việc tôi
 * phụ trách HOẶC việc do biểu mẫu của tôi tạo ra". Một việc không có ai phụ
 * trách thì không lọt vào vế nào cả — nó được tạo thật, nằm thật trong CSDL,
 * nhưng KHÔNG tab nào của màn Công việc chứa nó và tìm bằng mã CV cũng không
 * ra. Máy chủ đã vá phần mặc định (không chỉ định ai thì giao cho chính người
 * đang hỏi); hook này là đường để người dùng sửa lựa chọn đó ngay trên thẻ, thay
 * vì phải bảo trợ lý soạn lại cả bản nháp từ đầu.
 */
export function useDoiNguoiPhuTrachNhanProposal() {
  const apis = useNhanApis();
  const queryClient = useQueryClient();

  return useMutation({
    /**
     * ⚠ KHÔNG tự thử lại — cùng lý do đã ghi ở `useConfirmNhanProposal`:
     * QueryClient toàn cục bật `mutations.retry: failureCount < 1`, nên một
     * yêu cầu ghi bị timeout phía client sẽ TỰ bắn lại trong khi máy chủ vẫn
     * đang xử lý lần đầu. Ở đây hậu quả nhẹ hơn xác nhận (lần hai chỉ ghi đè
     * đúng người đó một lần nữa), nhưng vẫn sai theo cùng một kiểu: người dùng
     * nhận về một thông báo lỗi cho thao tác ĐÃ thành công. Thao tác ghi thì
     * không bao giờ được tự phát lại.
     */
    retry: false,
    mutationFn: async ({
      proposalId,
      nguoiPhuTrachId,
    }: {
      proposalId: string;
      nguoiPhuTrachId: string;
      conversationId?: string;
    }) => apis.patch.doiNguoiPhuTrachProposal(proposalId, nguoiPhuTrachId),
    onSuccess: (data, { conversationId }) => {
      /**
       * Vá THẲNG bản ghi trả về vào cache hội thoại, y như
       * `useRenameNhanConversation` vá tiêu đề — và vì đúng một lý do: chỉ
       * `invalidateQueries` rồi đợi là để thẻ đứng yên trọn một vòng mạng với
       * dòng "Phụ trách chính" CŨ, ngay sau khi người dùng vừa chọn người mới.
       * Nửa giây đó đọc như "bấm không ăn", và phản xạ tiếp theo của người dùng
       * là chọn lại lần nữa.
       *
       * Thay NGUYÊN bản ghi bằng bản máy chủ trả về, không trộn từng trường:
       * máy chủ đã sửa cả `payload` (thứ sẽ chạy) lẫn `preview` (thứ người đọc)
       * trong một lần ghi, và đã tự bỏ những cảnh báo về người phụ trách không
       * còn đúng nữa. Trộn tay là tự tạo ra một bản nháp lai giữa hai lần tính.
       *
       * Duyệt cả `messages` để tìm đúng đề xuất: một hội thoại có nhiều lượt và
       * mỗi lượt có thể mang nhiều đề xuất, nên không có đường tắt nào từ id đề
       * xuất tới đúng tin nhắn chứa nó ngoài việc dò.
       */
      if (conversationId) {
        queryClient.setQueryData<NhanConversationDetail>(
          nhanKeys.conversation(conversationId),
          (cu) =>
            cu
              ? {
                  ...cu,
                  messages: cu.messages.map((m) =>
                    m.proposals.some((p) => p.id === data.id)
                      ? {
                          ...m,
                          proposals: m.proposals.map((p) =>
                            p.id === data.id ? data : p,
                          ),
                        }
                      : m,
                  ),
                }
              : cu,
        );
      }
      /**
       * Lưới an toàn: nếu thiếu `conversationId` (hoặc cache của hội thoại đã
       * bị dọn) thì phép vá ở trên không chạm được vào đâu cả, và thứ duy nhất
       * còn lại để màn hình khớp với CSDL là nạp lại.
       *
       * ⚠ KHÔNG dọn nhánh `['tasks']` như `useConfirmNhanProposal`: ở đây chưa
       * có công việc nào bị ghi. Bản nháp vẫn chỉ là bản nháp cho tới lúc bấm
       * Xác nhận — dọn cả bảng việc chỉ để đổi một dòng xem trước là bắt cả màn
       * Công việc tải lại vì một thao tác không hề đụng tới nó.
       */
      queryClient.invalidateQueries({
        queryKey: conversationId
          ? nhanKeys.conversation(conversationId)
          : nhanKeys.conversations(),
      });
      toast.success('Đã đổi người phụ trách chính');
    },
    onError: (err: unknown) => {
      toast.error(thongDiepLoi(err, 'Không thể đổi người phụ trách'));
    },
  });
}

/** Hủy một đề xuất đang chờ (không có gì bị ghi). */
export function useCancelNhanProposal() {
  const apis = useNhanApis();
  const queryClient = useQueryClient();

  return useMutation({
    // Cùng lý do như `useConfirmNhanProposal`: thao tác ghi không tự phát lại.
    retry: false,
    mutationFn: async ({
      proposalId,
    }: {
      proposalId: string;
      conversationId?: string;
    }) => apis.post.cancelProposal(proposalId),
    onSuccess: (_data, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: conversationId
          ? nhanKeys.conversation(conversationId)
          : nhanKeys.conversations(),
      });
      toast.success('Đã hủy đề xuất');
    },
    onError: (err: unknown) => {
      toast.error(thongDiepLoi(err, 'Không thể hủy đề xuất'));
    },
  });
}

/**
 * Lấy mức dùng trong ngày — nguồn của lệnh `/usage`.
 *
 * ⚠ `useMutation` cho một điểm cuối GET nghe ngược đời, nên nói rõ vì sao:
 * đây là một hành động do người dùng GÕ RA, không phải dữ liệu của một khung
 * hình đang hiển thị. `useQuery` sẽ nhớ kết quả và trả lại đúng con số cũ cho
 * lần gõ thứ hai — mà cả điểm của lệnh này là "ngay lúc này tôi đã dùng bao
 * nhiêu", tức số cũ là số SAI. `useMutation` không có cache nên mỗi lần gõ là
 * một lần hỏi thật.
 *
 * Không đặt `retry: false` như hai hook xác nhận/hủy đề xuất: đây là lời gọi
 * chỉ ĐỌC, thử lại một lần không ghi thêm gì và cũng không tốn lượt hỏi nào.
 */
export function useNhanUsage() {
  const apis = useNhanApis();

  return useMutation({
    mutationFn: async () => apis.get.getUsage(),
    onError: (err: unknown) => {
      toast.error(thongDiepLoi(err, 'Không lấy được số liệu mức dùng'));
    },
  });
}

/**
 * Gợi ý cho ô soạn khi gõ `@` (người + việc trong một lần gọi).
 *
 * `enabled` yêu cầu chuỗi tìm không rỗng: bật khi `q` rỗng sẽ bắn một truy vấn
 * mỗi lần mở hộp soạn mà kết quả chẳng dùng vào đâu. Giữ `placeholderData` bản
 * cũ để danh sách không nhấp nháy về rỗng giữa hai lần gõ.
 */
export function useNhanMentionSearch(q: string, limit: number = 8) {
  const { data: session } = useSession();
  const apis = useNhanApis();
  const tuKhoa = q.trim();

  return useQuery({
    queryKey: nhanKeys.mentionSearch(tuKhoa),
    queryFn: async () => apis.get.searchMentions(tuKhoa, limit),
    enabled: !!session?.accessToken && tuKhoa.length > 0,
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });
}
