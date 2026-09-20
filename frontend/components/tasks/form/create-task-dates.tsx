'use client';

import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import type { TaskFormValues } from './create-task-schema';

/**
 * Cặp mốc thời gian của form TẠO việc.
 *
 * Dùng thang màu token `ws-*`, KHÁC form sửa (`task-form-dates.tsx`) vốn còn
 * dùng `gray-*` thô. Hai khối trông giống nhau nhưng không phải bản sao — gộp
 * lại là đổi màu ở một trong hai màn.
 */
export function CreateTaskDates({
  form,
}: {
  form: UseFormReturn<TaskFormValues>;
}) {
  return (
<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
  <FormField
    control={form.control}
    name='startDate'
    render={({ field }) => (
      <FormItem>
        <FormLabel className='text-[11px] font-bold text-ws-ink-soft uppercase'>
          Ngày bắt đầu
        </FormLabel>
        <FormControl>
          <DateTimePicker
            date={field.value ? new Date(field.value) : undefined}
            onDateChange={(date) =>
              field.onChange(date?.toISOString() || '')
            }
            maxDate={
              form.watch('dueDate')
                ? new Date(form.watch('dueDate') as string)
                : undefined
            }
            className='h-9 text-sm'
            placeholder='Mặc định ngày tạo...'
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name='dueDate'
    render={({ field }) => (
      <FormItem>
        <FormLabel className='text-[11px] font-bold text-ws-ink-soft uppercase'>
          Ngày hết hạn
        </FormLabel>
        <FormControl>
          <DateTimePicker
            date={field.value ? new Date(field.value) : undefined}
            onDateChange={(date) =>
              field.onChange(date?.toISOString() || '')
            }
            minDate={
              form.watch('startDate')
                ? new Date(form.watch('startDate') as string)
                : undefined
            }
            className='h-9 text-sm'
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
  );
}
