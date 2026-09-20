'use client';

import { useState } from 'react';
import Link from 'next/link';
import { History, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardResponse } from '@/types/daily-report.type';
import type { ScopeRailItem } from '../daily-report-utils';
import {
  FOCUS_RING,
  formatTimeVi,
  isReviewOnly,
  isSubmitted,
} from '../daily-report-utils';

/**
 * Số nhóm tối đa của MỘT trang, đồng thời là ngưỡng bật phân trang.
 * Tính riêng cho từng cụm.
 */
const SCOPES_PER_PAGE = 5;

/**
 * Cụm này có hiện thanh phân trang không.
 *
 * Gom vào một hàm để hai cụm dùng CHUNG một điều kiện, không sót chỗ nào khi
 * đổi ngưỡng.
 */
function hasPagination(totalScopes: number) {
  // Vừa đúng một trang thì thanh phân trang chỉ nói được "1 / 1" — không thêm
  // thông tin gì, mà lại chiếm một dòng dưới danh sách.
  return totalScopes > SCOPES_PER_PAGE;
}

/* Vòng focus bàn phím dùng `FOCUS_RING` của `daily-report-utils.ts` — nền dưới
   thanh phân trang là `ws-surface-alt`, đúng bản mà hằng số đó chừa khe. Công
   thức từng nằm ngay đây và bị các file khác chép tay lại; nay chỉ còn một
   nguồn. */

/**
 * Trang hiện tại của MỘT cụm.
 *
 * Mỗi cụm gọi hook một lần nên `lead` và `join` giữ trang riêng — lật cụm này
 * không kéo cụm kia đi theo.
 *
 * Trang được KẸP ngay trong lúc render chứ không nắn lại bằng `useEffect`:
 * khi nhóm cuối của trang cuối biến mất (giải tán nhóm, rời nhóm, hoặc
 * `my/today` về ít hơn), `tongSoTrang` tụt xuống ngay trong chính lần render
 * đó. Nắn bằng effect thì có một khung hình danh sách RỖNG chớp qua trước khi
 * effect kịp chạy.
 */
function useGroupPaging(totalScopes: number) {
  const [chosenPage, setChosenPage] = useState(1);

  // Luôn ≥ 1: cụm rỗng vẫn đọc là "1 / 1", không bao giờ là "1 / 0".
  const totalPages = Math.max(1, Math.ceil(totalScopes / SCOPES_PER_PAGE));
  const page = Math.min(chosenPage, totalPages);

  const changePage = (step: number) => {
    // Kẹp cả ở đây nữa: hai nút đã `disabled` đúng lúc, nhưng phép cộng vẫn
    // phải tự giữ mình trong khoảng hợp lệ.
    setChosenPage(Math.min(Math.max(page + step, 1), totalPages));
  };

  return { page, totalPages, changePage };
}

interface Props {
  items: ScopeRailItem[];
  /** Nhóm đang xem. `null` khi đang ở màn Lịch sử hoặc chưa có nhóm nào. */
  activeScopeId: string | null;
  isHistoryActive: boolean;
  onSelectScope: (scopeId: string) => void;
  onOpenHistory: () => void;
  historyHref?: string;
  /** Danh sách nhóm chưa về — chừa chỗ để hàng tiêu đề không nhảy. */
  isLoading: boolean;
  /**
   * Bảng của nhóm ĐANG CHỌN, do workspace tải sẵn. Cột này KHÔNG tự gọi
   * `useReportBoard` cho từng nhóm: `invalidateAfterWrite` dọn mọi query
   * `board` sau MỖI lần lưu nháp (2 giây sau khi ngừng gõ), nên một hook trên
   * mỗi dòng thành N request lặp đi lặp lại suốt lúc soạn báo cáo. Đánh đổi:
   * chỉ nhóm đang chọn có thanh tiến độ, nhóm khác nói trạng thái bản của
   * chính mình — vẫn đủ để biết mình còn nợ nhóm nào.
   */
  activeBoard: BoardResponse | undefined;
  /** Tên người được chăm, khi đang báo cáo thay. Đổi cách xưng hô của cả cột. */
  careName?: string;
}

/**
 * Cột nhóm — trục điều hướng của màn Báo cáo.
 *
 * Thay cho hộp thoại "Đổi nhóm" cũ. Nhóm là chiều chính của dữ liệu
 * (`my/today` trả một bản cho mỗi nhóm, `scope/:id/board` và
 * `scope/:id/summary` đều nhận `scopeId`), nên nó phải là chiều điều hướng
 * chứ không phải một hộp thoại bấm ra bấm vào cho mỗi lần chuyển.
 *
 * Chia BA cụm theo vai trò vì việc phải làm ở ba loại nhóm khác hẳn nhau: ở
 * nhóm mình quản lý thì vừa nộp bản của mình vừa theo dõi cả nhóm, ở nhóm mình
 * tham gia thì nộp (và duyệt thêm những người được giao, nếu có), ở nhóm mình
 * CHỈ duyệt thì không có bản nào để nộp. Cụm rỗng bỏ luôn cả tiêu đề — một tiêu
 * đề đứng trên danh sách rỗng còn khó hiểu hơn là không có tiêu đề.
 *
 * Cụm "Tôi duyệt" chia bằng danh tính server trả: `isReviewer` (có dòng phân
 * công) và `isMember` (có tên trong nhóm). Khác hẳn cụm "Đang giám sát" đã bỏ
 * ở đoạn dưới: cụm đó chia bằng một CỜ QUYỀN mà admin nào cũng có.
 *
 * Từng có cụm thứ ba "Đang giám sát", tách bằng `canViewGroupData`. Nó ra đời
 * khi `/daily-report-scopes/my` còn chạy nhánh `listEnabledScopesForAdmin` cho
 * admin nền tảng và trả về MỌI nhóm đang bật của toàn hệ thống, kể cả nhóm
 * riêng của người khác mà họ không hề được mời vào — gọi số nhóm đó là "Đang
 * tham gia" là nói sai với chính người đang nhìn màn hình.
 *
 * Nhánh admin đó đã bị bỏ ở server (xem `getMy` bên `acta-api`): danh sách nay
 * chỉ còn nhóm người gọi THẬT SỰ thuộc về, với mọi vai trò. Nhưng
 * `canViewGroupData` vẫn bật cho admin nền tảng ở TỪNG DÒNG, vì quyền đọc
 * board/summary của họ không đổi. Giữ lại cụm thứ ba sau khi server đã lọc thì
 * nó không còn bắt được nhóm nào "chỉ giám sát" nữa — nó bắt đúng những nhóm
 * admin đang tham gia thật và dán cho chúng cái nhãn sai ngược lại. Nên cụm đó
 * bị bỏ, và cờ `canViewGroupData` lui về đúng một việc: quyết định dòng đó hiện
 * tiến độ n/m của nhóm hay câu trạng thái bản của mình (xem `RailProgress`).
 *
 * Dưới 1024px cột này nằm ngang thành dải cuộn được. Ở tầng đó tiêu đề cụm bị
 * ẩn (xoay chữ dọc vừa khó đọc vừa hỏng với trình đọc màn hình), nên dấu
 * "trưởng nhóm" chuyển sang hiện trên TỪNG DÒNG — dải cuộn ngang được nên tiêu
 * đề cụm có thể đã trôi khỏi màn khi người dùng cuộn tới nhóm thứ tư, thứ năm.
 */
export function DailyReportScopeRail({
  items,
  activeScopeId,
  isHistoryActive,
  onSelectScope,
  onOpenHistory,
  historyHref,
  isLoading,
  activeBoard,
  careName,
}: Props) {
  const lead = items.filter((i) => i.isManager);
  /**
   * Nhóm mình ĐANG THAM GIA — không lọc bằng `canViewGroupData`.
   *
   * Cờ đó KHÔNG trả lời được câu "tôi có phải thành viên nhóm này không":
   * server bật nó cho admin nền tảng ở mọi dòng, kể cả nhóm họ là thành viên
   * thật. Tư cách thành viên nay đi bằng cờ riêng `isMember` do server trả, và
   * nhóm mình chỉ duyệt (`isReviewOnly`) tách sang cụm thứ ba bên dưới.
   */
  const join = items.filter((i) => !i.isManager && !isReviewOnly(i));
  /** Nhóm mình chỉ duyệt: được giao người, nhưng không có bản phải nộp ở đó. */
  const review = items.filter((i) => isReviewOnly(i));

  /* Ba cụm phân trang ĐỘC LẬP. Hook gọi vô điều kiện — kể cả lúc cột đang
     tải hoặc cụm rỗng — để thứ tự hook không đổi giữa các lần render. */
  const leadPaging = useGroupPaging(lead.length);
  const joinPaging = useGroupPaging(join.length);
  const reviewPaging = useGroupPaging(review.length);

  const leadOnPage = lead.slice(
    (leadPaging.page - 1) * SCOPES_PER_PAGE,
    leadPaging.page * SCOPES_PER_PAGE,
  );
  const joinOnPage = join.slice(
    (joinPaging.page - 1) * SCOPES_PER_PAGE,
    joinPaging.page * SCOPES_PER_PAGE,
  );
  const reviewOnPage = review.slice(
    (reviewPaging.page - 1) * SCOPES_PER_PAGE,
    reviewPaging.page * SCOPES_PER_PAGE,
  );

  return (
    <nav
      aria-label='Nhóm báo cáo của bạn'
      className={cn(
        /* `relative` là điều kiện để khung cuộn này CẮT được con của nó: các
           nhãn `sr-only` bên trong là `position: absolute`, và khi không tổ
           tiên nào có `position` thì chúng lấy gốc trang làm khối chứa, thoát
           khỏi `overflow-x-auto` và kéo cả trang rộng ra 498px ở khổ 375px
           (đo headless 16/09/2026). */
        'relative flex shrink-0 gap-1.5 overflow-x-auto overflow-y-hidden border-b border-ws-line bg-ws-surface-alt p-2',
        // Dưới 1024px dải này nằm ở ĐỈNH tấm nên hai góc trên của nó phải bo
        // theo tấm, nếu không mảng nền vuông lấp vào đường bo và viền trông
        // như bị cắt. Tấm bo `frame` (16px) và có viền 1px, nên bậc NGAY DƯỚI
        // trên thang bán kính — `card` (14px) — là đúng luật lồng: con phải bo
        // nhỏ hơn cha. Trước đây chỗ này là `rounded-t-[15px]`, một con số tự
        // chế nằm ngoài thang; chênh 1px không ai thấy, còn ở ngoài thang thì
        // lần sau lại có người chế thêm số khác.
        // Chỉ áp dưới 1024px: từ 1024px trở lên `nav` đã trong suốt nên không
        // còn gì để bo, và lúc đó nó nằm ở cột trái chứ không ở đỉnh.
        // Có `careName` nghĩa là dải "đang báo cáo thay" đang chiếm đỉnh tấm,
        // dải nhóm tụt xuống giữa — bo góc ở đó là khoét hai góc tròn vô cớ
        // giữa hai mảng màu.
        !careName && 'max-lg:rounded-t-ws-card',
        // Dải ngang ẩn thanh cuộn cho gọn; cột dọc ở ≥1024px thì GIỮ thanh
        // cuộn, nếu không người dùng có 8 nhóm sẽ không biết là còn cuộn được.
        'max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden',
        'lg:w-full lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0',
        // TẮT nền ở ≥1024px. Dưới 1024px cột này là dải ngang tự đứng nên cần
        // nền riêng; từ 1024px trở lên nền do lớp bọc vẽ, và nếu để cả hai thì
        // có hai mảng `surface-alt` chồng nhau — mảng của `nav` VUÔNG GÓC, đè
        // lên đúng góc trên-trái đã bo của lớp bọc. Kết quả là góc đó mất
        // đường cong, viền của tấm bị một mảng màu cắt ngang nên đọc thành
        // "góc mờ, không rõ border".
        'lg:bg-transparent',
        // ≥1024px cột DÍNH lại khi trang cuộn: danh sách nhóm là thứ người
        // dùng nhảy qua nhảy lại liên tục, mà nội dung một bản báo cáo dài vài
        // màn hình — để nó trôi mất thì mỗi lần đổi nhóm phải cuộn ngược lên
        // đầu trang. Mốc dính là `--ws-sticky-top` (đặt ở gốc màn /tasks, bằng
        // đúng chiều cao thanh Navbar cố định).
        //
        // NỀN và VIỀN PHẢI nằm ở lớp BỌC (xem `daily-report-workspace.tsx`),
        // không nằm ở đây: phần tử sticky chỉ cao bằng nội dung của nó, nên tô
        // nền lên chính nó thì cột trái bị cắt ngang — nửa trên `surface-alt`,
        // nửa dưới lòi nền trắng của tấm. Lớp bọc `self-stretch` cao hết tấm
        // giữ mảng màu liền một khối, còn phần tử này chỉ lo việc trượt.
        'lg:sticky lg:top-[var(--ws-sticky-top,0px)]',
        'lg:max-h-[calc(100vh-var(--ws-sticky-top,0px)-1.5rem)]',
        // `ws-scroll` thay thanh cuộn mặc định của HĐH (Windows: dải xám 17px)
        // bằng vệt mảnh theo token — xem khối cùng tên trong globals.css.
        'ws-scroll',
      )}
    >
      {isLoading && items.length === 0 ? (
        <RailSkeleton />
      ) : items.length === 0 ? (
        /* Cột rỗng phải NÓI ra là nó rỗng. Để trống trơn thì người dùng chưa
           có nhóm nào nhìn thấy một dải xám không rõ là đang tải, đang hỏng,
           hay vốn dĩ không có gì. Chỉ hiện ở cột dọc: ở dải ngang dưới
           1024px, một dòng chữ nằm cạnh nút "Lịch sử của tôi" đọc ra như một
           mục bấm được. */
        <p className='hidden px-2 py-3 text-ws-chip leading-snug text-ws-ink-faint lg:block'>
          Chưa có nhóm nào. Tạo nhóm rồi bật báo cáo thì nhóm sẽ hiện ở đây.
        </p>
      ) : (
        <>
          {/* `count` là TỔNG số nhóm của cụm, không phải số nhóm của trang
              đang xem: con số này trả lời "tôi quản lý mấy nhóm", đổi nó theo
              trang thì nó trả lời một câu không ai hỏi. */}
          {lead.length > 0 && (
            <RailHeading label='Nhóm của tôi' count={lead.length} />
          )}
          {leadOnPage.map((item) => (
            <RailRow
              key={item.scopeId}
              item={item}
              isActive={!isHistoryActive && item.scopeId === activeScopeId}
              onSelect={onSelectScope}
              board={item.scopeId === activeScopeId ? activeBoard : undefined}
              careName={careName}
            />
          ))}
          {hasPagination(lead.length) && (
            <RailPagination
              nhan='Nhóm của tôi'
              page={leadPaging.page}
              totalPages={leadPaging.totalPages}
              onChangePage={leadPaging.changePage}
            />
          )}

          {lead.length > 0 && join.length > 0 && <RailDivider />}

          {join.length > 0 && (
            <RailHeading label='Đang tham gia' count={join.length} />
          )}
          {joinOnPage.map((item) => (
            <RailRow
              key={item.scopeId}
              item={item}
              isActive={!isHistoryActive && item.scopeId === activeScopeId}
              onSelect={onSelectScope}
              /* Truyền `board` y như cụm quản lý, KHÔNG ghim `undefined`. Cụm
                 này gộp cả nhóm mà người xem đọc được dữ liệu nhóm (admin nền
                 tảng: `scope/:id/board` trả dữ liệu thật cho họ) lẫn nhóm họ
                 chỉ nộp bản của mình. Việc chọn hiển thị gì là của
                 `RailProgress` — nó đã gác bằng `canViewGroupData`, nên thành
                 viên thường vẫn thấy câu trạng thái bản của chính mình dù có
                 `board` trong tay. Chặn sẵn ở đây là gác hai lần bằng hai luật
                 khác nhau. */
              board={item.scopeId === activeScopeId ? activeBoard : undefined}
              careName={careName}
            />
          ))}
          {hasPagination(join.length) && (
            <RailPagination
              nhan='Đang tham gia'
              page={joinPaging.page}
              totalPages={joinPaging.totalPages}
              onChangePage={joinPaging.changePage}
            />
          )}

          {(lead.length > 0 || join.length > 0) && review.length > 0 && (
            <RailDivider />
          )}

          {review.length > 0 && (
            <RailHeading label='Tôi duyệt' count={review.length} />
          )}
          {reviewOnPage.map((item) => (
            <RailRow
              key={item.scopeId}
              item={item}
              isActive={!isHistoryActive && item.scopeId === activeScopeId}
              onSelect={onSelectScope}
              board={item.scopeId === activeScopeId ? activeBoard : undefined}
              careName={careName}
            />
          ))}
          {hasPagination(review.length) && (
            <RailPagination
              nhan='Tôi duyệt'
              page={reviewPaging.page}
              totalPages={reviewPaging.totalPages}
              onChangePage={reviewPaging.changePage}
            />
          )}
        </>
      )}

      <RailDivider />

      {/* Lịch sử KHÔNG thuộc nhóm nào — nó là màn duy nhất xuyên nhóm, nên
          đứng dưới một vạch ngăn chứ không trộn vào danh sách nhóm. */}
      {historyHref ? (
        <Link
          href={historyHref}
          aria-current={isHistoryActive ? 'true' : undefined}
          className={cn(
            'flex min-h-[44px] shrink-0 items-center gap-2 rounded-ws-control px-3 py-2.5 text-left transition-colors',
            isHistoryActive
              ? 'bg-ws-surface font-semibold text-ws-ink shadow-ws-rest ring-1 ring-ws-line'
              : 'text-ws-ink-soft hover:bg-ws-surface hover:text-ws-ink',
          )}
        >
          <History
            className={cn(
              'h-[15px] w-[15px] shrink-0',
              isHistoryActive ? 'text-ws-ink' : 'text-ws-ink-faint',
            )}
          />
          <span className='min-w-0 flex-1 truncate text-ws-cell font-semibold'>
            Lịch sử của tôi
          </span>
          <ChevronRight className='hidden h-3.5 w-3.5 shrink-0 text-ws-ink-faint lg:block' />
        </Link>
      ) : (
        <button
          type='button'
          onClick={onOpenHistory}
          aria-current={isHistoryActive ? 'true' : undefined}
          className={cn(
            'flex min-h-[44px] shrink-0 items-center gap-2 rounded-ws-control px-3 py-2.5 text-left transition-colors',
            isHistoryActive
              ? 'bg-ws-surface font-semibold text-ws-ink shadow-ws-rest ring-1 ring-ws-line'
              : 'text-ws-ink-soft hover:bg-ws-surface hover:text-ws-ink',
          )}
        >
          <History
            className={cn(
              'h-[15px] w-[15px] shrink-0',
              isHistoryActive ? 'text-ws-ink' : 'text-ws-ink-faint',
            )}
          />
          <span className='min-w-0 flex-1 truncate text-ws-cell font-semibold'>
            Lịch sử của tôi
          </span>
          <ChevronRight className='hidden h-3.5 w-3.5 shrink-0 text-ws-ink-faint lg:block' />
        </button>
      )}
    </nav>
  );
}

function RailHeading({ label, count }: { label: string; count: number }) {
  return (
    <p className='hidden items-center gap-1.5 px-2 pb-2 pt-1 text-ws-micro font-bold uppercase tracking-[0.06em] text-ws-ink-faint lg:flex'>
      {label}
      <span className='inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ws-surface-sunken px-1 text-ws-floor tracking-normal tabular-nums'>
        {count}
      </span>
    </p>
  );
}

/**
 * Thanh phân trang của MỘT cụm — nằm dưới cùng, canh phải của cụm đó.
 *
 * KHÔNG dùng `components/ui/pagination.tsx`: bộ đó dựng bằng thẻ `<a>`, mà thẻ
 * `<a>` không có `disabled` thật — hết trang chỉ làm nó mờ đi nhưng bàn phím
 * vẫn tab vào được và vẫn bấm được. Nó còn `mx-auto w-full justify-center` và
 * đi kèm cỡ nút của `buttonVariants`, quá bề ngang cho một cột rail chỉ rộng
 * hơn 200px và không nói token `ws-*`.
 *
 * Vẫn hiện ở dải ngang dưới 1024px dù tiêu đề cụm bị ẩn ở tầng đó: ẩn nốt
 * thanh này thì nhóm từ thứ 11 trở đi không còn đường nào chạm tới trên điện
 * thoại.
 */
function RailPagination({
  nhan,
  page,
  totalPages,
  onChangePage,
}: {
  nhan: string;
  page: number;
  totalPages: number;
  onChangePage: (step: number) => void;
}) {
  /* Ô vuông nền `ws-surface` + viền `ws-line`: nền của rail là `ws-surface-alt`
     nên hai màu này tách nhau, nút hiện thành một khối rõ ràng thay vì hai mũi
     tên trôi nổi. Hover phải hạ xuống `ws-surface-sunken` — để `ws-surface` như
     cũ thì hover không đổi gì vì nền nút giờ đã chính là màu đó. */
  /* 44px ở dải NGANG (dưới 1024px, nơi thật sự bấm bằng ngón tay), hạ về 32px
     từ `lg` trở lên khi thanh này nằm trong cột dọc 232px. Trước 16/09/2026 nút
     chỉ 32px ở mọi khổ, dưới sàn chạm 44px. `w-11` chứ không `min-w-11`: khối
     `@media (max-width: 540px)` trong `app/globals.css` đặt `min-width: 0` cho
     `button`, nên `min-w-*` chết ở đúng khổ điện thoại. `opacity-40` thay
     `opacity-35` để trạng thái tắt vẫn đọc được, cùng ngưỡng với `PageNav`. */
  const PAGE_BUTTON =
    'flex h-11 w-11 items-center justify-center rounded-ws-control border border-ws-line bg-ws-surface text-ws-ink-soft transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink disabled:pointer-events-none disabled:opacity-40 lg:h-8 lg:w-8';

  return (
    <div
      role='group'
      aria-label={`Phân trang ${nhan}`}
      /* `self-end` chỉ ở cột dọc: ở dải ngang dưới 1024px, `self-end` sẽ dán
         thanh này xuống đáy dải và lệch hẳn so với các ô nhóm bên cạnh. */
      className='flex shrink-0 items-center gap-1 px-1 pb-1 pt-1 lg:self-end'
    >
      <button
        type='button'
        aria-label={`Về trang trước — ${nhan}`}
        disabled={page <= 1}
        onClick={() => onChangePage(-1)}
        className={cn(PAGE_BUTTON, FOCUS_RING)}
      >
        <ChevronLeft className='h-3.5 w-3.5' />
      </button>

      {/* `aria-live` để người dùng bàn phím biết mình vừa sang trang mấy —
          nhãn của hai nút không đổi nên tự nó không nói ra điều đó. */}
      <span
        aria-live='polite'
        className='min-w-[34px] text-center text-ws-micro font-semibold tabular-nums text-ws-ink-faint'
      >
        {page} / {totalPages}
      </span>

      <button
        type='button'
        aria-label={`Đến trang sau — ${nhan}`}
        disabled={page >= totalPages}
        onClick={() => onChangePage(1)}
        className={cn(PAGE_BUTTON, FOCUS_RING)}
      >
        <ChevronRight className='h-3.5 w-3.5' />
      </button>
    </div>
  );
}

/** Vạch ngăn: dọc khi cột nằm ngang, ngang khi cột đứng dọc. */
function RailDivider() {
  return (
    <span
      role='separator'
      className='my-1 w-px shrink-0 self-stretch bg-ws-line lg:mx-2 lg:h-px lg:w-auto lg:self-auto'
    />
  );
}

function RailSkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <span
          key={i}
          className='h-[52px] min-w-[152px] shrink-0 animate-pulse rounded-ws-control bg-ws-surface-sunken lg:min-w-0'
        />
      ))}
    </>
  );
}

function RailRow({
  item,
  isActive,
  onSelect,
  board,
  careName,
}: {
  item: ScopeRailItem;
  isActive: boolean;
  onSelect: (scopeId: string) => void;
  board: BoardResponse | undefined;
  careName?: string;
}) {
  return (
    <button
      type='button'
      onClick={() => onSelect(item.scopeId)}
      aria-current={isActive ? 'true' : undefined}
      title={item.name}
      /* Mục đang chọn nhận diện bằng NỀN NỔI + chữ đậm + một đường bao mảnh,
         không bằng vạch màu ở cạnh. Cột này ngồi trên nền `surface-alt`, nên
         một ô `surface` có bóng đã tách hẳn khỏi nền — đúng cách một mục danh
         sách được chọn vẫn trông ở mọi nơi khác trong app.

         Màu KHÔNG phải kênh duy nhất: chữ đậm lên, bóng đổ, đường bao xuất
         hiện, và `aria-current` báo cho trình đọc màn hình. */
      className={cn(
        'flex min-h-[44px] min-w-[152px] shrink-0 flex-col gap-1.5 rounded-ws-control px-3 py-2 text-left transition-colors lg:min-w-0',
        isActive
          ? 'bg-ws-surface text-ws-ink shadow-ws-rest ring-1 ring-ws-line'
          : 'text-ws-ink-soft hover:bg-ws-surface hover:text-ws-ink',
      )}
    >
      <span className='flex min-w-0 items-center gap-2'>
        <MineDot item={item} />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-ws-cell',
            isActive ? 'font-bold' : 'font-semibold',
          )}
        >
          {item.name}
        </span>
        {/* Nhãn trạng thái cho trình đọc màn hình, đặt SAU tên nhóm chứ không
            nhét vào `MineDot`.

            `MineDot` là con ĐẦU TIÊN của nút, nên nhãn đặt trong đó bị ghép vào
            đầu tên trợ năng: cả dải năm nhóm đều mở màn bằng "Bạn chưa nộp…" và
            người dùng phải nghe hết câu trạng thái mới tới tên nhóm — đúng thứ
            họ đang dò tìm. Đặt ở đây thì thứ tự đọc là tên nhóm trước, trạng
            thái sau.

            Vẫn phải nằm trong `RailRow` chứ không đẩy xuống `RailProgress`:
            hàm đó return sớm cho người xem được dữ liệu nhóm, và ở nhánh đó
            không còn câu nào nói bản của CHÍNH họ. */}
        <span className='sr-only'>{myReportLabel(item, careName)}</span>
        {/* Ở ≥1024px tiêu đề cụm ngay phía trên đã nói vai trò rồi. */}
        {item.isManager && (
          <Users
            aria-label='Bạn là trưởng nhóm'
            className={cn(
              'h-3.5 w-3.5 shrink-0 lg:hidden',
              isActive ? 'text-ws-ink-soft' : 'text-ws-ink-ghost',
            )}
          />
        )}
      </span>

      <RailProgress item={item} board={board} careName={careName} />
    </button>
  );
}

/**
 * Câu trạng thái BẢN CỦA TÔI ở một nhóm — nguồn chữ DUY NHẤT cho cả hai kênh:
 * `MineDot` đọc nó cho trình đọc màn hình, `RailProgress` in nó lên màn.
 *
 * Gom vào một hàm vì hai kênh bắt buộc phải nói y một câu. Tách ra thì lần sau
 * có người sửa nhãn hiển thị mà quên nhãn đọc, và bản đọc lệch với bản nhìn.
 *
 * Ở chế độ làm thay, bản trong `my/today` là của NGƯỜI ĐƯỢC CHĂM. Xưng "Bạn"
 * ở đây là gán nhầm việc cho người đang đăng nhập.
 */
function myReportLabel(item: ScopeRailItem, careName?: string) {
  const who = careName ?? 'Bạn';
  // Nhóm chỉ duyệt không có bản nào của mình: "Hôm nay không báo cáo" ở đây
  // là nói sai về chính nhóm, vì nhóm vẫn báo cáo, chỉ người xem không nộp.
  if (isReviewOnly(item)) return 'Bạn duyệt báo cáo nhóm này';
  if (!item.report) {
    return careName ? `Không có bản của ${careName}` : 'Hôm nay không báo cáo';
  }
  if (isSubmitted(item.report.status)) {
    return `${who} đã nộp ${formatTimeVi(item.report.firstSubmittedAt)}`;
  }
  // Bản đã nộp rồi bị trả lại hay mở lại thì "chưa nộp" là sai: họ đã nộp, và
  // việc cần làm là nộp LẠI.
  switch (item.report.boardState) {
    case 'BI_TRA_LAI':
      return `${who} bị trả lại, cần nộp lại`;
    case 'DA_MO_LAI':
      return `${who} cần nộp lại`;
    case 'QUA_HAN_BO_SUNG':
      return `${who} quá hạn bổ sung`;
    default:
      return item.report.isMissed
        ? `${who} chưa nộp — đã khóa`
        : `${who} chưa nộp`;
  }
}

/**
 * Chấm = trạng thái BẢN CỦA TÔI ở nhóm đó. Bốn nhánh, bốn màu:
 *
 * | Nhánh                | Token           | Câu của `nhanBanCuaToi`  |
 * | chưa có bản          | `ws-ink-ghost`  | "Hôm nay không báo cáo"  |
 * | đang mở, chưa nộp    | `ws-open-edge`  | "Bạn chưa nộp"           |
 * | đã nộp               | `ws-done-edge`  | "Bạn đã nộp HH:MM"       |
 * | lỡ hạn, đã khoá      | `ws-void-edge`  | "Bạn chưa nộp — đã khóa" |
 *
 * (Ở chế độ làm thay, "Bạn" đổi thành tên người được chăm — xem
 * `nhanBanCuaToi`.)
 *
 * Chấm này KHÔNG tự mang chữ. Nhãn trạng thái là một `sr-only` nằm ở `RailRow`,
 * ngay SAU tên nhóm — xem chú thích tại chỗ để biết vì sao phải là ở đó.
 *
 * Nó tồn tại vì `RailProgress` có lệnh return sớm: ai xem được dữ liệu nhóm
 * (`item.canViewGroupData`) mà nhóm đó đã tải `board` thì nhận thanh tiến độ
 * "n/m" của cả nhóm THAY CHO câu trạng thái. Ở nhánh đó không còn dòng chữ nào
 * nói bản của CHÍNH họ — nên nhãn phải nằm ngoài `RailProgress`.
 *
 * Đổi lại, câu hiển thị của `RailProgress` phải mang `aria-hidden`: hai chỗ lấy
 * chữ từ cùng `nhanBanCuaToi` nên để cả hai cùng đọc là mỗi dòng nhóm bị đọc
 * trạng thái hai lần.
 *
 * ⚠ GIỚI HẠN CÒN LẠI, đừng đọc khối trên thành "đã xong phần trợ năng":
 * `sr-only` là vị trí tuyệt đối + kẹp 1px, tức KHÔNG NHÌN THẤY. Nó mở kênh cho
 * trình đọc màn hình, KHÔNG mở kênh nào cho người NHÌN ĐƯỢC nhưng không phân
 * biệt được màu. Với những người đó, ở nhánh return sớm nói trên, màu vẫn là
 * kênh DUY NHẤT phân biệt bốn trạng thái. Đóng chỗ này đòi một kênh nhìn thấy
 * được — hình chấm khác nhau, hoặc để `RailProgress` nói kèm trạng thái cá nhân
 * ở nhánh nhóm — cả hai đều là thay đổi bố cục, thuộc đợt khác.
 *
 * Nhánh "đang mở" từng dùng `ws-pending-edge`. Hai token đó không phải "gần
 * nhau" mà BẰNG NHAU tuyệt đối — cùng `#83868b` ở nền sáng, cùng `#7e8186` ở
 * nền tối (xem chỗ khai trong `app/globals.css`) — nên hai chấm vẽ ra y hệt,
 * không có cách nào phân biệt. Nay là vàng `ws-open-edge`; lý do chọn hue và
 * số tương phản nằm ở chỗ khai token.
 */
function MineDot({ item }: { item: ScopeRailItem }) {
  const tone = !item.report
    ? 'bg-ws-ink-ghost'
    : isSubmitted(item.report.status)
      ? 'bg-ws-done-edge'
      : item.report.isMissed
        ? 'bg-ws-void-edge'
        : 'bg-ws-open-edge';
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', tone)} />;
}

/**
 * Dòng dưới của một nhóm.
 *
 * Trưởng nhóm hoặc admin/super admin thấy tiến độ n/m của cả nhóm; thành viên
 * thường thì không — `my/today` không trả con số đó và `scope/:id/board` trả
 * 403 với họ. Bịa một tỷ lệ ở đây là nói dối; nói trạng thái bản của chính mình
 * mới là thứ có thật.
 *
 * Hai nhánh này LOẠI TRỪ nhau: ai thấy thanh n/m thì KHÔNG thấy câu trạng thái
 * bản của mình ở dòng này. Đó là lý do nhãn trạng thái cá nhân phải nằm ở
 * `RailRow` — đừng chuyển nó về đây.
 *
 * Điều kiện rẽ nhánh là `item.canViewGroupData` hoặc nhóm chỉ duyệt, KHÔNG phải
 * "là trưởng nhóm hay admin". Giá trị đó do server chốt và client chỉ rơi về
 * `isManager` khi server không gửi (`utils/scope-nav.ts`, chỗ dựng `fromScopes`)
 * — nên đừng suy vai trò ngược từ nhánh này.
 */
function RailProgress({
  item,
  board,
  careName,
}: {
  item: ScopeRailItem;
  board: BoardResponse | undefined;
  careName?: string;
}) {
  /* Thanh n/m cho quản lý/admin như cũ, và cho nhóm mình CHỈ duyệt - ở đó
     không có bản nào của mình để nói, còn board server trả đã lọc đúng những
     người mình phụ trách. Người duyệt phụ TRONG nhóm vẫn thấy câu trạng thái
     bản của chính mình: vai duyệt không miễn cho họ việc nộp. */
  if ((item.canViewGroupData || isReviewOnly(item)) && board) {
    const { submitted, total } = board.stats;
    const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return (
      <span className='flex h-4 items-center gap-2 text-ws-chip text-ws-ink-faint'>
        {/* Thanh này tự vẽ bằng hai `span` lồng nhau chứ không dùng Radix
            `<Progress>` như bảng nhóm và Tổng hợp: nó chỉ cao 1px, nằm trong
            một hàng cột nhóm 16px, và Radix bọc thêm một lớp `Indicator` với
            `transform` riêng làm hàng vỡ ở bề rộng này.
            Đổi lại, phần ngữ nghĩa phải khai bằng tay — không có ARIA thì trình
            đọc màn hình chỉ thấy hai `span` rỗng, và tỷ lệ nộp của cả nhóm
            biến mất khỏi bản đọc. */}
        <span
          role='progressbar'
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${submitted}/${total} đã nộp`}
          aria-label='Tỷ lệ đã nộp của nhóm'
          className='h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-ws-surface-sunken'
        >
          <span
            className={cn(
              'block h-full rounded-full',
              pct < 80 ? 'bg-ws-pending-edge' : 'bg-ws-done-edge',
            )}
            style={{ width: `${pct}%` }}
          />
        </span>
        {/* `aria-hidden` vì `aria-valuetext` ngay trên đã nói đúng con số này —
            để cả hai thì trình đọc màn hình đọc "12/15" hai lần liền. */}
        <span aria-hidden='true' className='tabular-nums'>
          {submitted}/{total}
        </span>
      </span>
    );
  }

  /* `aria-hidden` vì `MineDot` ngay phía trên đã đọc ĐÚNG câu này ra cho trình
     đọc màn hình — cả hai lấy chữ từ `nhanBanCuaToi`. Để cả hai cùng đọc thì
     mỗi dòng nhóm bị đọc trạng thái hai lần. Đây là kênh NHÌN, không phải kênh
     duy nhất: kênh đọc nằm trong `MineDot` và có ở mọi nhánh. */
  return (
    <span
      aria-hidden='true'
      className='h-4 truncate text-ws-chip text-ws-ink-faint'
    >
      {myReportLabel(item, careName)}
    </span>
  );
}
