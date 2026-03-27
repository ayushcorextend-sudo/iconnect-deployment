import { z } from 'zod';

/** artifacts insert — UploadPage */
export const ArtifactInsertSchema = z.object({
  title:        z.string().min(1, 'Title is required'),
  subject:      z.string().min(1, 'Subject is required'),
  type:         z.string().default('PDF'),
  size:         z.string().optional(),
  uploadedBy:   z.string().optional(),
  uploadedById: z.string().uuid().optional(),
  status:       z.enum(['pending', 'approved', 'rejected']).default('pending'),
  pages:        z.number().int().min(0).optional(),
  emoji:        z.string().optional(),
  access:       z.enum(['all', 'premium']).default('all'),
});
