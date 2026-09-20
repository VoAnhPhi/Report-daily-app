'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Eye, Plus, User, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DailyReportAnswer, DraftSource } from '@/types/daily-report.type';
import { FOCUS_RING_SURFACE, draftReasonLabel } from '../daily-report-utils';
// Import thẳng `./utils/<file>` chứ không qua barrel `daily-report-utils`:
// đó là luật ghi ngay trong đầu file barrel cho code mới bên trong thư mục này.
import { MAX_ANSWER_CONTENT_LENGTH } from '../utils/constants';
// Nhãn tên việc và popup xem nhanh đều ở chung file với `LinkedTaskChip`:
// chúng được tách RA từ chính viên chip đó để dùng lại, để cạnh nhau thì lần
// sửa sau còn thấy cả hai chỗ tiêu thụ.
import {
  LinkedTaskChip,
  TASK_LABEL_MAX_WIDTH,
  TASK_LABEL_TEXT,
  TaskQuickViewPopover,
  taskDisplayTitle,
} from './linked-task-chip';

/**
 * Nút hành động trong một thẻ gợi ý ("Xem nhanh" · "Chèn").
 *
 * Thẻ gợi ý nền `ws-surface` nên khe của vòng focus phải là `ws-surface` —
 * dùng nhầm bản `ws-surface-alt` là có một vệt sáng cắt ngang vòng focus.
 */
/* `min-h-11` ở khổ điện thoại: ba nút này đứng thành một hàng sát nhau, mà
   28px chỉ bằng hai phần ba sàn chạm. Từ `sm` trở lên về đúng 28px như cũ để
   thẻ nguồn không cao thêm một tầng. */
const SOURCE_ACTION_CLASS = cn(
  'inline-flex min-h-11 items-center gap-1 rounded-ws-tag border border-ws-line px-2 text-ws-micro text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink sm:h-7 sm:min-h-0',
  FOCUS_RING_SURFACE,
);

/**
 * Nhãn phạm vi của một gợi ý: việc của riêng mình, hay việc chung của nhóm.
 *
 * Phân biệt bằng icon CỘNG màu — hai tag cùng một sắc xám đọc lướt không tách
 * được, người dùng nêu 27/08/2026.
 *
 * Màu lấy từ dải AVATAR (`ws-ava-b-*`), không phải dải trạng thái. Luật 1 của
 * `docs/features/task-workspace-ui/03-bo-mau.md` khoá bốn màu ngữ nghĩa cho
 * vòng đời một VIỆC (`pending` xám · `progress` xanh dương · `done` xanh lá ·
 * `void` đỏ), và §4.3 lấy nốt hổ phách cho ưu tiên Cao, đỏ cho Khẩn cấp. Dải
 * avatar thì là bảng ĐỊNH DANH — nó trả lời "của ai", đúng câu hỏi mà nhãn này
 * đang trả lời — nên mượn ở đó không phá luật nào.
 *
 * Trong dải đó chỉ tím (`b`) là sắc KHÔNG trùng với bất kỳ trạng thái hay mức
 * ưu tiên nào, và nó đạt 4.8:1. Vì thế chỉ "Chung" được tô: nó là ca đáng chú
 * ý, còn "Cá nhân" giữ nền xám trung tính đúng vai mặc định. Tô cả hai thì màu
 * thứ hai buộc phải mượn xanh dương của `progress` hoặc hổ phách của ưu tiên
 * Cao — một tag phạm vi đọc ra thành trạng thái việc là đắt hơn cái lợi.
 *
 * Chữ hiện ra là dạng NGẮN, đúng hai chữ mà thanh lọc của màn `/tasks` đang
 * dùng (`tasks-route-shell.tsx`, trường `shortLabel`) — nhãn dài chiếm mất chỗ
 * của chính cái tên việc mà nó đứng cạnh. Tên đầy đủ đi qua một nhãn ẩn: đọc
 * trần chữ "Chung" cạnh một tên việc thì không rõ nó đang nói về cái gì.
 */
function ScopeTag({ scope }: { scope: DraftSource['scope'] }) {
  const isGroup = scope === 'group';
  const Icon = isGroup ? Users : User;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-ws-tag px-1.5 py-px text-ws-nano font-semibold',
        isGroup
          ? 'bg-ws-ava-b-bg text-ws-ava-b-fg'
          : 'bg-ws-surface-sunken text-ws-ink-soft',
      )}
    >
      <Icon aria-hidden='true' className='h-2.5 w-2.5 shrink-0' />
      <span aria-hidden='true'>{isGroup ? 'Chung' : 'Cá nhân'}</span>
      <span className='sr-only'>{isGroup ? 'Việc chung' : 'Việc cá nhân'}</span>
    </span>
  );
}

/** Sàn chiều cao ô nhập, tính theo số dòng. */
const MIN_ROWS = 3;
/** Trần chiều cao ô nhập — giữ đúng con số 12 của bản cũ. */
const MAX_ROWS = 12;

interface Props {
  answer: DailyReportAnswer;
  /** Gợi ý "có thể bạn đang vướng" (chỉ câu need_help). */
  helpSources?: DraftSource[];
  /**
   * Khối vẽ ngay dưới ô trả lời. `report-form.tsx` dùng nó cho trạng thái giải
   * quyết yêu cầu hỗ trợ của câu 3.
   *
   * Là một slot, không phải prop dữ liệu cộng import `ReportHelpStatus` ở đây:
   * component đó dùng hook của `daily-report-queries`, mà module này kéo theo
   * `next-auth/react` (bản ESM). Import tĩnh từ câu hỏi làm hỏng mọi bộ test chỉ
   * render câu hỏi, như `linked-task-chip.test.tsx` (15/09/2026).
   */
  belowAnswer?: ReactNode;
  readOnly: boolean;
  onChangeContent: (questionId: string, content: string) => void;
  onRemoveLinkedTask: (questionId: string, taskId: string) => void;
  /**
   * Chèn một loạt gợi ý vào câu trả lời. Nhận MẢNG kể cả khi chỉ có một nguồn:
   * bên nhận phải cộng dồn cả loạt mới biết dòng nào làm vượt trần ký tự (xem
   * `addHelpSources` trong `report-form.tsx`), mà "Chèn tất cả" thì gửi cả cụm
   * trong đúng một cú bấm.
   */
  onAddHelpSources?: (questionId: string, sources: DraftSource[]) => void;
  /** Mở chi tiết công việc theo id (qua ?focusTaskId=). */
  onOpenTask: (taskId: string) => void;
  /**
   * Map taskId -> nguồn gợi ý, để vẽ chip công việc gắn kèm.
   *
   * Mang cả `DraftSource` chứ không chỉ mã việc: chip in TÊN việc, còn popup
   * xem nhanh cần thêm `reason` và tiến độ việc con. Toàn bộ đã nằm sẵn trong
   * `answer.sources` mà BE gắn theo báo cáo — không phải gọi API nào thêm.
   */
  taskInfoById: Map<string, DraftSource>;
}

/**
 * Một câu hỏi trong hộp thoại báo cáo: nhãn, ô nhập tự giãn, nhãn ✨ khi còn
 * nội dung gợi ý, chip công việc gắn kèm (docs 06 mục 3).
 *
 * Nhãn, gợi ý và cờ bắt buộc đều lấy từ `answer` — chúng là snapshot template
 * version do BE trả về, không suy ra từ `kind` (docs 07 mục 4.2).
 */
export function DailyReportQuestion({
  answer,
  helpSources,
  belowAnswer,
  readOnly,
  onChangeContent,
  onRemoveLinkedTask,
  onAddHelpSources,
  onOpenTask,
  taskInfoById,
}: Props) {
  const showTaskChips = answer.allowTaskLink;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /**
   * Dàn thẻ chọn từng việc — GẤP LẠI mặc định.
   *
   * State cục bộ chứ không đưa lên URL hay lên `report-form`: nó chỉ nói "tôi
   * đang mở danh sách của riêng câu này", không ai ngoài component cần biết, và
   * mở lại từ đầu ở mỗi lượt vào màn mới là hành vi đúng.
   */
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  /**
   * Id nối nhãn với ô nhập. Bốn câu hỏi cùng nằm trên một trang nên id phải
   * bám `questionId`, id trùng thì trình đọc màn hình đọc sai câu.
   */
  const fieldId = `daily-report-q-${answer.questionId}`;
  const suggestionSources = answer.sources.filter(
    (source) => !answer.linkedTaskIds.includes(source.taskId),
  );
  /**
   * Việc cá nhân đứng trước việc chung — giữ đúng thứ tự đọc của bản cũ, vốn
   * dựng bằng hai `<section>` có tiêu đề "Việc cá nhân" / "Việc chung".
   *
   * Tiêu đề nhóm đã bỏ hẳn: với người có nhiều thẻ công việc thì tiêu đề trôi
   * khỏi tầm mắt ngay khi cuộn qua vài thẻ, nên nó chỉ trả lời được câu "thẻ
   * này thuộc phạm vi nào" ở đúng thẻ đầu tiên. Phạm vi nay đi theo TỪNG thẻ
   * bằng `ScopeTag`, đọc được ở bất kỳ vị trí cuộn nào.
   *
   * Sắp bằng khoá số trên một bản sao chứ không lọc hai lượt: `sort` của V8 là
   * sort ỔN ĐỊNH, nên thứ tự ưu tiên mà server trả về vẫn được giữ nguyên bên
   * trong mỗi phạm vi. `[...]` vì `sort` sửa thẳng mảng gốc, mà mảng gốc ở đây
   * là kết quả `filter` của chính lượt render này — sửa nó thì lần sau đọc lại
   * `answer.sources` sẽ ra thứ tự khác.
   */
  const orderedSources = [...suggestionSources].sort(
    (a, b) =>
      (a.scope === 'personal' ? 0 : 1) - (b.scope === 'personal' ? 0 : 1),
  );
  /* `sourceText` và `copySource` đã bỏ cùng nút "Sao chép": ô đích nằm ngay
     dưới nên chép rồi dán luôn chậm hơn chèn, mà ba nút ngang cấp trên mỗi thẻ
     làm không nút nào đọc ra là hành động chính. */

  /**
   * Cho ô nhập cao đúng bằng nội dung thật.
   *
   * Bản cũ suy `rows` từ số ký tự xuống dòng, nên một đoạn văn dài mà không ai
   * bấm Enter thì mãi mãi chỉ 3 dòng — ở 320px có tới ~200px chữ bị giấu, mà
   * `resize-none` lại chặn luôn đường kéo tay: người viết không đọc lại nổi
   * bài của chính mình. Chỉ `scrollHeight` mới biết chữ ngắt dòng ra sao theo
   * bề ngang thực tế.
   *
   * Vẫn chặn trần 12 dòng rồi mới cho cuộn: một câu trả lời dài không được
   * phép đẩy ba câu còn lại ra khỏi tầm mắt.
   */
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const style = window.getComputedStyle(el);
    // `leading-7` luôn cho line-height dạng px; nhánh ước lượng chỉ để đỡ
    // trường hợp trình duyệt trả về 'normal'. Hàm đọc giá trị đã tính nên đổi
    // lớp giãn dòng ở className là chiều cao tự khớp theo, không phải sửa ở
    // đây — chỉ nhớ rằng sàn/trần tính theo SỐ DÒNG nên ô sẽ cao hơn trước.

    const lineHeight =
      parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const paddingY =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    // `box-sizing: border-box` (preflight) nên chiều cao đặt vào phải cộng cả
    // viền, còn `scrollHeight` thì không tính viền.
    const borderY =
      parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    // Trả về 'auto' trước khi đo, nếu không `scrollHeight` kẹt ở chiều cao cũ
    // mỗi lần nội dung ngắn lại.
    el.style.height = 'auto';
    const needed = el.scrollHeight + borderY;
    const min = Math.ceil(MIN_ROWS * lineHeight + paddingY + borderY);
    const max = Math.ceil(MAX_ROWS * lineHeight + paddingY + borderY);
    el.style.height = `${Math.min(max, Math.max(min, Math.ceil(needed)))}px`;
    // Chỉ bật thanh cuộn khi đã chạm trần, tránh thanh cuộn nhấp nháy vì
    // line-height lẻ nửa pixel.
    el.style.overflowY = needed > max ? 'auto' : 'hidden';
  }, []);

  // Đo trước khi trình duyệt vẽ, tránh nháy một khung hình sai chiều cao. Chạy
  // lại theo `content` nên bản chỉ đọc nạp nội dung từ server cũng đúng.
  useLayoutEffect(() => {
    resize();
  }, [resize, answer.content]);

  /*
   * Bề ngang đổi thì số dòng sau khi ngắt cũng đổi: xoay máy, kéo cửa sổ, hay
   * panel bên cạnh mở ra làm cột hẹp lại. Quan sát chính ô nhập thay vì nghe
   * `window.resize` để bắt được cả trường hợp cửa sổ đứng yên mà cột co lại.
   */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      // Bỏ qua lần báo do chính mình đổi chiều cao — đo lại ở đó vừa thừa vừa
      // tạo vòng lặp ResizeObserver.
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resize]);

  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline gap-2'>
        {/* `htmlFor` là đường duy nhất đưa nội dung câu hỏi tới trình đọc màn
            hình: placeholder biến mất ngay khi gõ ký tự đầu tiên. */}
        <label htmlFor={fieldId} className='text-sm font-semibold text-ws-ink'>
          {answer.sortOrder}. {answer.label}
          {answer.isRequired && (
            /* `title=` của trình duyệt chỉ bật khi rê chuột, sau ~1 giây, và
               không bao giờ bật trên cảm ứng — với một dấu sao 8px thì đó là
               lời giải thích gần như không ai chạm tới. Tooltip của Radix bật
               nhanh hơn và vẽ bằng token của hệ thiết kế.
               Dấu sao GIỮ `aria-hidden`: nghĩa "bắt buộc" tới trình đọc màn
               hình qua `aria-required` của chính ô nhập (xem `<textarea>` bên
               dưới), không qua ký hiệu này. Đọc cả hai là nói hai lần.
               `TooltipProvider` gói ngay tại chỗ vì repo không có provider ở
               gốc cây. */
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    aria-hidden='true'
                    className='ml-0.5 align-baseline text-ws-danger'
                  >
                    *
                  </span>
                </TooltipTrigger>
                <TooltipContent className='ws-scope text-ws-meta'>
                  Bắt buộc
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </label>
      </div>

      {/* Chip công việc đứng TRƯỚC ô nhập, không phải sau.
          Chúng là dữ kiện để viết câu trả lời — người dùng nhìn tên việc rồi mới
          gõ. Nằm dưới ô nhập thì với câu trả lời dài (ô cao tới 12 dòng) chúng
          bị đẩy khỏi tầm mắt đúng lúc đang cần, và mắt phải nhảy xuống rồi
          ngược lên. Đặt ngay dưới nhãn thì thứ tự đọc thành: hỏi gì → dựa vào
          việc nào → viết. */}
      {showTaskChips && answer.linkedTaskIds.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {answer.linkedTaskIds.map((taskId) => (
            <LinkedTaskChip
              key={taskId}
              source={taskInfoById.get(taskId)}
              readOnly={readOnly}
              onRemove={() => onRemoveLinkedTask(answer.questionId, taskId)}
              onOpenTask={() => onOpenTask(taskId)}
            />
          ))}
        </div>
      )}

      <textarea
        id={fieldId}
        ref={textareaRef}
        value={answer.content}
        readOnly={readOnly}
        aria-required={answer.isRequired}
        /* Cùng khuôn với ô "lý do mở lại" trong `report-form.tsx`: `maxLength`
           kèm bộ đếm ngay dưới. `maxLength` chỉ là hàng rào của riêng thẻ này —
           trần thật nằm ở `changeContent`, vì nút "Chèn" ghi vào cùng một
           `content` mà không đi qua đây. */
        maxLength={MAX_ANSWER_CONTENT_LENGTH}
        onChange={(e) => onChangeContent(answer.questionId, e.target.value)}
        placeholder={
          readOnly
            ? (answer.hint ?? '')
            : (answer.suggestion ?? answer.hint ?? '')
        }
        /* Chỉ là chiều cao khởi điểm — `resize()` đặt chiều cao thật ngay
           trước khung hình đầu tiên. */
        rows={MIN_ROWS}
        className={cn(
          /* Nền TRẮNG và giãn dòng rộng hơn.
             Đây là ô người dùng gõ nhiều nhất trong cả tính năng — bốn câu
             trả lời, mỗi câu có thể vài đoạn. Nền chìm `surface-alt` làm nó
             đọc như một khối chỉ-đọc thay vì chỗ để viết, còn `leading-relaxed`
             (1.625) ở cỡ chữ 14px cho các dòng dính nhau khi đoạn dài.
             `leading-7` = 28px, tức 2.0 — khoảng thở của văn bản dài. */
          /* `ws-scroll`: khi câu trả lời chạm trần 12 dòng thì `resize()` bật
             `overflow-y: auto`, và nếu không khai gì thì ô ăn thanh cuộn MẶC
             ĐỊNH của hệ điều hành — trên Windows là dải xám ~17px chạy dọc
             ngay trong lòng ô nhập, đậm hơn mọi thứ khác trên tấm. Dùng lại
             đúng class mà mọi popup của phần Công việc đang dùng
             (create-task-modal, task-edit-form, task-group-modal…) thay vì chế
             thêm một kiểu thanh cuộn thứ hai. Class là selector thường nên nó
             ăn cho cả `textarea`, không cần đụng CSS toàn cục. */
          'ws-scroll w-full resize-none rounded-md border border-ws-line bg-ws-surface px-3 py-2.5 text-sm leading-7 text-ws-ink placeholder:text-ws-ink-faint',
          /* Focus NHẸ hơn, không phải BỎ focus.
             Bản cũ là `focus:ring-2 focus:ring-ws-focus`: vòng đặc 2px màu
             `ws-focus` (#1F5C3F, tương phản 7.4:1) ôm sát mép, bật lên mỗi lần
             bấm chuột vào ô — với ô cao tới 12 dòng thì đó là một khung xanh
             đậm bao quanh gần nửa màn hình, chói đúng lúc người dùng bắt đầu
             viết.
             Đổi sang đúng công thức của primitive dùng chung
             (components/ui/textarea.tsx:25 và input.tsx:22): viền 1px chuyển
             sang `ws-focus` + một quầng mềm 3px ở 50% độ đục. Chỉ dấu vẫn rõ vì
             nét viền đặc vẫn đủ 7.4:1 và nó đổi MÀU chứ không đổi độ dày, nên
             Tab chạy qua không xê dịch layout.
             Giữ `focus-visible` chứ không phải `focus`: với ô nhập chữ, trình
             duyệt luôn coi là focus-visible kể cả khi bấm chuột, nên không mất
             chỉ dấu cho người dùng chuột. */
          'outline-none transition-[color,box-shadow] focus-visible:border-ws-focus focus-visible:ring-[3px] focus-visible:ring-ws-focus/50',
          readOnly && 'bg-ws-surface-sunken text-ws-ink-soft',
        )}
      />

      {belowAnswer}

      {/* MỘT HÀNG DUY NHẤT dưới ô nhập: nhãn gợi ý, nút mở danh sách công
          việc, và bộ đếm ký tự nằm cùng dòng ở mép phải.

          Bộ đếm trước đây là một dòng riêng bên dưới, nên nó vừa tách khỏi ô
          nhập vừa đẩy mọi thứ xuống thêm một hàng. Gộp vào đây thì cả cụm phụ
          trợ của ô nhập gói trong đúng một dòng.

          Hàng vẫn render khi câu hỏi KHÔNG có gợi ý nào — lúc đó chỉ còn bộ
          đếm, và `ml-auto` giữ nó ở mép phải y như cũ. */}
      {!readOnly && (
        <div className='space-y-1.5'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-ws-micro text-ws-ink-soft'>
            {orderedSources.length > 0 && (
              <>
                <span>Gợi ý</span>
                <span aria-hidden='true' className='text-ws-ink-ghost'>
                  ·
                </span>
                <button
                  type='button'
                  aria-expanded={isPickerOpen}
                  onClick={() => setIsPickerOpen((open) => !open)}
                  className={cn(
                    'rounded-ws-tag text-ws-micro font-medium text-ws-accent hover:underline',
                    FOCUS_RING_SURFACE,
                  )}
                >
                  Các công việc {isPickerOpen ? '▴' : '▾'}
                </button>
              </>
            )}
            {/* Đếm chuỗi THÔ, không `trim()` trước — khác ô "lý do mở lại" ở
                `report-form.tsx` (ô đó đếm sau `trim()` vì chính chuỗi đã trim
                mới là chuỗi nó gửi đi). Ở đây `content` được gửi nguyên vẹn, và
                cả `@MaxLength` bên server (trường `content` của `SaveAnswerDto`
                không có `@Transform(trimString)`) lẫn `maxLength` của trình
                duyệt đều đo chuỗi thô. Đếm sau khi trim thì bộ đếm còn chỗ
                trống trong khi ô nhập đã chặn không cho gõ nữa. */}
            <span className='ml-auto shrink-0 tabular-nums text-ws-ink-faint'>
              {answer.content.length}/{MAX_ANSWER_CONTENT_LENGTH}
            </span>
          </div>

          {/* KHÔNG hộp bao ngoài danh sách. Mỗi thẻ đã có viền riêng, nên thêm
              một khung nữa quanh cả cụm là hai đường bao lồng nhau — mắt đọc
              thành một bảng trong bảng, và phần đệm của hộp ngoài còn đẩy cả
              danh sách thụt vào vô cớ. */}
          {isPickerOpen && orderedSources.length > 0 && (
            <div className='space-y-1'>
              {orderedSources.map((source) => {
                const fullTitle = `${source.code ? `${source.code} — ` : ''}${source.title}`;
                const itemCount = source.items?.length ?? 0;
                return (
                  <div
                    key={source.taskId}
                    /* MỘT KHUNG NHỎ: hai dòng chữ, hàng nút nằm ngay trên
                       dòng đầu khi còn chỗ ngang.
                       Bản cũ cao 6–8 dòng cho mỗi gợi ý (mã · lý do · mỗi
                       việc con một dòng · hàng nút), lại còn thêm một dòng
                       tiêu đề cho mỗi phạm vi. Người có nhiều thẻ công việc
                       thì khối tham khảo dài hơn cả bốn câu trả lời cộng
                       lại, đúng chỗ mà đáng ra họ phải đang gõ.
                       `basis-[13rem]` là điểm gãy: hẹp hơn thế thì hàng nút
                       tự rơi xuống dòng dưới, thay vì bóp tên việc lại còn
                       vài ký tự.
                       `items-center` chứ không `items-start`: khối chữ cao hai
                       dòng còn hàng nút chỉ một, nên căn theo đỉnh là nút dính
                       lên mép trên và lệch hẳn so với thân thẻ. */
                    className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-md border border-ws-line bg-ws-surface px-2.5 py-1.5'
                  >
                    <div className='min-w-0 flex-1 basis-[13rem]'>
                      <div className='flex min-w-0 items-center gap-1.5'>
                        <ScopeTag scope={source.scope} />
                        {/* `title=` chỉ để người dùng chuột đọc được phần
                            đuôi khi `truncate` cắt; chữ trong DOM vẫn đủ nên
                            trình đọc màn hình không mất gì. */}
                        <span
                          title={fullTitle}
                          className='min-w-0 truncate text-xs font-medium text-ws-ink'
                        >
                          {fullTitle}
                        </span>
                      </div>
                      {/* Lý do gợi ý + SỐ việc con. Danh sách việc con kèm
                          hạn đã chuyển vào popup "Xem nhanh"
                          (`linked-task-chip.tsx`) — ở đây chỉ cần trả lời
                          "có bao nhiêu", còn "là những việc nào" thì mở
                          popup. */}
                      <p className='mt-0.5 truncate text-ws-floor text-ws-ink-faint'>
                        {draftReasonLabel(source.reason)}
                        {itemCount > 0 ? ` · ${itemCount} việc con` : ''}
                      </p>
                    </div>
                    {/* Ba nút dùng CHUNG một chuỗi lớp: chúng là một hàng
                        hành động, lệch nhau một lớp là lệch cả hàng. */}
                    <div className='flex shrink-0 flex-wrap items-center gap-2'>
                      {/* "Xem nhanh", không còn "Xem chi tiết" mở modal to.
                          Bản cũ gọi thẳng `onOpenTask(source.taskId)` nên bấm
                          vào là bung `TaskDetailModal` của màn /tasks — modal
                          có tab, bình luận, đính kèm, chiếm hết màn hình đúng
                          lúc người dùng đang viết dở câu trả lời. Nay ra cùng
                          cái popup nhẹ mà viên chip việc đã gắn đang dùng, và
                          đường vào modal hạ xuống liên kết "Mở công việc" bên
                          trong popup.
                          Nhãn phải đổi theo hành vi: "Xem chi tiết" hứa cái
                          modal đầy đủ mà nút này không còn mở nữa.
                          `SOURCE_ACTION_CLASS` giữ nguyên `FOCUS_RING_SURFACE`
                          — nút vẫn đứng trên thẻ nguồn nền `ws-surface`, việc
                          bọc thêm `TaskQuickViewPopover` không đổi nền vì
                          `Popover` gốc của Radix không dựng thẻ DOM nào. */}
                      {/* Cả ba nút mang `aria-label` KÈM TÊN VIỆC. Danh sách
                          nay phẳng, không còn tiêu đề phạm vi chia khối, nên
                          người dùng trình đọc màn hình nghe liên tiếp "Xem
                          nhanh · Chèn · Sao chép" nhân với số gợi ý mà không
                          có gì phân biệt chúng thuộc việc nào. Nhãn chữ hiện
                          ra vẫn ngắn cho người nhìn. */}
                      <TaskQuickViewPopover
                        source={source}
                        onOpenTask={() => onOpenTask(source.taskId)}
                      >
                        <button
                          type='button'
                          aria-label={`Xem nhanh công việc ${source.title}`}
                          className={SOURCE_ACTION_CLASS}
                        >
                          <Eye aria-hidden='true' className='h-3 w-3' /> Xem
                          nhanh
                        </button>
                      </TaskQuickViewPopover>
                      <button
                        type='button'
                        aria-label={`Chèn công việc ${source.title} vào câu trả lời`}
                        onClick={() =>
                          onAddHelpSources?.(answer.questionId, [source])
                        }
                        className={SOURCE_ACTION_CLASS}
                      >
                        <Plus aria-hidden='true' className='h-3 w-3' /> Chèn
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!readOnly && showTaskChips && helpSources && helpSources.length > 0 && (
        <div className='space-y-1'>
          <p className='text-ws-micro text-ws-ink-soft'>
            Có thể bạn đang vướng:
          </p>
          <div className='flex flex-wrap gap-1.5'>
            {helpSources
              .filter((s) => !answer.linkedTaskIds.includes(s.taskId))
              .map((s) => {
                const title = taskDisplayTitle(s);
                const reason = draftReasonLabel(s.reason);
                return (
                  <button
                    key={s.taskId}
                    type='button'
                    onClick={() => onAddHelpSources?.(answer.questionId, [s])}
                    /* Nhãn in TÊN việc, không in MÃ.
                       Bản cũ in `+ CV260814001 (quá hạn)`: mã việc không nói gì
                       khi đọc lướt, mà đây đúng là lúc người dùng phải quyết
                       định có thêm việc này vào câu trả lời hay không. Đường dự
                       phòng `title.slice(0, 24)` cũng bỏ luôn — nó cắt giữa chữ
                       và KHÔNG để lại dấu …, nên một cái tên bị cụt đọc ra như
                       tên thật. Nay dùng chung `TASK_LABEL_*` với viên chip việc
                       đã gắn: cùng trần bề ngang, cùng kiểu cắt đuôi.
                       Lý do gợi ý rời khỏi mặt chip xuống `title=`/`aria-label`:
                       yêu cầu là "label nhỏ thôi có tên công việc thôi", và một
                       dải chục viên mà viên nào cũng kéo theo cụm ngoặc thì
                       phần tên — thứ duy nhất cần đọc — chìm mất. */
                    title={`${title} — ${reason}`}
                    aria-label={`Thêm công việc ${title} vào câu trả lời (${reason.toLowerCase()})`}
                    className={cn(
                      /* Nét đứt giữ nguyên — nó phân biệt "gợi ý chưa thêm" với
                         chip đã thêm. Chỉ hạ màu viền xuống cấp `ws-line`.
                         `min-h-6` thay `py-0.5`: đủ 24x24 của WCAG 2.2 AA, và
                         bằng đúng chiều cao nút nhãn trong `LinkedTaskChip` nên
                         hai dải chip trong cùng phần gợi ý không lệch nhau. */
                      'inline-flex min-h-6 items-center gap-1 rounded-full border border-dashed border-ws-line bg-ws-surface-alt px-2 text-ws-micro text-ws-ink-soft hover:bg-ws-surface-sunken hover:text-ws-ink',
                      TASK_LABEL_MAX_WIDTH,
                      /* Chip đứng thẳng trên thân bản báo cáo — khung màn là
                         `bg-ws-surface` (`daily-report-workspace.tsx:558`), khối
                         này không tự đặt nền nào — chứ không trên nền
                         `ws-surface-alt` của chính nó: khe 1px của `ring-offset`
                         nằm NGOÀI viền, tức tô lên nền của cha. */
                      FOCUS_RING_SURFACE,
                    )}
                  >
                    {/* Dấu + của bản cũ là một ký tự CHỮ mở đầu nhãn. Giữ nguyên
                        như vậy thì nay nó nằm trong thẻ mang `truncate` và trở
                        thành thứ bị cắt cùng cái tên — dấu hiệu "thêm" biến mất
                        đúng ở những chip tên dài. Đổi sang icon `shrink-0` đứng
                        NGOÀI thẻ chữ: nó luôn hiện, và giống đúng nút "Chèn" ở
                        thẻ nguồn phía trên.
                        Đánh đổi: icon + `gap-1` ăn ~16px trong trần 10rem nên
                        tên ở đây cắt sớm hơn chip việc đã gắn chừng đó — vẫn
                        chung một trần, chỉ khác phần chừa cho icon. */}
                    <Plus aria-hidden='true' className='h-3 w-3 shrink-0' />
                    <span className={TASK_LABEL_TEXT}>{title}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
