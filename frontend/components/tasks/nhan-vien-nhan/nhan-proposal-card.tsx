'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  Search,
  UserPen,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn, formatReferenceId } from '@/lib/utils';
import type {
  NhanProposalDto,
  NhanProposalKind,
  NhanProposalStatus,
} from '@/types/nhan-vien-nhan.type';
import {
  useCancelNhanProposal,
  useConfirmNhanProposal,
  useDoiNguoiPhuTrachNhanProposal,
  useNhanMentionSearch,
} from '@/hooks/queries/nhan-vien-nhan-queries';

/**
 * Hai loại đề xuất DUY NHẤT có chỗ cho một người phụ trách chính.
 *
 * Đổi trạng thái / bình luận / gửi thư đều thao tác trên thứ đã tồn tại và
 * không mang trường người phụ trách nào cả — máy chủ trả 400 nếu cố đổi, nên
 * hiện nút ở đó chỉ là mời người dùng đi vào một lỗi.
 */
const LOAI_CO_NGUOI_PHU_TRACH: readonly NhanProposalKind[] = [
  'tao_viec',
  'cap_nhat_viec',
];

/**
 * Thẻ XEM TRƯỚC một thao tác ghi.
 *
 * Đây là chốt an toàn của cả tính năng: máy soạn, người duyệt. Vì vậy thẻ này
 * phải làm được đúng một việc — cho người đọc thấy CHÍNH XÁC thứ sắp xảy ra
 * trước khi nó xảy ra. Ba quyết định trình bày đều đi ra từ đó:
 *
 *   • Số đối tượng bị ảnh hưởng in ĐẬM ngay trên tiêu đề, không giấu trong văn
 *     xuôi. Khác biệt giữa "hủy 3 việc" và "hủy 37 việc" phải đọc được trong
 *     nửa giây.
 *   • Cảnh báo dùng nền hổ phách `ws-count-*`, KHÔNG dùng `ws-danger` hay
 *     `ws-void-*`: theo luật màu của màn này, đỏ-nâu chỉ có một nghĩa là trạng
 *     thái "Đã hủy", mượn sang chỗ khác là phá mã màu (docs 03-bo-mau.md).
 *   • Nút Xác nhận là nút chính DUY NHẤT trong thẻ, nhưng vẫn KHÔNG dùng
 *     `bg-ws-solid` — màu đen đã thuộc về "Thêm việc" ở hàng công cụ, mỗi màn
 *     chỉ được một nút đen.
 *
 * Từ đó cũng ra chỗ đứng của ô đổi người phụ trách (`OChonNguoiPhuTrach` ở cuối
 * tệp): nó là một NÚT CHỮ nhỏ, không phải nút thứ hai cạnh Xác nhận. Thẻ này chỉ
 * được có một lời mời bấm nổi bật; thêm một nút đặc thứ hai là người dùng phải
 * đọc hai lần mới biết cái nào mới là cái làm thay đổi dữ liệu thật.
 */
export function NhanProposalCard({
  proposal,
  conversationId,
}: {
  proposal: NhanProposalDto;
  conversationId: string;
}) {
  const [dangChay, setDangChay] = useState<
    'xac-nhan' | 'huy' | 'doi-nguoi' | null
  >(null);
  const xacNhan = useConfirmNhanProposal();
  const huy = useCancelNhanProposal();
  const doiNguoi = useDoiNguoiPhuTrachNhanProposal();

  /**
   * Bản đề xuất máy chủ vừa trả về sau khi đổi người phụ trách.
   *
   * Vì sao cần thêm một ô nhớ trong khi hook đã vá thẳng vào cache hội thoại:
   * phép vá đó cần `conversationId`, và thẻ này có thể được dựng ở nơi id rỗng
   * (khung chat truyền `hoiThoaiId ?? ''`) hoặc khi cache của hội thoại đã bị
   * dọn. Thiếu lưới thứ hai thì đúng vào những lúc ấy người dùng chọn người mới
   * xong mà dòng "Phụ trách chính" vẫn y nguyên — đọc như bấm không ăn.
   *
   * ⚠ Ô nhớ này CHỈ sống tới lần prop đổi kế tiếp — xem hiệu ứng ngay dưới. Giữ
   * nó lâu hơn là tự tạo một bản sao thứ hai của cùng một đề xuất, và bản sao
   * đó sẽ nói "Chờ duyệt" kèm nguyên nút Xác nhận SAU khi người dùng đã bấm xác
   * nhận (prop đã thành `confirmed`, ô nhớ thì không biết gì).
   */
  const [banVuaDoi, setBanVuaDoi] = useState<NhanProposalDto | null>(null);

  /**
   * Nhường lại cho prop mỗi khi nó mang một bản ghi mới.
   *
   * Prop chỉ đổi danh tính khi cache hội thoại đổi, tức khi máy chủ đã nói lời
   * cuối (vá sau khi đổi người, nạp lại sau khi xác nhận/hủy). Lúc đó bản trong
   * ô nhớ hoặc trùng nội dung (không nhấp nháy gì) hoặc đã cũ hơn — cả hai
   * trường hợp đều phải bỏ đi. Thứ tự này tự sửa cho nhau: ô nhớ chỉ có việc
   * lấp đúng khoảng trống giữa lúc máy chủ trả lời và lúc cache kịp mang bản
   * mới về tới thẻ.
   */
  useEffect(() => {
    setBanVuaDoi(null);
  }, [proposal]);

  /**
   * Bản ghi ĐANG được vẽ. Mọi chỗ đọc bên dưới đều phải đi qua biến này chứ
   * không đọc thẳng `proposal`, nếu không thẻ sẽ vẽ lẫn hai bản khác nhau —
   * dòng xem trước theo bản mới còn bộ đếm hết hạn theo bản cũ chẳng hạn.
   */
  const deXuat = banVuaDoi ?? proposal;

  /**
   * Mốc thời gian PHẢI là state, không được đọc `Date.now()` trong thân kết xuất.
   *
   * ⚠ Panel giữ nguyên trong DOM khi đóng, và khung chat không tự nạp lại, nên
   * một thẻ đã dựng sẽ đứng yên hàng chục phút mà không có lần kết xuất nào
   * khác. Đọc `Date.now()` một lần lúc dựng thì thẻ vẫn mang trạng thái "Chờ
   * duyệt" và nút Xác nhận vẫn mời bấm SAU khi bản nháp hết hiệu lực — bấm vào
   * chỉ nhận về lỗi từ máy chủ. Đóng/mở lại panel cũng không sửa được vì
   * component không hề bị dựng lại.
   */
  const [bayGio, setBayGio] = useState(() => Date.now());
  const hetHanLuc = new Date(deXuat.expiresAt).getTime();

  const choDuyet = deXuat.status === 'pending';
  const hetHan = hetHanLuc < bayGio;
  /**
   * Ô chọn người phụ trách chỉ có nghĩa khi bản nháp còn SỬA được: đúng loại,
   * còn chờ duyệt, và chưa quá hạn. Việc đã chạy, đã bỏ hay đã quá hạn thì
   * không còn gì để đổi — máy chủ trả 400 cho cả ba, nên hiện ô ở đó là dựng
   * sẵn một cái bẫy.
   */
  const doiDuocNguoi =
    LOAI_CO_NGUOI_PHU_TRACH.indexOf(deXuat.kind) !== -1 && choDuyet && !hetHan;

  /**
   * Nhịp đếm ngược, chỉ chạy khi thẻ còn chờ duyệt và chưa hết hạn.
   *
   * Hai nhịp lồng nhau có chủ đích: 30 giây một lần để số phút còn lại tự trôi,
   * và nhịp CUỐI rơi đúng lúc hết hạn — nếu chỉ chạy nhịp 30 giây thì thẻ còn
   * mời bấm thêm tới nửa phút sau khi bản nháp đã chết. Cộng thêm 250ms để
   * tránh trường hợp đồng hồ máy nhích chưa tới mốc, gây thêm một vòng thừa.
   */
  useEffect(() => {
    if (deXuat.status !== 'pending') return;
    let hen = 0;
    const dat = () => {
      const conLai = hetHanLuc - Date.now();
      if (conLai <= 0) return;
      hen = window.setTimeout(
        () => {
          setBayGio(Date.now());
          dat();
        },
        Math.min(30_000, conLai + 250),
      );
    };
    dat();
    return () => window.clearTimeout(hen);
  }, [deXuat.status, hetHanLuc]);

  // Không toast ở đây: hai hook mutation đã toast sẵn cả thành công lẫn lỗi, và
  // thứ đáng đọc nhất — `resultSummary`, ví dụ "Đã đổi 12/15 việc. Không đổi
  // được: …" — hiện ngay trong thẻ này sau khi làm mới, ở lại chứ không trôi
  // mất sau bốn giây như một toast.
  const onXacNhan = async () => {
    setDangChay('xac-nhan');
    try {
      await xacNhan.mutateAsync({ proposalId: deXuat.id, conversationId });
    } finally {
      setDangChay(null);
    }
  };

  const onHuy = async () => {
    setDangChay('huy');
    try {
      await huy.mutateAsync({ proposalId: deXuat.id, conversationId });
    } finally {
      setDangChay(null);
    }
  };

  /**
   * Đổi người phụ trách chính của bản nháp.
   *
   * Trả về `true`/`false` chứ không để lỗi bay lên: ô chọn bên dưới cần biết
   * kết quả để quyết định ĐÓNG hay Ở LẠI. Chọn nhầm người là chuyện thường
   * (trùng tên, gõ thiếu dấu), nên khi máy chủ từ chối thì ô tìm phải còn
   * nguyên đó cho người dùng chọn lại ngay — đóng nó lại rồi bắt họ bấm mở lần
   * nữa là phạt người dùng vì một lỗi họ chưa kịp hiểu.
   *
   * Không toast ở đây: hook đã hiện đúng câu tiếng Việt máy chủ gửi về (bản
   * nháp đã chạy / đã quá hạn / người nhận đã bị khoá…), và một toast thứ hai
   * viết chung chung chỉ che mất câu nói rõ nguyên nhân.
   */
  const onDoiNguoi = async (nguoiPhuTrachId: string): Promise<boolean> => {
    setDangChay('doi-nguoi');
    try {
      const moi = await doiNguoi.mutateAsync({
        proposalId: deXuat.id,
        nguoiPhuTrachId,
        conversationId,
      });
      setBanVuaDoi(moi);
      return true;
    } catch {
      return false;
    } finally {
      setDangChay(null);
    }
  };

  return (
    <div
      className={cn(
        'mt-2 overflow-hidden rounded-ws-card border bg-ws-surface shadow-ws-rest',
        choDuyet && !hetHan
          ? 'border-ws-line-strong'
          : 'border-ws-line opacity-90',
      )}
    >
      <div className='flex items-start gap-2 border-b border-ws-line-soft bg-ws-surface-alt px-3 py-2.5'>
        <span className='mt-[1px] shrink-0'>{NHAN_ICON[deXuat.kind]}</span>
        <div className='min-w-0 flex-1'>
          <p className='text-ws-h2 font-semibold leading-tight text-ws-ink'>
            {deXuat.preview.tieuDe}
          </p>
          <p className='mt-0.5 text-ws-meta text-ws-ink-soft'>
            Ảnh hưởng{' '}
            <strong className='font-semibold text-ws-ink'>
              {deXuat.preview.soDoiTuong}
            </strong>{' '}
            {DON_VI[deXuat.kind]}
          </p>
        </div>
        <TrangThaiChip status={deXuat.status} hetHan={hetHan} />
      </div>

      <dl className='divide-y divide-ws-line-soft'>
        {deXuat.preview.dong.map((d, i) => (
          <div key={`${d.nhan}-${i}`} className='px-3 py-2'>
            <dt className='text-ws-nano font-semibold uppercase tracking-wide text-ws-ink-faint'>
              {d.nhan}
            </dt>
            {/* `whitespace-pre-line` vì danh sách việc bị ảnh hưởng được máy
                chủ nối bằng '\n' — mỗi việc một dòng là cách duy nhất đọc được
                một danh sách 40 dòng. */}
            <dd className='mt-0.5 whitespace-pre-line break-words text-ws-body leading-relaxed text-ws-ink'>
              {d.giaTri}
            </dd>
          </div>
        ))}
      </dl>

      {deXuat.preview.canhBao && deXuat.preview.canhBao.length > 0 && (
        <ul className='space-y-1 border-t border-ws-line-soft bg-ws-count-bg px-3 py-2'>
          {deXuat.preview.canhBao.map((c, i) => (
            <li
              key={i}
              className='flex gap-1.5 text-ws-meta leading-snug text-ws-count-fg'
            >
              <AlertTriangle className='mt-[2px] h-3.5 w-3.5 shrink-0' />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Ô chọn người phụ trách đứng TRƯỚC hàng nút, không phải sau: người dùng
          sửa bản nháp rồi mới duyệt, nên thứ tự đọc từ trên xuống phải là "xem
          trước → sửa nốt chỗ này → Xác nhận". Đặt sau hàng nút thì nó nằm dưới
          cả nút Xác nhận, tức phần lớn người dùng bấm xong mới nhìn thấy. */}
      {doiDuocNguoi && (
        <div className='border-t border-ws-line-soft px-3 py-2'>
          <OChonNguoiPhuTrach
            khoa={dangChay !== null}
            dangGui={dangChay === 'doi-nguoi'}
            onChon={onDoiNguoi}
          />
        </div>
      )}

      {choDuyet && !hetHan ? (
        <div className='flex items-center gap-2 border-t border-ws-line-soft px-3 py-2.5'>
          <Button
            onClick={onXacNhan}
            disabled={dangChay !== null}
            className='h-9 rounded-ws-control bg-ws-accent px-3.5 text-ws-meta font-semibold text-white hover:bg-ws-accent-hover'
          >
            {dangChay === 'xac-nhan' ? (
              <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            ) : (
              <Check className='mr-1.5 h-3.5 w-3.5' />
            )}
            Xác nhận
          </Button>
          <Button
            variant='outline'
            onClick={onHuy}
            disabled={dangChay !== null}
            className='h-9 rounded-ws-control border-ws-line px-3 text-ws-meta font-medium text-ws-ink-soft hover:bg-ws-surface-alt'
          >
            {dangChay === 'huy' ? (
              <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            ) : (
              <X className='mr-1.5 h-3.5 w-3.5' />
            )}
            Bỏ
          </Button>
          {/* Số phút còn lại đứng cạnh giờ hết hạn: một mốc giờ trần bắt người
              đọc tự trừ nhẩm, mà thứ họ cần biết là "còn kịp bấm không". */}
          <span className='ml-auto text-right text-ws-nano text-ws-ink-ghost'>
            Hết hạn {gioVN(deXuat.expiresAt)} · {conLaiVN(hetHanLuc - bayGio)}
          </span>
        </div>
      ) : deXuat.resultSummary ? (
        <p className='border-t border-ws-line-soft px-3 py-2 text-ws-meta text-ws-ink-soft'>
          {deXuat.resultSummary}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Ô chọn người phụ trách chính cho một bản nháp chưa chạy.
 *
 * ⚠ Đây là phần vá cho một lỗi ĐÃ XẢY RA THẬT: một việc được tạo mà không chỉ
 * định ai phụ trách sẽ nằm ngoài phạm vi danh sách của mọi tab màn Công việc —
 * việc có thật trong CSDL nhưng không ai nhìn thấy nó, kể cả khi tìm bằng mã CV.
 * Máy chủ đã vá phần mặc định; ô này là đường sửa NHANH ngay trên thẻ, để người
 * dùng khỏi phải quay lại bảo trợ lý soạn lại cả bản nháp chỉ vì sai một người.
 *
 * Dùng LẠI đúng bộ tìm kiếm `@` của ô soạn (`useNhanMentionSearch`), không viết
 * bộ thứ hai: phạm vi tìm là toàn hệ thống nên phải hỏi máy chủ, và một bộ tìm
 * người thứ hai sẽ lệch dần với bộ kia ở lần sửa quy tắc lọc đầu tiên — lúc đó
 * cùng một cái tên tìm được ở ô soạn nhưng không tìm được ở đây, mà không ai
 * đoán ra vì sao. Truy vấn đó trả cả người lẫn việc; ở đây chỉ lấy phần người.
 *
 * ⚠ Dùng chung bộ tìm kiếm thì phải dùng chung cả LUẬT HIỂN THỊ của nó: từ khi
 * tuyến gợi ý thôi lọc `isActive`, kết quả có thể chứa tài khoản đã khoá. Ô này
 * vẽ họ y hệt danh sách `@` — mờ, gắn nhãn "tài khoản đã khoá", bấm không ăn —
 * chứ không tự nghĩ ra một cách nói thứ hai. Bỏ qua cờ `daKhoa` ở đây là để lọt
 * đúng thứ mà cả ô này sinh ra để chặn: bản nháp giao cho một người không đăng
 * nhập được, và công việc lại rơi vào chỗ không ai nhìn thấy.
 */
function OChonNguoiPhuTrach({
  khoa,
  dangGui,
  onChon,
}: {
  /** Thẻ đang bận vì một thao tác khác (xác nhận/hủy) — khoá cả ô này. */
  khoa: boolean;
  /** Đang gửi CHÍNH lời đổi người này. */
  dangGui: boolean;
  /** Trả `true` nếu máy chủ đã nhận; `false` thì giữ ô mở để chọn lại. */
  onChon: (nguoiPhuTrachId: string) => Promise<boolean>;
}) {
  const [mo, setMo] = useState(false);
  const [tuKhoa, setTuKhoa] = useState('');
  /** Id đang chờ máy chủ trả lời — để hiện vòng xoay ĐÚNG dòng vừa bấm. */
  const [idDangGui, setIdDangGui] = useState<string | null>(null);

  /**
   * Truyền chuỗi rỗng khi hộp đóng để truy vấn tự tắt (`enabled` của hook đòi từ
   * khoá không rỗng). Không có mẹo này thì mỗi thẻ đề xuất trong hội thoại giữ
   * một truy vấn tìm người sống suốt, dù chưa ai mở ô ra.
   */
  const { data: goiY, isFetching } = useNhanMentionSearch(mo ? tuKhoa : '');
  const nguoi = goiY?.users ?? [];
  const daGoTim = tuKhoa.trim().length > 0;
  /**
   * Tìm được người, nhưng KHÔNG người nào nhận việc được.
   *
   * Tách thành một biến riêng vì nó là một trạng thái thứ BA, không phải một
   * biến thể của "không tìm thấy": câu "Không tìm thấy ai khớp với từ khoá này"
   * sẽ là một lời nói dối ở đây — máy chủ tìm thấy đúng người, chỉ là tài khoản
   * của họ đang bị khoá. Đúng lớp im lặng mà bản vá này sinh ra để dẹp, nên nó
   * phải có câu chữ của riêng mình.
   */
  const toanBoDaKhoa = nguoi.length > 0 && nguoi.every((u) => u.daKhoa);

  const dong = () => {
    setMo(false);
    setTuKhoa('');
  };

  const chon = async (id: string) => {
    setIdDangGui(id);
    try {
      // Chỉ đóng khi máy chủ đã nhận. Hỏng thì ở lại — người dùng thường chỉ
      // cần chọn lại một dòng khác chứ không cần mở lại cả ô.
      if (await onChon(id)) dong();
    } finally {
      setIdDangGui(null);
    }
  };

  return (
    <div>
      {mo ? (
        <div className='space-y-1.5'>
          <div className='flex items-center gap-1.5 rounded-ws-control border border-ws-line-strong bg-ws-surface px-2 py-1 focus-within:border-ws-focus'>
            <Search className='h-3.5 w-3.5 shrink-0 text-ws-ink-ghost' />
            <input
              // Mở ra là gõ được ngay: người dùng vừa chủ động bấm nút mở, việc
              // kế tiếp của họ chắc chắn là gõ tên.
              autoFocus
              value={tuKhoa}
              disabled={khoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              onKeyDown={(e) => {
                // Esc đóng — cùng phím với danh sách gợi ý của ô soạn, để hai
                // chỗ tìm người trong cùng một màn không dạy hai thói quen.
                if (e.key === 'Escape') {
                  e.preventDefault();
                  dong();
                }
              }}
              placeholder='Gõ tên người phụ trách…'
              className='min-w-0 flex-1 border-0 bg-transparent py-0.5 text-ws-meta text-ws-ink outline-none placeholder:text-ws-ink-ghost disabled:opacity-60'
            />
            <button
              type='button'
              onClick={dong}
              disabled={dangGui}
              aria-label='Đóng ô chọn người phụ trách'
              className='shrink-0 text-ws-ink-ghost transition-colors hover:text-ws-ink-soft disabled:opacity-40'
            >
              <X className='h-3.5 w-3.5' />
            </button>
          </div>

          <ul className='ws-scroll max-h-[168px] overflow-y-auto rounded-ws-block border border-ws-line bg-ws-surface py-1'>
            {!daGoTim ? (
              <li className='px-2.5 py-1.5 text-ws-nano leading-snug text-ws-ink-ghost'>
                Gõ tên để tìm người trong hệ thống.
              </li>
            ) : nguoi.length === 0 ? (
              <li className='flex items-center gap-1.5 px-2.5 py-1.5 text-ws-nano leading-snug text-ws-ink-ghost'>
                {isFetching ? (
                  <>
                    <Loader2 className='h-3 w-3 animate-spin' />
                    Đang tìm…
                  </>
                ) : (
                  'Không tìm thấy ai khớp với từ khoá này.'
                )}
              </li>
            ) : (
              <>
                {/* Trạng thái thứ ba: tìm ra người, nhưng không ai nhận được
                    việc. Phải nói thành lời ngay trên đầu danh sách — nếu không
                    người dùng chỉ thấy vài cái tên mờ bấm không ăn và đọc ra là
                    ô chọn hỏng, đúng thứ im lặng mà bản vá này đang dẹp. */}
                {toanBoDaKhoa && (
                  <li className='px-2.5 py-1.5 text-ws-nano leading-snug text-ws-ink-ghost'>
                    Chỉ tìm thấy tài khoản đã khoá. Tài khoản đã khoá không đăng
                    nhập được nên không nhận việc được — hãy mở khoá tài khoản
                    đó, hoặc chọn người khác.
                  </li>
                )}
                {nguoi.map((u) => (
                  <li key={u.id}>
                    <button
                      type='button'
                      onClick={() => void chon(u.id)}
                      /**
                       * Khoá cả khi thẻ đang bận LẪN khi chính tài khoản này đã
                       * bị khoá. Ở đây `disabled` là an toàn (khác hẳn danh sách
                       * `@` của ô soạn, nơi `disabled` làm mất tiêu điểm ô nhập
                       * rồi đóng luôn dropdown): ô này không đóng theo `onBlur`,
                       * nên mất tiêu điểm không giấu mất câu giải thích.
                       */
                      disabled={khoa || u.daKhoa}
                      className={cn(
                        'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors disabled:opacity-60',
                        u.daKhoa
                          ? 'disabled:cursor-default'
                          : 'hover:bg-ws-surface-alt',
                      )}
                    >
                      {idDangGui === u.id ? (
                        <Loader2 className='h-5 w-5 shrink-0 animate-spin p-[3px] text-ws-ink-soft' />
                      ) : (
                        <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ws-ava-a-bg text-ws-nano font-semibold text-ws-ava-a-fg'>
                          {u.fullName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate text-ws-meta font-medium text-ws-ink'>
                          {u.fullName}
                        </span>
                        {/* Mã tham chiếu là thứ duy nhất tách được hai người
                            trùng tên — mà giao nhầm người chính là lỗi ô này sinh
                            ra để sửa, nên không được cắt bỏ cho gọn. */}
                        <span className='block truncate text-ws-nano text-ws-ink-ghost'>
                          {formatReferenceId(u.referenceId)}
                        </span>
                        {/* Cùng con chữ với danh sách `@` của ô soạn: hai chỗ
                            chọn người trong cùng một màn phải dùng chung một
                            cách nói, nếu không người dùng phải học hai lần. */}
                        {u.daKhoa && (
                          <span className='mt-0.5 inline-block rounded-ws-chip bg-ws-surface-sunken px-1 py-px text-ws-nano font-semibold text-ws-ink-faint'>
                            tài khoản đã khoá
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => setMo(true)}
          disabled={khoa}
          className='flex items-center gap-1.5 text-ws-meta font-medium text-ws-ink-soft transition-colors hover:text-ws-ink disabled:opacity-40'
        >
          {dangGui ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <UserPen className='h-3.5 w-3.5' />
          )}
          Đổi người phụ trách
        </button>
      )}

      {/* Một dòng, không hơn. Nó phải trả lời đúng hai câu hỏi bật ra ngay tại
          đây — "không chọn thì việc đi đâu" và "thêm người thứ hai bằng cách
          nào" — mà không biến thành một đoạn hướng dẫn không ai đọc. */}
      <p className='mt-1.5 text-ws-nano leading-snug text-ws-ink-ghost'>
        Chưa chọn ai thì việc mặc định giao cho bạn. Cần thêm người hỗ trợ thì
        nói với trợ lý, gõ @ để chọn đúng người.
      </p>
    </div>
  );
}

function TrangThaiChip({
  status,
  hetHan,
}: {
  status: NhanProposalStatus;
  hetHan: boolean;
}) {
  // Một đề xuất `pending` nhưng đã quá mốc hết hạn thì đọc là "Quá hạn": máy
  // chủ chỉ dọn trạng thái khi có người nạp lại hội thoại, nên nếu chỉ tin cột
  // `status` thì thẻ sẽ mời người dùng bấm một nút chắc chắn báo lỗi.
  const thuc: NhanProposalStatus = status === 'pending' && hetHan ? 'expired' : status;
  const { nhan, lop } = CHIP[thuc];
  return (
    <span
      className={cn(
        'shrink-0 rounded-ws-chip px-1.5 py-0.5 text-ws-nano font-semibold',
        lop,
      )}
    >
      {nhan}
    </span>
  );
}

const CHIP: Record<NhanProposalStatus, { nhan: string; lop: string }> = {
  pending: { nhan: 'Chờ duyệt', lop: 'bg-ws-count-bg text-ws-count-fg' },
  confirmed: { nhan: 'Đã chạy', lop: 'bg-ws-done-bg text-ws-done-fg' },
  cancelled: { nhan: 'Đã bỏ', lop: 'bg-ws-surface-sunken text-ws-ink-faint' },
  expired: { nhan: 'Quá hạn', lop: 'bg-ws-surface-sunken text-ws-ink-faint' },
  failed: { nhan: 'Lỗi', lop: 'bg-ws-void-bg text-ws-void-fg' },
};

/** Đơn vị đếm cho dòng "Ảnh hưởng N …" — mỗi loại thao tác đếm một thứ khác. */
const DON_VI: Record<NhanProposalKind, string> = {
  tao_viec: 'công việc',
  cap_nhat_viec: 'công việc',
  doi_trang_thai: 'công việc',
  binh_luan_viec: 'công việc',
  gui_thu: 'người nhận',
};

const NHAN_ICON: Record<NhanProposalKind, string> = {
  tao_viec: '📝',
  cap_nhat_viec: '✏️',
  doi_trang_thai: '🔁',
  binh_luan_viec: '💬',
  gui_thu: '✉️',
};

/**
 * Thời gian còn lại, làm tròn LÊN phút. Làm tròn xuống sẽ hiện "còn 0 phút"
 * suốt 59 giây cuối, đọc như đã hết hạn trong khi nút vẫn bấm được.
 */
function conLaiVN(ms: number): string {
  if (ms <= 0) return 'đã hết hạn';
  if (ms < 60_000) return 'còn dưới 1 phút';
  return `còn ${Math.ceil(ms / 60_000)} phút`;
}

function gioVN(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}
