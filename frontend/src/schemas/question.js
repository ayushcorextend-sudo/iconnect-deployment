/**
 * question.js — Canonical schemas for question entities.
 *
 * BUG-F: ExamPage used q.correct, QuizPlayer used q.correct_key — same concept,
 * two different column names across two different tables. These schemas are the
 * single source of truth so every consumer uses the right field for the right table.
 *
 *   exam_questions  → ExamQuestionSchema  (correct: 'A'|'B'|'C'|'D')
 *   quiz_questions  → QuizQuestionSchema  (correct_key: string)
 */

import { z } from 'zod';

/** exam_questions table — used by ExamPage, QuestionEditor */
export const ExamQuestionSchema = z.object({
  id:          z.number().int().positive(),
  subjectId:   z.number().int().positive(),
  question:    z.string().min(1),
  optionA:     z.string().min(1),
  optionB:     z.string().min(1),
  optionC:     z.string().min(1),
  optionD:     z.string().min(1),
  correct:     z.enum(['A', 'B', 'C', 'D']),  // canonical: uppercase char
  explanation: z.string().optional(),
  difficulty:  z.string().optional(),
  source:      z.string().optional(),
});

/** quiz_questions row as returned from DB — used by QuizPlayer, SuperAdminApprovals */
// BUG-X: schema now matches the actual table (stem + options JSONB, not option_a/b/c/d columns)
const QuizOptionSchema = z.object({
  label: z.string().min(1),
  text:  z.string().min(1),
});

export const QuizQuestionSchema = z.object({
  id:          z.string().uuid(),
  quizId:      z.string().uuid().optional(),  // may be quiz_id (snake) on raw DB row
  quiz_id:     z.string().uuid().optional(),
  stem:        z.string().min(1),
  options:     z.array(QuizOptionSchema).min(2),
  correct_key: z.string().min(1),
  explanation: z.string().optional().nullable(),
  sort_order:  z.number().int().min(0).optional(),
});

/** DB insert shape for quiz_questions (snake_case, matches actual table) */
export const QuizQuestionInsertSchema = z.object({
  quiz_id:     z.string().uuid(),
  sort_order:  z.number().int().min(0).optional(),
  stem:        z.string().min(1, 'Question text is required'),
  options:     z.array(QuizOptionSchema).min(2, 'At least 2 options required'),
  correct_key: z.string().min(1, 'Correct answer is required'),
  explanation: z.string().optional(),
});
