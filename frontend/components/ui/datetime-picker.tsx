"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarClock, CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  /** false = chỉ chọn ngày (ẩn ô giờ, mốc 00:00). Mặc định true. */
  showTime?: boolean
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Chọn ngày & giờ",
  disabled = false,
  className,
  minDate,
  maxDate,
  showTime = true,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date>(date ?? new Date())

  const timeValue = date ? format(date, "HH:mm") : "09:00"

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) {
      onDateChange?.(undefined)
      return
    }
    const next = new Date(day)
    if (showTime) {
      const [h, m] = (date ? format(date, "HH:mm") : "09:00").split(":").map(Number)
      next.setHours(h, m, 0, 0)
    } else {
      next.setHours(0, 0, 0, 0)
    }
    onDateChange?.(next)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return
    const base = date ? new Date(date) : new Date()
    base.setHours(h, m, 0, 0)
    onDateChange?.(base)
  }

  const isDateDisabled = (d: Date): boolean => {
    if (!minDate && !maxDate) return false
    const checkDate = new Date(d)
    checkDate.setHours(0, 0, 0, 0)
    if (minDate) {
      const min = new Date(minDate)
      min.setHours(0, 0, 0, 0)
      if (checkDate < min) return true
    }
    if (maxDate) {
      const max = new Date(maxDate)
      max.setHours(0, 0, 0, 0)
      if (checkDate > max) return true
    }
    return false
  }

  const isTodayDisabled = isDateDisabled(new Date())

  const handleTodayClick = () => {
    const today = new Date()
    setMonth(today)
    if (showTime) {
      today.setSeconds(0, 0)
      onDateChange?.(today)
    } else {
      handleDaySelect(today)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setMonth(date ?? new Date())
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {showTime ? (
            <CalendarClock className="mr-2 h-4 w-4 shrink-0" />
          ) : (
            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
          )}
          {date ? (
            format(date, showTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", {
              locale: vi,
            })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDaySelect}
          initialFocus
          locale={vi}
          month={month}
          onMonthChange={setMonth}
          modifiers={{ disabled: isDateDisabled }}
          classNames={{ today: "" }}
        />
        <div className="flex items-center justify-end border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            disabled={disabled || isTodayDisabled}
            onClick={handleTodayClick}
          >
            Hôm nay
          </Button>
        </div>
        {showTime && (
          <div className="flex items-center gap-2 border-t p-3">
            <span className="text-xs font-medium text-muted-foreground">Giờ</span>
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              disabled={disabled}
              className="h-9 w-32"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
