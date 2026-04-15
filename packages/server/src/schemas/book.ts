import { z } from 'zod';

const baseBookSchema = z.object({
  name: z.string().trim().max(200).default(''),
  description: z.string().trim().max(300).default(''),
  remarks: z.string().trim().max(4000).default(''),
});

export const bookInputSchema = baseBookSchema.superRefine((value, ctx) => {
  if (!value.name && !value.description) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Author or title is required.',
      path: ['name'],
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

export type BookInput = z.infer<typeof bookInputSchema>;
export type BooksQuery = z.infer<typeof booksQuerySchema>;
