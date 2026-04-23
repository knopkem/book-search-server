import { z } from 'zod';

const baseBookSchema = z.object({
  name: z.string().trim().max(200).default(''),
  description: z.string().trim().max(300).default(''),
  remarks: z.string().trim().max(4000).default(''),
});

export const bookInputSchema = baseBookSchema.superRefine((value, ctx) => {
  if (!value.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Author is required.',
      path: ['name'],
    });
  }

  if (!value.description) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Title is required.',
      path: ['description'],
    });
  }
});

export const bookSchema = baseBookSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const booksQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  author: z.string().trim().max(200).optional(),
  title: z.string().trim().max(300).optional(),
  remarks: z.string().trim().max(300).optional(),
});

export const bookIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const bulkBooksSchema = z.array(bookInputSchema).max(10_000);

export const bookImportSummarySchema = z.object({
  processedCount: z.number().int().nonnegative(),
  importedCount: z.number().int().nonnegative(),
  skippedExistingCount: z.number().int().nonnegative(),
  skippedDuplicateCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

export type BookInput = z.infer<typeof bookInputSchema>;
export type BooksQuery = z.infer<typeof booksQuerySchema>;
export type BookImportSummary = z.infer<typeof bookImportSummarySchema>;
