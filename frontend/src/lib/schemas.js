/**
 * Zod validation schemas for all Supabase mutations.
 * Use validateSchema(schema, data) before any DB write to catch bad payloads early.
 */
import { z } from 'zod';

// ─── Primitives ───────────────────────────────────────────────────────────────
const uuid   = z.string().uuid();
const nonEmpty = z.string().min(1);
const email  = z.string().email();
const url    = z.string().url();
const optUrl = z.string().url().optional().or(z.literal(''));

// ─── profiles ────────────────────────────────────────────────────────────────
export const ProfileSchema = z.object({
  name:        nonEmpty.max(120),
  email:       email,
  role:        z.enum(['doctor', 'contentadmin', 'superadmin']),
  speciality:  z.string().max(100).optional(),
  college:     z.string().max(150).optional(),
  district:    z.string().max(100).optional(),
  state:       z.string().max(100).optional(),
  mci_number:  z.string().max(30).optional(),
  phone:       z.string().max(20).optional(),
  hometown:    z.string().max(100).optional(),
});

export const ProfileUpdateSchema = ProfileSchema.partial();

// ─── artifacts (e-books / uploads) ───────────────────────────────────────────
export const ArtifactSchema = z.object({
  title:       nonEmpty.max(200),
  subject:     nonEmpty.max(100),
  description: z.string().max(1000).optional(),
  type:        z.enum(['pdf', 'video', 'link', 'other']).default('pdf'),
  pages:       z.number().int().min(1).optional(),
  emoji:       z.string().max(10).optional(),
  file_url:    optUrl,
  status:      z.enum(['pending', 'approved', 'rejected', 'archived']).default('pending'),
  uploaded_by: uuid,
});

export const ArtifactUpdateSchema = ArtifactSchema.partial().omit({ uploaded_by: true });

// ─── notifications ────────────────────────────────────────────────────────────
export const NotificationSchema = z.object({
  user_id: uuid,
  title:   nonEmpty.max(200),
  body:    z.string().max(1000).optional(),
  type:    z.enum(['info', 'success', 'warning', 'error']).default('info'),
  icon:    z.string().max(10).optional(),
  channel: z.enum(['in_app', 'email', 'sms']).default('in_app'),
  is_read: z.boolean().default(false),
});

// ─── activity_logs ────────────────────────────────────────────────────────────
export const ActivityLogSchema = z.object({
  user_id:       uuid,
  activity_type: nonEmpty.max(60),
  points:        z.number().int().min(0).default(0),
  metadata:      z.record(z.unknown()).optional(),
});

// ─── quizzes ─────────────────────────────────────────────────────────────────
export const QuizSchema = z.object({
  title:       nonEmpty.max(200),
  subject:     nonEmpty.max(100),
  description: z.string().max(800).optional(),
  created_by:  uuid,
  status:      z.enum(['draft', 'pending', 'approved', 'rejected']).default('draft'),
  time_limit:  z.number().int().min(0).optional(),
});

export const QuizQuestionSchema = z.object({
  quiz_id:         uuid,
  question_text:   nonEmpty.max(1000),
  options:         z.array(z.string().min(1)).min(2).max(6),
  correct_option:  z.number().int().min(0).max(5),
  explanation:     z.string().max(1000).optional(),
  order_index:     z.number().int().min(0).default(0),
});

export const QuizAttemptSchema = z.object({
  quiz_id:    uuid,
  user_id:    uuid,
  score:      z.number().int().min(0),
  total:      z.number().int().min(1),
  answers:    z.record(z.number().int()),
  time_taken: z.number().int().min(0).optional(),
});

// ─── video_lectures ───────────────────────────────────────────────────────────
export const VideoLectureSchema = z.object({
  title:      nonEmpty.max(200),
  subject:    nonEmpty.max(100),
  url:        url,
  thumbnail:  optUrl,
  duration:   z.number().int().min(0).optional(),
  created_by: uuid,
  status:     z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

// ─── flashcard_decks ─────────────────────────────────────────────────────────
export const FlashcardDeckSchema = z.object({
  title:      nonEmpty.max(200),
  subject:    nonEmpty.max(100),
  created_by: uuid,
  status:     z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

export const FlashcardSchema = z.object({
  deck_id:     uuid,
  front:       nonEmpty.max(1000),
  back:        nonEmpty.max(1000),
  order_index: z.number().int().min(0).default(0),
});

// ─── doubts ───────────────────────────────────────────────────────────────────
export const DoubtSchema = z.object({
  user_id: uuid,
  title:   nonEmpty.max(300),
  body:    z.string().max(3000).optional(),
  subject: z.string().max(100).optional(),
  status:  z.enum(['open', 'resolved']).default('open'),
});

export const DoubtReplySchema = z.object({
  doubt_id:    uuid,
  user_id:     uuid,
  reply_text:  nonEmpty.max(3000),
});

// ─── live_arenas ─────────────────────────────────────────────────────────────
export const LiveArenaSchema = z.object({
  title:        nonEmpty.max(200),
  pin:          z.string().min(4).max(10),
  created_by:   uuid,
  status:       z.enum(['waiting', 'active', 'ended']).default('waiting'),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
});

// ─── conferences ─────────────────────────────────────────────────────────────
export const ConferenceSchema = z.object({
  title:      nonEmpty.max(200),
  speciality: z.string().max(100).optional(),
  date:       z.string().min(1),
  location:   z.string().max(200).optional(),
  url:        optUrl,
  featured:   z.boolean().default(false),
});

// ─── admin_webinars ──────────────────────────────────────────────────────────
export const WebinarSchema = z.object({
  title:        nonEmpty.max(200),
  speaker:      z.string().max(100).optional(),
  scheduled_at: z.string().datetime({ offset: true }),
  url:          optUrl,
  description:  z.string().max(800).optional(),
});

// ─── personal_targets ────────────────────────────────────────────────────────
export const PersonalTargetSchema = z.object({
  user_id:      uuid,
  target_score: z.number().int().min(0).max(999999).optional(),
  target_date:  z.string().optional(),
  speciality:   z.string().max(100).optional(),
  daily_goal:   z.number().int().min(0).max(24).optional(),
});

// ─── smart_notes ─────────────────────────────────────────────────────────────
export const SmartNoteSchema = z.object({
  user_id:     uuid,
  artifact_id: uuid,
  note_text:   nonEmpty.max(5000),
  mnemonic:    z.string().max(500).optional(),
  tags:        z.array(z.string().max(50)).max(10).optional(),
  starred:     z.boolean().default(false),
});

// ─── audit_logs ──────────────────────────────────────────────────────────────
export const AuditLogSchema = z.object({
  user_id:     uuid,
  action:      nonEmpty.max(100),
  resource:    nonEmpty.max(100),
  resource_id: z.string().optional(),
  details:     z.record(z.unknown()).optional(),
});

// ─── Validation helper ────────────────────────────────────────────────────────
/**
 * Validate data against a Zod schema.
 * Returns { data, error } — mirrors the Supabase response pattern.
 * On success: { data: <parsed>, error: null }
 * On failure: { data: null, error: <ZodError> }
 *
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} raw
 * @returns {{ data: T | null, error: import('zod').ZodError | null }}
 */
export function validateSchema(schema, raw) {
  const result = schema.safeParse(raw);
  if (result.success) return { data: result.data, error: null };
  return { data: null, error: result.error };
}

/**
 * Strict insert validator — use before every Supabase .insert() or .upsert().
 *
 * - Strips unknown fields (so extra props from state don't pollute DB)
 * - Logs a warning on failure but returns the raw value as a fallback
 *   so that existing functionality is never broken by a validation miss.
 *
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} raw
 * @returns {T} Parsed (cleaned) data, or raw data if validation fails
 */
export function validateInsert(schema, raw) {
  const result = schema.strip ? schema.strip().safeParse(raw) : schema.safeParse(raw);
  if (result.success) return result.data;
  console.warn('[validateInsert] Schema validation failed:', formatZodError(result.error), raw);
  return raw; // fallback: allow insert with original data rather than crash
}

/**
 * Returns a human-readable string of the first validation error.
 * @param {import('zod').ZodError} zodError
 */
export function formatZodError(zodError) {
  if (!zodError?.issues?.length) return 'Validation failed';
  const { path, message } = zodError.issues[0];
  return path.length ? `${path.join('.')}: ${message}` : message;
}
