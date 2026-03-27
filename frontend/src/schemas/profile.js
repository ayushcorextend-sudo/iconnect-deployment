import { z } from 'zod';

/** Frontend form shape (camelCase) — used in Registration and ProfilePage */
export const ProfileFormSchema = z.object({
  firstName:  z.string().min(1, 'First name is required'),
  lastName:   z.string().min(1, 'Last name is required'),
  mciNumber:  z.string().min(1, 'MCI number is required'),
  phone:      z.string().max(20).optional(),
  speciality: z.string().max(100).optional(),
  college:    z.string().max(200).optional(),
  state:      z.string().max(100).optional(),
  district:   z.string().max(100).optional(),
});

/** DB row shape (snake_case) — validated before insert/update */
export const ProfileDBSchema = z.object({
  first_name:  z.string().min(1),
  last_name:   z.string().min(1),
  mci_number:  z.string().min(1),
  phone:       z.string().max(20).optional(),
  speciality:  z.string().max(100).optional(),
  college:     z.string().max(200).optional(),
  state:       z.string().max(100).optional(),
  district:    z.string().max(100).optional(),
});
