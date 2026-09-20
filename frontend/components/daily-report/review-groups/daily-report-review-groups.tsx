'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Building2,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useDeleteReviewGroup,
  useReviewGroups,
  useSaveReviewGroup,
} from '@/hooks/queries/daily-report-queries';
import type {
  ReviewGroup,
  ReviewGroupPerson,
  ScopeMemberInfo,
} from '@/types/daily-report.type';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoHint } from '../shared/info-hint';
import { PersonAvatar } from '../shared/person-avatar';
import { ReportErrorState } from '../shared/report-error-state';
import {
  FOCUS_RING_SURFACE as FOCUS_RING,
  TOOLTIP_CONTENT_CLASS,
  TOOLTIP_CONTENT_STYLE,
} from '../utils/classes';
import {
  ReviewGroupWizard,
  type ReviewGroupDraft,
} from './review-group-wizard';

/**
 * Trang **Bộ phận** của một phạm vi báo cáo (thiết kế 20 mục 19). Trong code
 * và API vẫn là `ReviewGroup` (route `review-groups`); tên hiện ra đổi thành
 * "Bộ phận" từ 15/09/2026.
 *
 * Vì sao là một TRANG RIÊNG chứ không phải một khối trong hộp thoại cấu hình:
 * chia bộ phận là việc làm một lần rồi sửa dần theo tháng, cần nhìn cả bức
 * tranh "ai duyệt ai" cùng lúc.
 *
 * Tạo và sửa đi qua `ReviewGroupWizard` ba bước (UAT 16/09/2026 lượt 2) thay
 * cho form dài nằm ngay trên lưới thẻ.
 *
 * Chỉ trưởng nhóm vào được: workspace đã gác `isManagerOfActive` trước khi
 * mount, và server gác `isManager` ở cả bốn route - đây là lớp thứ hai chứ
 * không phải lớp duy nhất.
 */
export function DailyReportReviewGroups({
  scopeId,
  scopeName,
}: {
  scopeId: string;
  scopeName?: string;
}) {
  const { data: session } = useSession();
  const viewerId = session?.user?.id ?? null;
  const { data, isLoading, isError, refetch } = useReviewGroups(scopeId);
  const luuNhom = useSaveReviewGroup(scopeId);
  const xoaNhom = useDeleteReviewGroup(scopeId);

  const [draft, setDraft] = useState<ReviewGroupDraft | null>(null);
  const [xacNhanXoa, datXacNhanXoa] = useState<ReviewGroup | null>(null);

  const dangBan = luuNhom.isPending || xoaNhom.isPending;
  const scopeMembers = data?.scopeMembers ?? [];
  const groups = data?.groups ?? [];
  const managerIds = useMemo(
    () => new Set(data?.managerIds ?? []),
    [data?.managerIds],
  );

  /**
   * Tên người theo id, gom từ MỌI nguồn đang có trên màn: người đã rời nhóm
   * không còn trong `scopeMembers` nhưng vẫn có thể đang nằm trong một bộ phận.
   */
  const nguoiTheoId = useMemo(() => {
    const map = new Map<string, ScopeMemberInfo>();
    for (const m of data?.scopeMembers ?? []) map.set(m.id, m);
    for (const g of data?.groups ?? []) {
      for (const p of [...g.reviewers, ...g.members]) {
        if (!map.has(p.id)) map.set(p.id, p);
      }
    }
    return map;
  }, [data?.scopeMembers, data?.groups]);

  const moFormTao = () => {
    setDraft({ name: '', reviewerIds: [], memberIds: [] });
  };

  const moFormSua = (group: ReviewGroup) => {
    setDraft({
      groupId: group.id,
      name: group.name,
      reviewerIds: group.reviewers.map((r) => r.id),
      memberIds: group.members.map((m) => m.id),
      expectedUpdatedAt: group.updatedAt,
    });
  };

  const luu = (next: ReviewGroupDraft) => {
    luuNhom.mutate(
      {
        groupId: next.groupId,
        payload: {
          name: next.name,
          reviewerIds: next.reviewerIds,
          memberIds: next.memberIds,
          expectedUpdatedAt: next.expectedUpdatedAt,
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  if (isError) {
    return (
      <div className='p-4 md:p-5'>
        <ReportErrorState
          title='Không tải được bộ phận của nhóm này.'
          detail='Đây là lỗi kết nối, cách chia bộ phận hiện tại vẫn còn nguyên.'
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const viewerUnassigned =
    viewerId !== null &&
    (data?.unassignedMembers ?? []).some((m) => m.id === viewerId);

  return (
    <div>
      {/* Hàng đầu: tên màn, MỘT câu nói bộ phận dùng để làm gì, và nút tạo.
          Nút tạo chỉ ở đây khi đã có bộ phận; lúc chưa có, lối tạo duy nhất
          nằm giữa trạng thái rỗng - hai nút cùng chữ trên một màn là thừa (UAT
          16/09/2026 lượt 2). */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-3 md:px-5'>
        <div className='min-w-0 flex-auto basis-64'>
          <p className='flex items-center gap-1 text-ws-body font-semibold text-ws-ink'>
            Bộ phận
            <InfoHint label='Bộ phận hoạt động thế nào'>
              Mỗi bộ phận có người duyệt và các thành viên họ phụ trách. Người
              duyệt chỉ thấy, nhận thông báo và duyệt báo cáo của thành viên
              trong bộ phận mình. Chọn nhiều người duyệt thì ai kết luận trước
              là xong. Bạn là trưởng nhóm nên vẫn duyệt được tất cả.
            </InfoHint>
          </p>
          <p className='text-ws-meta text-ws-ink-faint'>
            Giao cho người khác duyệt báo cáo của một nhóm thành viên. Lưu là
            áp dụng ngay.
          </p>
        </div>
        {groups.length > 0 && (
          <Button
            type='button'
            onClick={moFormTao}
            disabled={dangBan}
            className={cn('h-11 shrink-0 gap-1.5 sm:h-9', FOCUS_RING)}
          >
            <Plus aria-hidden='true' className='h-4 w-4' />
            Tạo bộ phận
          </Button>
        )}
      </div>

      <div className='space-y-3 p-4 md:p-5'>
        {isLoading && (
          <div
            aria-busy='true'
            className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
          >
            <span className='sr-only'>Đang tải bộ phận…</span>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className='h-40 rounded-ws-card bg-ws-surface-sunken'
              />
            ))}
          </div>
        )}

        {data && groups.length === 0 && (
          /* Trạng thái ban đầu: nói hiện đang thế nào, và bước tiếp theo. */
          <div className='flex flex-col items-center justify-center rounded-ws-card border border-dashed border-ws-line px-6 py-12 text-center'>
            <span
              aria-hidden='true'
              className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ws-surface-sunken text-ws-ink-soft'
            >
              <UserCog className='h-6 w-6' />
            </span>
            <p className='text-ws-body font-semibold text-ws-ink'>
              Chưa có bộ phận nào
            </p>
            <p className='mt-1 max-w-sm text-ws-meta text-ws-ink-faint'>
              Hiện bạn duyệt mọi báo cáo của {scopeName ?? 'nhóm này'}. Tạo bộ
              phận để giao bớt cho người khác.
            </p>
            <Button
              type='button'
              onClick={moFormTao}
              disabled={dangBan}
              className={cn('mt-4 h-11 gap-1.5 sm:h-9', FOCUS_RING)}
            >
              <Plus aria-hidden='true' className='h-4 w-4' />
              Tạo bộ phận
            </Button>
          </div>
        )}

        {data && groups.length > 0 && (
          <ul className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            {groups.map((group) => (
              <li
                key={group.id}
                className='flex min-w-0 flex-col gap-3 rounded-ws-card border border-ws-line bg-ws-surface p-3'
              >
                {/* KHÔNG `flex-wrap`: cụm nút ở lại cùng hàng với tên, tên tự
                    kẹp hai dòng. Từ `sm` (lưới nhiều cột) chỉ MỘT dòng: một tên
                    dài xuống hai dòng là "Người duyệt" của thẻ đó lệch xuống so
                    với thẻ bên cạnh (đo 1440px, 17/09/2026). Tên đủ nằm ở
                    `title`. */}
                <div className='flex items-start gap-2 sm:items-center'>
                  {/* Icon chỉ từ `sm`: ở 375px nó cùng hai nút 44px bóp tên
                      bộ phận còn khoảng 100px (đo 16/09/2026). */}
                  <span
                    aria-hidden='true'
                    className='hidden h-9 w-9 shrink-0 items-center justify-center rounded-ws-control bg-ws-surface-sunken text-ws-ink-soft sm:flex'
                  >
                    <Building2 className='h-4 w-4' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <h3
                      title={group.name}
                      className='line-clamp-2 break-words text-ws-h2 font-bold leading-snug text-ws-ink sm:line-clamp-1'
                    >
                      {group.name}
                    </h3>
                    <p className='text-ws-meta text-ws-ink-faint'>
                      {group.reviewers.length} người duyệt ·{' '}
                      {group.members.length} thành viên
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    <HanhDongIcon
                      icon={Pencil}
                      label={`Sửa bộ phận ${group.name}`}
                      onClick={() => moFormSua(group)}
                      disabled={dangBan}
                    />
                    <HanhDongIcon
                      icon={Trash2}
                      label={`Xoá bộ phận ${group.name}`}
                      onClick={() => datXacNhanXoa(group)}
                      disabled={dangBan}
                      tone='danger'
                    />
                  </div>
                </div>

                <PeopleBlock label='Người duyệt' people={group.reviewers} />
                <PeopleBlock
                  label='Thành viên'
                  people={group.members}
                  muted
                />
              </li>
            ))}

            {/* Thẻ "chưa thuộc bộ phận" đứng CÙNG lưới, viền nét đứt: nó là
                một phần của cùng bức tranh "ai duyệt ai". */}
            {data.unassignedMembers.length > 0 && (
              <li className='flex min-w-0 flex-col gap-3 rounded-ws-card border border-dashed border-ws-line bg-ws-surface-alt p-3'>
                <div className='flex items-start gap-2 sm:items-center'>
                  <span
                    aria-hidden='true'
                    className='hidden h-9 w-9 shrink-0 items-center justify-center rounded-ws-control border border-dashed border-ws-line-strong text-ws-ink-faint sm:flex'
                  >
                    <UserCog className='h-4 w-4' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <h3 className='break-words text-ws-h2 font-bold leading-snug text-ws-ink'>
                      Chưa thuộc bộ phận nào
                    </h3>
                    <p className='text-ws-meta text-ws-ink-faint'>
                      Bạn duyệt bản của {data.unassignedMembers.length} người
                      này
                    </p>
                  </div>
                  {viewerUnassigned && (
                    <InfoHint label='Vì sao bản của bạn chưa có người duyệt'>
                      Bạn cũng đang nằm ở đây, mà không ai tự duyệt bản của
                      mình. Muốn có người duyệt bản của bạn, hãy thêm bạn vào
                      một bộ phận.
                    </InfoHint>
                  )}
                </div>
                <PeopleBlock
                  people={data.unassignedMembers.map((m) => ({
                    ...m,
                    isScopeMember: true,
                  }))}
                  muted
                />
              </li>
            )}
          </ul>
        )}
      </div>

      {draft !== null && (
        <ReviewGroupWizard
          key={draft.groupId ?? 'new'}
          draft={draft}
          scopeMembers={scopeMembers}
          managerIds={managerIds}
          personById={nguoiTheoId}
          isSaving={luuNhom.isPending}
          onSave={luu}
          onClose={() => setDraft(null)}
        />
      )}

      <ConfirmationDialog
        isOpen={xacNhanXoa !== null}
        onClose={() => {
          if (!xoaNhom.isPending) datXacNhanXoa(null);
        }}
        onConfirm={() => {
          if (!xacNhanXoa) return;
          xoaNhom.mutate(xacNhanXoa.id, {
            onSuccess: () => datXacNhanXoa(null),
          });
        }}
        title={`Xoá bộ phận ${xacNhanXoa?.name ?? ''}?`}
        description={`${
          xacNhanXoa?.reviewers.map((r) => r.fullName || r.id).join(', ') ||
          'Người duyệt của bộ phận này'
        } sẽ không còn đọc, nhận thông báo hay duyệt báo cáo của ${
          xacNhanXoa?.members.length ?? 0
        } thành viên trong bộ phận. Bản của họ quay về cho bạn duyệt, ngay cả bản đang chờ duyệt hôm nay.`}
        confirmText='Xoá bộ phận'
        variant='destructive'
        isLoading={xoaNhom.isPending}
      />
    </div>
  );
}

/**
 * Một hành động của thẻ bộ phận: chỉ icon, tên nằm ở `aria-label` và trong chú
 * giải. 44px ở khổ điện thoại, hạ về 36px từ `sm`.
 */
function HanhDongIcon({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone?: 'danger';
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-ws-control border border-ws-line bg-ws-surface transition-colors hover:bg-ws-surface-alt disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:w-9',
              tone === 'danger' ? 'text-ws-danger' : 'text-ws-ink-soft',
              FOCUS_RING,
            )}
          >
            <Icon aria-hidden='true' className='h-4 w-4' />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className={TOOLTIP_CONTENT_CLASS}
          style={TOOLTIP_CONTENT_STYLE}
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Danh sách người của một thẻ: avatar + tên, mỗi người một chip. Người duyệt
 * nổi trên nền `ws-surface`, thành viên chìm vào `ws-surface-sunken` - hai vai
 * đọc ra được bằng mắt trước khi đọc nhãn.
 *
 * "Đã rời nhóm": người đó không còn trong nhóm giao việc, nên dòng đó chết -
 * người duyệt mất quyền, thành viên không còn bản nào ở đây.
 */
function PeopleBlock({
  label,
  people,
  muted,
}: {
  label?: string;
  people: ReviewGroupPerson[];
  muted?: boolean;
}) {
  return (
    <div className='min-w-0'>
      {label && (
        <p className='mb-1 text-ws-meta font-medium text-ws-ink-soft'>
          {label}
        </p>
      )}
      <ul className='flex flex-wrap gap-1.5'>
        {people.map((person) => (
          <li key={person.id} className='min-w-0 max-w-full'>
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border border-ws-line py-0.5 pl-0.5 pr-2 text-ws-chip',
                muted
                  ? 'bg-ws-surface-sunken text-ws-ink-soft'
                  : 'bg-ws-surface text-ws-ink',
              )}
            >
              <PersonAvatar
                name={person.fullName || '?'}
                url={person.avatarUrl}
                seed={person.id}
                size='xs'
              />
              <span className='min-w-0 truncate'>
                {person.fullName || person.id}
              </span>
              {!person.isScopeMember && (
                <span className='shrink-0 text-ws-ink-faint'>
                  · đã rời nhóm
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
