import * as z from 'zod';
import { TaskPriority, TaskStatus } from '@/types/task.type';
import {
  attachmentSchema,
  dueAfterStartIssue,
  isDueAfterStart,
} from '../task-schema-parts';

/** Schema + kiểu dữ liệu của form sửa công việc (nguồn dùng chung với modal cha). */
export const updateTaskSchema = z
  .object({
    title: z.string().min(1, 'Tiêu đề không được để trống'),
    description: z.string().default(''),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(TaskPriority),
    category: z.string(),
    startDate: z.string().default(''),
    dueDate: z.string().default(''),
    attachments: z.array(attachmentSchema).default([]),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          label: z.string().min(1),
          done: z.boolean(),
          deleted: z.boolean().optional(),
          /** Đánh dấu xoá hẳn; chỉ thực sự xoá khi bấm Lưu. */
          purge: z.boolean().optional(),
          reportDueAt: z.string().nullable().optional(),
          completionDueAt: z.string().nullable().optional(),
        }),
      )
      .default([]),
  })
  .refine(isDueAfterStart, dueAfterStartIssue());

export interface UpdateTaskFormValues {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  startDate?: string;
  dueDate?: string;
  attachments?: { name: string; url: string }[];
  items?: {
    id?: string;
    label: string;
    done: boolean;
    deleted?: boolean;
    /** Xoá hẳn khi bấm Lưu (server gỡ khỏi mảng kèm lịch sử). */
    purge?: boolean;
    reportDueAt?: string | null;
    completionDueAt?: string | null;
  }[];
}
