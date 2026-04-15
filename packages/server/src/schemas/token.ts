import { z } from 'zod';

export const createApiTokenSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const tokenIdParamsSchema = z.object({
  id: z.string().uuid(),
});
