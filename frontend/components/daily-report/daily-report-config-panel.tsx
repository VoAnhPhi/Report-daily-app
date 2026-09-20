'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  FilePlus2,
  Loader2,
  Lock,
  Settings2,
  Trash2,
  UserCog,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContentWithoutCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { InfoHint } from './shared/info-hint';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import {
  useCreateReportScope,
  useGenerateTodayReports,
  useMyReportScopes,
  useRemoveReportScope,
  useReportTemplate,
  useTodayGenerationPreview,
  useUpdateReportScope,
} from '@/hooks/queries/daily-report-queries';
import type {
  DailyReportGenerationPreview,
  DailyReportStatus,
} from '@/types/daily-report.type';
import {
  DEFAULT_LEADER_SUMMARY_MINUTE,
  DEFAULT_REMINDER_BEFORE_MINUTES,
  REPORT_CUTOFF_MINUTE,
  REPORT_GENERATE_MINUTE,
  formatMinuteOfDay,
  missedTodaysGeneration,
  parseMinuteOfDay,
  reportStartsHint,
  toSchedulePayload,
  FOCUS_RING_SURFACE as FOCUS_RING,
} from './daily-report-utils';
import { DailyReportSchedule } from './config/daily-report-schedule';

/**
 * Vòng focus bàn phím — cùng công thức với `daily-report-scope-rail.tsx`, để cả
 * màn Báo cáo chỉ có MỘT kiểu vòng focus. Khối này nằm trên nền `ws-surface`
 * (thân popup cấu hình) nên khe hở lấy đúng màu đó; chỗ nào nền khác thì ghi đè
 * riêng `ring-offset-*` tại chỗ, đừng đổi hằng số này.
 */
/** Khung xương một dòng cấu hình — nhãn ngắn trên, ô điều khiển dưới. */
function ConfigRowSkeleton() {
  return (
    <div className='space-y-1'>
      <Skeleton className='h-3 w-20 rounded-ws-bar bg-ws-surface-sunken' />
      <Skeleton className='h-7 w-full rounded-ws-control bg-ws-surface-sunken' />
    </div>
  );
}

/**
 * Mặc định của BE khi tạo scope mà không gửi gì (`daily-report-scope.service.ts:370`
 * và `daily-report.constants.ts`). Nhắc lại ở client CHỈ để hiện trước cho người
 * dùng thấy — nguồn sự thật vẫn là server, đừng dựa vào đây để tính toán.
 */
const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5, 6];

/** Bản nháp cấu hình báo cáo mà form cha đang giữ hộ. */
export interface PendingReportConfig {
  enabled: boolean;
  weekdays: number[];
  /** Giờ nhắc người còn thiếu, phút từ 00:00. */
  remindMinute: number;
  /** Giờ gửi tổng hợp. Chốt số liệu, KHÔNG chặn nộp — mốc chặn là `cutoffMinute` 23:00. */
  summaryMinute: number;
}

interface Props {
  /** Nhóm giao việc đang sửa. Null = đang tạo nhóm mới (chưa có id). */
  groupId: string | null;
  /**
   * Mở thẳng cấu hình của MỘT scope đã biết, không đi qua groupId.
   * Màn Báo cáo biết chính xác nhóm đang xem nên truyền id vào đây; lối cũ (tra
   * theo `assignGroupId`) chỉ đúng với scope kiểu nhóm giao việc.
   */
  scopeId?: string | null;
  /**
   * `live` — mỗi thay đổi gửi lên server NGAY. Đúng cho popup "Cấu hình báo
   * cáo" của một nhóm đang chạy: ở đó không có nút Lưu và hộp thoại nói thẳng
   * "Mọi thay đổi lưu ngay".
   *
   * `draft` — mọi thay đổi chỉ ghi vào state của form cha, form cha gửi đi khi
   * người dùng bấm Lưu.
   *
   * Phải là prop TƯỜNG MINH, không suy từ `groupId`/`scopeId` như bản trước.
   * Bản trước coi "có groupId" là "đã có nhóm thật nên lưu ngay được", nên form
   * SỬA nhóm — vốn có nút Lưu và nút Hủy hẳn hoi — lại rơi vào nhánh lưu ngay:
   * gạt công tắc một cái là `PATCH` bay đi kèm toast "Đã cập nhật", trong khi
   * người dùng còn chưa bấm gì và vẫn đinh ninh mình bấm Hủy được.
   */
  mode?: 'live' | 'draft';
  /**
   * Bản nháp hiện tại và đường ghi ngược lại. Chế độ `draft` bắt buộc phải có
   * `onPendingChange`; thiếu nó thì panel chỉ hiện câu nhắc lưu nhóm trước.
   */
  pendingEnabled?: boolean;
  pendingWeekdays?: number[];
  pendingRemindMinute?: number;
  pendingSummaryMinute?: number;
  /** Đang lưu nhóm — khoá công tắc và khối chọn ngày để không sửa nửa chừng. */
  pendingDisabled?: boolean;
  onPendingChange?: (next: PendingReportConfig) => void;
  /**
   * Mở cấu hình ĐẦY ĐỦ (lưu ngay) của scope này. Chỉ nhánh nháp dùng tới: form
   * sửa nhóm chỉ chứa công tắc, ngày và giờ - không có người duyệt phụ, thời
   * hạn duyệt, bộ câu hỏi hay nút "Tạo báo cáo hôm nay". Thiếu lối này, trưởng
   * nhóm sửa nhóm xong không biết phải vào đâu để giao người duyệt.
   */
  onOpenFullConfig?: (scopeId: string) => void;
}

/** Nhãn thứ trong tuần — ISO: 1 = thứ Hai … 7 = Chủ nhật. */
const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 7, label: 'CN' },
];

/**
 * Khối bật/tắt Báo cáo hằng ngày cho một nhóm giao việc (docs 06 mục 5).
 * Đây là đường DUY NHẤT để bật tính năng từ giao diện — không bật thì nút
 * "Báo cáo hôm nay" trên màn Công việc sẽ tự ẩn với mọi thành viên.
 */
export function DailyReportConfigPanel({
  groupId,
  scopeId = null,
  mode = 'live',
  pendingEnabled = false,
  pendingWeekdays,
  pendingRemindMinute,
  pendingSummaryMinute,
  pendingDisabled = false,
  onPendingChange,
  onOpenFullConfig,
}: Props) {
  const { data: scopes, isLoading } = useMyReportScopes(
    groupId !== null || scopeId !== null,
  );
  const createScope = useCreateReportScope();
  const updateScope = useUpdateReportScope();
  const removeScope = useRemoveReportScope();
  const generateToday = useGenerateTodayReports();

  const [confirmArchive, setConfirmArchive] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const scope = useMemo(
    () =>
      scopes?.find((s) =>
        scopeId !== null ? s.id === scopeId : s.assignGroupId === groupId,
      ) ?? null,
    [scopes, groupId, scopeId],
  );
  /* Hộp thoại này KHÔNG còn hỏi `GET /daily-report-scopes/:id` nữa. Lượt gọi đó
     chỉ để lấy danh sách thành viên cho khối phân công người duyệt, mà khối đó
     đã rời sang trang Nhóm duyệt - nơi danh sách thành viên về CÙNG một lượt
     với các nhóm, nên hai thứ không thể lệch nhau. */

  /**
   * Công tắc là ĐIỀU KHIỂN CÓ KIỂM SOÁT, vẽ thẳng từ dữ liệu server. Không có
   * cập nhật lạc quan nào, nên sau khi bấm phải chờ HAI lượt: `PATCH` xong rồi
   * `invalidateScopeConfig` refetch `/my` xong, thumb mới nhúc nhích — mà trong
   * lúc đó `isBusy` lại khoá nút, xám ngay tại vị trí cũ. Đó chính là cảm giác
   * "bấm mà không có gì xảy ra".
   *
   * Ghi đè bằng một giá trị chờ trong lúc mutation bay: thumb đi ngay, và tự bỏ
   * khi dữ liệu server về. KHÔNG dùng khi mutation lỗi — `onError` của
   * `useUpdateReportScope` đã báo, và giá trị chờ bị xoá nên thumb quay lại đúng
   * sự thật thay vì kẹt ở trạng thái giả.
   */
  const [optimisticOn, setOptimisticOn] = useState<boolean | null>(null);
  const serverOn = !!scope?.isEnabled;
  /**
   * Xoá giá trị chờ khi sự thật server — hoặc nhóm đang xem — đổi.
   *
   * Trước đây là `useEffect` phụ thuộc `[serverOn, groupId]` chạy SAU khi vẽ;
   * nay so ngay trong lúc render theo khuôn "giữ giá trị của lượt trước trong
   * state" của React. Điều kiện kích hoạt giống hệt mảng phụ thuộc cũ, nên
   * thumb không nhúc nhích thêm lần nào: lúc mutation của chính người dùng về
   * thì `optimisticOn` đã bằng `serverOn` rồi, mà `isOn = optimisticOn ?? serverOn`
   * nên bỏ giá trị chờ đi không đổi thứ đang hiển thị.
   *
   * Nhánh lỗi vẫn đi đường riêng và không đổi: cả hai lối trong `toggle`
   * (`updateScope` và `createScope`) tự gọi `setOptimisticOn(null)` trong
   * `onError` — lúc đó `serverOn` không đổi giá trị nên nhánh dưới đây không
   * chạm tới.
   */
  const [syncedServerOn, setSyncedServerOn] = useState(serverOn);
  const [syncedGroupId, setSyncedGroupId] = useState(groupId);
  if (syncedServerOn !== serverOn || syncedGroupId !== groupId) {
    setSyncedServerOn(serverOn);
    setSyncedGroupId(groupId);
    setOptimisticOn(null);
  }

  // Bộ câu hỏi thật của scope, không phải danh sách cứng — nhóm có thể dùng
  // template riêng. `versions[0]` là bản mới nhất (BE sắp version giảm dần).
  const { data: template } = useReportTemplate(scope?.templateId ?? null);
  const questions = template?.versions?.[0]?.questions ?? [];
  const generationPreview = useTodayGenerationPreview(
    scope?.id ?? null,
    generateDialogOpen,
  );

  const isBusy =
    createScope.isPending ||
    updateScope.isPending ||
    removeScope.isPending ||
    generateToday.isPending;

  // Lần tải đầu, khi chưa biết gì về scope. Refetch nền KHÔNG tính — nếu tính thì
  // mỗi lần đổi một tuỳ chọn cả khối lại biến mất một nhịp.
  const isFirstLoad = isLoading && !scopes;

  /* Chế độ nháp: hoặc do nơi gọi chỉ định, hoặc do chưa có gì để gọi API (đang
     tạo nhóm mới, chưa có id nào). */
  const isDraft = mode === 'draft' || (groupId === null && scopeId === null);

  if (isDraft) {
    // Không có đường ghi ngược thì panel chẳng giữ được gì — chỉ nhắc.
    if (!onPendingChange) {
      return (
        <div className='rounded-md border border-dashed border-ws-line-strong bg-ws-surface-alt p-3'>
          <p className='text-xs text-ws-ink-soft'>
            Lưu nhóm trước, rồi mở lại để bật báo cáo hằng ngày.
          </p>
        </div>
      );
    }

    const draftWeekdays = pendingWeekdays ?? DEFAULT_WEEKDAYS;
    const startsHint = reportStartsHint(draftWeekdays, scope?.generationLabel, {
      missedTodaysGeneration: missedTodaysGeneration(scope),
    });
    /* Ba mốc dưới đây theo đúng thứ tự ưu tiên: bản nháp người dùng đang giữ →
       nhãn THẬT của scope do server trả → hằng số dự phòng có tên ở utils.
       Không có số 390 hay 1040 viết thẳng ở đây: nhóm đổi được hai mốc giữa,
       nên một con số cứng trong client sẽ hiện sai ngay khi nhóm đổi lịch. */
    const cutoff = scope?.hardStopMinute ?? REPORT_CUTOFF_MINUTE;
    const draftRemind =
      pendingRemindMinute ??
      parseMinuteOfDay(scope?.reminderLabel) ??
      cutoff - DEFAULT_REMINDER_BEFORE_MINUTES;
    const draftSummary =
      pendingSummaryMinute ??
      parseMinuteOfDay(scope?.leaderSummaryLabel) ??
      DEFAULT_LEADER_SUMMARY_MINUTE;
    const emit = (patch: Partial<PendingReportConfig>) =>
      onPendingChange({
        enabled: pendingEnabled,
        weekdays: draftWeekdays,
        remindMinute: draftRemind,
        summaryMinute: draftSummary,
        ...patch,
      });

    /* Đang sửa một nhóm CÓ THẬT mà danh sách scope chưa về: khoá hết.
       Nếu không, người dùng chỉnh trên giá trị mặc định giả — rồi bấm Lưu là
       đè lên cấu hình thật của nhóm. Chốt chặn quyền `scope.isManager` lúc đó
       cũng chưa có gì để kiểm. */
    const isWaitingForScope = groupId !== null && isFirstLoad;
    const isLocked =
      pendingDisabled ||
      isWaitingForScope ||
      (scope ? !scope.isManager : false);

    return (
      <div className='rounded-md border border-ws-line'>
        <ConfigHeaderRow
          questionCount={questions.length}
          right={
            <Switch
              checked={pendingEnabled}
              disabled={isLocked}
              onCheckedChange={(on) => emit({ enabled: on })}
              aria-label='Bật báo cáo hằng ngày cho nhóm'
              className={FOCUS_RING}
            />
          }
        />

        {isWaitingForScope && (
          <div
            aria-busy='true'
            className='space-y-2 border-t border-ws-line p-3'
          >
            <span className='sr-only'>Đang tải cấu hình báo cáo của nhóm…</span>
            {[0, 1, 2].map((i) => (
              <ConfigRowSkeleton key={i} />
            ))}
          </div>
        )}

        {pendingEnabled && !isWaitingForScope && (
          <div className='space-y-3 border-t border-ws-line p-3'>
            <WeekdayPicker
              value={draftWeekdays}
              disabled={isLocked}
              onChange={(next) => emit({ enabled: true, weekdays: next })}
              questionLabels={questions.map((q) => q.label)}
              generationLabel={scope?.generationLabel}
            />
            {/* Chỉ hiện câu khi nó báo điều KHÁC thường (chưa áp dụng hôm nay,
                sẽ bắt đầu lúc nào, chưa chọn ngày nào). Trạng thái bình thường
                "Đã áp dụng cho hôm nay" không cần đứng thường trực (UAT
                18/09/2026: form nhóm nhiều chữ quá). Giờ sinh đi vào câu từ
                scope, không do hàm tự dựng. */}
            {!startsHint.startsWith('Đã áp dụng') && (
              <p className='text-[11px] text-ws-ink-soft'>{startsHint}</p>
            )}

            {/* Nhóm đã có cấu hình thì chỉnh luôn mốc giờ ngay tại đây, vẫn ở
                dạng nháp. Trước đây khối này chỉ có ở chế độ lưu-ngay, nên
                người sửa nhóm buộc phải chỉnh giờ qua một popup khác. */}
            {scope ? (
              <DailyReportSchedule
                remindMinute={draftRemind}
                summaryMinute={draftSummary}
                cutoffMinute={cutoff}
                generationLabel={scope?.generationLabel}
                disabled={isLocked}
                onCommit={({ remindMinute, summaryMinute }) =>
                  emit({ enabled: true, remindMinute, summaryMinute })
                }
              />
            ) : (
              /* Chưa có scope (nhóm mới) thì chưa có gì để chỉnh: mốc giờ do
                  server đặt lúc tạo. Nói ra các mốc mặc định để người dùng biết
                  điều gì sắp xảy ra, và nói rõ chỉnh được sau khi lưu. */
              <p className='text-[11px] text-ws-ink-faint'>
                Sau khi lưu, nhóm chạy theo lịch mặc định: mở{' '}
                {formatMinuteOfDay(REPORT_GENERATE_MINUTE)} · nhắc{' '}
                {formatMinuteOfDay(cutoff - DEFAULT_REMINDER_BEFORE_MINUTES)} ·
                gửi tổng hợp {formatMinuteOfDay(DEFAULT_LEADER_SUMMARY_MINUTE)}{' '}
                · khóa {formatMinuteOfDay(cutoff)}. Mở lại nhóm này là chỉnh
                được hai mốc giữa.
              </p>
            )}

            {/* Mở CHỒNG lên hộp thoại nhóm, không đóng nó: form nhóm chỉ gửi
                cấu hình báo cáo khi người dùng đã động vào khối này, và tự nạp
                lại từ server khi chưa động - nên chỉnh ở cấu hình đầy đủ rồi
                quay lại không bị bản nháp cũ ghi đè. */}
            {/* Cùng khuôn hàng cài đặt với hộp thoại cấu hình: nhãn + dấu hỏi
                trái, nút phải. Đoạn văn năm dòng cũ kẹp cạnh nút vào chú giải
                (UAT 18/09/2026). */}
            {scope?.isManager && onOpenFullConfig && (
              <SettingRow
                label='Cấu hình khác'
                hint={
                  <InfoHint label='Cấu hình khác gồm những gì'>
                    Thời hạn duyệt, bộ câu hỏi và nút tạo báo cáo hôm nay nằm ở
                    cấu hình báo cáo của nhóm. Chia bộ phận có trang riêng.
                  </InfoHint>
                }
              >
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className={cn('shrink-0', FOCUS_RING)}
                  disabled={isLocked}
                  onClick={() => onOpenFullConfig(scope.id)}
                >
                  <Settings2 className='h-3.5 w-3.5' aria-hidden='true' />
                  Mở cấu hình báo cáo
                </Button>
              </SettingRow>
            )}

            {scope?.isManager && (
              <div className='border-t border-ws-line pt-3'>
                <div className='flex items-center gap-1'>
                  <button
                    type='button'
                    disabled={isLocked || removeScope.isPending}
                    onClick={() => setConfirmArchive(true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-ws-chip py-1 text-xs text-ws-danger hover:underline disabled:opacity-50',
                      FOCUS_RING,
                    )}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                    Xóa nhóm khỏi báo cáo
                  </button>
                  {/* Hộp xác nhận nói đủ hệ quả trước khi làm, nên câu hệ quả
                      vào chú giải thay vì đứng thường trực. */}
                  <InfoHint label='Xóa nhóm khỏi báo cáo làm gì'>
                    Lưu ngay và không bật lại được; nhóm công việc vẫn được giữ
                    nguyên.
                  </InfoHint>
                </div>
              </div>
            )}
          </div>
        )}

        <ConfirmationDialog
          isOpen={confirmArchive}
          onClose={() => setConfirmArchive(false)}
          onConfirm={() => {
            if (scope) {
              removeScope.mutate(scope.id, {
                onSuccess: () => {
                  onPendingChange({
                    enabled: false,
                    weekdays: draftWeekdays,
                    remindMinute: draftRemind,
                    summaryMinute: draftSummary,
                  });
                },
              });
            }
            setConfirmArchive(false);
          }}
          title='Xóa nhóm này khỏi báo cáo hằng ngày?'
          description='Nhóm sẽ biến mất khỏi danh sách báo cáo và không bật lại được — muốn dùng lại phải tạo cấu hình mới. Các bản đã nộp không mất: chúng chuyển sang chế độ chỉ đọc và được giữ 12 tháng. Nhóm công việc vẫn không bị xóa.'
          confirmText='Xóa nhóm'
          cancelText='Hủy'
          variant='destructive'
          isLoading={removeScope.isPending}
        />
      </div>
    );
  }

  /**
   * Công tắc = tạm dừng/bật lại (`isEnabled`), KHÔNG phải lưu trữ. Trước đây
   * tắt công tắc gọi thẳng DELETE — thao tác đó chuyển mọi bản báo cáo sang
   * `ARCHIVED` và không đảo ngược được. Lưu trữ giờ là nút riêng có xác nhận.
   */
  const toggle = (on: boolean) => {
    setOptimisticOn(on);
    // Đã có hàng cấu hình — kể cả đang tạm dừng — thì PATCH. Chỉ POST khi nhóm
    // thật sự chưa có scope nào. Trước đây `/my` giấu scope đang tắt nên nhánh
    // này luôn rơi vào POST, và POST đụng chốt chặn trùng của server → 409, công
    // tắc chết một chiều. Server đã trả cả scope tắt, giữ đúng thứ tự này.
    if (scope) {
      updateScope.mutate(
        { scopeId: scope.id, payload: { isEnabled: on } },
        { onError: () => setOptimisticOn(null) },
      );
      return;
    }
    if (on) {
      createScope.mutate(
        { scopeType: 'assign_group', assignGroupId: groupId },
        { onError: () => setOptimisticOn(null) },
      );
    }
  };

  const isOn = optimisticOn ?? serverOn;

  /* Lịch THẬT của nhóm, đọc từ scope. Hằng số chỉ là lưới an toàn cho ca nhãn
     server hỏng — thà hiện mặc định của server còn hơn hiện `NaN:NaN`. */
  const scopeCutoff = scope?.hardStopMinute ?? REPORT_CUTOFF_MINUTE;
  const scopeRemind =
    parseMinuteOfDay(scope?.reminderLabel) ??
    scopeCutoff - DEFAULT_REMINDER_BEFORE_MINUTES;
  const scopeSummary =
    parseMinuteOfDay(scope?.leaderSummaryLabel) ??
    DEFAULT_LEADER_SUMMARY_MINUTE;

  return (
    <div className='rounded-md border border-ws-line'>
      <ConfigHeaderRow
        questionCount={questions.length}
        right={
          <Switch
            checked={isOn}
            disabled={
              isBusy || isFirstLoad || (scope ? !scope.isManager : false)
            }
            onCheckedChange={toggle}
            aria-label='Bật báo cáo hằng ngày cho nhóm'
            className={FOCUS_RING}
          />
        }
      />

      {/* Lần tải đầu: KHUNG XƯƠNG, không phải con quay thay chỗ cả khối. Danh
          sách scope từng mất ~3 giây (server gọi N+1); suốt lúc đó người dùng
          không thấy công tắc lẫn cấu hình, nên tưởng tính năng bị gỡ. */}
      {isFirstLoad && (
        <div aria-busy='true' className='space-y-2 border-t border-ws-line p-3'>
          <span className='sr-only'>Đang tải cấu hình báo cáo của nhóm…</span>
          {[0, 1, 2, 3].map((i) => (
            <ConfigRowSkeleton key={i} />
          ))}
        </div>
      )}

      {isOn && scope && (
        <div className='space-y-3 border-t border-ws-line p-3'>
          {/* Bốn mốc giờ, hai mốc giữa nhóm tự đặt.
              Trước đây cả bốn chỉ là một câu chữ đọc từ nhãn server — server
              nhận được ba trường giờ mà giao diện thì chối, tức chiều ngược
              lại của cùng một lỗi. */}
          <DailyReportSchedule
            remindMinute={scopeRemind}
            summaryMinute={scopeSummary}
            cutoffMinute={scopeCutoff}
            generationLabel={scope.generationLabel}
            disabled={isBusy || !scope.isManager}
            onCommit={({ remindMinute, summaryMinute }) =>
              updateScope.mutate({
                scopeId: scope.id,
                payload: toSchedulePayload({
                  remindMinute,
                  summaryMinute,
                  cutoffMinute: scopeCutoff,
                }),
              })
            }
          />

          <WeekdayPicker
            value={scope.weekdays ?? []}
            disabled={isBusy || !scope.isManager}
            onChange={(next) =>
              updateScope.mutate({
                scopeId: scope.id,
                payload: { weekdays: next },
              })
            }
            questionLabels={questions.map((q) => q.label)}
            generationLabel={scope.generationLabel}
          />

          {/* Hai cài đặt DUYỆT đứng chung MỘT khối có viền, hai hàng ngăn bằng
              đường kẻ (18/09/2026): "ai duyệt" (Bộ phận) và "duyệt trong bao
              lâu" (Thời hạn duyệt) là một cặp, để rời nhau thì mỗi mục trôi
              giữa các mục khác của hộp thoại.
              Chia nhóm duyệt có trang riêng `/daily-reports/<nhóm>/review-groups`
              (dải "Bộ phận"); ở đây chỉ một hàng + đường dẫn. Là `Link` thật
              chứ không phải nút gọi router: điều hướng sang route khác làm hộp
              thoại này tự rã theo, và người dùng mở được tab mới. */}
          <div className='divide-y divide-ws-line rounded-ws-block border border-ws-line bg-ws-surface'>
            {scope.isManager && (
              <div className='px-3 py-2.5'>
                <SettingRow
                  label='Bộ phận'
                  hint={
                    <InfoHint label='Giải thích về bộ phận và người duyệt'>
                      Bạn duyệt được toàn bộ thành viên. Người duyệt phụ chỉ
                      xem, nhận thông báo và xử lý báo cáo của những thành viên
                      được giao.
                    </InfoHint>
                  }
                >
                  <Link
                    href={`/daily-reports/${encodeURIComponent(scope.id)}/review-groups`}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-ws-control border border-ws-line bg-ws-surface px-3 text-xs font-semibold text-ws-ink-soft hover:bg-ws-surface-alt hover:text-ws-ink',
                      FOCUS_RING,
                    )}
                  >
                    <UserCog className='h-3.5 w-3.5' aria-hidden='true' />
                    Mở trang Bộ phận
                  </Link>
                </SettingRow>
              </div>
            )}
            <div className='px-3 py-2.5'>
              <ReviewWindowField
                value={scope.reviewWindowDays ?? 3}
                disabled={isBusy || !scope.isManager}
                onCommit={(next) =>
                  updateScope.mutate({
                    scopeId: scope.id,
                    payload: { reviewWindowDays: next },
                  })
                }
              />
            </div>
          </div>

          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <p className='text-xs font-medium text-ws-ink-soft'>
                Bộ câu hỏi
                {template ? ` · ${template.name}` : ''}
              </p>
              <InfoHint label='Câu có ổ khóa là gì'>
                Câu có ổ khóa là câu bắt buộc của công ty, không sửa hay xóa
                được.
              </InfoHint>
            </div>
            {questions.length === 0 ? (
              /* Khung xương bốn dòng thay cho một câu chữ: bộ câu hỏi luôn có
                 vài dòng, nên chỗ trống phải giữ đúng chiều cao ấy — thay chữ
                 bằng danh sách thật là cả khối bên dưới nhảy một nhịp. */
              <div aria-busy='true' className='space-y-1'>
                <span className='sr-only'>Đang tải bộ câu hỏi…</span>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className='h-4 w-full rounded-ws-bar bg-ws-surface-sunken'
                  />
                ))}
              </div>
            ) : (
              <ul className='space-y-0.5'>
                {questions.map((q) => (
                  <li
                    key={q.id}
                    className='flex items-center gap-1.5 text-xs text-ws-ink-soft'
                  >
                    <span className='tabular-nums'>{q.sortOrder}.</span>
                    <span className='min-w-0 flex-1 truncate'>{q.label}</span>
                    {q.isCore && (
                      <Lock className='h-3 w-3 shrink-0 text-ws-ink-ghost' />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {scope.isManager && (
            <div className='border-t border-ws-line pt-3'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-1'>
                  <p className='text-xs font-medium text-ws-ink-soft'>
                    Tạo báo cáo hôm nay
                  </p>
                  <InfoHint label='Tạo báo cáo hôm nay làm gì'>
                    Tạo bản báo cáo hôm nay cho tất cả thành viên chưa có bản.
                    Bấm xong sẽ hiện danh sách để xác nhận trước khi tạo.
                  </InfoHint>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className={cn('shrink-0', FOCUS_RING)}
                  disabled={isBusy}
                  onClick={() => setGenerateDialogOpen(true)}
                >
                  <FilePlus2 className='h-3.5 w-3.5' />
                  Tạo ngay
                </Button>
              </div>
              <DailyReportGenerationDialog
                open={generateDialogOpen}
                onOpenChange={setGenerateDialogOpen}
                preview={generationPreview.data}
                isLoading={generationPreview.isLoading}
                isError={generationPreview.isError}
                isGenerating={generateToday.isPending}
                onConfirm={() => {
                  if (!scope) return;
                  generateToday.mutate(scope.id, {
                    onSuccess: () => setGenerateDialogOpen(false),
                  });
                }}
              />
            </div>
          )}

          {scope.isManager && (
            <div className='border-t border-ws-line pt-3'>
              {/* Nhãn nói "Xóa nhóm" vì đó là điều người dùng THẤY: nhóm biến
                  mất khỏi màn Báo cáo và không dựng lại được. Hành vi bên dưới
                  vẫn là archive (`removeScope` → `ARCHIVED`), không đổi một
                  dòng — các bản cũ vẫn còn ở chế độ chỉ đọc, và câu mô tả dưới
                  đây phải nói thẳng điều đó, không được để người dùng tưởng dữ
                  liệu đã bị xoá sạch. */}
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  disabled={isBusy}
                  onClick={() => setConfirmArchive(true)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-ws-chip py-1 text-xs text-ws-danger hover:underline disabled:opacity-50',
                    FOCUS_RING,
                  )}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  Xóa nhóm khỏi báo cáo
                </button>
                {/* Câu hệ quả vào chú giải: bấm nút là hiện hộp xác nhận nói đủ
                    hệ quả trước khi làm, nên không cần đứng thường trực. */}
                <InfoHint label='Xóa nhóm khỏi báo cáo làm gì'>
                  Nhóm thôi báo cáo hằng ngày. Các bản cũ vẫn còn ở chế độ chỉ
                  đọc.
                </InfoHint>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => {
          if (scope) removeScope.mutate(scope.id);
          setConfirmArchive(false);
        }}
        title='Xóa nhóm này khỏi báo cáo hằng ngày?'
        description='Nhóm sẽ biến mất khỏi danh sách báo cáo và không bật lại được — muốn dùng lại phải tạo cấu hình mới. Các bản đã nộp không mất: chúng chuyển sang chế độ chỉ đọc và được giữ 12 tháng. Nếu chỉ muốn tạm dừng, hãy tắt công tắc.'
        confirmText='Xóa nhóm'
        cancelText='Hủy'
        variant='destructive'
        isLoading={removeScope.isPending}
      />
    </div>
  );
}

/**
 * Vì sao `canGenerate = false` — từ điển RIÊNG của `generate-today/preview`,
 * không được ánh xạ chéo với `emptyReason` (docs 11 mục 3).
 *
 * Là HÀM chứ không phải `Record` vì hai câu trong đây có mốc giờ, và mốc đó
 * phải là `preview.generationLabel` của chính nhóm này. Bản trước viết thẳng
 * '07:30' vào chuỗi: nhóm nào cũng đọc ra 07:30 kể cả khi server nói khác, và
 * nếu server ngừng trả nhãn thì chẳng ai biết.
 *
 * Thiếu nhãn thì bỏ hẳn mốc giờ khỏi câu — một mốc bịa ra tệ hơn một câu chung.
 */
function generationBlockedLabel(
  reason: string,
  generationLabel?: string | null,
): string {
  const at = generationLabel || null;
  switch (reason) {
    case 'SCOPE_DISABLED':
      return 'Báo cáo hằng ngày đang tạm dừng.';
    case 'SCOPE_ARCHIVED':
      return 'Cấu hình này đã được lưu trữ.';
    case 'NON_REPORTING_DAY':
      return 'Hôm nay không nằm trong ngày báo cáo của nhóm.';
    case 'BEFORE_GENERATION_TIME':
      return at
        ? `Chưa đến ${at}. Bạn có thể kiểm tra trước; nút xác nhận sẽ mở sau mốc này.`
        : 'Chưa đến giờ mở báo cáo của nhóm. Bạn có thể kiểm tra trước; nút xác nhận sẽ mở sau mốc này.';
    case 'PAST_HARD_STOP':
      return 'Đã quá giờ khóa báo cáo hôm nay.';
    case 'NO_TEMPLATE':
      return 'Nhóm chưa có phiên bản bộ câu hỏi để tạo báo cáo.';
    case 'EMPTY_SNAPSHOT':
      return at
        ? `Không có thành viên trong snapshot ${at}.`
        : 'Không có thành viên trong snapshot đầu ngày.';
    default:
      return 'Chưa thể tạo báo cáo hôm nay.';
  }
}

function reportStatusLabel(status: DailyReportStatus | null): string {
  if (status === null) return 'Chưa có bản';
  if (status === 'SUBMITTED') return 'Đã nộp';
  if (status === 'REOPENED') return 'Đã mở lại';
  if (status === 'ARCHIVED') return 'Đã lưu trữ';
  return 'Nháp';
}

function DailyReportGenerationDialog({
  open,
  onOpenChange,
  preview,
  isLoading,
  isError,
  isGenerating,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: DailyReportGenerationPreview;
  isLoading: boolean;
  isError: boolean;
  isGenerating: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentWithoutCloseButton className='ws-scope max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Tạo báo cáo hôm nay</DialogTitle>
          <DialogDescription>
            Xem trước có bao nhiêu bản báo cáo sẽ được tạo trước khi tạo
          </DialogDescription>
        </DialogHeader>

        {/* Khung xương dựng theo ĐÚNG bố cục của kết quả: ba ô số rồi danh sách
            thành viên. Con quay giữa hộp thoại không nói được điều đó, và khi
            dữ liệu về thì cả hộp thoại đổi chiều cao một nhịp. */}
        {isLoading && (
          <div aria-busy='true' className='space-y-4'>
            <span className='sr-only'>Đang kiểm tra nhanh…</span>
            <div className='grid grid-cols-3 gap-2'>
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className='h-17 rounded-ws-block bg-ws-surface-sunken'
                />
              ))}
            </div>
            <div className='space-y-2'>
              <Skeleton className='h-3 w-40 rounded-ws-bar bg-ws-surface-sunken' />
              <Skeleton className='h-24 w-full rounded-ws-block bg-ws-surface-sunken' />
            </div>
          </div>
        )}

        {!isLoading && isError && (
          <p className='rounded-md border border-ws-danger/30 bg-ws-danger/5 p-3 text-sm text-ws-danger'>
            Chưa tải được thông tin preview. Hãy đóng hộp thoại và thử lại.
          </p>
        )}

        {!isLoading && !isError && preview && (
          <div className='space-y-4'>
            <div className='grid grid-cols-3 gap-2'>
              <GenerationStat
                label='Bản báo cáo'
                value={preview.counts.snapshotMembers}
              />
              <GenerationStat
                label='Đã có'
                value={preview.counts.existingReports}
              />
              <GenerationStat
                label='Sẽ tạo thêm'
                value={preview.counts.toCreate}
              />
            </div>

            {preview.blockedReason && (
              <p className='rounded-md border border-ws-line bg-ws-surface-alt p-3 text-xs leading-relaxed text-ws-ink-soft'>
                {generationBlockedLabel(
                  preview.blockedReason,
                  preview.generationLabel,
                )}
              </p>
            )}

            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-xs font-medium text-ws-ink-soft'>
                  Thành viên sẽ nhận báo cáo
                </p>
                <span className='text-[11px] text-ws-ink-faint'>
                  {preview.generationLabel} · khóa {preview.hardStopLabel}
                </span>
              </div>
              <ul className='max-h-48 divide-y divide-ws-line overflow-y-auto rounded-md border border-ws-line'>
                {preview.includedMembers.length === 0 ? (
                  <li className='p-3 text-xs text-ws-ink-faint'>
                    Chưa có thành viên.
                  </li>
                ) : (
                  preview.includedMembers.map((member) => (
                    <li
                      key={member.id}
                      className='flex items-center justify-between gap-3 px-3 py-2'
                    >
                      <span className='min-w-0 truncate text-xs text-ws-ink'>
                        {member.fullName}
                      </span>
                      <span className='shrink-0 text-[11px] text-ws-ink-faint'>
                        {reportStatusLabel(member.reportStatus)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {preview.excludedMembers.length > 0 && (
              <div className='space-y-1'>
                <p className='text-xs font-medium text-ws-ink-soft'>
                  Không nằm trong snapshot
                </p>
                <p className='text-[11px] leading-relaxed text-ws-ink-faint'>
                  {preview.excludedMembers
                    .map((member) => member.fullName)
                    .join(' · ')}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            className={FOCUS_RING}
            disabled={isGenerating}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type='button'
            className={FOCUS_RING}
            disabled={!preview?.canGenerate || isGenerating}
            onClick={onConfirm}
          >
            {isGenerating && <Loader2 className='animate-spin' />}
            {isGenerating ? 'Đang tạo…' : 'Xác nhận tạo'}
          </Button>
        </DialogFooter>
      </DialogContentWithoutCloseButton>
    </Dialog>
  );
}

function GenerationStat({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-md border border-ws-line bg-ws-surface-alt p-2.5'>
      <p className='text-lg font-semibold tabular-nums text-ws-ink'>{value}</p>
      <p className='text-[11px] text-ws-ink-faint'>{label}</p>
    </div>
  );
}

/**
 * Hàng tiêu đề của khối — giống hệt ở cả hai chế độ, chỉ khác thứ nằm bên phải.
 * Người dùng phải thấy đúng một khối "Báo cáo hằng ngày", dù đang tạo hay đang sửa.
 */
function ConfigHeaderRow({
  right,
  questionCount = 0,
}: {
  right: React.ReactNode;
  /**
   * Số câu của bộ câu hỏi nhóm đang dùng. 0 = chưa biết (nhóm mới, hoặc bộ câu
   * chưa tải) - khi đó câu phụ nói chung chung chứ không đoán một con số. Bản
   * cũ viết cứng "4 câu hỏi" trong khi nhóm dùng được bộ câu riêng.
   */
  questionCount?: number;
}) {
  return (
    <div className='flex items-center justify-between gap-3 p-3'>
      <div className='flex min-w-0 items-start gap-2'>
        <ClipboardList className='mt-0.5 h-4 w-4 shrink-0 text-ws-ink-soft' />
        <div className='flex min-w-0 items-center gap-1'>
          <p className='text-sm font-medium text-ws-ink'>Báo cáo hằng ngày</p>
          <InfoHint label='Báo cáo hằng ngày là gì'>
            {questionCount > 0
              ? `Mỗi thành viên trả lời ${questionCount} câu hỏi vào mỗi ngày báo cáo.`
              : 'Mỗi thành viên trả lời bộ câu hỏi của nhóm vào mỗi ngày báo cáo.'}
          </InfoHint>
        </div>
      </div>
      {right}
    </div>
  );
}

/**
 * Chọn ngày báo cáo trong tuần. Dùng chung cho hai chế độ:
 * - sửa nhóm: mỗi lần bấm gọi thẳng `PATCH`;
 * - tạo nhóm: ghi vào state của form, gửi kèm khi tạo scope.
 *
 * Tách ra để hai chế độ không trôi dạt khỏi nhau — chép đôi khối này là cách chắc
 * chắn nhất để một bên có Chủ nhật còn bên kia thì không.
 */
function WeekdayPicker({
  value,
  disabled,
  onChange,
  questionLabels = [],
  generationLabel,
}: {
  value: number[];
  disabled?: boolean;
  onChange: (next: number[]) => void;
  /**
   * Nhãn các câu hỏi của bộ đang dùng — để phần giới thiệu nói ĐÚNG bản mà nhóm
   * này sẽ nhận, không phải một danh sách cứng. Rỗng khi nhóm chưa có scope
   * (chưa biết bộ câu hỏi nào) — lúc đó chỉ nói chung.
   */
  questionLabels?: string[];
  /**
   * Giờ sinh của nhóm, `'HH:mm'` từ `scope.generationLabel`. Thiếu (nhóm chưa
   * có scope) mới rơi về hằng số dự phòng.
   */
  generationLabel?: string | null;
}) {
  const generationAt =
    generationLabel || formatMinuteOfDay(REPORT_GENERATE_MINUTE);

  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-1'>
        <p className='text-xs font-medium text-ws-ink-soft'>Ngày báo cáo</p>
        {/* Người dùng không đoán được "ngày báo cáo" nghĩa là ngày SINH bản
            báo cáo, nên khối này phải tự giới thiệu. Dùng `InfoHint` như mọi
            dấu hỏi khác trong hộp thoại (18/09/2026): trước đây là Popover
            riêng với icon "?" khác kiểu, vì chú giải cũ không mở được bằng
            ngón tay - nay `InfoHint` mở được cả bằng chạm. */}
        <InfoHint label='Ngày báo cáo nghĩa là gì'>
          <span className='block space-y-1'>
            <span className='block'>
              Ngày được chọn là ngày hệ thống tự mở một bản báo cáo mới lúc{' '}
              {generationAt} cho từng người trong nhóm. Ngày không chọn thì
              không tạo bản nào và không tính vào tỷ lệ nộp.
            </span>
            {questionLabels.length > 0 && (
              <span className='block'>
                Mỗi bản gồm {questionLabels.length} câu:{' '}
                {questionLabels.join(' · ')}.
              </span>
            )}
            <span className='block text-ws-ink-soft'>
              Đổi ngày không đụng tới các bản đã sinh trước đó.
            </span>
          </span>
        </InfoHint>
      </div>
      {/* Khuôn "segmented": track chìm bọc ngoài, ngày ĐANG BẬT nổi lên.
          Nền trắng của bản trước quá nhẹ — trên track `ws-surface-sunken` nó
          chỉ chênh vài phần trăm độ sáng, nên không đọc được ngay ngày nào
          đang bật. Dùng `ws-accent` (xanh thương hiệu) thay vì `ws-solid`:
          vẫn tương phản mạnh nhưng không biến bảy ô thành một mảng đen, và
          xanh ở đây trùng nghĩa "đang bật" với công tắc phía trên. */}
      <div className='inline-flex flex-wrap items-center gap-0.5 rounded-ws-control border border-ws-line bg-ws-surface-sunken p-0.5'>
        {WEEKDAY_LABELS.map((d) => {
          const active = value.includes(d.value);
          return (
            <button
              key={d.value}
              type='button'
              disabled={disabled}
              aria-pressed={active}
              onClick={() => {
                const next = active
                  ? value.filter((w) => w !== d.value)
                  : [...value, d.value].sort((a, b) => a - b);
                // Ít nhất một ngày — tắt hết thì không còn nghĩa gì, và BE trả 422.
                if (next.length === 0) return;
                onChange(next);
              }}
              className={cn(
                'h-7 w-8 rounded-ws-chip text-[11px] transition-colors disabled:opacity-50',
                // Khe hở lấy màu TRACK (`ws-surface-sunken`) chứ không phải nền
                // popup: bảy ô nằm trên track, offset sai màu là vòng focus bị
                // một vệt sáng cắt ngang.
                FOCUS_RING,
                'focus-visible:ring-offset-ws-surface-sunken',
                active
                  ? 'bg-ws-accent font-semibold text-ws-solid-ink shadow-ws-rest'
                  : 'text-ws-ink-soft hover:bg-ws-surface hover:text-ws-ink',
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Ô "Thời hạn duyệt: [N] ngày làm việc".
 *
 * Hai câu chú thích dưới ô KHÔNG phải trang trí:
 *   · đổi giá trị chỉ áp cho lần nộp SAU đó, vì hạn của mỗi lần nộp đã chốt
 *     cứng ngay lúc submit — không nói thì người quản lý sửa số rồi tưởng đã
 *     gia hạn cho những báo cáo sắp hết hạn;
 *   · `1` nghĩa là cửa sổ đóng ngay cuối ngày nộp, nên KHÔNG có ngày nhắc nào.
 */
function ReviewWindowField({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (next: number) => void;
}) {
  const [nhap, datNhap] = useState(String(value));

  /*
   * Đồng bộ ô nhập khi máy chủ trả về giá trị khác — làm NGAY TRONG LÚC VẼ, chứ
   * không phải trong `useEffect`: effect chạy sau lượt vẽ đầu nên ô sẽ nháy một
   * nhịp giá trị cũ, và React cũng cảnh báo cascading render.
   *
   * Hạt giống của bộ theo dõi phải khớp thứ đang được đồng bộ VÀO. `nhap` khởi
   * tạo từ chính `value`, nên seed bằng `value` là đúng; seed rỗng thì lượt vẽ
   * đầu sẽ ghi đè lên chữ người dùng chưa kịp lưu.
   */
  const [valueTruoc, datValueTruoc] = useState(value);
  if (value !== valueTruoc) {
    datValueTruoc(value);
    datNhap(String(value));
  }

  const luu = () => {
    const so = Number(nhap);
    if (!Number.isInteger(so) || so < 1 || so > 30) {
      datNhap(String(value));
      return;
    }
    if (so !== value) onCommit(so);
  };

  return (
    <div className='space-y-1'>
      {/* Cùng khuôn hàng cài đặt với "Bộ phận": nhãn trái, ô nhập phải, MỘT
          dòng (UAT 18/09/2026). Hai câu định nghĩa vào chú giải. Câu "Với 1
          ngày…" bên dưới thì KHÔNG: nó chỉ hiện đúng lúc người dùng vừa chọn
          giá trị đó, và nó nói hệ quả của chính lựa chọn đang gõ. */}
      <SettingRow
        label='Thời hạn duyệt'
        htmlFor='so-ngay-duyet'
        hint={
          <InfoHint label='Cách tính thời hạn duyệt'>
            Tính cả ngày nộp. Đổi giá trị chỉ áp dụng cho báo cáo nộp sau đó,
            không dịch hạn của những bản đang chờ duyệt.
          </InfoHint>
        }
      >
        {/* Ô chỉ cần chứa 1-30 (hai chữ số): hẹp lại để cả hàng vừa một dòng
            trong khối Duyệt ở 375px (hàng 267px; bản rộng 64px cần 280px). */}
        <span className='flex items-center gap-1.5'>
          <Input
            id='so-ngay-duyet'
            type='number'
            min={1}
            max={30}
            value={nhap}
            disabled={disabled}
            onChange={(e) => datNhap(e.target.value)}
            onBlur={luu}
            className='h-9 w-12 px-1 text-center shadow-none'
          />
          <span className='text-xs text-ws-ink-soft'>ngày làm việc</span>
        </span>
      </SettingRow>
      {Number(nhap) === 1 && (
        <p className='text-xs text-ws-ink-faint'>
          Với 1 ngày, cửa sổ đóng ngay cuối ngày nộp nên sẽ không có lượt nhắc
          người duyệt nào.
        </p>
      )}
    </div>
  );
}

/**
 * Một hàng cài đặt: nhãn (+ dấu hỏi) bên trái, điều khiển bên phải, MỘT dòng.
 * Khổ hẹp không đủ chỗ thì điều khiển rớt xuống dòng dưới, canh trái.
 */
function SettingRow({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  /** Có thì nhãn là `<label>` nối vào ô nhập đó. */
  htmlFor?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelClass = 'text-xs font-medium text-ws-ink-soft';
  return (
    <div className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5'>
      <span className='flex min-w-0 items-center gap-1'>
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelClass}>
            {label}
          </label>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        {hint}
      </span>
      {children}
    </div>
  );
}
