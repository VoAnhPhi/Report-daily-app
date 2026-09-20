'use client';

import { useId, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Building2, Loader2, X } from 'lucide-react';

import ResponsiveModal from '@/components/modals/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ScopeMemberInfo } from '@/types/daily-report.type';

import { AvatarStack } from '../shared/person-avatar';
import {
  PersonPickGrid,
  type PickablePerson,
} from '../shared/person-pick-grid';
import { StepIndicator } from '../shared/step-indicator';
import { FOCUS_RING_SURFACE as FOCUS_RING } from '../utils/classes';

/** Tên bộ phận dài nhất, khớp `@db.VarChar(60)` và DTO server. */
const MAX_NAME_LENGTH = 60;

const STEPS = ['Người duyệt', 'Thành viên', 'Xem lại'];

/**
 * Lý do một tài khoản không nhận được vai người duyệt. Server chỉ nhận tài
 * khoản `status = active` và chưa bị xoá (`assertAssignable`, 422); tài khoản
 * khách mua hàng chưa xác minh (`marketing`) hay tài khoản đã khoá rơi vào đây.
 */
const INACTIVE_REASON =
  'Tài khoản này chưa được kích hoạt đầy đủ (ví dụ tài khoản khách chưa xác minh, hoặc đã bị khoá) nên không nhận được vai người duyệt. Họ vẫn là thành viên và vẫn nộp báo cáo bình thường.';

export interface ReviewGroupDraft {
  /** Vắng = đang TẠO bộ phận mới. */
  groupId?: string;
  name: string;
  reviewerIds: string[];
  memberIds: string[];
  /** Mốc chống ghi đè, chỉ có khi sửa. Gửi lại nguyên văn lên server. */
  expectedUpdatedAt?: string;
}

/**
 * Tạo hoặc sửa MỘT bộ phận theo ba bước (UAT 16/09/2026 lượt 2, dựng theo
 * `ui-ux-pro-max`): đặt tên và chọn người duyệt → chọn thành viên → xem lại rồi
 * lưu.
 *
 * Vì sao chia bước thay vì một form dài: form cũ phơi ra cùng lúc ô tên, hai
 * dòng hướng dẫn, một dải chip người duyệt và một lưới ô tích thành viên, nên
 * chính người làm tính năng còn "thấy sợ". Mỗi bước giờ chỉ hỏi MỘT câu, và
 * bước cuối nói lại toàn bộ lựa chọn trước khi áp dụng - vì lưu là áp dụng ngay
 * cho cả bản đã nộp trong ngày.
 *
 * Luật giữ nguyên từ bản cũ:
 *   · người duyệt phải là thành viên của nhóm và đang hoạt động;
 *   · trưởng nhóm không cần tự thêm mình (vẫn duyệt được mọi người);
 *   · một người không vừa duyệt vừa bị duyệt trong cùng bộ phận - chọn ai làm
 *     người duyệt thì người đó rời danh sách thành viên.
 */
export function ReviewGroupWizard({
  draft: initialDraft,
  scopeMembers,
  managerIds,
  personById,
  isSaving,
  onSave,
  onClose,
}: {
  draft: ReviewGroupDraft;
  scopeMembers: ScopeMemberInfo[];
  managerIds: Set<string>;
  /** Tra tên và ảnh của cả người ngoài `scopeMembers` (đã rời nhóm). */
  personById: Map<string, ScopeMemberInfo>;
  isSaving: boolean;
  onSave: (draft: ReviewGroupDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState(0);
  const nameId = useId();
  const titleId = useId();
  const isEdit = Boolean(draft.groupId);

  const name = draft.name.trim();
  const canNext =
    step === 0
      ? name.length > 0 && draft.reviewerIds.length > 0
      : step === 1
        ? draft.memberIds.length > 0
        : true;
  const blockReason =
    step === 0
      ? name.length === 0
        ? 'Đặt tên cho bộ phận để tiếp tục.'
        : draft.reviewerIds.length === 0
          ? 'Chọn ít nhất một người duyệt để tiếp tục.'
          : null
      : step === 1 && draft.memberIds.length === 0
        ? 'Chọn ít nhất một thành viên để tiếp tục.'
        : null;

  const toggleReviewer = (id: string) =>
    setDraft((prev) =>
      prev.reviewerIds.includes(id)
        ? { ...prev, reviewerIds: prev.reviewerIds.filter((r) => r !== id) }
        : {
            ...prev,
            reviewerIds: [...prev.reviewerIds, id],
            // Không ai tự duyệt bản của chính mình (server trả 422).
            memberIds: prev.memberIds.filter((m) => m !== id),
          },
    );

  const toggleMember = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter((m) => m !== id)
        : [...prev.memberIds, id],
    }));

  const selectMembers = (ids: string[], select: boolean) =>
    setDraft((prev) => ({
      ...prev,
      memberIds: select
        ? Array.from(new Set([...prev.memberIds, ...ids]))
        : prev.memberIds.filter((m) => !ids.includes(m)),
    }));

  /* Ứng viên người duyệt: mọi thành viên trừ trưởng nhóm. Người ĐÃ được chọn
     từ trước mà nay ngoài nhóm vẫn hiện để bỏ chọn được. */
  const reviewerCandidates: PickablePerson[] = [
    ...scopeMembers
      .filter((m) => !managerIds.has(m.id))
      .map((m) => ({
        id: m.id,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl,
        note: draft.memberIds.includes(m.id)
          ? 'Đang là thành viên, chọn sẽ bỏ khỏi thành viên'
          : undefined,
        ...(m.isActive === false && !draft.reviewerIds.includes(m.id)
          ? {
              disabledReason: INACTIVE_REASON,
              disabledLabel: 'Chưa kích hoạt',
            }
          : {}),
      })),
    ...draft.reviewerIds
      .filter((id) => !scopeMembers.some((m) => m.id === id))
      .map((id) => ({
        id,
        fullName: personById.get(id)?.fullName || id,
        avatarUrl: personById.get(id)?.avatarUrl ?? null,
        note: 'Đã rời nhóm',
      })),
  ];

  const memberCandidates: PickablePerson[] = scopeMembers.map((m) =>
    draft.reviewerIds.includes(m.id)
      ? {
          id: m.id,
          fullName: m.fullName,
          avatarUrl: m.avatarUrl,
          disabledReason:
            'Người này là người duyệt của bộ phận, nên không đồng thời là thành viên được duyệt. Bỏ chọn họ ở bước 1 nếu muốn.',
          disabledLabel: 'Đang là người duyệt',
        }
      : { id: m.id, fullName: m.fullName, avatarUrl: m.avatarUrl },
  );

  const peopleOf = (ids: string[]) =>
    ids.map((id) => ({
      id,
      fullName: personById.get(id)?.fullName || id,
      avatarUrl: personById.get(id)?.avatarUrl ?? null,
    }));

  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
      maxWidth='sm:max-w-2xl'
      className='ws-scope'
      scrollable={false}
    >
      <section
        aria-labelledby={titleId}
        /* Dưới 768px đây là Drawer, và `DrawerContent` tự chặn ở 80vh (kể cả
           tay cầm). Để khối cao hơn trần đó là chân hộp - chỗ có nút Tiếp tục -
           rơi khỏi màn hình (đo 375px, 16/09/2026). */
        className='flex max-h-[calc(80vh-2rem)] min-h-0 flex-col md:max-h-[90vh]'
      >
        <header className='space-y-3 border-b border-ws-line px-4 py-3 md:px-5'>
          <div className='flex items-start gap-2'>
            <span
              aria-hidden='true'
              className='flex h-9 w-9 shrink-0 items-center justify-center rounded-ws-control bg-ws-surface-sunken text-ws-ink-soft'
            >
              <Building2 className='h-4 w-4' />
            </span>
            <div className='min-w-0 flex-1'>
              <h2
                id={titleId}
                className='truncate text-ws-h2 font-semibold text-ws-ink'
              >
                {isEdit ? `Sửa bộ phận ${initialDraft.name}` : 'Tạo bộ phận'}
              </h2>
              <p className='text-ws-meta text-ws-ink-faint'>
                Lưu là áp dụng ngay, cả với bản đã nộp hôm nay.
              </p>
            </div>
            <button
              type='button'
              aria-label='Đóng'
              onClick={onClose}
              disabled={isSaving}
              className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-pill text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink sm:h-9 sm:w-9',
                FOCUS_RING,
              )}
            >
              <X aria-hidden='true' className='h-4 w-4' />
            </button>
          </div>
          <StepIndicator steps={STEPS} current={step} />
        </header>

        <div className='ws-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-5'>
          {step === 0 && (
            <>
              <div className='space-y-1.5'>
                <label
                  htmlFor={nameId}
                  className='text-ws-body font-semibold text-ws-ink'
                >
                  Tên bộ phận
                </label>
                <Input
                  id={nameId}
                  autoFocus
                  value={draft.name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder='Ví dụ: Kinh doanh miền Nam'
                  disabled={isSaving}
                  className='h-11'
                />
              </div>
              <div className='space-y-2'>
                <div>
                  <p className='text-ws-body font-semibold text-ws-ink'>
                    Ai duyệt bộ phận này?
                    {draft.reviewerIds.length > 0 && (
                      <span className='font-normal text-ws-ink-soft'>
                        {' '}
                        · đã chọn {draft.reviewerIds.length}
                      </span>
                    )}
                  </p>
                  <p className='text-ws-meta text-ws-ink-faint'>
                    Chọn một hoặc nhiều người. Ai kết luận trước thì bản đó xong
                    với những người còn lại. Bạn là trưởng nhóm nên không cần tự
                    thêm mình.
                  </p>
                </div>
                <PersonPickGrid
                  label='Người duyệt'
                  people={reviewerCandidates}
                  selected={draft.reviewerIds}
                  onToggle={toggleReviewer}
                  emptyText='Nhóm chưa có thành viên nào ngoài trưởng nhóm.'
                />
              </div>
            </>
          )}

          {step === 1 && (
            <div className='space-y-2'>
              <div>
                <p className='text-ws-body font-semibold text-ws-ink'>
                  Ai thuộc bộ phận {name}?
                  {draft.memberIds.length > 0 && (
                    <span className='font-normal text-ws-ink-soft'>
                      {' '}
                      · đã chọn {draft.memberIds.length}
                    </span>
                  )}
                </p>
                <p className='text-ws-meta text-ws-ink-faint'>
                  Người duyệt chỉ xem và duyệt báo cáo của những người bạn chọn
                  ở đây. Một người thuộc được nhiều bộ phận.
                </p>
              </div>
              <PersonPickGrid
                label='Thành viên của bộ phận'
                people={memberCandidates}
                selected={draft.memberIds}
                onToggle={toggleMember}
                onSelectMany={selectMembers}
                emptyText='Nhóm chưa có thành viên nào để chia.'
              />
            </div>
          )}

          {step === 2 && (
            <dl className='divide-y divide-ws-line rounded-ws-block border border-ws-line bg-ws-surface'>
              <ReviewRow label='Tên bộ phận' onEdit={() => setStep(0)}>
                <span className='break-words text-ws-body font-semibold text-ws-ink'>
                  {name}
                </span>
              </ReviewRow>
              <ReviewRow
                label={`Người duyệt (${draft.reviewerIds.length})`}
                onEdit={() => setStep(0)}
              >
                <PeopleLine people={peopleOf(draft.reviewerIds)} />
              </ReviewRow>
              <ReviewRow
                label={`Thành viên (${draft.memberIds.length})`}
                onEdit={() => setStep(1)}
              >
                <PeopleLine people={peopleOf(draft.memberIds)} />
              </ReviewRow>
            </dl>
          )}
        </div>

        {/* Khổ hẹp: câu trạng thái một hàng riêng, hai nút chia đôi hàng dưới
            để cả hai luôn thấy được và đủ to để chạm. */}
        <footer className='grid grid-cols-2 items-center gap-2 border-t border-ws-line bg-ws-surface px-4 py-3 sm:flex sm:flex-wrap md:px-5'>
          <p
            aria-live='polite'
            className='col-span-2 min-w-0 text-ws-meta text-ws-ink-faint sm:flex-1'
          >
            {blockReason ?? `Bước ${step + 1} trên ${STEPS.length}`}
          </p>
          {step > 0 ? (
            <Button
              type='button'
              variant='outline'
              onClick={() => setStep(step - 1)}
              disabled={isSaving}
              className={cn('h-11 gap-1.5 sm:h-9', FOCUS_RING)}
            >
              <ArrowLeft aria-hidden='true' className='h-4 w-4' />
              Quay lại
            </Button>
          ) : (
            <Button
              type='button'
              variant='ghost'
              onClick={onClose}
              disabled={isSaving}
              className={cn('h-11 sm:h-9', FOCUS_RING)}
            >
              Huỷ
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type='button'
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className={cn('h-11 gap-1.5 sm:h-9', FOCUS_RING)}
            >
              Tiếp tục
              <ArrowRight aria-hidden='true' className='h-4 w-4' />
            </Button>
          ) : (
            <Button
              type='button'
              onClick={() => onSave({ ...draft, name })}
              disabled={isSaving}
              aria-busy={isSaving}
              className={cn('h-11 gap-1.5 sm:h-9', FOCUS_RING)}
            >
              {isSaving && (
                <Loader2 aria-hidden='true' className='h-4 w-4 animate-spin' />
              )}
              {isEdit ? 'Lưu thay đổi' : 'Tạo bộ phận'}
            </Button>
          )}
        </footer>
      </section>
    </ResponsiveModal>
  );
}

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className='flex items-start gap-3 px-3 py-3'>
      <div className='min-w-0 flex-1 space-y-1.5'>
        <dt className='text-ws-meta font-medium text-ws-ink-soft'>{label}</dt>
        <dd className='min-w-0'>{children}</dd>
      </div>
      <button
        type='button'
        onClick={onEdit}
        className={cn(
          'inline-flex h-11 shrink-0 items-center rounded-ws-control px-2.5 text-ws-chip font-semibold text-ws-ink-soft hover:bg-ws-surface-sunken hover:text-ws-ink sm:h-8',
          FOCUS_RING,
        )}
      >
        Sửa
      </button>
    </div>
  );
}

/** Ảnh chồng mép rồi tên, gọn một hai dòng. */
function PeopleLine({
  people,
}: {
  people: { id: string; fullName: string; avatarUrl: string | null }[];
}) {
  const names = people.map((p) => p.fullName);
  const shown = names.slice(0, 4).join(', ');
  const rest = names.length - 4;
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <AvatarStack people={people} max={5} size='sm' />
      <span className='min-w-0 text-ws-body text-ws-ink'>
        {shown}
        {rest > 0 && (
          <span className='text-ws-ink-soft'> và {rest} người khác</span>
        )}
      </span>
    </span>
  );
}
