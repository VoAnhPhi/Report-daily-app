'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { Archive, ArrowRight, Loader2, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ReportCarrySection } from './report-carry-section';
import { ReportHelpStatus } from './report-help-status';
import { ReportReviewOutcome } from './report-review-outcome';
import { ReportReviewPanel } from './report-review-panel';
import { ReportReviewStatus } from './report-review-status';
import {
  useReopenReport,
  useReportDraft,
  useReportKpis,
  useSaveReportAnswers,
  useSubmitReport,
} from '@/hooks/queries/daily-report-queries';
import type {
  DailyReport,
  DailyReportAnswer,
  DraftSource,
  SaveAnswerPayload,
} from '@/types/daily-report.type';
import { DailyReportQuestion } from './daily-report-question';
import {
  draftSourceLine,
  formatTimeVi,
  TOOLTIP_CONTENT_CLASS,
  TOOLTIP_CONTENT_STYLE,
  FOCUS_RING_SURFACE as FOCUS_RING,
} from '../daily-report-utils';
// Import thẳng `./utils/<file>` chứ không qua barrel `daily-report-utils`:
// đó là luật ghi ngay trong đầu file barrel cho code mới bên trong thư mục này.
import {
  MAX_ANSWER_CONTENT_LENGTH,
  MAX_LINKED_TASKS,
} from '../utils/constants';

/** Nội dung soạn cục bộ của bốn câu, khoá theo `questionId`. */
type LocalAnswers = Map<
  string,
  Pick<DailyReportAnswer, 'content' | 'isAutoDrafted' | 'linkedTaskIds'>
>;

const AUTOSAVE_DELAY_MS = 2000;

/** Server nhận lý do mở lại 1–500 ký tự; chặn ở đây để không ăn 422 rồi mới biết. */
const MAX_REOPEN_REASON = 500;
const DEFAULT_REOPEN_REASON = 'Bổ sung nội dung còn thiếu';

/** Tên gọi trong câu: người Việt gọi nhau bằng chữ CUỐI của họ tên. */
const givenName = (fullName: string | undefined): string =>
  fullName?.trim().split(/\s+/).pop() || 'thành viên';

/** Form 4 câu hỏi của một bản báo cáo. */
export function ReportForm({
  report,
  isOwnReport = true,
  canViewBoard,
  boardLabel = 'Bảng nhóm',
  nextReviewHref = null,
  onOpenTask,
  onOpenBoard,
}: {
  report: DailyReport;
  /**
   * Bản của chính người đang xem (hoặc của người được chăm khi báo cáo thay).
   * `false` khi trưởng nhóm / người duyệt đọc bản của thành viên: mọi câu chữ
   * nói "bạn" phải đổi sang tên chủ bản.
   */
  isOwnReport?: boolean;
  canViewBoard: boolean;
  /** Nhãn nút sang bảng - "Bộ phận của bạn" với người chỉ duyệt, không quản lý. */
  boardLabel?: string;
  /** Bản CHỜ DUYỆT kế tiếp trong cùng ngày, để đi hết hàng đợi không phải quay về bảng. */
  nextReviewHref?: string | null;
  onOpenTask: (taskId: string) => void;
  onOpenBoard: () => void;
}) {
  /**
   * Quyền do BE tính. KHÔNG dùng cờ cục bộ để "mở khóa" bản đã nộp: server
   * chặn sửa bản `SUBMITTED` bằng 409 "Cần mở lại báo cáo trước khi chỉnh sửa",
   * nên đường duy nhất là gọi reopen.
   */
  const readOnly = !report.permissions.canEdit;
  const {
    data: availableKpis = [],
    isSuccess: kpisLoaded,
    isLoading: kpisLoading,
    isError: kpisError,
    refetch: taiLaiKpis,
  } = useReportKpis(report.scope.id);
  const [achievedKpiIds, setAchievedKpiIds] = useState<string[]>(
    () => report.achievedKpis?.map((item) => item.kpiId) ?? [],
  );

  /**
   * KPI thật sự được phép gửi lên — LỌC BỎ những KPI đã ngừng sử dụng.
   *
   * Lỗi đo được trên trình duyệt ngày 26/08/2026, và nó khoá cứng nút Nộp:
   * `achievedKpiIds` khởi tạo từ `report.achievedKpis` (bản CHỤP lúc sinh báo
   * cáo), còn danh sách ô tick bên dưới vẽ từ `availableKpis` — mà `GET /kpis`
   * chỉ trả KPI còn `isActive` và chưa archive. Trưởng nhóm ngừng dùng một KPI
   * mà thành viên đã tick trước đó thì id ấy vẫn nằm trong state, KHÔNG còn ô
   * tick nào để bỏ, và mọi lần lưu/nộp đều gửi nó lên. Server trả 422 "KPI
   * không tồn tại, đã ngừng sử dụng hoặc không thuộc nhóm báo cáo"
   * (`validateKpis`), nên người dùng KHÔNG nộp được nữa và không có cách nào tự
   * gỡ từ giao diện — kể cả F5.
   *
   * Chỉ lọc khi danh sách KPI đã tải xong. Lúc chưa tải, `availableKpis` là
   * mảng rỗng, mà lọc theo mảng rỗng là xoá sạch mọi KPI người dùng đã tick —
   * vá một lỗi bằng một lỗi mất dữ liệu.
   */
  const submittableKpiIds = useMemo(() => {
    if (!kpisLoaded) return achievedKpiIds;
    const stillOffered = new Set(availableKpis.map((kpi) => kpi.id));
    return achievedKpiIds.filter((id) => stillOffered.has(id));
  }, [kpisLoaded, availableKpis, achievedKpiIds]);

  /**
   * Những dòng KPI thật sự được vẽ.
   *
   * Tách khỏi JSX vì cần ĐẾM để quyết định có chặn chiều cao khung hay không.
   * Bản đọc lấy từ `report.achievedKpis` (bản chụp lúc nộp) chứ không từ
   * `availableKpis`: xem lại một bản cũ phải thấy đúng những KPI người ta đã
   * tick, kể cả KPI nay đã ngừng dùng.
   */
  const kpiRows = readOnly
    ? (report.achievedKpis ?? []).map((item) => ({
        id: item.kpiId,
        name: item.name,
        description: null as string | null,
      }))
    : availableKpis;

  // Trạng thái soạn cục bộ — chỉ lấy nội dung người dùng đã lưu.
  const [local, setLocal] = useState<LocalAnswers>(
    () =>
      new Map(
        report.answers.map((a) => [
          a.questionId,
          {
            content: a.content,
            isAutoDrafted: a.isAutoDrafted,
            linkedTaskIds: a.linkedTaskIds,
          },
        ]),
      ),
  );
  /**
   * Mốc "đã lưu nháp lúc …" — ISO do SERVER trả, không phải `new Date()` của
   * máy người dùng. `PATCH /daily-reports/:id` trả về cả bản báo cáo, trong đó
   * `lastEditedAt` chính là mốc server vừa ghi trong cùng transaction. Đồng hồ
   * máy lệch vài phút thì dòng này in giờ khác hẳn giờ trong lịch sử chỉnh sửa
   * mà server hiển thị ở nơi khác.
   */
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  /**
   * Hẹn giờ autosave đang treo, để HUỶ được từ bên ngoài effect.
   *
   * Vì sao cần: cổng `if (readOnly || !dirtyRef.current) return` nằm TRƯỚC
   * `setTimeout`, nên một khi đã hẹn thì hàm bên trong chạy vô điều kiện — hạ
   * `dirtyRef` sau đó KHÔNG chặn được nó. Đó chính là cuộc đua sinh ra lỗi
   * "Chưa lưu được nháp" ngay sau khi nộp thành công: gõ xong bấm Nộp trong
   * vòng 2 giây thì hẹn giờ nổ khi bản đã `SUBMITTED`, và `saveAnswers` của
   * server chỉ nhận `status IN (DRAFT, REOPENED)` (`daily-reports.service.ts`,
   * mệnh đề `claim`) nên trả 409 "Báo cáo vừa được nộp hoặc thay đổi bởi
   * request khác". Người dùng đọc toast đỏ đó thành "nộp hỏng" rồi bấm lại.
   */
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ô nhập lý do mở lại — thay `window.prompt`. */
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState(DEFAULT_REOPEN_REASON);

  const { mutate: saveAnswers, isPending: isSaving } = useSaveReportAnswers();
  const { mutate: submitReport, isPending: isSubmitting } = useSubmitReport();
  const { mutate: reopenReport, isPending: isReopening } = useReopenReport();
  const {
    mutate: fetchDraft,
    data: draftData,
    isPending: isDrafting,
  } = useReportDraft();

  /**
   * Thông tin việc gắn kèm, lấy thẳng từ `answer.sources` (BE gắn sẵn trong
   * report), chỉ bổ sung thêm từ kết quả nút ↻ nếu người dùng đã bấm dựng lại.
   *
   * Giữ CẢ `DraftSource` chứ không chỉ `code` như bản cũ: chip nay in tên việc,
   * và popup xem nhanh của chip cần thêm `reason` + tiến độ việc con. Tất cả đã
   * nằm trong cùng một mảng `sources` — tách lấy mỗi `code` chỉ để rồi phải gọi
   * API khác lấy nốt phần còn lại.
   */
  const taskInfoById = useMemo(() => {
    const map = new Map<string, DraftSource>();
    for (const a of report.answers) {
      for (const s of a.sources) map.set(s.taskId, s);
    }
    for (const d of draftData?.drafts ?? []) {
      for (const s of d.sources) map.set(s.taskId, s);
    }
    return map;
  }, [report.answers, draftData]);

  /**
   * Yêu cầu hỗ trợ đang đi theo câu 3. Server giữ nhiều nhất MỘT yêu cầu chưa
   * giải quyết cho mỗi bản (nộp lại thì cập nhật chính yêu cầu đó), nên yêu cầu
   * đang mở luôn thắng; không có thì lấy yêu cầu đã giải quyết mới nhất
   * (`helpRequests` mới nhất trước). Một bản mang nhiều yêu cầu khi thành viên
   * nộp lại với nội dung câu 3 khác sau khi yêu cầu cũ đã được giải quyết.
   */
  const helpRequest = useMemo(() => {
    const helps = report.helpRequests ?? [];
    return (
      helps.find(
        (help) => help.status === 'OPEN' || help.status === 'ACKNOWLEDGED',
      ) ?? helps.find((help) => help.status === 'RESOLVED')
    );
  }, [report.helpRequests]);

  const helpSources = useMemo(() => {
    const fromDraft = draftData?.drafts.find(
      (d) => d.questionKind === 'need_help',
    )?.sources;
    if (fromDraft) return fromDraft;
    return report.answers.find((a) => a.kind === 'need_help')?.sources ?? [];
  }, [report.answers, draftData]);

  const buildPayload = useCallback((): SaveAnswerPayload[] => {
    return Array.from(local.entries()).map(([questionId, a]) => ({
      questionId,
      content: a.content,
      isAutoDrafted: a.isAutoDrafted,
      linkedTaskIds: a.linkedTaskIds,
    }));
  }, [local]);

  // Tự lưu nháp sau khi ngừng gõ 2 giây (docs 06 mục 3).
  useEffect(() => {
    if (readOnly || !dirtyRef.current) return;
    const timer = setTimeout(() => {
      autosaveTimerRef.current = null;
      dirtyRef.current = false;
      saveAnswers(
        {
          reportId: report.id,
          answers: buildPayload(),
          achievedKpiIds: submittableKpiIds,
        },
        { onSuccess: (saved) => setSavedAt(saved.lastEditedAt) },
      );
    }, AUTOSAVE_DELAY_MS);
    autosaveTimerRef.current = timer;
    return () => {
      clearTimeout(timer);
      /* Chỉ xoá con trỏ nếu nó vẫn đang trỏ vào ĐÚNG hẹn giờ này. Lượt effect
         sau đã kịp ghi hẹn giờ mới vào ref trước khi hàm dọn của lượt trước
         chạy trong vài kịch bản của React — xoá vô điều kiện là làm mất dấu
         hẹn giờ đang sống, và `cancelAutosave` hết tác dụng. */
      if (autosaveTimerRef.current === timer) autosaveTimerRef.current = null;
    };
  }, [
    local,
    submittableKpiIds,
    readOnly,
    report.id,
    saveAnswers,
    buildPayload,
  ]);

  /**
   * Ảnh chụp mới nhất để lưu được cả khi teardown — lúc đó closure của effect
   * đã cũ nên không đọc `local` trực tiếp được.
   *
   * Gán trong `useLayoutEffect` chứ không gán thẳng giữa lúc render: ghi vào
   * `ref.current` khi đang render là thứ `react-hooks/refs` chặn, và chặn có
   * lý — một lượt render mà React dựng rồi bỏ đi vẫn kịp ghi đè hàm lưu bằng
   * closure của lượt không bao giờ được commit. `useLayoutEffect` chạy đồng bộ
   * ngay sau commit và trước khi trình duyệt vẽ, nên hàm vẫn luôn mới đúng như
   * cách gán cũ.
   *
   * KHÔNG khai mảng phụ thuộc: phải chạy lại sau MỌI lượt render, vì mỗi lượt
   * là một closure `local` / `achievedKpiIds` khác.
   *
   * Thứ tự chạy vẫn an toàn: effect gắn listener bên dưới là effect thường
   * (passive), luôn chạy SAU mọi layout effect, nên tới lúc `pagehide` có thể
   * nổ thì `flushRef.current` đã là hàm thật. Effect này cũng không có hàm dọn,
   * nên lúc unmount `flushRef.current` vẫn còn nguyên cho `flushNow()` cuối
   * cùng gọi.
   */
  const flushRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    flushRef.current = () => {
      if (readOnly || !dirtyRef.current) return;
      dirtyRef.current = false;
      saveAnswers({
        reportId: report.id,
        answers: buildPayload(),
        achievedKpiIds: submittableKpiIds,
      });
    };
  });

  /**
   * Sửa lỗi doc 07 mục 4.1: đóng trong 2 giây chờ debounce thì mất phần vừa gõ.
   * Lưu ngay khi rời chế độ xem, ẩn tab hoặc rời trang. Không dùng `sendBeacon`
   * được vì request cần header Bearer.
   */
  useEffect(() => {
    const flushNow = () => flushRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, []);

  /**
   * Đường ghi thứ nhất vào `content`: người dùng gõ hoặc dán vào ô nhập.
   *
   * Cắt trần ngay tại tầng state chứ không phó thác cho `maxLength` của ô nhập.
   * `maxLength` là hàng rào của riêng thẻ `<textarea>` — nó giữ được đường gõ
   * và dán, nhưng state này còn một đường ghi thứ hai là `addHelpSources` bên
   * dưới. Đặt trần ở đây thì mọi đường vào đều đi qua đúng một chỗ kiểm.
   */
  const changeContent = (questionId: string, content: string) => {
    dirtyRef.current = true;
    setLocal((prev) => {
      const next = new Map(prev);
      const cur = next.get(questionId);
      if (cur)
        next.set(questionId, {
          ...cur,
          content: content.slice(0, MAX_ANSWER_CONTENT_LENGTH),
          isAutoDrafted: false,
        });
      return next;
    });
  };

  const removeLinkedTask = (questionId: string, taskId: string) => {
    dirtyRef.current = true;
    setLocal((prev) => {
      const next = new Map(prev);
      const cur = next.get(questionId);
      if (cur)
        next.set(questionId, {
          ...cur,
          linkedTaskIds: cur.linkedTaskIds.filter((id) => id !== taskId),
        });
      return next;
    });
  };

  /**
   * Đường ghi thứ hai vào `content`: nút "Chèn" / "Chèn tất cả" nối thêm một
   * dòng gợi ý VÀ gắn kèm `taskId` của việc đó.
   *
   * Đường này đi vòng qua `maxLength` của ô nhập — máy nối chuỗi chứ người dùng
   * không gõ — nên hai trần phải được kiểm ở chính đây. Nó cũng là đường duy
   * nhất làm `linkedTaskIds` dài thêm.
   *
   * Nhận cả MẢNG chứ không nhận từng nguồn một: "Chèn tất cả" chèn nhiều dòng
   * trong cùng một cú bấm, mà React chưa render lại giữa các lần gọi. Gọi lẻ N
   * lần thì mỗi lần đều chỉ nhìn thấy `local` của trước cả loạt, nên không cách
   * nào biết dòng thứ mấy làm vượt trần để nói cho đúng. Gộp lại thì cộng dồn
   * được ngay tại đây, và cả loạt chỉ tạo một lần đổi state thay vì N lần.
   *
   * Chạm trần thì BỎ QUA nguồn đó rồi nói ra, không cắt cụt: một dòng gợi ý bị
   * cắt giữa chừng đọc như dữ liệu hỏng mà người dùng không biết mình đang
   * thiếu chữ.
   */
  const addHelpSources = (questionId: string, sources: DraftSource[]) => {
    const cur = local.get(questionId);
    if (!cur) return;

    let content = cur.content;
    const linkedTaskIds = [...cur.linkedTaskIds];
    let skipped = 0;

    for (const source of sources) {
      const line = draftSourceLine(source);
      const merged = content ? `${content}\n${line}` : line;
      if (
        merged.length > MAX_ANSWER_CONTENT_LENGTH ||
        linkedTaskIds.length >= MAX_LINKED_TASKS
      ) {
        skipped += 1;
        continue;
      }
      content = merged;
      linkedTaskIds.push(source.taskId);
    }

    if (skipped > 0) {
      toast.error(
        `Không chèn được ${skipped} mục — câu trả lời đã chạm trần ${MAX_ANSWER_CONTENT_LENGTH} ký tự hoặc ${MAX_LINKED_TASKS} công việc gắn kèm. Hãy rút gọn bớt rồi chèn lại.`,
      );
    }
    // Không có gì được chèn thì cũng đừng đánh dấu bẩn: một lượt tự động lưu
    // với payload y hệt chỉ tổ làm dòng "Đã lưu nháp lúc …" nháy lên vô cớ.
    if (content === cur.content) return;

    dirtyRef.current = true;
    setLocal((prev) => {
      const next = new Map(prev);
      const at = next.get(questionId);
      if (!at) return prev;
      // Không spread `...at`: kiểu state chỉ có đúng ba trường
      // (`content` · `linkedTaskIds` · `isAutoDrafted`) và cả ba đều được ghi
      // ngay dưới đây, nên spread chỉ tạo cảm giác an toàn giả. Nếu sau này
      // thêm trường thứ tư vào kiểu, TypeScript sẽ báo thiếu ngay tại chỗ này —
      // đúng thứ ta muốn, thay vì âm thầm mang theo giá trị cũ.
      next.set(questionId, {
        content,
        linkedTaskIds,
        isAutoDrafted: false,
      });
      return next;
    });
  };

  /**
   * Làm mới gợi ý — chỉ cập nhật placeholder và nguồn tham khảo, không thay
   * nội dung người dùng đang nhập và không tạo autosave.
   */
  const regenerate = () => {
    fetchDraft(report.id);
  };

  /**
   * BE là nguồn sự thật về `isRequired` — snapshot theo template version của
   * bản báo cáo. Đây cũng là cổng chặn duy nhất phía client: 422 của server có
   * `missingQuestionIds` nhưng filter lỗi chung chỉ giữ lại `message`.
   */
  const missingRequired = report.answers.filter((a) => {
    const cur = local.get(a.questionId);
    return a.isRequired && (cur?.content ?? '').trim().length === 0;
  });

  /**
   * Huỷ autosave đang treo. Gọi TRƯỚC mọi thao tác đổi `status` của bản báo cáo.
   *
   * Không mất chữ: `handleSubmit` gửi kèm `buildPayload()` — đúng nội dung mà
   * autosave định gửi — nên huỷ ở đây là bỏ một request THỪA, không phải bỏ một
   * request cần thiết. Hạ luôn `dirtyRef` để `flushRef` (lưu khi ẩn tab / rời
   * trang) cũng không bắn theo.
   */
  const cancelAutosave = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    dirtyRef.current = false;
  }, []);

  const handleSubmit = () => {
    cancelAutosave();
    submitReport({
      reportId: report.id,
      answers: buildPayload(),
      achievedKpiIds: submittableKpiIds,
    });
  };

  const toggleKpi = (kpiId: string, checked: boolean) => {
    dirtyRef.current = true;
    setAchievedKpiIds((current) =>
      checked
        ? Array.from(new Set([...current, kpiId]))
        : current.filter((id) => id !== kpiId),
    );
  };

  /**
   * Mở lại bản đã nộp — server bắt buộc có lý do (1–500 ký tự).
   *
   * Ô nhập lý do bung ra ngay dưới dải "Đã nộp", thay cho `window.prompt`. Ngoài
   * chuyện prompt xấu và không dịch được, nó còn không chặn được chuỗi rỗng hay
   * quá 500 ký tự — người dùng chỉ biết mình sai sau khi ăn 422 từ server.
   */
  const handleReopen = () => {
    const trimmed = reopenReason.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_REOPEN_REASON) return;
    reopenReport(
      { reportId: report.id, reason: trimmed },
      {
        onSuccess: () => {
          setIsReopenOpen(false);
          setReopenReason(DEFAULT_REOPEN_REASON);
        },
      },
    );
  };

  const ownerName = report.owner.fullName ?? 'thành viên';
  /**
   * Nhãn nút mở lại theo ĐÚNG việc nó làm với người đang xem:
   *   · REOPENED (chỉ bật cho quản lý khi đã quá hạn sửa) → cấp thêm hạn;
   *   · bản của mình → "Sửa lại";
   *   · bản của người khác → mở cho CHÍNH HỌ sửa, không phải cho mình.
   * "Sửa lại" trên bản của thành viên đọc như trưởng nhóm sắp tự tay sửa bài
   * người khác, trong khi nút chỉ trả quyền sửa về cho chủ bản.
   */
  const reopenLabel =
    report.status === 'REOPENED'
      ? 'Cấp thêm hạn sửa'
      : isOwnReport
        ? 'Sửa lại'
        : `Mở lại cho ${givenName(report.owner.fullName)} sửa`;
  /* `canReopen` do server tính: trên bản REOPENED nó chỉ bật cho quản lý khi
     bản đã khoá - đường thoát duy nhất của "Quá hạn bổ sung". */
  const reopenAction = report.permissions.canReopen && !isReopenOpen && (
    <Button
      variant='ghost'
      size='sm'
      className='min-h-11 shrink-0 text-xs sm:h-7 sm:min-h-0'
      disabled={isReopening}
      aria-busy={isReopening}
      /* Nhãn nút một mình không nói được mở lại bản NÀO - nó đứng cạnh dải
         trạng thái nên mắt thấy ngữ cảnh, còn trình đọc màn hình đọc rời từng
         nút. */
      aria-label={
        report.status === 'REOPENED'
          ? `Cấp thêm hạn sửa cho bản của ${ownerName}`
          : isOwnReport
            ? 'Mở lại báo cáo để sửa'
            : `Mở lại bản của ${ownerName} để họ sửa`
      }
      onClick={() => setIsReopenOpen(true)}
    >
      {reopenLabel}
    </Button>
  );
  /* Khối kết luận nằm SAU nội dung (người duyệt đọc xong mới quyết). Bản dài
     thì nó ở tít dưới, nên dải trạng thái trên đầu có lối tắt xuống đó. */
  /* Lối tắt hiện cho CẢ HAI trạng thái của khối cuối trang: đang chờ mình
     duyệt, hoặc đã có kết luận để đọc. Trước vòng sửa 16/09/2026 nó chỉ hiện
     cho người duyệt, nên chủ bản không có đường nào xuống xem kết luận ngoài
     việc tự cuộn qua hết bốn câu trả lời. */
  const daCoKetLuan = (report.review?.decision ?? null) !== null;
  const jumpToReview = (report.review?.canReview || daCoKetLuan) && (
    <a
      href='#khoi-duyet-bao-cao'
      className={cn(
        /* `px-3` bằng đúng nút ghost `size='sm'` đứng cạnh: khi hai nút rớt
           xuống hai dòng ở 320px, chữ của chúng phải thẳng một cột. */
        'inline-flex min-h-11 items-center rounded-ws-control px-3 text-xs font-semibold underline-offset-2 hover:underline sm:h-7 sm:min-h-0',
        FOCUS_RING,
      )}
    >
      {report.review?.canReview ? 'Tới phần kết luận' : 'Xem kết luận'}
    </a>
  );

  return (
    /* Bó về khổ đọc được. Trong tấm nội dung ~1300px, `w-full` cho ra ~180 ký
       tự một dòng — gấp hơn hai lần ngưỡng 65–75. Bảng theo dõi thì KHÔNG bó:
       bảng cần bề ngang. */
    /* KHÔNG mx-auto: khi cột ngữ cảnh nằm bên phải, cột form rộng hơn 760px một
       chút nên căn giữa đẩy cả khối lệch khỏi mép tiêu đề và dải mục phía trên.
       Căn trái thì mọi thứ trong cột phải cùng đứng trên một đường dọc. */
    <div className='flex w-full max-w-[760px] flex-col gap-4'>
      {report.status === 'ARCHIVED' && (
        <div className='flex items-center gap-1.5 rounded-md border border-ws-line bg-ws-surface-alt px-3 py-2 text-xs text-ws-ink-soft'>
          <Archive className='h-3.5 w-3.5 shrink-0' />
          Nhóm đã lưu trữ, báo cáo này chỉ đọc.
        </div>
      )}

      {report.isLocked && report.status !== 'ARCHIVED' && (
        <div className='flex items-center gap-1.5 rounded-md border border-ws-line bg-ws-surface-alt px-3 py-2 text-xs text-ws-ink-soft'>
          <Archive className='h-3.5 w-3.5 shrink-0' />
          Báo cáo đã khóa lúc {report.scope.hardStopLabel} và chỉ còn chế độ
          xem.
          {report.isMissed ? ' Báo cáo này được ghi nhận là chưa nộp.' : ''}
        </div>
      )}

      {/*
        MỘT dải cho trạng thái duyệt của cả bản (thay hai dải rời "Đã nộp
        lúc…" và REOPENED của bản cũ). Dải tự phân biệt "bị TRẢ LẠI" với "được
        MỞ LẠI để bổ sung" qua `boardState` của server: một bản hoàn toàn có
        thể ở `REOPENED` + `decision = ACCEPTED` cùng lúc (đã từng duyệt đạt,
        nay mở cho bổ sung), và gộp hai thứ đó là nói với người đã làm đúng
        rằng họ bị chê.
      */}
      <ReportReviewStatus
        report={report}
        isOwnReport={isOwnReport}
        /* Bản bị trả lại giữ lý do ngay trên đầu: đó là việc phải làm, không
           phải hồ sơ. Hai kết luận còn lại để khối cuối trang nói. */
        hideQuote={daCoKetLuan && report.boardState !== 'BI_TRA_LAI'}
        action={
          (reopenAction || jumpToReview) && (
            /* Không `shrink-0`: ở 320px hai nút cạnh nhau rộng hơn cả dải, nên
               cụm phải được xuống dòng bên trong thay vì tràn ra ngoài. */
            <span className='flex min-w-0 flex-wrap items-center gap-2'>
              {jumpToReview}
              {reopenAction}
            </span>
          )
        }
      />

      {isReopenOpen && (
        <div className='rounded-md border border-ws-line bg-ws-surface-alt p-3'>
          <label
            htmlFor='daily-report-reopen-reason'
            className='text-xs font-medium text-ws-ink'
          >
            {report.status === 'REOPENED'
              ? 'Vì sao cần cấp thêm hạn sửa cho báo cáo này?'
              : isOwnReport
                ? 'Vì sao bạn cần mở lại báo cáo này?'
                : `Vì sao cần mở lại bản của ${ownerName}?`}
          </label>
          <textarea
            id='daily-report-reopen-reason'
            autoFocus
            rows={2}
            value={reopenReason}
            maxLength={MAX_REOPEN_REASON}
            onChange={(e) => setReopenReason(e.target.value)}
            /* Cùng công thức focus nhẹ với ô trả lời ở `daily-report-question`:
               viền đổi màu + quầng mềm 3px, thay cho vòng đặc 2px. Ô này có
               `autoFocus` nên vòng cũ bật lên ngay khoảnh khắc mở panel — đúng
               chỗ chói nhất. */
            className='mt-1.5 w-full resize-none rounded-md border border-ws-line bg-ws-surface px-3 py-2 text-sm text-ws-ink outline-none transition-[color,box-shadow] placeholder:text-ws-ink-faint focus-visible:border-ws-focus focus-visible:ring-[3px] focus-visible:ring-ws-focus/50'
            placeholder='Ví dụ: bổ sung số liệu còn thiếu ở câu 2'
          />
          <div className='mt-2 flex items-center justify-between gap-2'>
            <span className='text-ws-micro tabular-nums text-ws-ink-faint'>
              {reopenReason.trim().length}/{MAX_REOPEN_REASON}
            </span>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                className='min-h-11 text-xs sm:h-7 sm:min-h-0'
                onClick={() => {
                  setIsReopenOpen(false);
                  setReopenReason(DEFAULT_REOPEN_REASON);
                }}
              >
                Huỷ
              </Button>
              <Button
                size='sm'
                className='min-h-11 text-xs sm:h-7 sm:min-h-0'
                disabled={isReopening || reopenReason.trim().length === 0}
                aria-busy={isReopening}
                onClick={handleReopen}
              >
                {isReopening && (
                  <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                )}
                {report.status === 'REOPENED'
                  ? 'Cấp thêm hạn sửa'
                  : isOwnReport
                    ? 'Mở lại để sửa'
                    : reopenLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Việc cần làm tiếp đứng ngay dưới dải trạng thái: nó là KẾT QUẢ của kết
          luận "Tiếp tục thực hiện", nên người đọc bản thấy nó cùng lúc với kết
          luận thay vì phải cuộn qua bốn câu. Tự ẩn khi không có dòng nào. */}
      <ReportCarrySection report={report} />

      {/* Người đang ĐIỀN luôn thấy khối này, kể cả khi danh sách KPI chưa
          về hay tải hỏng: điều kiện cũ chỉ dựa vào độ dài mảng, nên `GET /kpis`
          lỗi là khối biến mất hẳn và người nộp tưởng nhóm không có KPI nào -
          nộp thiếu mà không có dấu hiệu gì (rà giao diện 16/09/2026). */}
      {(!readOnly ||
        availableKpis.length > 0 ||
        report.achievedKpis?.length > 0) && (
        <section className='rounded-md border border-ws-line bg-ws-surface px-3 py-3'>
          <h3 className='text-sm font-semibold text-ws-ink'>KPI đạt được</h3>
          {/* Câu hướng dẫn chỉ dành cho người đang ĐIỀN. Bản chỉ đọc mà không
              tick KPI nào thì trước đây khối này còn trơ tiêu đề + câu hướng
              dẫn + khoảng trống, người duyệt không biết là "không đạt KPI nào"
              hay "tải hỏng". */}
          {!readOnly ? (
            kpisError ? (
              <p className='mt-0.5 text-ws-micro text-ws-danger'>
                Chưa tải được danh sách KPI.{' '}
                <button
                  type='button'
                  onClick={() => void taiLaiKpis()}
                  className='underline underline-offset-2'
                >
                  Thử lại
                </button>
              </p>
            ) : kpisLoaded && availableKpis.length === 0 ? (
              <p className='mt-0.5 text-ws-micro text-ws-ink-faint'>
                Nhóm chưa cấu hình KPI nào. Không cần tick gì ở bước này.
              </p>
            ) : (
              <p className='mt-0.5 text-ws-micro text-ws-ink-faint'>
                Chỉ chọn những KPI bạn đã thực sự đạt trong ngày.
              </p>
            )
          ) : kpiRows.length === 0 ? (
            <p className='mt-0.5 text-ws-micro text-ws-ink-faint'>
              Không đánh dấu KPI nào đạt trong ngày.
            </p>
          ) : null}
          {/* Quá 7 KPI thì khung tự cuộn thay vì đẩy dài mãi cả form.

              Ngưỡng là SỐ DÒNG chứ không phải chiều cao đo được: 7 dòng chỉ
              có tên là 7×32px + 6 khe 8px = 272px, nên `18rem` (288px) cho
              dòng thứ tám ló ra một phần — dấu hiệu duy nhất nói rằng còn
              cuộn được. Hệ quả đã biết: 5 KPI mà cái nào cũng có mô tả dài
              thì khung vẫn cao và KHÔNG có thanh cuộn, vì luật đếm dòng chứ
              không đo. Muốn đổi sang "cao quá thì cuộn" thì bỏ điều kiện đếm.

              `pr-1.5` chừa chỗ cho thanh cuộn 9px của `ws-scroll` khỏi đè lên
              chữ; `overscroll-contain` để cuộn hết danh sách thì không kéo
              theo cả trang. */}
          {/* Ba dòng xám trong lúc chờ: khối đã dựng sẵn nên danh sách hiện
              ra không đẩy cả form nhảy một tầng. */}
          {!readOnly && kpisLoading && (
            <div className='mt-2 space-y-2' aria-busy='true'>
              <div className='h-8 animate-pulse rounded-md bg-ws-surface-alt' />
              <div className='h-8 animate-pulse rounded-md bg-ws-surface-alt' />
              <div className='h-8 animate-pulse rounded-md bg-ws-surface-alt' />
            </div>
          )}
          <div
            className={cn(
              'mt-2 space-y-2',
              kpiRows.length > 7 &&
                'ws-scroll max-h-[18rem] overflow-y-auto overscroll-contain pr-1.5',
            )}
          >
            {kpiRows.map((kpi) => (
              <label
                key={kpi.id}
                className='flex items-start gap-2 rounded-md bg-ws-surface-alt px-2.5 py-2'
              >
                <Checkbox
                  /* `rounded-[var(--radius-ws-check)]` như hai chỗ còn lại của
                     màn: primitive `ui/checkbox` mặc định `rounded-[4px]`, nên
                     thiếu dòng này ô tích KPI là hình duy nhất lệch bán kính
                     trong cả form. `mt-0.5` khớp cách canh của `items-start`. */
                  className='mt-0.5 rounded-[var(--radius-ws-check)]'
                  checked={achievedKpiIds.includes(kpi.id)}
                  disabled={readOnly}
                  onCheckedChange={(value) => toggleKpi(kpi.id, value === true)}
                />
                <span className='min-w-0'>
                  <span className='block text-xs font-medium text-ws-ink'>
                    {kpi.name}
                  </span>
                  {kpi.description && (
                    <span className='block text-ws-micro text-ws-ink-faint'>
                      {kpi.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* MỘT dòng cho cả bản, không lặp dưới từng câu.
          Câu "Hệ thống dựng sẵn…" trước đây nằm dưới mỗi ô nhập có nội dung tự
          dựng — bốn câu là bốn lần cùng một câu chữ, mà nó chỉ mang một thông
          tin duy nhất và không đổi theo câu hỏi: bản nháp này do máy dựng, bạn
          cứ sửa. Lặp lại thì vừa tốn bốn hàng vừa dạy người đọc bỏ qua nó.
          Điều kiện giữ nguyên như cũ: chỉ hiện khi thật sự có câu được dựng
          sẵn VÀ câu đó còn nội dung, và không hiện ở bản chỉ đọc. */}
      {report.answers.map((a) => {
        const cur = local.get(a.questionId);
        const draft = draftData?.drafts.find((d) => d.questionKind === a.kind);
        const merged: DailyReportAnswer = cur
          ? {
              ...a,
              content: cur.content,
              isAutoDrafted: cur.isAutoDrafted,
              linkedTaskIds: cur.linkedTaskIds,
              suggestion: draft?.content ?? a.suggestion,
              sources: draft?.sources ?? a.sources,
            }
          : {
              ...a,
              suggestion: draft?.content ?? a.suggestion,
              sources: draft?.sources ?? a.sources,
            };
        return (
          <DailyReportQuestion
            key={a.questionId}
            answer={merged}
            helpSources={a.kind === 'need_help' ? helpSources : undefined}
            belowAnswer={
              a.kind === 'need_help' && helpRequest ? (
                <ReportHelpStatus
                  helpRequest={helpRequest}
                  canResolve={report.permissions.canResolveHelp ?? false}
                />
              ) : undefined
            }
            readOnly={readOnly}
            onChangeContent={changeContent}
            onRemoveLinkedTask={removeLinkedTask}
            onAddHelpSources={addHelpSources}
            onOpenTask={onOpenTask}
            taskInfoById={taskInfoById}
          />
        );
      })}

      {/* Khối kết luận đứng SAU nội dung, không trên đầu như bản cũ: người
          duyệt phải đọc bài rồi mới quyết. Đặt ba lựa chọn kết luận trước bài
          là mời bấm "Đạt" khi chưa đọc. Dải trạng thái trên đầu có lối tắt
          xuống đây. */}
      <ReportReviewPanel report={report} />
      {/* Cùng một chỗ, cùng một neo `#khoi-duyet-bao-cao`: một trong hai khối
          hiện, không bao giờ cả hai (form đòi `canReview`, mà `canReview` của
          server đòi chưa ai kết luận). */}
      <ReportReviewOutcome report={report} />

      {/* `flex-wrap` là cặp bắt buộc của `whitespace-nowrap` bên dưới: khoá cho
          "Dựng lại báo cáo" một dòng làm hàng nút rộng ~278px, sát mép 280px lòng trong
          ở 320px — thêm dòng "Đã lưu nháp lúc …" là tràn ngang. Cho phép ngắt
          hàng thì nó tự xuống dòng thay vì đẩy trang trượt ngang; desktop thừa
          chỗ nên không đổi gì. `ml-auto` giữ cụm nút bên phải luôn dán mép phải
          kể cả khi đã xuống hàng riêng.
          Bản chỉ đọc mà không có nút nào (thành viên xem lại bài đã nộp) thì
          thanh này rỗng: một dải trắng có viền dính đáy màn hình suốt lúc cuộn.
          Vùng trạng thái lưu nháp chỉ có nghĩa khi đang sửa, nên ẩn cả thanh ở
          ca đó không lấy mất gì của trình đọc màn hình. */}
      {(!readOnly ||
        canViewBoard ||
        report.permissions.canSubmit ||
        nextReviewHref !== null) && (
      <div className='sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-ws-line bg-ws-surface py-3'>
        <div className='flex items-center gap-2 text-ws-micro text-ws-ink-faint'>
          {!readOnly && (
            <button
              type='button'
              onClick={regenerate}
              disabled={isDrafting}
              aria-busy={isDrafting}
              className={cn(
                'inline-flex items-center gap-1 whitespace-nowrap rounded-ws-control border border-ws-line bg-ws-surface-alt px-2 py-1 text-xs text-ws-ink-soft hover:bg-ws-surface-sunken disabled:opacity-50',
                FOCUS_RING,
              )}
            >
              <RefreshCw
                className={cn('h-3 w-3', isDrafting && 'animate-spin')}
              />
              Làm mới gợi ý
            </button>
          )}
          {/* `aria-live='polite'` chứ không phải `assertive`: trạng thái lưu
              nháp là tin phụ, không được cắt ngang thứ người dùng đang gõ.
              Vùng phải luôn có mặt trong DOM để trình đọc màn hình theo dõi
              được — gắn `aria-live` lên một node vừa mới xuất hiện thì lần
              thông báo đầu tiên bị bỏ qua.
              `empty:hidden` là cặp bắt buộc của việc luôn giữ node: hàng này
              có `gap-2`, mà một flex item rỗng vẫn ăn trọn một khe 8px — ở
              320px đó là đủ để hàng nút gãy dòng khi chưa có gì để nói. */}
          <span
            role='status'
            aria-live='polite'
            aria-busy={isSaving}
            className='empty:hidden'
          >
            {isSaving
              ? 'Đang lưu…'
              : savedAt
                ? `Đã lưu nháp lúc ${formatTimeVi(savedAt)}`
                : null}
          </span>
        </div>
        {/* `flex-wrap` + `shrink-0` trên từng nút: ở 320px nút bảng, link bản kế
            tiếp và nút Nộp không vừa một hàng. Không cho xuống hàng thì chúng co
            lại, chữ "Bộ phận của bạn" tràn viền 5px và link gãy thành hai dòng
            trong hộp cao 36px (đo 15/09/2026). */}
        <div className='ml-auto flex flex-wrap items-center justify-end gap-2'>
          {canViewBoard && (
            <Button
              variant='outline'
              size='sm'
              className='shrink-0 text-xs'
              onClick={onOpenBoard}
              title={boardLabel}
            >
              <Users aria-hidden='true' className='h-3.5 w-3.5 sm:mr-1.5' />
              {/* Dưới `sm` nút chỉ còn icon: ở 320-375px nút đủ chữ cộng link "Bản
                  chờ duyệt kế tiếp" không vừa một hàng, thanh dính đáy cao lên
                  113px và che đúng ô nhận xét cùng nút "Gửi kết luận" (đo
                  15/09/2026). Chữ vẫn nằm trong DOM làm tên trợ năng của nút. */}
              <span className='sr-only sm:not-sr-only'>{boardLabel}</span>
            </Button>
          )}
          {/* Đi tiếp hàng đợi ngay tại chỗ. Link thật chứ không phải nút: mở
              được tab mới để duyệt song song, và đổi route là đổi hẳn bản -
              `key={report.id}` ở workspace dựng lại form sạch. */}
          {nextReviewHref && (
            <Link
              href={nextReviewHref}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-opacity hover:opacity-90',
                /* Bản đang mở CHƯA kết luận thì hành động chính của màn là "Gửi
                   kết luận" ở khối trên; nút này lùi về dạng viền để không mời
                   bỏ bản dở sang bản khác. Kết luận xong nó mới là bước kế. */
                report.review?.canReview
                  ? 'border border-ws-line bg-ws-surface text-ws-ink'
                  : 'bg-ws-progress-fg text-ws-solid-ink',
                FOCUS_RING,
              )}
            >
              Bản chờ duyệt kế tiếp
              <ArrowRight className='h-3.5 w-3.5' aria-hidden='true' />
            </Link>
          )}
          {report.permissions.canSubmit && (
            /* `canSubmit` là cờ RIÊNG, không suy ra từ `canEdit`: server có
               thể cho sửa mà không cho nộp (bản `SUBMITTED` đang chờ mở lại,
               hoặc luật lịch đổi về sau). Bản cũ ẩn/hiện nút Nộp theo
               `readOnly`, nên nút vẫn sáng trong đúng những ca server từ chối
               và người dùng chỉ biết sau khi bấm rồi ăn 409.
               Lý do KHÔNG nộp được phải tới được cả chuột lẫn bàn phím lẫn
               trình đọc màn hình. `title=` cũ chỉ hiện khi rê chuột và không
               bao giờ hiện trên cảm ứng — mà nút đang `disabled` thì đó là
               câu duy nhất giải thích vì sao.
               Nút disabled không phát sự kiện chuột, nên chú giải phải bám vào
               lớp bọc; `components/ui/button.tsx` đã có `disabled:pointer-
               events-none` nên con trỏ đi xuyên qua nút xuống đúng lớp bọc đó.
               `aria-describedby` do Radix tự gắn, nhưng chỉ khi chú giải mở,
               nên câu này còn được lặp lại ở `aria-label` của nút. */
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='inline-flex'>
                    <Button
                      size='sm'
                      disabled={missingRequired.length > 0 || isSubmitting}
                      aria-busy={isSubmitting}
                      aria-label={
                        missingRequired.length > 0
                          ? `Nộp báo cáo, còn thiếu câu ${missingRequired.map((a) => a.sortOrder).join(', ')}`
                          : undefined
                      }
                      onClick={handleSubmit}
                      className='bg-ws-solid text-ws-solid-ink hover:bg-ws-solid/90'
                    >
                      {isSubmitting && (
                        <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                      )}
                      Nộp báo cáo
                    </Button>
                  </span>
                </TooltipTrigger>
                {missingRequired.length > 0 && (
                  <TooltipContent
                    className={TOOLTIP_CONTENT_CLASS}
                    style={TOOLTIP_CONTENT_STYLE}
                  >
                    Còn thiếu câu{' '}
                    {missingRequired.map((a) => a.sortOrder).join(', ')}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
