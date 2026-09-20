import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  slug: z.string().optional(),
  categoryId: z.string().min(1, 'Category ID is required'),
});

export type CreateDocumentFormValues = z.infer<typeof createDocumentSchema>;

export const createDocumentCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export type CreateDocumentCategoryFormValues = z.infer<
  typeof createDocumentCategorySchema
>;

export const createDocumentChapterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export type CreateDocumentChapterFormValues = z.infer<
  typeof createDocumentChapterSchema
>;

export const updateDocumentChapterSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  views: z.coerce.number().optional(),
  videoUrl: z.string().optional(),
});

export type UpdateDocumentChapterFormValues = z.infer<
  typeof updateDocumentChapterSchema
>;

export const updateDocumentSchema = createDocumentSchema.partial().extend({
  title: z.string().optional(),
  categoryId: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  downloads: z.coerce.number().optional(),
  publishedAt: z.date().optional(),
});

export type UpdateDocumentFormValues = z.infer<typeof updateDocumentSchema>;
