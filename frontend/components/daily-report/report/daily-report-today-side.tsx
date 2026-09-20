'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useMyReportHistory,
  useScopeMemberReportHistory,
} from '@/hooks/queries/daily-report-queries';
import type {
  BoardResponse,
  DailyReportHistoryItem,
  ReportScopeMeta,
} from '@/types/daily-report.type';
import {
  FOCUS_RING,
  REPORT_STATUS_LABEL_VI,
  SUBMISSION_STATE_LABEL,
  formatDayMonthVi,
  formatMinuteOfDay,
  isInReviewCycle,
  isSubmitted,
  minuteOfDayVi,
  shiftDayStr,
  todayStrVi,
} from '../daily-report-utils';
import { ReviewStateBadge } from '../shared/report-row';

/** Bốn nhãn giờ đủ để vẽ mốc trong ngày — khớp cả `ReportScopeMeta` lẫn
 *  `DailyReportScopeListItem` nên không cần dựng kiểu mới. */
type DayMarks = Pick<
  ReportScopeMeta,
  'generationLabel' | 'reminderLabel' | 'leaderSummaryLabel' | 'hardStopLabel'
>;

interface Props {
  scopeId: string;
  marks: DayMarks;
  /**
   * Xem được bảng của ĐÚNG nhóm này: quản lý, hoặc người được giao duyệt (bảng
   * của họ đã được server lọc theo phân công). Chỉ gác thẻ tiến độ; bảng do
   * workspace tải, nên cờ sai ở đây không bắn thêm request nào.
   */
  canViewBoard: boolean;
  /** Bảng nhóm của ngày đang xem. `undefined` khi chưa về hoặc không có quyền. */
  board: BoardResponse | undefined;
  /** Bản đang mở: thẻ "Bản gần đây" bỏ chính nó ra khỏi danh sách. */
  reportId: string;
  /**
   * Chủ bản khi đang đọc bản của NGƯỜI KHÁC. Có giá trị thì thẻ "Bản gần đây"
   * đọc lịch sử của chính người đó - đọc lịch sử của người duyệt ở đây là đặt
   * bài của mình cạnh bài người khác như thể cùng một người.
   */
  otherOwner?: { id: string; fullName?: string } | null;
  onOpenBoard: () => void;
  onOpenHistory: () => void;
  onOpenReport: (reportId: string) => void;
}

/**
 * Cột ngữ cảnh của màn đọc một bản.
 *
 * Ba thẻ, ba nguồn khác nhau, không thẻ nào lặp lại cột nhóm bên trái:
 * - Mốc trong ngày ← `ReportScopeMeta`, bốn mốc của CHÍNH nhóm này
 * - Nhóm đã nộp    ← `BoardResponse`, quản lý và người duyệt
 * - Bản gần đây    ← `GET /daily-reports/my` lọc theo `scopeId`, hoặc lịch sử
 *                    của chủ bản khi đang đọc bản người khác
 *
 * Thẻ giữa CÓ lặp con số n/m với cột trái, nhưng ở đây nó đi kèm TÊN người còn
 * thiếu — thứ cột trái không chỗ nào chứa nổi, và là thứ trưởng nhóm cần để đi
 * nhắc. Con số đứng đó làm ngữ cảnh cho danh sách tên, không phải để đọc lại.
 */
export function DailyReportTodaySide({
  scopeId,
  marks,
  canViewBoard,
  board,
  reportId,
  otherOwner = null,
  onOpenBoard,
  onOpenHistory,
  onOpenReport,
}: Props) {
  return (
    <aside
      aria-label='Ngữ cảnh hôm nay'
      /* Từ 1280px trở lên cột này DÍNH khi cuộn, giống cột nhóm bên trái: nó
         chứa mốc giờ trong ngày và tiến độ nhóm — thứ người dùng liếc lại
         trong lúc gõ câu trả lời ở giữa. Để nó trôi mất thì phải cuộn ngược
         lên mới xem được hạn nộp. Dưới 1280px cột nằm dưới form nên không
         dính. Mốc `--ws-sticky-top` đặt ở gốc màn /tasks. */
      /* `max-h` + cuộn riêng đi KÈM `sticky`, không tách rời được.
         Một phần tử đã ghim ở `top` mà cao hơn khoảng trống còn lại thì phần
         dưới của nó nằm ngoài mép màn hình và không có cách nào tới: cuộn
         trang chỉ làm nội dung ở giữa chạy, cột này đứng im. Với nhóm còn
         nhiều người chưa nộp, phần bị nuốt chính là nút "Xem bảng nhóm" và
         "Xem hết lịch sử". Cột nhóm bên trái đã có đủ bộ ba này từ đầu —
         xem `daily-report-scope-rail.tsx`.
         Đặt `overflow-y-auto` lên CHÍNH phần tử sticky là an toàn; chỉ
         `overflow` ở TỔ TIÊN mới giết sticky. */
      /* Mốc dính CỘNG 12px, không dính đúng `--ws-sticky-top`.
         Biến đó là đáy thanh Navbar, nên dính đúng vào nó là mép trên thẻ
         "Mốc trong ngày" chạm sát gạch chân Navbar — hai đường kẻ nằm liền
         nhau không có khoảng thở, đọc thành thẻ bị dán vào thanh. Khác với
         các header dính của Bảng nhóm / Tổng hợp / Lịch sử: chúng là băng
         trải hết bề ngang, nối tiếp Navbar thành một khối nên chạm sát là
         đúng. Cột này là những THẺ RỜI có viền riêng, cần hở ra mới đọc được
         là một lớp khác.
         `max-h` trừ theo: 12px hở trên + 12px chừa dưới = 1.5rem. */
      className='ws-scroll flex w-full shrink-0 flex-col gap-3 xl:sticky xl:top-[calc(var(--ws-sticky-top,0px)+0.75rem)] xl:max-h-[calc(100vh-var(--ws-sticky-top,0px)-1.5rem)] xl:w-[280px] xl:overflow-y-auto'
    >
      <DayMarksCard marks={marks} />
      {canViewBoard && board && (
        <TeamProgressCard board={board} onOpenBoard={onOpenBoard} />
      )}
      <RecentCard
        scopeId={scopeId}
        excludeReportId={reportId}
        otherOwner={otherOwner}
        onOpenHistory={onOpenHistory}
        onOpenReport={onOpenReport}
      />
    </aside>
  );
}

function SideCard({
  title,
  busy,
  children,
}: {
  title: string;
  /** Thẻ đang chờ dữ liệu về. Đặt `aria-busy` để trình đọc màn hình khỏi đọc
   *  nội dung tạm thời như thể đó là kết quả cuối cùng. */
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-busy={busy || undefined}
      className='rounded-ws-block border border-ws-line bg-ws-surface-alt p-3'
    >
      <p className='text-ws-chip font-bold uppercase tracking-[0.06em] text-ws-ink-faint'>
        {title}
      </p>
      {children}
    </section>
  );
}

/**
 * Bốn mốc trong ngày của nhóm đang xem.
 *
 * Đọc thẳng bốn nhãn server trả về, KHÔNG đóng cứng '07:30 · 16:30 · 17:20 ·
 * 23:00' trong client: doc 11 mục 1 chốt ba mốc sau là cấu hình theo TỪNG nhóm
 * (`reminderBeforeMinutes`, `leaderSummaryMinute`, `cutoffMinute`), chỉ mốc
 * sinh bản 07:30 là không cho chỉnh. Nhóm đổi giờ thì chỗ này đổi theo mà
 * không phải sửa code.
 *
 * "Bạn đang ở đây" xác định bằng so chuỗi 'HH:mm': cả hai vế đều zero-pad nên
 * so chuỗi cho đúng thứ tự thời gian, không cần parse ra số phút.
 */
function DayMarksCard({ marks }: { marks: DayMarks }) {
  /* Đọc đồng hồ trong thân render là dấu "đang ở đây" đông cứng ở lần render
     cuối — người viết báo cáo ngồi cả buổi chiều sẽ thấy nó đứng im qua mốc
     16:30 và 17:20. Một nhịp mỗi phút là đủ, và rẻ.

     ĐÂY CHỈ LÀ CHỈ BÁO TRỰC QUAN, KHÔNG PHẢI NGUỒN QUYỀN. Đồng hồ đọc ở đây là
     đồng hồ MÁY NGƯỜI DÙNG — chỉnh sai giờ, sai múi giờ, hay để máy ngủ qua
     đêm là nó lệch ngay. Nó chỉ quyết định chấm nào được tô đậm và dòng nào
     thêm chữ "hiện tại".
     Việc mở/khoá/nộp KHÔNG bao giờ hỏi tới biến này: `permissions`,
     `isLocked`, `isMissed` đều do server trả về và mọi nút đọc thẳng từ đó.
     Nếu có ngày cần thêm điều kiện cho một nút nào, đừng lấy `nowMinute` ra
     dùng — hỏi server. */
  const [nowMinute, setNowMinute] = useState(minuteOfDayVi);
  useEffect(() => {
    const id = setInterval(() => setNowMinute(minuteOfDayVi()), 60_000);
    return () => clearInterval(id);
  }, []);
  const now = formatMinuteOfDay(nowMinute);
  const rows = [
    { at: marks.generationLabel, label: 'Mở bản báo cáo' },
    { at: marks.reminderLabel, label: 'Nhắc thành viên nộp' },
    { at: marks.leaderSummaryLabel, label: 'Tổng hợp cho trưởng nhóm' },
    { at: marks.hardStopLabel, label: 'Khóa báo cáo' },
  ];
  /** Mốc gần nhất đã qua. -1 nghĩa là chưa tới mốc đầu tiên trong ngày. */
  let current = -1;
  rows.forEach((r, i) => {
    if (r.at <= now) current = i;
  });

  return (
    <SideCard title='Mốc trong ngày'>
      <ol className='mt-2'>
        {rows.map((r, i) => {
          const isNow = i === current;
          const isPast = i < current;
          const isLast = i === rows.length - 1;
          return (
            <li
              key={r.at + r.label}
              className='relative flex gap-2.5 pb-3.5 last:pb-0'
            >
              {/* Đường dọc nối các mốc thành MỘT dòng thời gian.
                  Thiếu nó thì bốn dòng đọc thành bốn mục rời rạc, mất hẳn nghĩa
                  "cái này xảy ra rồi mới tới cái kia". Vẽ bằng một phần tử tuyệt
                  đối chứ không dùng `border-l` của `li`: chấm nằm giữa đường, nên
                  đường phải chạy NGẦM phía sau chấm và dừng đúng ở mốc cuối. */}
              {!isLast && (
                <span
                  aria-hidden='true'
                  className={cn(
                    'absolute left-[3.5px] top-3 w-px',
                    // kéo tới chấm của mốc kế: hết phần đệm dưới của dòng này
                    'bottom-0',
                    isPast ? 'bg-ws-done-edge/50' : 'bg-ws-line',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full',
                  isNow
                    ? 'bg-ws-accent ring-[3px] ring-ws-accent-bg'
                    : isPast
                      ? 'bg-ws-done-edge'
                      : 'bg-ws-surface-alt ring-1 ring-ws-line-strong',
                )}
              />
              <span className='min-w-0 flex-1'>
                <span
                  className={cn(
                    'block text-ws-chip tabular-nums',
                    isNow
                      ? 'font-semibold text-ws-accent'
                      : 'text-ws-ink-faint',
                  )}
                >
                  {r.at}
                </span>
                <span className='block text-ws-chip leading-snug text-ws-ink-soft'>
                  {r.label}
                  {isNow && ' · hiện tại'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </SideCard>
  );
}

function TeamProgressCard({
  board,
  onOpenBoard,
}: {
  board: BoardResponse;
  onOpenBoard: () => void;
}) {
  const { submitted, total } = board.stats;
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const missing = board.rows.filter((r) => !isSubmitted(r.status));
  /* Thẻ này nay còn hiện khi đọc bản của một NGÀY CŨ (bảng theo ngày của bản
     đang duyệt), và với người duyệt phụ thì bảng chỉ gồm người họ phụ trách.
     "Nhóm hôm nay" cho cả hai ca là nói sai cả phạm vi lẫn ngày. */
  const isToday = board.date === todayStrVi();
  const who = board.stats.isFilteredToAssignment ? 'Bộ phận' : 'Nhóm';
  const title = isToday
    ? `${who} hôm nay`
    : `${who} ngày ${formatDayMonthVi(board.date)}`;

  return (
    <SideCard title={title}>
      <div className='mt-2 flex items-center gap-2'>
        {/* Thanh tiến độ dùng chung `components/ui/progress.tsx` thay cho hai
            span tự vẽ: bản tự vẽ không có `role="progressbar"` nên trình đọc
            màn hình chỉ thấy hai ô trống, và tỷ lệ n/m bên cạnh không nói ra
            được là nó thuộc về thanh nào.
            Màu ruột đặt qua `[&>div]` vì Radix không mở prop cho Indicator —
            Indicator là phần tử con duy nhất của Root. */}
        <Progress
          value={pct}
          aria-label={`Tiến độ nộp, ${title.toLowerCase()}: ${submitted} trên ${total}`}
          className={cn(
            'h-1.5 min-w-0 flex-1 bg-ws-surface-sunken',
            pct < 80
              ? '[&>div]:bg-ws-pending-edge'
              : '[&>div]:bg-ws-done-edge',
          )}
        />
        <span className='shrink-0 text-ws-chip font-semibold tabular-nums text-ws-ink-soft'>
          {submitted}/{total}
        </span>
      </div>

      {missing.length > 0 ? (
        <>
          <p className='mb-1.5 mt-2 text-ws-chip text-ws-ink-faint'>
            Còn {missing.length} người chưa nộp:
          </p>
          {/* Xếp DỌC chứ không chồng avatar: mục đích ở đây là đọc được TÊN để
              đi nhắc, chồng avatar thì phải rê chuột từng cái mới biết là ai. */}
          <ul className='flex flex-col gap-1.5'>
            {missing.slice(0, 4).map((row) => (
              <li key={row.userId} className='flex min-w-0 items-center gap-2'>
                {/* Ảnh đại diện đi kèm tên. `avatarUrl` đã nằm sẵn trong mỗi
                    dòng board server trả về (`getBoard` trong
                    `daily-reports.service.ts`), không phải gọi thêm gì.

                    KHÔNG dùng `AvatarFallback`: bản trong repo bỏ qua children
                    và luôn vẽ icon `User` chung (xem `components/ui/avatar.tsx`)
                    — bốn người chưa nộp mà cùng một icon xám thì danh sách này
                    mất hẳn tác dụng nhận mặt. Nên chữ cái đầu nằm sẵn dưới,
                    `AvatarImage` phủ lên trên và chỉ hiện khi ảnh tải được:
                    thiếu ảnh hoặc link hỏng đều rơi về chữ, không ra ô trống
                    lẫn icon "ảnh vỡ" của trình duyệt. */}
                <Avatar
                  aria-hidden='true'
                  className='h-6 w-6 shrink-0 items-center justify-center bg-ws-surface-sunken text-ws-micro font-bold text-ws-ink-soft'
                >
                  {row.fullName.trim().split(' ').pop()?.charAt(0) ?? '?'}
                  <AvatarImage
                    src={row.avatarUrl ?? undefined}
                    alt={row.fullName}
                    className='absolute inset-0 object-cover'
                  />
                </Avatar>
                <span className='min-w-0 flex-1 truncate text-ws-chip text-ws-ink-soft'>
                  {row.fullName}
                </span>
              </li>
            ))}
            {missing.length > 4 && (
              /* Thụt đúng bề ngang avatar (24px) + `gap-2` (8px) để dòng này
                 thẳng hàng với cột TÊN ở trên. */
              <li className='pl-8 text-ws-chip text-ws-ink-faint'>
                +{missing.length - 4} người nữa
              </li>
            )}
          </ul>
        </>
      ) : (
        <p className='mt-2 text-ws-chip text-ws-ink-faint'>
          {board.stats.isFilteredToAssignment
            ? 'Cả bộ phận đã nộp đủ.'
            : isToday
              ? 'Cả nhóm đã nộp đủ hôm nay.'
              : 'Cả nhóm đã nộp đủ ngày này.'}
        </p>
      )}

      <button
        type='button'
        onClick={onOpenBoard}
        className={cn(
          'mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-ws-control border border-ws-line bg-ws-surface px-3 text-ws-meta font-semibold text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink md:min-h-[36px]',
          FOCUS_RING,
        )}
      >
        <Users aria-hidden='true' className='h-3.5 w-3.5' />
        {/* "Xem bảng bộ phận", không phải "Xem bộ phận": nút này mở BẢNG đã
            lọc theo bộ phận mình phụ trách, không phải trang Bộ phận (trang đó
            chỉ trưởng nhóm vào được). */}
        {board.stats.isFilteredToAssignment
          ? 'Xem bảng bộ phận'
          : 'Xem bảng nhóm'}
      </button>
    </SideCard>
  );
}

/**
 * Ba bản gần nhất CỦA CHÍNH NHÓM NÀY. Bản của mình dùng `GET /daily-reports/my`
 * với `scopeId`; bản của người khác dùng lịch sử thành viên
 * (`/scope/:id/members/history`, server gác bằng `canViewReport` - người duyệt
 * đọc được người mình phụ trách).
 *
 * Bản đang mở bị lọc bỏ: nó đang hiện ngay bên trái, đưa vào đây là đọc cùng
 * một thứ hai lần. Lọc theo id chứ không theo "hôm nay" như bản cũ: mở một bản
 * của ngày cũ thì chính bản đó mới là thứ trùng.
 */
function RecentCard({
  scopeId,
  excludeReportId,
  otherOwner,
  onOpenHistory,
  onOpenReport,
}: {
  scopeId: string;
  excludeReportId: string;
  otherOwner: { id: string; fullName?: string } | null;
  onOpenHistory: () => void;
  onOpenReport: (reportId: string) => void;
}) {
  const today = todayStrVi();
  const range = { from: shiftDayStr(today, -29), to: today };
  const mine = useMyReportHistory(
    { ...range, scopeId, page: 1, limit: 5 },
    otherOwner === null,
  );
  const theirs = useScopeMemberReportHistory(
    scopeId,
    otherOwner?.id ?? null,
    range,
  );
  const { data, isLoading } = otherOwner === null ? mine : theirs;
  const ownerName = otherOwner
    ? (otherOwner.fullName?.trim().split(/\s+/).pop() ?? 'thành viên')
    : null;

  const rows = (data?.data ?? [])
    .filter((r) => r.id !== excludeReportId)
    .slice(0, 3);

  return (
    <SideCard
      title={ownerName ? `Bản gần đây của ${ownerName}` : 'Bản gần đây'}
      busy={isLoading}
    >
      {isLoading ? (
        /* Lúc chờ, thẻ này TỪNG hiện thẳng câu "Chưa có bản nào trước hôm nay
           ở nhóm này." — một khẳng định về dữ liệu mà lúc đó chưa ai biết,
           tức nói sai với người dùng trong đúng khoảng thời gian họ đang chờ.
           Ba vệt xám nói đúng điều đang xảy ra: chưa biết.
           `bg-ws-surface-sunken` là bắt buộc: `Skeleton` mặc định `bg-muted`,
           nằm ngoài thang ws- nên trên nền `surface-alt` nó ra một màu khác
           hẳn phần còn lại của cột. */
        <div className='mt-2 flex flex-col gap-1.5'>
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              className='h-8 w-full rounded-ws-control bg-ws-surface-sunken'
            />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <>
          <ul className='mt-1.5 flex flex-col'>
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type='button'
                  onClick={() => onOpenReport(row.id)}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-2 rounded-ws-control px-1.5 py-1.5 text-left transition-colors hover:bg-ws-surface md:min-h-[36px]',
                    FOCUS_RING,
                  )}
                >
                  <span className='shrink-0 text-ws-chip font-semibold tabular-nums text-ws-ink'>
                    {row.reportDate.slice(8, 10)}/{row.reportDate.slice(5, 7)}
                  </span>
                  <span className='min-w-0 flex-1 truncate text-ws-chip text-ws-ink-faint'>
                    {row.answerPreview || '—'}
                  </span>
                  <RecentBadge row={row} />
                </button>
              </li>
            ))}
          </ul>
          {/* "Lịch sử của tôi" là lịch sử của NGƯỜI XEM. Đang đọc bản người
              khác mà dẫn sang đó là đưa người duyệt về bài của chính họ. */}
          {otherOwner === null && (
            <button
              type='button'
              onClick={onOpenHistory}
              className={cn(
                'mt-1.5 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-ws-control px-3 text-ws-meta font-semibold text-ws-ink-soft transition-colors hover:bg-ws-surface hover:text-ws-ink md:min-h-[36px]',
                FOCUS_RING,
              )}
            >
              Xem hết lịch sử
              <ChevronRight aria-hidden='true' className='h-3.5 w-3.5' />
            </button>
          )}
        </>
      ) : (
        <p className='mt-2 text-ws-chip text-ws-ink-faint'>
          {ownerName
            ? `${ownerName} chưa có bản nào khác trong 30 ngày qua ở nhóm này.`
            : 'Chưa có bản nào khác trong 30 ngày qua ở nhóm này.'}
        </p>
      )}
    </SideCard>
  );
}

/**
 * Nhãn một dòng "Bản gần đây". Bản nằm TRONG vòng duyệt thì nói kết quả duyệt
 * ("Đạt", "Bị trả lại"), vì với cả chủ bản lẫn người duyệt đó mới là điều đáng
 * biết về một bài đã nộp. Bản cũ hơn vòng duyệt giữ nhãn trạng thái nộp: server
 * vẫn suy chúng là "Chờ duyệt" mãi mãi, in ra là nói điều không có thật.
 */
function RecentBadge({ row }: { row: DailyReportHistoryItem }) {
  const inCycle =
    row.boardState !== undefined &&
    isInReviewCycle({
      deadlineAt: row.reviewDeadlineAt,
      decision: row.reviewDecision,
    });
  /* Cùng khuôn viên nhạt có icon với mọi badge trạng thái (17/09/2026); bỏ chữ
     in hoa của bản cũ. */
  if (inCycle && row.boardState) {
    return <ReviewStateBadge state={row.boardState} size='xs' />;
  }
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-1.5 py-0.5 text-ws-chip font-semibold',
        isSubmitted(row.status)
          ? 'bg-ws-done-bg text-ws-done-fg'
          : row.isMissed
            ? 'bg-ws-danger/5 text-ws-danger/80'
            : 'bg-ws-pending-bg text-ws-pending-fg',
      )}
    >
      {/* Bản lỡ hạn vẫn là DRAFT ở server; nhãn phải nói đúng như màu. */}
      {row.isMissed && !isSubmitted(row.status)
        ? SUBMISSION_STATE_LABEL.missed
        : REPORT_STATUS_LABEL_VI[row.status]}
    </span>
  );
}
