import { z } from 'zod';

/** activity_logs insert — trackActivity.js */
export const ActivityLogInsertSchema = z.object({
  userId:          z.string().uuid(),
  activityType:    z.string().min(1),
  referenceId:     z.string().default(''),
  durationMinutes: z.number().int().positive().optional(),
  // score_delta intentionally omitted — DB trigger fills it server-side
});

/** DB shape (snake_case) */
export const ActivityLogDBSchema = z.object({
  user_id:          z.string().uuid(),
  activity_type:    z.string().min(1),
  reference_id:     z.string().default(''),
  duration_minutes: z.number().int().positive().optional(),
});
