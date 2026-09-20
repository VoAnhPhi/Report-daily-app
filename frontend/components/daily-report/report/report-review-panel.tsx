'use client';

import { useState, type ReactNode } from 'react';
import {
  ArrowRightCircle,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useCancelCarryOver,
  useReviewReport,
} from '@/hooks/queries/daily-report-queries';
import type {
  DailyReport,
  DailyReportReviewDecision,
  ReviewCarryCandidate,
  ReviewCarryOverInput,
} from '@/types/daily-report.type';

import { formatDateVi } from '../utils/date';
import { InfoHint } from '../shared/info-hint';
import { FOCUS_RING_SURFACE as FOCUS_RING } from '../utils/classes';
import {
  CARRY_LONG_CHAIN_WARNING,
  carryItemLabel,
  REVIEW_DECISION_LABEL_VI,
} from '../utils/labels';

/**
 * Khối ra quyết định của người duyệt trên MỘT lần nộp.
 *
 * ⚠ KHÔNG tự suy quyền ở client. Khối này chỉ hiện khi `review.canReview`: cờ
 * đó do server dựng và đã gộp đủ sáu điều kiện - quyền trên đúng thành viên
 * này, không phải bản của chính mình, bản đang ở trạng thái đã nộp, có lần nộp
 * để duyệt, chưa ai kết luận, và còn trong cửa sổ duyệt. Tự tính lại từ vai trò
 * là chắc chắn lệch, và hậu quả là ba lựa chọn hiện trên bản mà API từ chối.
 *
 * Danh sách việc cũng vậy: `review.carryCandidates` do server dựng và xếp sẵn,
 * vì trạng thái công việc đổi được giữa lúc thành viên nộp và lúc người duyệt
 * mở ra đọc.
 *
 * Thứ tự trong khối, chốt sau UAT ngày 15/09/2026: chọn kết luận, rồi ngay dưới
 * là ô BẮT BUỘC của đúng kết luận đó (danh sách việc cần làm tiếp, hoặc lý do
 * trả lại), rồi nhận xét không bắt buộc, rồi nút gửi. Hạn duyệt không in lại ở
 * đây: dải trạng thái trên đầu bản đã có.
 */

/** Hiện sẵn dưới từng lựa chọn, để người duyệt đọc được trước khi chọn. */
const DECISION_HINT: Record<DailyReportReviewDecision, string> = {
  ACCEPTED: 'bản ổn, không cần làm gì thêm.',
  CONTINUED: 'bản ổn, nhưng giao việc làm tiếp ở ngày làm việc kế tiếp.',
  REJECTED: 'thành viên sửa chính bản này rồi nộp lại.',
};

/**
 * Icon và màu của từng kết luận. Theo luật màu của cụm Báo cáo: đạt mượn
 * `done`, làm tiếp mượn `progress` (còn một bước), trả lại dùng `ws-danger`.
 * Chuỗi viết nguyên văn để Tailwind sinh được CSS.
 */
const DECISION_TONE: Record<
  DailyReportReviewDecision,
  { icon: LucideIcon; text: string; on: string }
> = {
  ACCEPTED: {
    icon: CheckCircle2,
    text: 'text-ws-done-fg',
    on: 'border-ws-done-fg bg-ws-done-bg text-ws-done-fg',
  },
  CONTINUED: {
    icon: ArrowRightCircle,
    text: 'text-ws-progress-fg',
    on: 'border-ws-progress-fg bg-ws-progress-bg/50',
  },
  REJECTED: {
    icon: Undo2,
    text: 'text-ws-danger',
    on: 'border-ws-danger bg-ws-danger/10 text-ws-danger',
  },
};

/**
 * Câu phụ của ứng viên mà lượt duyệt trước đã chuyển đi. Phải nói rõ ngày
 * đích: xác nhận lại giữ nguyên ngày đã chốt, không dời sang ngày làm việc kế
 * tiếp của lúc duyệt.
 */
function cauDaChuyen(item: ReviewCarryCandidate): string | null {
  const dong = item.existingCarryOver;
  if (!dong) return null;
  return `Đã chuyển sang ${formatDateVi(dong.toReportDate)} ở lượt duyệt trước. Chọn để xác nhận lại.`;
}

/** Một dòng ứng viên: ô chọn, nhãn, và các câu trạng thái đi kèm. */
function DongUngVien({
  item,
  checked,
  disabled,
  onToggle,
  extra,
}: {
  item: ReviewCarryCandidate;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  extra?: ReactNode;
}) {
  const daChuyen = cauDaChuyen(item);
  return (
    <li
      className={cn(
        'flex items-start gap-2.5 rounded-ws-control border bg-ws-surface px-3 py-2.5',
        checked ? 'border-ws-progress-fg' : 'border-ws-line',
        !item.eligible && 'opacity-70',
      )}
    >
      {/* Góc bo của ô tick (`--radius-ws-check`), không dùng `rounded-sm` của
          component dùng chung: trong `ws-scope` giá trị đó là 8px trên hộp
          16px, tức một hình tròn, và đứng ngay dưới ba radio kết luận thì đọc
          thành "chỉ chọn một". Sửa ở cấp app vẫn là quyết định riêng (thiết kế
          20 mục 20.7). */}
      <Checkbox
        id={item.key}
        checked={checked}
        disabled={!item.eligible || disabled}
        onCheckedChange={onToggle}
        className='mt-0.5 rounded-[var(--radius-ws-check)]'
      />
      <label
        htmlFor={item.key}
        className='min-w-0 flex-1 cursor-pointer text-ws-body leading-snug text-ws-ink'
      >
        {carryItemLabel(item)}
        {item.carriedCount > 0 ? (
          <span className='ml-1.5 text-xs text-ws-ink-faint'>
            đã chuyển tiếp {item.carriedCount} lần
          </span>
        ) : null}
        {!item.eligible && item.ineligibleReason ? (
          <span className='ml-1.5 text-xs text-ws-danger'>
            {item.ineligibleReason}
          </span>
        ) : null}
        {daChuyen ? (
          <span className='block text-xs text-ws-done-fg'>{daChuyen}</span>
        ) : null}
        {/* `ws-danger`: bảng màu của repo dành màu này cho tín hiệu cần chú ý
            kiểu "quá hạn", và cấm mượn các token hổ phách của vai trò khác. */}
        {item.isLongChain ? (
          <span className='block text-xs text-ws-danger'>
            {CARRY_LONG_CHAIN_WARNING}
          </span>
        ) : null}
      </label>
      {extra}
    </li>
  );
}

/**
 * Nút huỷ một việc đã chuyển tiếp TỚI bản này: "việc này không cần làm nữa".
 * Huỷ mềm, và KHÔNG đảo kết luận của báo cáo nguồn.
 *
 * Ba điều kiện, thiếu một là không vẽ:
 *   · có dòng chuyển tiếp để huỷ (`continuesCarryOverId`);
 *   · server nói người này huỷ được (`canCancel`) - dòng do người khác tạo mà
 *     hiện nút thì bấm vào là ăn 403;
 *   · việc CHƯA được chuyển tiếp đi từ bản này (`existingCarryOver`). Huỷ mắt
 *     xích đã có mắt xích sau là để lại một chuỗi nối tiếp từ một dòng đã huỷ.
 */
function NutHuyChuyenTiep({
  item,
  disabled,
  onCancel,
}: {
  item: ReviewCarryCandidate;
  disabled: boolean;
  onCancel: (carryOverId: string) => void;
}) {
  const id = item.continuesCarryOverId;
  if (!id || !item.canCancel || item.existingCarryOver) return null;
  return (
    <Button
      type='button'
      size='sm'
      variant='ghost'
      /* 24px là dưới nửa sàn chạm 44px và nút này nằm sát chữ của dòng
         ngay bên cạnh, nên ở khổ điện thoại bấm rất dễ lệch. Từ `sm` trở lên
         giữ đúng 24px như cũ để không phá bố cục dòng. */
      className='min-h-11 w-11 shrink-0 p-0 sm:h-6 sm:w-6 sm:min-h-0'
      disabled={disabled}
      onClick={() => onCancel(id)}
      aria-label={`Huỷ chuyển tiếp ${carryItemLabel(item)}`}
      title='Việc này không cần làm nữa'
    >
      <X className='h-3.5 w-3.5' />
    </Button>
  );
}

export function ReportReviewPanel({ report }: { report: DailyReport }) {
  /*
   * `review` là bắt buộc trong kiểu, nhưng đọc phòng thủ ở đây là có lý do
   * thật: ngay sau khi triển khai, cache React Query trên máy người đang mở app
   * vẫn giữ bản báo cáo CŨ chưa có trường này. Không phòng thủ thì họ thấy màn
   * trắng cho tới khi tự tải lại trang.
   */
  const review = report.review as DailyReport['review'] | undefined;
  const { mutate: guiQuyetDinh, isPending } = useReviewReport();
  const { mutate: huyChuyenTiep, isPending: dangHuy } = useCancelCarryOver(
    report.id,
  );

  const [quyetDinh, datQuyetDinh] = useState<DailyReportReviewDecision | null>(
    null,
  );
  const [nhanXet, datNhanXet] = useState('');
  const [daChon, datDaChon] = useState<Set<string>>(new Set());
  const [viecGoTay, datViecGoTay] = useState('');
  const [moNhanXet, datMoNhanXet] = useState(false);

  if (!review?.canReview) return null;

  // Server đã xếp sẵn: việc đang chuyển tiếp tới bản này, việc gắn trong bản,
  // rồi việc lượt duyệt trước đã chuyển đi.
  const ungVien = review.carryCandidates;
  const dangChonTiepTuc = quyetDinh === 'CONTINUED';
  const dangChonTraLai = quyetDinh === 'REJECTED';
  /*
   * Chỉ tính những lựa chọn CÒN HỢP LỆ. `daChon` giữ khoá theo lượt bấm, còn
   * danh sách ứng viên thì đổi theo mỗi lần tải lại (việc vừa bị xoá, vừa hoàn
   * thành ở chỗ khác). Đếm thẳng `daChon.size` là nút Gửi vẫn sáng với một lựa
   * chọn đã mất, và server trả 422 vì CONTINUED không còn việc nào.
   */
  const daChonHieuLuc = ungVien.filter(
    (item) => item.eligible && daChon.has(item.key),
  );
  const coViecDuocChon =
    daChonHieuLuc.length > 0 || viecGoTay.trim().length > 0;

  /*
   * Điều kiện gửi, cố ý bám ĐÚNG luật server để nút không mời người dùng bấm
   * vào một yêu cầu chắc chắn bị từ chối:
   *   · CONTINUED phải có ít nhất một việc - chọn từ danh sách hoặc ghi thêm;
   *   · REJECTED phải có lý do.
   */
  const guiDuoc =
    quyetDinh !== null &&
    !isPending &&
    (!dangChonTiepTuc || coViecDuocChon) &&
    (!dangChonTraLai || nhanXet.trim().length > 0);

  const doiChon = (key: string) => {
    datDaChon((truoc) => {
      const sau = new Set(truoc);
      if (sau.has(key)) sau.delete(key);
      else sau.add(key);
      return sau;
    });
  };

  const dungPayloadCarry = (): ReviewCarryOverInput[] => {
    const dong: ReviewCarryOverInput[] = [];
    for (const item of daChonHieuLuc) {
      /*
       * Việc gõ tay mà lượt duyệt trước đã chuyển đi thì xác nhận lại đích
       * danh. Hai loại còn lại gửi như cũ: server tự nhận ra va chạm với dòng
       * đã chuyển đi và xác nhận lại dòng đó thay vì tạo dòng thứ hai.
       */
      if (item.kind === 'outgoing' && item.existingCarryOver) {
        dong.push({ confirmCarryOverId: item.existingCarryOver.id });
        continue;
      }
      /*
       * Dòng đã chuyển tiếp thì gửi `continuesCarryOverId` để chuỗi NỐI TIẾP.
       * Gửi lại `note` như một việc mới sẽ mở chuỗi khác, và con số "đã chuyển
       * tiếp N lần" đứng yên ở 1 mãi mãi.
       */
      if (item.continuesCarryOverId) {
        dong.push({ continuesCarryOverId: item.continuesCarryOverId });
      } else if (item.taskId) {
        dong.push({ taskId: item.taskId });
      }
    }
    const goTay = viecGoTay.trim();
    if (goTay.length > 0) dong.push({ note: goTay });
    return dong;
  };

  const gui = () => {
    if (!quyetDinh || !guiDuoc) return;
    guiQuyetDinh({
      reportId: report.id,
      payload: {
        decision: quyetDinh,
        ...(nhanXet.trim() ? { comment: nhanXet.trim() } : {}),
        ...(dangChonTiepTuc ? { carryOvers: dungPayloadCarry() } : {}),
      },
    });
  };

  const nhanXetId = 'nhan-xet-duyet';
  const huy = () => {
    datQuyetDinh(null);
    datMoNhanXet(false);
  };

  /* Tên nút gửi nói ĐÚNG việc sắp làm. "Gửi kết luận" giữ cho nhánh làm tiếp
     vì đó là kết luận có kèm danh sách việc. */
  const nhanNutGui =
    quyetDinh === 'ACCEPTED'
      ? 'Xác nhận đạt'
      : quyetDinh === 'REJECTED'
        ? 'Gửi chưa đạt'
        : 'Gửi kết luận';

  /* MỘT câu nhắc, chỉ khi nút gửi đang tắt vì thiếu việc. Nhánh "Chưa đạt"
     đã có dấu * và placeholder nói cùng ý - in thêm là trùng chữ. */
  const lyDoChuaGui =
    dangChonTiepTuc && !coViecDuocChon
      ? 'Chọn ít nhất một việc, hoặc ghi việc khác.'
      : null;

  /** Một nút quyết định lớn. Là `radio` thật (Radix), nên phím mũi tên và
   *  trình đọc màn hình hiểu đây là "chọn một trong nhiều". */
  const nutQuyetDinh = (gt: DailyReportReviewDecision) => {
    const tone = DECISION_TONE[gt];
    const Icon = tone.icon;
    const isOn = quyetDinh === gt;
    return (
      <RadioGroupPrimitive.Item
        value={gt}
        aria-describedby={`ket-luan-mo-ta-${gt}`}
        className={cn(
          /* Cỡ nút thường (44px ở điện thoại, 40px từ `sm`), viền 1px: bản
             56px viền 2px chữ 19px trông như hai khối quảng cáo (UAT
             17/09/2026). */
          'flex h-11 items-center justify-center gap-1.5 rounded-ws-control border px-3 text-ws-cell font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-10',
          isOn
            ? tone.on
            : 'border-ws-line bg-ws-surface text-ws-ink hover:border-ws-line-strong hover:bg-ws-surface-alt',
          FOCUS_RING,
        )}
      >
        <Icon
          aria-hidden='true'
          className={cn('h-4 w-4 shrink-0', tone.text)}
        />
        {/* Nút "Tiếp tục" mang nhãn ĐẦY ĐỦ (yêu cầu 17/09/2026): một mình
            "Tiếp tục thực hiện" không nói tiếp tục cái gì. Badge ở nơi khác
            vẫn dùng nhãn ngắn của `REVIEW_DECISION_LABEL_VI`. */}
        {gt === 'CONTINUED'
          ? 'Yêu cầu tiếp tục thực hiện'
          : REVIEW_DECISION_LABEL_VI[gt]}
      </RadioGroupPrimitive.Item>
    );
  };

  return (
    /* `id` nằm trên CHÍNH section vì dải trạng thái trên đầu bản có link
       `#khoi-duyet-bao-cao` nhảy xuống đây; `scroll-mt` để khối không chui dưới
       thanh Navbar cố định khi nhảy tới. */
    <section
      id='khoi-duyet-bao-cao'
      aria-labelledby='khoi-duyet-bao-cao-tieu-de'
      className='scroll-mt-[calc(var(--ws-sticky-top,0px)+0.75rem)] rounded-ws-card border border-ws-line bg-ws-surface p-4'
    >
      <h3
        id='khoi-duyet-bao-cao-tieu-de'
        className='flex items-center gap-1 text-ws-body font-semibold text-ws-ink'
      >
        Kết luận của người duyệt
        <InfoHint label='Ba kết luận khác nhau thế nào'>
          Đạt: {DECISION_HINT.ACCEPTED} Chưa đạt: {DECISION_HINT.REJECTED}{' '}
          Yêu cầu tiếp tục thực hiện: {DECISION_HINT.CONTINUED}
        </InfoHint>
      </h3>
      {/* Mô tả của hai nút lớn, cho trình đọc màn hình (nối qua
          `aria-describedby`); nằm NGOÀI nút để không bị đọc hai lần. */}
      <span id='ket-luan-mo-ta-ACCEPTED' className='sr-only'>
        {DECISION_HINT.ACCEPTED}
      </span>
      <span id='ket-luan-mo-ta-REJECTED' className='sr-only'>
        {DECISION_HINT.REJECTED}
      </span>
      <span id='ket-luan-mo-ta-CONTINUED' className='sr-only'>
        {DECISION_HINT.CONTINUED}
      </span>

      {/* BA lựa chọn, MỘT khuôn, chia đều bề ngang khối (18/09/2026). Bản
          trước để hai nút trong `max-w-md` rồi treo lựa chọn thứ ba thành một
          liên kết nhỏ lệch trái: khối rộng 760px mà nội dung dồn về nửa trái,
          đọc ra như một khối chưa vẽ xong ("mất cân đối").
          Thứ tự giữ nguyên: Đạt, Chưa đạt, rồi Tiếp tục. */}
      <RadioGroupPrimitive.Root
        value={quyetDinh ?? ''}
        onValueChange={(value) =>
          datQuyetDinh(value as DailyReportReviewDecision)
        }
        disabled={isPending}
        aria-labelledby='khoi-duyet-bao-cao-tieu-de'
        className='mt-3 grid gap-2 sm:grid-cols-3'
      >
        {nutQuyetDinh('ACCEPTED')}
        {nutQuyetDinh('REJECTED')}
        {nutQuyetDinh('CONTINUED')}
      </RadioGroupPrimitive.Root>

      {quyetDinh !== null && (
        /* Phần nhập mở ngay dưới lựa chọn, trong một khung nền nhạt nối liền:
           người duyệt thấy rõ mình đang điền cho quyết định nào. */
        <div className='mt-2 space-y-3 rounded-ws-block bg-ws-surface-alt p-3'>
          {dangChonTiepTuc && (
            <fieldset className='space-y-2'>
              <legend className='flex items-center gap-1 text-ws-cell font-semibold text-ws-ink'>
                Việc cần làm tiếp
                <InfoHint label='Việc cần làm tiếp dùng để làm gì'>
                  Việc được chọn sẽ hiện trong bản của ngày làm việc kế tiếp.
                </InfoHint>
              </legend>
              {/*
                Dòng ĐÃ CHUYỂN TIẾP đứng TRƯỚC ô ghi việc khác, cố ý: ghi lại
                một nội dung tương tự thay vì chọn tiếp dòng cũ là mở chuỗi mới.
              */}
              {ungVien.length > 0 && (
                <ul className='space-y-1.5'>
                  {ungVien.map((item) => (
                    <DongUngVien
                      key={item.key}
                      item={item}
                      checked={daChon.has(item.key)}
                      disabled={isPending}
                      onToggle={() => doiChon(item.key)}
                      extra={
                        item.kind === 'carried' ? (
                          <NutHuyChuyenTiep
                            item={item}
                            disabled={dangHuy || isPending}
                            onCancel={huyChuyenTiep}
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </ul>
              )}
              {/* Ô ghi việc khác BẮT BUỘC phải có: `CONTINUED` được phép cả khi
                  báo cáo không gắn công việc nào.

                  KHÔNG nhãn riêng: nhãn cũ "Việc khác cần làm tiếp" lặp lại gần
                  nguyên văn tiêu đề "Việc cần làm tiếp" ngay phía trên, và cùng
                  với dòng "Bản không gắn công việc nào" (đã bỏ) làm khối cao
                  thêm hai dòng (UAT 18/09/2026). Placeholder đổi theo ca nên
                  vẫn nói đủ, `aria-label` lo phần trình đọc màn hình. */}
              <Textarea
                id='viec-go-tay'
                aria-label={
                  ungVien.length > 0
                    ? 'Việc khác cần làm tiếp'
                    : 'Việc cần làm tiếp'
                }
                value={viecGoTay}
                onChange={(e) => datViecGoTay(e.target.value)}
                disabled={isPending}
                rows={2}
                maxLength={500}
                placeholder={
                  ungVien.length > 0
                    ? 'Việc khác, ví dụ: Chốt hợp đồng Vinatex'
                    : 'Bản không gắn công việc nào. Ghi việc cần làm tiếp, ví dụ: Chốt hợp đồng Vinatex'
                }
                className='bg-ws-surface'
              />
            </fieldset>
          )}

          {dangChonTraLai || moNhanXet || nhanXet.length > 0 ? (
            <div className='space-y-1.5'>
              <label
                htmlFor={nhanXetId}
                className='flex items-center justify-between gap-2 text-ws-cell font-semibold text-ws-ink'
              >
                <span>
                  {dangChonTraLai ? 'Lý do chưa đạt' : 'Nhận xét'}
                  {dangChonTraLai ? (
                    <span className='text-ws-danger'> *</span>
                  ) : (
                    <span className='font-normal text-ws-ink-faint'>
                      {' '}
                      (không bắt buộc)
                    </span>
                  )}
                </span>
                <span className='text-ws-micro font-normal tabular-nums text-ws-ink-faint'>
                  {nhanXet.length}/500
                </span>
              </label>
              <Textarea
                id={nhanXetId}
                value={nhanXet}
                onChange={(e) => datNhanXet(e.target.value)}
                disabled={isPending}
                rows={3}
                maxLength={500}
                autoFocus={dangChonTraLai}
                placeholder={
                  dangChonTraLai
                    ? 'Nói rõ chỗ cần sửa'
                    : 'Ghi chú cho thành viên'
                }
                className='bg-ws-surface'
              />
            </div>
          ) : (
            <button
              type='button'
              onClick={() => datMoNhanXet(true)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-ws-control text-ws-cell font-medium text-ws-ink-soft hover:text-ws-ink sm:min-h-8',
                FOCUS_RING,
              )}
            >
              <MessageSquarePlus aria-hidden='true' className='h-4 w-4' />
              Thêm nhận xét
            </button>
          )}

          <div className='flex flex-wrap items-center justify-end gap-2 border-t border-ws-line pt-3'>
            <p
              aria-live='polite'
              /* Khổ hẹp: câu nhắc chiếm trọn một hàng, hai nút xuống hàng dưới
                 cùng nhau (đo 375px, 17/09/2026). */
              className='min-w-0 basis-full text-ws-meta text-ws-ink-faint empty:hidden sm:flex-1 sm:basis-40'
            >
              {lyDoChuaGui}
            </p>
            <Button
              type='button'
              variant='ghost'
              onClick={huy}
              disabled={isPending}
              className={cn('h-11 sm:h-9', FOCUS_RING)}
            >
              Huỷ
            </Button>
            <Button
              type='button'
              onClick={gui}
              disabled={!guiDuoc}
              aria-busy={isPending}
              className={cn(
                'h-11 px-5 sm:h-9',
                dangChonTraLai
                  ? 'bg-ws-danger text-ws-solid-ink hover:bg-ws-danger/90'
                  : 'bg-ws-solid text-ws-solid-ink hover:bg-ws-solid/90',
              )}
            >
              {isPending ? (
                <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
              ) : null}
              {nhanNutGui}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
