'use client';

import { Users, UsersRound, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import type { UserReferenceResponse } from '@/types/user.type';

interface CreateTaskAssigneesProps {
  selectedAssignees: UserReferenceResponse[];
  setSelectedAssignees: React.Dispatch<
    React.SetStateAction<UserReferenceResponse[]>
  >;
  setIsAssigneePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGroupModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Khối "Người liên quan" của form TẠO việc — chọn từng người hoặc theo nhóm. */
export function CreateTaskAssignees({
  selectedAssignees,
  setSelectedAssignees,
  setIsAssigneePickerOpen,
  setIsGroupModalOpen,
}: CreateTaskAssigneesProps) {
  return (
<div className='space-y-2'>
  <FormLabel className='text-[11px] font-bold text-ws-ink-soft uppercase flex items-center gap-2'>
    <Users className='w-4 h-4 text-ws-ink-faint' />
    Người liên quan
  </FormLabel>

  {selectedAssignees.length > 0 && (
    <div className='flex flex-wrap gap-2'>
      {selectedAssignees.map((user) => (
        <div
          key={user.id}
          className='flex items-center gap-2 bg-ws-accent-bg border border-ws-accent/30 rounded-full pl-1 pr-2 py-1'
        >
          <Avatar className='w-5 h-5'>
            <AvatarImage
              src={user.avatarUrl || '/placeholder.svg'}
            />
            <AvatarFallback className='text-[10px]'>
              {user.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className='text-xs font-medium text-ws-accent'>
            {user.fullName}
          </span>
          <button
            type='button'
            onClick={() =>
              setSelectedAssignees((prev) =>
                prev.filter((u) => u.id !== user.id),
              )
            }
            className='text-ws-ink-faint hover:text-ws-danger transition-colors'
          >
            <X className='w-3 h-3' />
          </button>
        </div>
      ))}
    </div>
  )}

  <div className='flex flex-col sm:flex-row gap-2'>
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-9 w-full sm:flex-1 justify-center text-xs font-bold border-dashed'
      onClick={() => setIsAssigneePickerOpen(true)}
    >
      <Users className='w-3.5 h-3.5 mr-1.5' />
      {selectedAssignees.length > 0
        ? `Đã chọn ${selectedAssignees.length} người`
        : 'Chọn người liên quan'}
    </Button>

    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-9 w-full sm:w-auto justify-center text-xs font-bold border-dashed'
      onClick={() => setIsGroupModalOpen(true)}
    >
      <UsersRound className='w-3.5 h-3.5 mr-1.5' />
      Chọn nhóm
    </Button>
  </div>
</div>
  );
}
