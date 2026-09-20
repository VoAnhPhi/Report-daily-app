'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskStatus } from '@/types/task.type';
import { GetTasksQuery } from '@/app/api/tasks';
import {
  getTaskColumnData,
  TASK_STATUS_CONFIG,
} from '@/components/tasks/task-utils';
import {
  useMyPinnedTasks,
  useMyTasksInfinite,
  usePinTask,
  useUnpinTask,
} from '@/hooks/queries/task-queries';
import { useOptimizedInfiniteScroll } from '@/hooks/use-optimized-infinite-scroll';
import { TaskStatusChip } from '../shared/task-status-chip';
import { AddTaskSlot } from './add-task-slot';
import { EmptyColumn } from './board-empty';
import { TaskCard, TaskCardSkeleton } from './task-card';

export interface TaskColumnProps {
  status: TaskStatus;
  baseQuery?: GetTasksQuery;
  showTypeTag: boolean;
  hasActiveFilter: boolean;
  /** Vừa thả lại đúng cột này — hiện dòng nhắc 2,5 giây. */
  sameColumnHint: boolean;
  /**
   * Thẻ đang được kéo XUẤT PHÁT từ cột này.
   *
   * Cần biết để KHÔNG tô cột nguồn thành ô đích hợp lệ: thư viện dnd vẫn bật
   * `isDraggingOver` cho chính cột đang giữ thẻ, nên nó sáng xanh y như ba
   * cột kia — mời người dùng thả vào, rồi thả xong lại báo "không lưu được
   * thứ tự trong cột". Hứa một thao tác rồi từ chối nó.
   */
  isDragSource: boolean;
  onSelectTask: (task: Task) => void;
  onAddTask?: () => void;
  onClearFilters?: () => void;
  onMoveTask: (id: string, next: TaskStatus, previous: TaskStatus) => void;
  /**
   * Nộp danh sách việc của cột LÊN BẢNG, để bảng tra được MÃ việc từ id lúc bắt
   * đầu kéo.
   *
   * CẤY TỪ `staging` trong lượt merge 26/08/2026. Nhánh này tách `TaskColumn`
   * ra file riêng TRƯỚC khi `staging` thêm tính năng kéo thẻ việc vào khung chat
   * "Nhân viên Nhân" (`876b512a`), nên bản tách không mang prop này — mà
   * `task-board.tsx` vẫn truyền nó xuống. Thiếu nó thì `soTheRef` của bảng rỗng
   * và `timThe` không tra ra thẻ nào, nên kéo thẻ vào chat im lặng không làm gì.
   *
   * Phải ỔN ĐỊNH giữa các lần kết xuất — nó nằm trong mảng phụ thuộc bên dưới.
   */
  onGhiSoThe: (cot: TaskStatus, viec: Task[]) => void;
}

/**
 * Một cột status: tự tải danh sách việc của status đó theo trang (infinite
 * scroll — giảm tải, không load hết 1 lần), gom theo mốc tháng của startDate.
 *
 * Đầu cột là một HỘP RIÊNG nằm trên thân cột; thân cột trong suốt, đặt trên
 * khung nội dung `ws-surface`. Nhờ vậy bốn cột không cần bốn nền màu vẫn có
 * ranh giới rõ — đây là thứ chữa được "bốn cột đánh nhau".
 */
export function TaskColumn({
  status,
  baseQuery,
  showTypeTag,
  hasActiveFilter,
  sameColumnHint,
  isDragSource,
  onSelectTask,
  onAddTask,
  onClearFilters,
  onMoveTask,
  onGhiSoThe,
}: TaskColumnProps) {
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMyTasksInfinite(status, baseQuery);
  // Việc đã ghim: query RIÊNG (không phân trang) → luôn nổi đầu cột dù ở trang
  // nào. Danh sách phân trang bên dưới đã loại ghim (pinned: 'exclude').
  const { data: pinned = [] } = useMyPinnedTasks(status, baseQuery);
  const { mutate: pinTask } = usePinTask();
  const { mutate: unpinTask } = useUnpinTask();
  const { lastElementRef } = useOptimizedInfiniteScroll({
    hasMore: !!hasNextPage,
    loading: isFetchingNextPage,
    onLoadMore: fetchNextPage,
    enablePrefetch: false,
  });

  /**
   * Thanh cuộn chỉ hiện KHI ĐANG CUỘN, và bật/tắt bằng cách sờ thẳng vào
   * `classList` — KHÔNG qua `useState`.
   *
   * Trước đây nó hiện theo `:hover`. Trong lúc kéo thẻ, con trỏ quét ngang bốn
   * cột nên bốn thanh cuộn liên tục vào/ra trạng thái hover; `::-webkit-scrollbar-thumb`
   * không được hợp thành trên GPU nên mỗi lần đổi là một lượt vẽ lại thật, ngay
   * giữa lúc @hello-pangea/dnd đang đo đạc — đó là chỗ sinh giật.
   *
   * Còn lý do không dùng state: `onScroll` bắn mỗi khung hình. `setState` ở đó
   * sẽ render lại toàn bộ cột (và mọi thẻ trong cột) suốt lúc cuộn — đổi một
   * nguồn giật này lấy một nguồn giật khác nặng hơn. Đổi class trực tiếp không
   * đụng gì tới React.
   */
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const hideScrollbarTimer = useRef<number | null>(null);

  const revealScrollbar = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.classList.add('is-scrolling');
    if (hideScrollbarTimer.current !== null) {
      window.clearTimeout(hideScrollbarTimer.current);
    }
    hideScrollbarTimer.current = window.setTimeout(() => {
      el.classList.remove('is-scrolling');
      hideScrollbarTimer.current = null;
    }, 900);
  }, []);

  useEffect(
    () => () => {
      if (hideScrollbarTimer.current !== null) {
        window.clearTimeout(hideScrollbarTimer.current);
      }
    },
    [],
  );

  /**
   * Dựng lại mảng NGAY TRONG hiệu ứng chứ không lấy từ `getTaskColumnData` bên
   * dưới: hàm đó trả về đối tượng MỚI ở mỗi lần kết xuất, đưa nó vào mảng phụ
   * thuộc là hiệu ứng chạy mỗi lần vẽ. Bám vào `data` (đối tượng của TanStack
   * Query, chỉ đổi khi dữ liệu đổi thật) mới đúng nhịp. Thân hiệu ứng chỉ ghi
   * vào một ref của bảng nên không kéo theo lần kết xuất nào.
   */
  useEffect(() => {
    onGhiSoThe(
      status,
      pinned.concat(data?.pages.flatMap((p) => p?.data ?? []) ?? []),
    );
  }, [data, pinned, status, onGhiSoThe]);

  const { total, groups, isEmpty } = getTaskColumnData(data, pinned);

  // Ghim/bỏ ghim từ card — chặn nổi bọt để không mở modal chi tiết.
  const togglePin = useCallback(
    (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      if (task.isPinnedByMe) unpinTask(task.id);
      else pinTask(task.id);
    },
    [pinTask, unpinTask],
  );

  /*
   * @hello-pangea/dnd yêu cầu index Draggable liền mạch 0..n-1 trong droppable —
   * đếm phẳng xuyên các section tháng (header tháng chỉ là separator).
   *
   * Tính SẴN mốc bắt đầu của từng nhóm tháng thay vì tăng dần một biến đếm ngay
   * trong JSX. Thân cột nằm trong hàm con của `<Droppable>`, mà hàm đó thư viện
   * gọi lại theo nhịp riêng của nó chứ không trùng lượt render của component;
   * một biến đếm dùng chung sẽ cộng dồn tiếp giá trị của lượt trước và dãy index
   * vỡ ngay — đúng thứ `react-hooks/immutability` chặn.
   *
   * Thứ tự vẽ quyết định thứ tự đánh số: khối ghim đứng trước, chiếm
   * `0 .. pinned.length - 1`; sau đó tới các nhóm tháng theo đúng thứ tự
   * `groups`. Vậy mốc của một nhóm = số việc ghim + tổng số việc của các nhóm
   * đứng trước nó.
   */
  const groupStartIndexes: number[] = [];
  let nextDragIndex = pinned.length;
  for (const group of groups) {
    groupStartIndexes.push(nextDragIndex);
    nextDragIndex += group.tasks.length;
  }

  return (
    <div
      className={cn(
        'group/col flex flex-col h-full min-h-[500px] xl:min-h-0 w-[85vw] sm:w-[320px] xl:w-auto shrink-0 xl:shrink snap-center transition-opacity duration-200',
        // Cột "Đã hủy" lùi về sau — mờ đi khi không tương tác.
        status === TaskStatus.CANCELLED &&
          'opacity-60 hover:opacity-100 focus-within:opacity-100',
      )}
    >
      {/* KHÔNG có tay nắm ⠿ ở đầu cột. Cột đứng cố định theo STATUS_ORDER và
          không có cơ chế đổi thứ tự — chỉ THẺ mới kéo được. Một biểu tượng tay
          nắm ở đây hứa một hành vi không tồn tại, và người dùng thật đã thử kéo. */}
      <div className='mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-ws-line bg-ws-surface-alt px-3 py-2.5'>
        <TaskStatusChip status={status} size='sm' />
        <span className='inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-ws-ink-soft'>
          {isLoading ? '—' : total > 999 ? '999+' : total}
          {hasActiveFilter && !isLoading && (
            <span
              title='Đã lọc — số này chỉ đếm việc khớp bộ lọc'
              className='h-1.5 w-1.5 rounded-full bg-ws-accent'
            />
          )}
        </span>
        <span className='flex-1' />
        {/* KHÔNG có nút "+" ở đầu cột. Mỗi cột chỉ còn MỘT lối thêm việc — ô
            gạch ở đáy cột (hoặc chính nó ở trạng thái rỗng) — cộng nút chính
            trên thanh công cụ. Ba lối cho cùng một hành động là nhiễu. */}
      </div>

      {sameColumnHint && (
        <p role='status' className='mb-2 px-1 text-[11.5px] text-ws-ink-faint'>
          Việc vẫn ở{' '}
          <em className='not-italic font-semibold'>
            {TASK_STATUS_CONFIG[status].label}
          </em>{' '}
          — kéo sang cột khác để đổi trạng thái.
        </p>
      )}

      <div className='flex-1 min-h-0'>
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              /* Hai chủ cùng cần nút DOM này: dnd để đo vùng thả, còn ta để bật
                 class thanh cuộn. `provided.innerRef` là callback ref nên gọi
                 tay được, không cần thư viện gộp ref. */
              ref={(node) => {
                provided.innerRef(node);
                bodyRef.current = node;
              }}
              onScroll={revealScrollbar}
              className={cn(
                // Thân cột TRONG SUỐT. Khi kéo qua dùng outline chứ không
                // border — outline không đẩy layout nên thẻ không nhảy.
                'h-full min-h-[180px] overflow-y-auto rounded-2xl p-2 pr-1.5 space-y-2 transition-colors duration-200 board-scroll',
                // Nét MẢNH, LIỀN, mờ — không phải 1.5px đứt đoạn màu đặc. Ô đích
                // chỉ cần đủ để mắt xác nhận, không cần hét lên; nét đứt còn tạo
                // chuyển động giả ở rìa khi thẻ đi qua.
                /* `&& !isDragSource` — cột đang GIỮ thẻ không được tô như ô
                   đích. Thư viện vẫn bật `isDraggingOver` cho chính nó, nên
                   trước đây cả bốn cột cùng sáng xanh; thả về cột cũ thì lại
                   ăn dòng nhắc "không lưu được thứ tự trong cột". Mời rồi từ
                   chối. */
                snapshot.isDraggingOver &&
                  !isDragSource &&
                  'bg-ws-done-bg/70 outline outline-ws-done-edge/30 -outline-offset-2',
              )}
            >
              {isLoading ? (
                <>
                  <TaskCardSkeleton />
                  <TaskCardSkeleton />
                </>
              ) : isError ? (
                /* Nhánh LỖI phải đứng TRƯỚC nhánh rỗng.
                   Trước đây cột không có nhánh này: tải hỏng thì `data` là
                   undefined nên `isEmpty` bật, và cột báo "Chưa có việc nào" —
                   một khẳng định sai về chính công việc của người dùng, đúng
                   thứ đã cấm ở các màn Báo cáo. Tệ hơn ở đây vì có bốn cột:
                   mạng chập một nhịp là cả bảng nói người dùng không còn việc
                   nào cả.
                   Nút Thử lại là lối thoát DUY NHẤT ngoài F5 — query client
                   tắt hết refetch tự động. */
                <div className='flex flex-col items-center gap-2 px-3 py-10 text-center'>
                  <AlertTriangle className='h-6 w-6 text-ws-ink-ghost' />
                  <p className='text-xs text-ws-ink-soft'>
                    Không tải được cột này.
                  </p>
                  <p className='text-[11px] text-ws-ink-faint'>
                    Đây là lỗi kết nối, không phải cột không có việc.
                  </p>
                  <button
                    type='button'
                    onClick={() => void refetch()}
                    className='mt-1 rounded-md border border-ws-line bg-ws-surface px-2.5 py-1 text-[11px] text-ws-ink-soft transition-colors hover:bg-ws-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ws-focus'
                  >
                    Thử lại
                  </button>
                </div>
              ) : isEmpty ? (
                <EmptyColumn
                  status={status}
                  hasActiveFilter={hasActiveFilter}
                  onAddTask={onAddTask}
                  onClearFilters={onClearFilters}
                />
              ) : (
                <>
                  {pinned.length > 0 && (
                    <div className='space-y-2'>
                      {pinned.map((task, pinnedIndex) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={pinnedIndex}
                          showTypeTag={showTypeTag}
                          onClick={onSelectTask}
                          onTogglePin={togglePin}
                          onMove={onMoveTask}
                        />
                      ))}
                    </div>
                  )}
                  {/* Khe TRONG một nhóm tháng bằng đúng khe giữa các thẻ (8px).
                      Trước đây là 12px, tức lớn hơn khe GIỮA hai nhóm — mắt gom
                      thẻ cuối nhóm này với thẻ đầu nhóm sau thành một cụm, ngược
                      hẳn ý nghĩa. Ranh giới giữa hai nhóm đã do tiêu đề tháng
                      kèm đường kẻ ngang đảm nhiệm, không cần thêm khoảng hở. */}
                  {groups.map((group, groupIndex) => (
                    <div key={group.key} className='space-y-2'>
                      <div className='sticky top-0 z-10 flex items-center gap-2 rounded-md bg-ws-surface/85 px-1 py-1.5 backdrop-blur-sm'>
                        <span className='text-[11px] font-semibold uppercase tracking-wide text-ws-ink-faint'>
                          {group.label}
                        </span>
                        <span className='text-[10px] font-semibold tabular-nums text-ws-ink-ghost'>
                          {group.tasks.length}
                        </span>
                        <div className='h-px flex-1 bg-ws-line' />
                      </div>
                      {group.tasks.map((task, taskIndex) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={groupStartIndexes[groupIndex] + taskIndex}
                          showTypeTag={showTypeTag}
                          onClick={onSelectTask}
                          onTogglePin={togglePin}
                          onMove={onMoveTask}
                        />
                      ))}
                    </div>
                  ))}
                </>
              )}
              {provided.placeholder}
              {hasNextPage && (
                <div
                  ref={lastElementRef}
                  className='flex justify-center py-3 text-ws-ink-ghost'
                >
                  {isFetchingNextPage && (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  )}
                </div>
              )}
              {!isLoading && !isEmpty && onAddTask && (
                <AddTaskSlot onAddTask={onAddTask} />
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}
