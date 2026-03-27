import { z } from 'zod';

/** notifications insert — sendNotification.js, BroadcastPage */
export const NotificationInsertSchema = z.object({
  userId:  z.string().uuid(),
  type:    z.string().default('info'),
  icon:    z.string().default('🔔'),
  title:   z.string().min(1, 'Title is required'),
  body:    z.string().default(''),
  channel: z.string().default('in_app'),
  isRead:  z.boolean().default(false),
});
