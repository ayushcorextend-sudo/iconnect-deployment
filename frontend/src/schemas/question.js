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

/** quiz_questions table — used by QuizPlayer, QuizBuilder, LiveArena, SuperAdminApprovals */
export const QuizQuestionSchema = z.object({
  id:         z.string().uuid(),
  quizId:     z.string().uuid(),
  question:   z.string().min(1),
  optionA:    z.string().min(1),
  optionB:    z.string().min(1),
  optionC:    z.string().min(1),
  optionD:    z.string().min(1),
  correctKey: z.enum(['a', 'b', 'c', 'd']),   // canonical: lowercase for quiz table
  sortOrder:  z.number().int().min(0).optional(),
});

/** DB insert shape for quiz_questions (snake_case) */
export const QuizQuestionInsertSchema = z.object({
  quiz_id:     z.string().uuid(),
  question:    z.string().min(1),
  option_a:    z.string().min(1),
  option_b:    z.string().min(1),
  option_c:    z.string().min(1),
  option_d:    z.string().min(1),
  correct_key: z.enum(['a', 'b', 'c', 'd']),
  sort_order:  z.number().int().min(0).optional(),
});
