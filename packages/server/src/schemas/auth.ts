import { z } from 'zod';

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

export const mobileGoogleAuthSchema = z.object({
  credential: z.string().min(1),
  deviceName: z.string().trim().min(1).max(100).optional(),
});
