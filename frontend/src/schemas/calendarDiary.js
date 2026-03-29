import { z } from 'zod';

/** calendar_diary upsert — ActivityPage, DiaryPanel */
export const CalendarDiaryUpsertSchema = z.object({
  userId:        z.string().uuid(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  entries:       z.array(z.unknown()).default([]),
  mood:          z.enum(['great', 'good', 'okay', 'tired', 'stressed']).optional(),
  personalNotes: z.string().optional(),
});
