'use client';

import { formatReferenceId } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFriendPickerUsers } from '@/hooks/use-user-queries';
import { UserReferenceResponse } from '@/types/user.type';
import { Check, Search, Users, X } from 'lucide-react';
import DottedSeparator from '@/components/ui/dotted-separator';

interface SelectAssigneeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (users: UserReferenceResponse[]) => void;
  selectedUsers: UserReferenceResponse[];
  title?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
}

export function SelectAssigneeModal({
  isOpen,
  onClose,
  onSelect,
  selectedUsers,
  title,
  confirmLabel,
  onConfirm,
  confirmDisabled,
}: SelectAssigneeModalProps) {
  const { results, isLoading, error, searchQuery, setSearchQuery } =
    useFriendPickerUsers(isOpen);

  const handleToggleUser = (user: UserReferenceResponse) => {
    const exists = selectedUsers.some((u) => u.id === user.id);
    const updated = exists
      ? selectedUsers.filter((u) => u.id !== user.id)
      : [...selectedUsers, user];

    onSelect(updated);
  };

  const handleRemoveSelectedUser = (userId: string) => {
    onSelect(selectedUsers.filter((u) => u.id !== userId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='ws-scope duration-150 ease-out data-[state=closed]:duration-100 data-[state=open]:zoom-in-[0.99] data-[state=closed]:zoom-out-[0.99] motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 sm:max-w-md max-h-[85vh] flex flex-col gap-3 overflow-hidden'>
        <DialogHeader className='shrink-0'>
          <DialogTitle className='flex items-center gap-2'>
            <Users className='w-5 h-5 text-ws-ink-soft' />
            {title ?? 'Chọn người thực hiện'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Tìm và chọn người tham gia thực hiện công việc.
          </DialogDescription>
        </DialogHeader>

        <div className='relative shrink-0'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ws-ink-ghost' />
          <Input
            placeholder='Tìm theo tên, email, số điện thoại, mã giới thiệu...'
            className='pl-9'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Selected Users Section — cuộn riêng, không đẩy popup dài quá màn hình */}
        {selectedUsers.length > 0 && (
          <>
            <div className='shrink-0'>
              <h4 className='text-sm font-medium text-ws-ink-soft mb-2'>
                Đã chọn ({selectedUsers.length})
              </h4>
              <div className='ws-scroll flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1'>
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className='flex items-center gap-2 bg-ws-accent-bg border border-ws-accent/30 rounded-full px-3 py-1'
                  >
                    <Avatar className='w-5 h-5'>
                      <AvatarImage src={user.avatarUrl || '/placeholder.svg'} />
                      <AvatarFallback className='text-xs'>
                        {user.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className='text-xs font-medium text-ws-accent'>
                      {user.fullName}
                    </span>
                    <button
                      type='button'
                      onClick={() => handleRemoveSelectedUser(user.id)}
                      className='text-ws-ink-faint hover:text-ws-danger transition-colors'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <DottedSeparator className='my-2 shrink-0' />
          </>
        )}

        {/* Search Results Section — chiếm phần còn lại, tự cuộn */}
        <div className='mt-1 flex flex-col flex-1 min-h-0'>
          <h4 className='text-sm font-medium text-ws-ink-soft mb-2 shrink-0'>
            Kết quả tìm kiếm
          </h4>
          <ScrollArea className='flex-1 min-h-[8rem]'>
            {isLoading ? (
              <p className='text-sm text-ws-ink-faint px-2'>Đang tìm kiếm...</p>
            ) : error ? (
              <p className='text-sm text-ws-danger px-2'>Lỗi: {error}</p>
            ) : results.length === 0 ? (
              <p className='text-sm text-ws-ink-faint px-2'>Không có kết quả</p>
            ) : (
              results.map((user) => {
                const selected = selectedUsers.some((u) => u.id === user.id);
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 rounded-md hover:bg-ws-surface-sunken cursor-pointer transition-colors ${
                      selected ? 'bg-ws-accent-bg' : ''
                    }`}
                    onClick={() => handleToggleUser(user)}
                  >
                    <div className='flex items-center gap-2'>
                      <Avatar className='w-8 h-8'>
                        <AvatarImage
                          src={user.avatarUrl || '/placeholder.svg'}
                        />
                        <AvatarFallback>
                          {user.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium'>{user.fullName}</p>
                        <p className='text-xs text-ws-ink-faint'>
                          {formatReferenceId(user.referenceId)}
                        </p>
                      </div>
                    </div>
                    {selected && <Check className='w-4 h-4 text-ws-accent' />}
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        <div className='mt-2 flex justify-end gap-2 shrink-0'>
          <Button variant='outline' onClick={onClose}>
            Hủy
          </Button>
          <Button
            className='bg-ws-solid text-ws-solid-ink hover:opacity-90'
            onClick={onConfirm ?? onClose}
            disabled={confirmDisabled}
          >
            {confirmLabel ?? 'Xong'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
