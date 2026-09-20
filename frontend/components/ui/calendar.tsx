'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      formatters={{
        formatMonthDropdown: (date) => `Tháng ${date.getMonth() + 1}`,
      }}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4 cursor-pointer',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center h-10 ',
        caption_label: 'text-sm font-medium',
        button_previous: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-7 w-7 p-0 hover:opacity-100 z-10 cursor-pointer hover:text-modern-primary hover:bg-modern-primary/10',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-7 w-7 p-0 hover:opacity-100 z-10 cursor-pointer hover:text-modern-primary hover:bg-modern-primary/10',
        ),
        month_grid: 'w-full border-collapse mt-4',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-normal text-xs',
        week: 'flex w-full mt-2',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-modern-primary/10 hover:text-modern-primary',
        ),
        day_button: 'h-9 w-9 p-0',
        selected:
          'bg-modern-primary text-white hover:bg-modern-primary/90 hover:text-white focus:bg-modern-primary focus:text-white',
        today:
          'bg-modern-primary/20 text-modern-primary font-semibold border-2 border-modern-primary',
        outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-modern-primary/20 aria-selected:text-muted-foreground aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'aria-selected:bg-modern-primary/10 aria-selected:text-modern-primary',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
