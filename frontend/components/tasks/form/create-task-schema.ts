import * as z from 'zod';
import { TaskPriority, TaskStatus } from '@/types/task.type';
import {
  attachmentSchema,
  dueAfterStartIssue,
  isDueAfterStart,
} from '../task-schema-parts';

/** Schema + kiểu dữ liệu của form TẠO công việc (khác form sửa: không có `id`,
 * `deleted`, `purge` ở việc con, và trạng thái chỉ cho hai giá trị đầu). */
export const taskSchema = z
  .object({
    title: z.string().min(1, 'Tiêu đề không được để trống'),
    description: z.string().optional(),
    status: z.enum([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
    priority: z.nativeEnum(TaskPriority),
    category: z.string(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    attachments: z.array(attachmentSchema).optional(),
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          done: z.boolean(),
          reportDueAt: z.string().nullable().optional(),
          completionDueAt: z.string().nullable().optional(),
        }),
      )
      .optional(),
  })
  .refine(isDueAfterStart, dueAfterStartIssue());

export type TaskFormValues = z.infer<typeof taskSchema>;
