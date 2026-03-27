import { z } from 'zod';

/** audit_logs insert — auditLog.js (fixes BUG-Q: silent audit fail) */
export const AuditLogInsertSchema = z.object({
  actorId:    z.string().uuid().optional(),
  actorEmail: z.string().email().optional(),
  action:     z.string().min(1, 'Action is required'),
  resource:   z.string().default(''),
  resourceId: z.string().default(''),
  details:    z.record(z.unknown()).default({}),
  ipAddress:  z.string().default(''),
});
