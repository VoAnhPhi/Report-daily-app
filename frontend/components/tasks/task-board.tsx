'use client';

import { useCallback, useRef, useState } from 'react';
import {
  DragDropContext,
  DropResult,
} from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Task, TaskStatus } from '@/types/task.type';
/* Kiểu của cụm kéo thẻ việc vào khung chat trợ lý — đến từ `staging`.
   Dòng import này nằm trong khối xung đột lúc merge 26/08/2026 và bị rơi
   khi nhận bản đã tách của nhánh này; bốn chỗ dùng bên dưới đã lộ ra ngay
   ở cổng `tsc`. */
import type { NhanViecKeoTha } from '@/types/nhan-vien-nhan.type';
import { GetTasksQuery } from '@/app/api/tasks';
import {
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER as STATUS_ORDER,
} from '@/components/tasks/task-utils';
import { useUpdateTaskStatus } from '@/hooks/queries/task-queries';
import { TaskColumn } from './board/task-column';
import { TaskDetailModal } from './task-detail-modal';
import { UpdateStatusModal } from './update-status-modal';

interface TaskBoardProps {
  /** Filter của tab hiện tại (KHÔNG kèm status — mỗi cột tự thêm status của nó). */
  baseQuery?: GetTasksQuery;
  showTypeTag?: boolean;
  /**
   * Có bộ lọc nào đang bật không — đổi câu trạng thái rỗng và bật chấm "Đã lọc"
   * cạnh bộ đếm. Không có cờ này người dùng không phân biệt được "cột có 3 việc"
   * với "cột có 3 việc KHỚP BỘ LỌC".
   */
  hasActiveFilter?: boolean;
  /** Mở luồng tạo việc từ ô "Thêm việc" ở đáy cột. */
  onAddTask?: () => void;
  /** Xoá toàn bộ bộ lọc — nút trong trạng thái rỗng vì lọc. */
  onClearFilters?: () => void;
  /**
   * Bắt đầu kéo một thẻ (`null` = vừa thả xong, dù thả vào đâu).
   *
   * Bảng KHÔNG biết ai đang nghe và cũng không cần biết: nó chỉ nói ra "đang
   * kéo việc này". Người nghe hiện tại là ngăn kéo trợ lý ở cấp trang, dùng tin
   * đó để bật vùng "Thả vào đây để nhắc công việc này".
   */
  onKeoThe?: (viec: NhanViecKeoTha | null) => void;
  /**
   * Đã thả ra NGOÀI mọi cột (`destination === null`).
   *
   * ⚠ Đây là cổng duy nhất cho mọi ô thả nằm ngoài bảng, và cổng ấy phải hẹp
   * đúng như vậy: nếu thư viện kéo thả đã nhận thẻ vào một cột thì việc đã đổi
   * trạng thái, và bắn thêm tin ra ngoài là để một cú kéo làm hai việc cùng lúc.
   * Bảng vẫn cư xử y như trước ở nhánh này (thẻ tự bay về, không đổi gì cả).
   */
  onThaNgoaiBang?: (viec: NhanViecKeoTha) => void;
}

export function TaskBoard({
  baseQuery,
  showTypeTag = false,
  hasActiveFilter = false,
  onAddTask,
  onClearFilters,
  onKeoThe,
  onThaNgoaiBang,
}: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updatingTaskData, setUpdatingTaskData] = useState<{
    id: string;
    status: TaskStatus;
  } | null>(null);
  const [sameColumnHint, setSameColumnHint] = useState<TaskStatus | null>(null);
  /** Cột mà thẻ đang kéo xuất phát — để không tô nó thành ô đích hợp lệ. */
  const [draggingFrom, setDraggingFrom] = useState<TaskStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const { mutate: updateStatus } = useUpdateTaskStatus();

  /**
   * Hai nhánh, không một nhánh:
   * - vào `done` → mở hộp xác nhận (đây là trạng thái DUY NHẤT backend ghi nhận
   *   bằng chứng, và là trạng thái khó lùi nhất về nghiệp vụ);
   * - mọi chuyển khác → gọi thẳng mutation, thẻ nhảy ngay, kèm toast Hoàn tác.
   *
   * Backend không đòi hỏi bằng chứng cho mọi chuyển đổi: `updateTaskStatus` cho
   * phép mọi transition và cả `message` lẫn `evidence` đều tuỳ chọn.
   */
  /**
   * Sổ tra id → thẻ việc, do từng cột tự nộp lên.
   *
   * Vì sao phải có: `onDragStart` chỉ đưa `draggableId` (đúng bằng id việc), mà
   * ô soạn của trợ lý cần MÃ việc để viết ra `@CV260625010`. Bảng thì không giữ
   * danh sách việc — mỗi cột tự tải phần của mình.
   *
   * Vì sao là ref chứ không phải state: đây là dữ liệu tra cứu, không phải thứ
   * để vẽ. Đưa vào state là mỗi lần một cột tải xong trang mới thì cả bảng và
   * bốn cột vẽ lại — đúng thứ mà những chú thích về giật ở dưới đang cố tránh.
   *
   * Vì sao không tự gọi `useMyTasksInfinite` ngay tại đây cho gọn: khoá truy vấn
   * trùng nhau nên sẽ không tốn thêm một lượt gọi mạng nào, NHƯNG bảng sẽ trở
   * thành người theo dõi thứ hai của cả tám truy vấn, tức vẽ lại toàn bộ mỗi lần
   * bất kỳ cột nào đổi dữ liệu. Cái giá đó lớn hơn hẳn một cái ref.
   */
  const soTheRef = useRef<Map<TaskStatus, Task[]>>(new Map());
  const ghiSoThe = useCallback((cot: TaskStatus, viec: Task[]) => {
    soTheRef.current.set(cot, viec);
  }, []);

  /** Thẻ của cú kéo đang diễn ra — đọc lại lúc thả, khi `draggableId` không đủ. */
  const theDangKeoRef = useRef<NhanViecKeoTha | null>(null);

  const timThe = (id: string): NhanViecKeoTha | null => {
    let thay: Task | undefined;
    // `forEach` chứ không `for...of`: tsconfig của kho này chưa bật
    // `downlevelIteration` nên duyệt trực tiếp một Map là lỗi biên dịch.
    soTheRef.current.forEach((ds) => {
      if (thay) return;
      thay = ds.find((t) => t.id === id);
    });
    if (!thay) return null;
    // Việc mới tạo có thể chưa có mã — lúc đó tiêu đề là thứ duy nhất gọi tên
    // được nó, và ô soạn cũng nhận tiêu đề y như khi chọn từ danh sách `@`.
    return { id: thay.id, nhan: thay.code ?? thay.title };
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    setDraggingFrom(null);

    const keo = theDangKeoRef.current;
    theDangKeoRef.current = null;
    /**
     * Báo "đã thả ra ngoài" TRƯỚC khi tắt cờ kéo.
     *
     * Bên nghe (ngăn kéo trợ lý) tự đo con trỏ trong lúc kéo và dọn kết quả đo
     * khi cờ tắt. Gọi ngược thứ tự thì kết quả đo đã bị dọn trước lúc được hỏi,
     * và không cú thả nào vào được khung chat.
     */
    if (!destination && keo) onThaNgoaiBang?.(keo);
    onKeoThe?.(null);

    // Thả ra ngoài mọi cột — thẻ tự bay về, im lặng.
    if (!destination) return;

    if (destination.droppableId === source.droppableId) {
      // Sắp xếp thủ công trong cột KHÔNG lưu được (backend không có cột thứ tự).
      // Nói ra thay vì im lặng: im lặng đọc thành "hệ thống treo".
      setSameColumnHint(source.droppableId as TaskStatus);
      window.setTimeout(() => setSameColumnHint(null), 2500);
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const previousStatus = source.droppableId as TaskStatus;

    if (newStatus === TaskStatus.DONE) {
      setUpdatingTaskData({ id: draggableId, status: newStatus });
      return;
    }

    updateStatus({
      id: draggableId,
      payload: { status: newStatus },
      previousStatus,
    });
  };

  /** Chấm chỉ vị trí thay dòng chữ "Cuộn ngang…" — nói cùng một điều, chiếm ít chỗ hơn. */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollWidth > el.clientWidth + 4;
    setIsScrollable(scrollable);
    if (!scrollable) return;
    const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth);
    setActiveDot(Math.round(ratio * (STATUS_ORDER.length - 1)));
  }, []);

  const jumpToColumn = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({
      left: (max * index) / (STATUS_ORDER.length - 1),
      behavior: 'smooth',
    });
  };

  return (
    /* Cột flex bọc ngoài, KHÔNG phải fragment.
       Hàng chấm chỉ trang bên dưới là anh em của vùng cuộn ngang. Trước đây
       vùng cuộn lấy `h-full` — tức chiếm trọn chiều cao cha — nên hàng chấm bị
       đẩy ra ngoài, và cha (`page.tsx`, vùng bảng) có `overflow-hidden` nên nó
       bị cắt sạch. Dưới 1280px đó là cách DUY NHẤT để biết đang ở cột nào và
       để nhảy nhanh sang cột khác, nên mất nó là mất cả chỉ báo lẫn điều
       hướng, chỉ còn vuốt mò.
       Giờ vùng cuộn ăn phần dư (`min-h-0 flex-1`) và hàng chấm giữ chỗ của
       mình (`shrink-0`). */
    <div className='flex h-full min-h-0 flex-col'>
      <DragDropContext
        onDragStart={(start) => {
          setDraggingFrom(start.source.droppableId as TaskStatus);
          // Không tra ra thẻ (sổ chưa kịp có, hoặc thẻ vừa bị lọc mất) thì báo
          // `null`: vùng thả không hiện, cú kéo chạy y như trước khi có tính
          // năng này. Hỏng theo hướng im lặng, không chặn thao tác nào.
          const viec = timThe(start.draggableId);
          theDangKeoRef.current = viec;
          onKeoThe?.(viec);
        }}
        onDragEnd={onDragEnd}
        // Trình đọc màn hình đọc bằng tiếng Việt. @hello-pangea/dnd đã hỗ trợ
        // kéo bằng bàn phím sẵn — trước đây chỉ thiếu bộ chuỗi này.
        dragHandleUsageInstructions='Nhấn phím cách để nhấc công việc. Dùng phím mũi tên để di chuyển giữa các cột. Nhấn phím cách lần nữa để thả, Escape để hủy.'
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          /* Bỏ `xl:board-scroll`: `board-scroll` là class thường do khối
             `<style jsx global>` bên dưới định nghĩa, không phải utility của
             Tailwind — nên tiền tố `xl:` không sinh ra quy tắc nào, class chỉ
             nằm trong DOM cho vui. Ở ≥1280px vùng này cũng đã
             `overflow-x-visible` nên không có thanh cuộn ngang để tạo kiểu. */
          className='flex xl:grid xl:grid-cols-4 gap-3 xl:gap-4 min-h-0 flex-1 items-start overflow-x-auto xl:overflow-x-visible snap-x snap-mandatory scrollbar-none px-1 pb-1'
        >
          {/* Bốn cột dựng theo `TASK_STATUS_ORDER` (nhập kèm alias `STATUS_ORDER`).
              Nhãn/icon/màu lấy từ `TASK_STATUS_CONFIG` — cột KHÔNG còn bảng cấu
              hình màu riêng: sau đợt màu, cả bốn thân cột đều trong suốt và định
              danh của cột nằm ở chip trạng thái trên đầu cột. */}
          {STATUS_ORDER.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              baseQuery={baseQuery}
              showTypeTag={showTypeTag}
              hasActiveFilter={hasActiveFilter}
              sameColumnHint={sameColumnHint === status}
              isDragSource={draggingFrom === status}
              onSelectTask={setSelectedTask}
              onAddTask={onAddTask}
              onClearFilters={onClearFilters}
              onGhiSoThe={ghiSoThe}
              onMoveTask={(id, next, previous) => {
                if (next === TaskStatus.DONE) {
                  setUpdatingTaskData({ id, status: next });
                  return;
                }
                updateStatus({
                  id,
                  payload: { status: next },
                  previousStatus: previous,
                });
              }}
            />
          ))}
        </div>
      </DragDropContext>

      {isScrollable && (
        <div className='xl:hidden shrink-0 flex items-center justify-center gap-1.5 pt-2'>
          {STATUS_ORDER.map((status, i) => (
            <button
              key={status}
              type='button'
              onClick={() => jumpToColumn(i)}
              aria-label={`Xem cột ${TASK_STATUS_CONFIG[status].label}`}
              className='flex h-11 w-11 items-center justify-center'
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i === activeDot ? 'bg-ws-accent' : 'bg-ws-line-strong/50',
                )}
              />
            </button>
          ))}
        </div>
      )}

      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      <UpdateStatusModal
        taskId={updatingTaskData?.id || null}
        newStatus={updatingTaskData?.status || null}
        isOpen={!!updatingTaskData}
        onClose={() => setUpdatingTaskData(null)}
      />

      {/* Thanh cuộn của cột: CHIẾM CHỖ luôn (rãnh 6px giữ nguyên nên nội dung
          không nhích ngang khi hiện/ẩn) nhưng chỉ TÔ MÀU khi cột đang thật sự
          được cuộn — class `is-scrolling` do `revealScrollbar` gắn, tự gỡ sau
          900ms không cuộn.
          KHÔNG dùng `:hover`: kéo thẻ là quét con trỏ qua bốn cột, mỗi lần
          vào/ra là một lượt vẽ lại thanh cuộn (pseudo-element này không hợp
          thành trên GPU) ngay giữa lúc dnd đang đo — chính là chỗ sinh giật.
          Dùng `ws-line-strong` thay đen cứng để đúng cả chế độ tối.

          TÊN PHẢI RIÊNG (`board-scroll`), tuyệt đối không đặt trùng
          `ws-scroll` hay `scrollbar-custom`. Khối này là `<style jsx global>`
          nên nó ghi đè cả utility layer của Tailwind: đặt trùng tên là mọi
          vùng cuộn khác trong app cũng thành "thanh cuộn trong suốt, chỉ hiện
          khi có class `is-scrolling`" — mà chỉ mấy cột kanban này mới gắn
          class đó, nên chỗ khác mất hẳn thanh cuộn. */}
      <style jsx global>{`
        .board-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .board-scroll.is-scrolling {
          scrollbar-color: var(--color-ws-line-strong) transparent;
        }
        .board-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .board-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .board-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        .board-scroll.is-scrolling::-webkit-scrollbar-thumb {
          background: color-mix(
            in srgb,
            var(--color-ws-line-strong) 55%,
            transparent
          );
        }
      `}</style>
    </div>
  );
}
