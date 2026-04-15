import { z } from 'zod';

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
});
