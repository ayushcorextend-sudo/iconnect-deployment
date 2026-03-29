import { z } from 'zod';

/** flashcards insert — FlashcardMaker, SpacedRepetition */
export const FlashcardInsertSchema = z.object({
  deckId:    z.string().uuid(),
  front:     z.string().min(1, 'Front is required'),
  back:      z.string().min(1, 'Back is required'),
  sortOrder: z.number().int().min(0).default(0),
});

/** flashcard_decks insert */
export const FlashcardDeckInsertSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  subject:     z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  status:      z.enum(['pending', 'approved', 'rejected']).default('pending'),
  createdBy:   z.string().uuid(),
});
