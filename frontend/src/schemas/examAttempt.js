import { z } from 'zod';

/** quiz_attempts insert — QuizPlayer */
export const QuizAttemptInsertSchema = z.object({
  quizId:     z.string().uuid(),
  userId:     z.string().uuid(),
  answers:    z.record(z.string(), z.string()),  // { question_id: chosen_key }
  score:      z.number().int().min(0),
  total:      z.number().int().min(1),
  startedAt:  z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
});

/** exam_attempts insert — ExamPage */
export const ExamAttemptInsertSchema = z.object({
  userId:      z.string().uuid(),
  subjectId:   z.number().int().positive(),
  score:       z.number().int().min(0),
  total:       z.number().int().min(1),
  answers:     z.array(z.unknown()).optional(),   // [{questionId, chosen, correct}]
  attemptedAt: z.string().datetime().optional(),
});
