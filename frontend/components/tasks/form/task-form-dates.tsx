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
import type { UpdateTaskFormValues } from './task-form-schema';

/**
 * Cặp mốc thời gian của form sửa việc: ngày bắt đầu và ngày hết hạn.
 *
 * Hai ô ràng buộc lẫn nhau qua `maxDate`/`minDate` đọc từ `form.watch` — đó là
 * lý do khối này nhận cả `form` chứ không phải hai giá trị rời.
 */
export function TaskFormDates({
  form,
}: {
  form: UseFormReturn<UpdateTaskFormValues>;
}) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
      <FormField
        control={form.control}
        name='startDate'
        render={({ field }) => (
          <FormItem>
            <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
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
            <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
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
