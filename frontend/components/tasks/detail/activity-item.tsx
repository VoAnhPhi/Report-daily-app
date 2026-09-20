'use client';

import {
  TaskActivity,
  TaskActivityType,
  TaskAttachment,
  TaskStatus,
  FileMediaType,
} from '@/types/task.type';
import {
  getFileMediaType,
  formatTaskTime,
} from '@/components/tasks/task-utils';
import type { Session } from 'next-auth';

type StatusVisual = Record<TaskStatus, { label: string; color: string }>;
import { cn } from '@/lib/utils';
import {
  MoreVertical,
  Pencil,
  Trash2,
  ArrowRight,
  Play,
  FileIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  Reply,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useMemo, forwardRef, memo, type ReactNode } from 'react';
import {
  useTaskActivityReplies,
  useToggleActivityReaction,
} from '@/hooks/queries/task-queries';
import { EmojiPicker } from '@/components/emoji-picker';

interface ActivityItemProps {
  activity: TaskActivity;
  session: Session | null;
  onReply: (activity: TaskActivity) => void;
  onMediaClick: (attachments: TaskAttachment[], index: number) => void;
  onUpdate: (activityId: string, message: string) => Promise<void>;
  onDelete: (activityId: string) => Promise<void>;
  statusConfig: StatusVisual;
  isReply?: boolean;
  readOnly?: boolean;
  /** Record id + name của User, để tô đậm phần tag trong nội dung. */
  participants?: Record<string, string>;
}

/** Biến URL (http/https/www.) trong đoạn text thường thành link bấm được. */
function linkifyText(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Tìm các chuỗi bắt đầu bằng http://, https://, hoặc www.
  const re = /((?:https?:\/\/|www\.)[^\s]+)/gi;
  let last = 0;
  let messages: RegExpExecArray | null = re.exec(text);

  while (messages !== null) {
    // Thêm text trước URL (nếu có) vào nodes.
    if (messages.index > last) nodes.push(text.slice(last, messages.index));

    // Tách dấu câu cuối khỏi URL (vd "...abc)." → link "...abc", text ")." ).
    let url = messages[0];
    let trailing = '';
    // kiểm tra xem URL có kết thúc bằng các dấu câu này không
    const trail = url.match(/[.,!?;:)\]]+$/);
    if (trail) {
      trailing = trail[0];
      url = url.slice(0, url.length - trailing.length);
    }

    const href = url.startsWith('www.') ? `https://${url}` : url;
    nodes.push(
      <a
        key={`${keyPrefix}-${messages.index}`}
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-blue-600 underline break-all'
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    if (trailing) nodes.push(trailing);
    last = messages.index + messages[0].length;

    messages = re.exec(text);
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Tô đậm các đoạn `@Tên` + biến URL thành link trong nhận xét */
function renderMessageWithMentions(
  message: string,
  mentionNames: string[],
): ReactNode {
  if (mentionNames.length === 0) return linkifyText(message, 'lnk');

  const escaped = mentionNames
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  // Tên dài xét trước; ranh giới phải chặn `@An` sáng bên trong `@Anh`.
  const re = new RegExp(`@(?:${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'gu');

  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(message)) !== null) {
    if (m.index > last)
      parts.push(
        ...linkifyText(message.slice(last, m.index), `pre-${m.index}`),
      );
    parts.push(
      <span key={m.index} className='font-semibold text-blue-600'>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }

  if (last < message.length)
    parts.push(...linkifyText(message.slice(last), 'end'));
  return parts;
}

const ActivityItemBase = forwardRef<HTMLDivElement, ActivityItemProps>(
  (
    {
      activity,
      session,
      onReply,
      onMediaClick,
      onUpdate,
      onDelete,
      statusConfig,
      isReply = false,
      readOnly = false,
      participants,
    },
    ref,
  ) => {
    const [showReplies, setShowReplies] = useState(false);
    const mentionNames = (activity.mentionedUserIds ?? [])
      .map((id) => participants?.[id])
      .filter((n): n is string => !!n);
    const [isEditing, setIsEditing] = useState(false);
    const [editMessage, setEditMessage] = useState(activity.message || '');
    const [isUpdating, setIsUpdating] = useState(false);

    const {
      data: repliesData,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading: isLoadingReplies,
    } = useTaskActivityReplies(activity.id, 20, { enabled: showReplies });

    const toggleReactionMutation = useToggleActivityReaction();

    const replies = useMemo(() => {
      const seen = new Set<string>();
      return (repliesData?.pages.flatMap((page) => page.data) ?? []).filter(
        (reply) => {
          if (!reply.id) return true;
          if (seen.has(reply.id)) return false;
          seen.add(reply.id);
          return true;
        },
      );
    }, [repliesData]);

    const handleUpdate = async () => {
      if (!editMessage.trim()) return;
      setIsUpdating(true);
      try {
        await onUpdate(activity.id, editMessage.trim());
        setIsEditing(false);
      } finally {
        setIsUpdating(false);
      }
    };

    const handleToggleReaction = (emoji: string) => {
      toggleReactionMutation.mutate({ activityId: activity.id, emoji });
    };

    const hasReactions =
      activity.reactionSummary && activity.reactionSummary.length > 0;

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          isReply ? 'pl-6 mt-4 scale-[0.98] origin-left' : 'pl-8',
        )}
      >
        {!isReply && (
          <div
            className={cn(
              'absolute left-1.5 -translate-x-1/2 top-1.5 w-3 h-3 rounded-full border-2 border-white ring-2 ring-zinc-50 z-10 shadow-sm',
              activity.type === TaskActivityType.STATUS_CHANGED
                ? 'bg-blue-600'
                : 'bg-zinc-400',
            )}
          />
        )}

        {isReply && (
          <div className='absolute left-0 top-3 w-4 h-[1px] bg-zinc-200' />
        )}

        <div className='space-y-1.5'>
          <div className='flex items-center justify-between gap-4'>
            <div className='min-w-0'>
              <span className='block truncate text-[13px] font-bold text-zinc-900'>
                {activity.createdBy.fullName}
              </span>
              {activity.onBehalfName && (
                <span className='block truncate text-[11px] font-medium text-amber-600'>
                  thay cho {activity.onBehalfName}
                </span>
              )}
            </div>

            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-[11px] font-bold text-zinc-900 shrink-0'>
                {formatTaskTime(activity.createdAt)}
              </span>
              {activity.type === TaskActivityType.COMMENT &&
                activity.createdBy.id === session?.user?.id &&
                !isEditing &&
                !readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type='button'
                        className='p-1 hover:bg-zinc-200 rounded-md text-zinc-400 transition-colors'
                      >
                        <MoreVertical className='w-3 h-3' />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='end'
                      className='ws-scope text-xs font-bold min-w-[80px]'
                    >
                      <DropdownMenuItem
                        onClick={() => {
                          setIsEditing(true);
                          setEditMessage(activity.message || '');
                        }}
                      >
                        <Pencil className='w-3 h-3 mr-2' /> Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-rose-600 focus:text-rose-600'
                        onClick={() => onDelete(activity.id)}
                      >
                        <Trash2 className='w-3 h-3 mr-2' /> Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          </div>

          {activity.type === TaskActivityType.STATUS_CHANGED &&
            activity.oldStatus &&
            activity.newStatus && (
              <div className='flex items-center gap-2 py-1 px-2 bg-blue-50/50 rounded-lg w-fit border border-blue-100/50'>
                <span className='text-[9px] font-bold text-zinc-400 uppercase tracking-tighter'>
                  {statusConfig[activity.oldStatus].label}
                </span>
                <ArrowRight className='w-2.5 h-2.5 text-blue-400' />
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-tighter',
                    statusConfig[activity.newStatus].color,
                  )}
                >
                  {statusConfig[activity.newStatus].label}
                </span>
              </div>
            )}

          {activity.message && (
            <div className='relative group'>
              {isEditing ? (
                <div className='space-y-2'>
                  <Textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    className='resize-none min-h-[60px] text-[13px] bg-white border-zinc-300 rounded-xl'
                  />
                  <div className='flex justify-end gap-1.5'>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='h-7 px-2 text-[10px] font-bold uppercase'
                      onClick={() => setIsEditing(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='h-7 px-3 text-[10px] font-bold uppercase bg-zinc-900'
                      onClick={handleUpdate}
                      disabled={isUpdating}
                    >
                      {isUpdating && (
                        <Loader2 className='w-2.5 h-2.5 mr-1.5 animate-spin' />
                      )}
                      Lưu
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    'text-[13px] leading-relaxed p-3 rounded-2xl shadow-xs font-medium whitespace-pre-wrap break-words',
                    activity.type === TaskActivityType.COMMENT
                      ? 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none'
                      : 'bg-white/40 border border-zinc-100 text-zinc-600 italic',
                  )}
                >
                  {renderMessageWithMentions(activity.message, mentionNames)}
                </p>
              )}
            </div>
          )}

          {activity.attachments && activity.attachments.length > 0 && (
            <div className='grid grid-cols-2 gap-2 mt-2'>
              {activity.attachments.map((file, i) => {
                const type = getFileMediaType(file.name);
                return (
                  <button
                    key={file.id || i}
                    type='button'
                    onClick={() => onMediaClick(activity.attachments!, i)}
                    className='group relative h-24 rounded-xl overflow-hidden border border-zinc-200 bg-white hover:border-blue-400 transition-all shadow-xs p-0.5 text-left'
                  >
                    <div className='w-full h-full rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center'>
                      {type === FileMediaType.IMAGE ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                        />
                      ) : type === FileMediaType.VIDEO ? (
                        <div className='relative w-full h-full'>
                          <video
                            src={`${file.url}#t=0.001`}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                            muted
                            playsInline
                            preload='metadata'
                          />
                          <div className='absolute inset-0 flex items-center justify-center'>
                            <div className='w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform'>
                              <Play className='w-4 h-4 text-white fill-white ml-0.5' />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col items-center justify-center gap-1 p-2'>
                          <FileIcon className='w-6 h-6 text-zinc-400' />
                          <span className='text-[9px] font-bold text-zinc-500 truncate w-full text-center px-1'>
                            {file.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Reactions and Reply Actions */}
          {activity.type === TaskActivityType.COMMENT && (
            <div className='flex flex-wrap items-center gap-2 mt-1.5'>
              {/* Reaction Summary */}
              {hasReactions && (
                // Một Provider cho cả hàng chip; mỗi chip một Provider là context thừa.
                <TooltipProvider delayDuration={150}>
                  <div className='flex flex-wrap gap-1'>
                    {activity.reactionSummary!.map((react) => {
                      const chip = (
                        <button
                          key={react.emoji}
                          type='button'
                          disabled={readOnly}
                          onClick={() => {
                            if (!readOnly) handleToggleReaction(react.emoji);
                          }}
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all',
                            react.isReactedByMe
                              ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm'
                              : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200',
                            readOnly && 'cursor-default',
                          )}
                        >
                          <span className='text-base leading-none'>
                            {react.emoji}
                          </span>
                          <span>{react.count}</span>
                        </button>
                      );

                      // Không có tên thì đừng dựng tooltip rỗng.
                      if (!react.users?.length) return chip;

                      return (
                        <Tooltip key={react.emoji}>
                          <TooltipTrigger asChild>{chip}</TooltipTrigger>
                          <TooltipContent className='max-w-[220px]'>
                            {react.users.map((u) => (
                              <div key={u.id} className='truncate'>
                                {u.fullName}
                              </div>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}

              {!readOnly && (
                <div className='flex items-center gap-1'>
                  <EmojiPicker
                    onEmojiSelect={handleToggleReaction}
                    closeOnSelect={true}
                    className='h-6 w-6 text-zinc-400 hover:bg-zinc-100'
                  />

                  {!isReply && (
                    <button
                      type='button'
                      onClick={() => onReply(activity)}
                      aria-label='Phản hồi'
                      title='Phản hồi'
                      className='flex items-center justify-center h-6 w-6 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors'
                    >
                      <Reply className='w-3.5 h-3.5' />
                    </button>
                  )}
                </div>
              )}

              {(activity.replyCount || 0) > 0 && !isReply && (
                <button
                  type='button'
                  onClick={() => setShowReplies(!showReplies)}
                  className='flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors uppercase tracking-tighter'
                >
                  {showReplies ? (
                    <ChevronUp className='w-3 h-3' />
                  ) : (
                    <ChevronDown className='w-3 h-3' />
                  )}
                  {showReplies
                    ? 'Ẩn phản hồi'
                    : `Xem ${activity.replyCount} phản hồi`}
                </button>
              )}
            </div>
          )}

          {/* Recursive Replies */}
          {showReplies && !isReply && (
            <div className='mt-2 border-l border-zinc-100 space-y-2'>
              {isLoadingReplies ? (
                <div className='pl-6 py-2'>
                  <Loader2 className='w-4 h-4 animate-spin text-zinc-300' />
                </div>
              ) : (
                <>
                  {replies.map((reply) => (
                    <ActivityItem
                      key={reply.id}
                      activity={reply}
                      session={session}
                      onReply={onReply}
                      onMediaClick={onMediaClick}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      statusConfig={statusConfig}
                      isReply={true}
                      readOnly={readOnly}
                      participants={participants}
                    />
                  ))}
                  {hasNextPage && (
                    <button
                      type='button'
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className='ml-6 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 py-1 transition-colors uppercase tracking-tighter'
                    >
                      {isFetchingNextPage ? 'Đang tải...' : 'Xem thêm phản hồi'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

ActivityItemBase.displayName = 'ActivityItem';

/** Bọc memo: ô hoạt động chỉ vẽ lại khi prop đổi (feed dài không re-render mỗi phím gõ). */
export const ActivityItem = memo(ActivityItemBase);
