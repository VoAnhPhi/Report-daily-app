'use client';

import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadButton } from '@/lib/uploadthing';
import { EmojiPicker } from '@/components/emoji-picker';
import { cn } from '@/lib/utils';
import { MentionTextarea, type MentionCandidate } from './mention-textarea';
import { getFileMediaType } from '../task-utils';
import { FileThumbnail } from '../shared/file-thumbnail';

interface TaskCommentComposerProps {
  comment: string;
  setComment: React.Dispatch<React.SetStateAction<string>>;
  commentAttachments: { name: string; url: string }[];
  setCommentAttachments: React.Dispatch<
    React.SetStateAction<{ name: string; url: string }[]>
  >;
  replyingTo: { id: string; name: string } | null;
  setReplyingTo: React.Dispatch<
    React.SetStateAction<{ id: string; name: string } | null>
  >;
  mentionCandidates: MentionCandidate[];
  onMentionSelect?: (candidate: MentionCandidate) => void;
  isAddingComment: boolean;
  isUploadingCommentFile: boolean;
  setIsUploadingCommentFile: React.Dispatch<React.SetStateAction<boolean>>;
  onPost: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
}

/**
 * Khu soạn nhận xét: xem trước tệp đã chọn, banner "đang phản hồi", ô nhập @mention
 * và thanh công cụ (đính kèm / emoji / gửi) tách dưới ô nhập (tránh che chữ khi gõ dài).
 */
export function TaskCommentComposer({
  comment,
  setComment,
  commentAttachments,
  setCommentAttachments,
  replyingTo,
  setReplyingTo,
  mentionCandidates,
  onMentionSelect,
  isAddingComment,
  isUploadingCommentFile,
  setIsUploadingCommentFile,
  onPost,
  onKeyDown,
  onPaste,
}: TaskCommentComposerProps) {
  return (
    <>
      {commentAttachments.length > 0 && (
        <div className='px-6 py-3 flex flex-wrap gap-3'>
          {commentAttachments.map((file, i) => {
            const type = getFileMediaType(file.name);
            return (
              <div
                key={i}
                className='relative group/file flex flex-col gap-1 w-16'
              >
                <div className='w-16 h-16 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shadow-sm shrink-0'>
                  <FileThumbnail
                    type={type}
                    url={file.url}
                    name={file.name}
                    playClassName='w-4 h-4'
                    fileIconClassName='w-5 h-5'
                  />
                </div>
                <p className='text-[8px] font-bold text-zinc-500 truncate text-center w-full px-0.5'>
                  {file.name}
                </p>
                <button
                  type='button'
                  onClick={() =>
                    setCommentAttachments((prev) =>
                      prev.filter((_, idx) => idx !== i),
                    )
                  }
                  className='absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md z-10'
                >
                  <X className='w-2.5 h-2.5' />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {replyingTo && (
        <div className='px-6 py-2 bg-blue-50 flex items-center justify-between border-b border-blue-100 animate-in slide-in-from-bottom-1'>
          <div className='flex items-center gap-2'>
            <div className='w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse' />
            <span className='text-[10px] font-bold text-blue-700 uppercase'>
              Đang phản hồi{' '}
              <span className='text-blue-900'>{replyingTo.name}</span>
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className='p-1 hover:bg-blue-100 rounded-full text-blue-500'
          >
            <X className='w-3 h-3' />
          </button>
        </div>
      )}

      <div className='p-6 pt-4'>
        <div className='space-y-2'>
          <MentionTextarea
            placeholder='Viết nhận xét... (gõ @ để nhắc người liên quan)'
            value={comment}
            onChange={setComment}
            candidates={mentionCandidates}
            onMentionSelect={onMentionSelect}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            className='resize-none min-h-[90px] bg-zinc-50 border-zinc-200 focus:bg-white focus:border-zinc-300 rounded-2xl p-3.5 text-sm transition-all'
          />
          {/* Thanh công cụ tách khỏi ô nhập để không che chữ khi gõ dài. */}
          <div className='flex items-center justify-end gap-2'>
            <UploadButton
              endpoint='attachmentUploader'
              onUploadBegin={() => setIsUploadingCommentFile(true)}
              onClientUploadComplete={(res) => {
                setIsUploadingCommentFile(false);
                if (res)
                  setCommentAttachments((prev) => [
                    ...prev,
                    ...res.map((f) => ({ name: f.name, url: f.ufsUrl })),
                  ]);
              }}
              onUploadError={() => setIsUploadingCommentFile(false)}
              appearance={{
                container: 'w-auto',
                button: cn(
                  '!h-8 !w-8 !min-w-0 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 rounded-lg shadow-none flex items-center justify-center p-0',
                  isUploadingCommentFile && 'cursor-not-allowed opacity-50',
                ),
                allowedContent: 'hidden',
              }}
              content={{
                button: () =>
                  isUploadingCommentFile ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin text-blue-600' />
                  ) : (
                    <Paperclip className='w-4 h-4' />
                  ),
              }}
            />
            <div className='w-[1px] h-4 bg-zinc-200 shrink-0' />
            <EmojiPicker
              onEmojiSelect={(emoji) => setComment((prev) => prev + emoji)}
            />
            <div className='w-[1px] h-4 bg-zinc-200 shrink-0' />
            <Button
              size='icon'
              disabled={
                (!comment.trim() && commentAttachments.length === 0) ||
                isAddingComment ||
                isUploadingCommentFile
              }
              onClick={onPost}
              className='h-8 w-8 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-md transition-all active:scale-95'
            >
              {isAddingComment ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Send className='w-3.5 h-3.5' />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
