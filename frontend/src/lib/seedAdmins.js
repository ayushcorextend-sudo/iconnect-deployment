/**
 * iConnect Admin Account Setup Instructions
 *
 * The app uses Supabase Auth for real authentication.
 * Before the quick-login buttons work, you must create
 * these two accounts in your Supabase project.
 *
 * HOW TO CREATE ADMIN ACCOUNTS:
 * ─────────────────────────────────────────────────────
 * 1. Go to: https://supabase.com/dashboard/project/kzxsyeznpudomeqxbnvp/auth/users
 * 2. Click "Add user" → "Create new user"
 *
 * Super Admin:
 *   Email:    admin@iconnect.in
 *   Password: Admin@123
 *
 * Content Admin:
 *   Email:    content@iconnect.in
 *   Password: Content@123
 *
 * 3. After creating both users, insert profile rows.
 *    Go to the SQL Editor and run:
 *
 *   INSERT INTO profiles (id, email, name, role)
 *   VALUES
 *     ('<super-admin-uuid>',   'admin@iconnect.in',   'Dr. Rajesh Kumar', 'superadmin'),
 *     ('<content-admin-uuid>', 'content@iconnect.in', 'Priya Sharma',     'contentadmin');
 *
 *   Replace <super-admin-uuid> and <content-admin-uuid> with the actual
 *   UUIDs shown in Auth → Users.
 *
 * REQUIRED SUPABASE TABLES:
 * ─────────────────────────────────────────────────────
 * profiles:
 *   id            uuid primary key references auth.users
 *   email         text
 *   name          text
 *   role          text  -- 'superadmin' | 'contentadmin' | 'doctor'
 *   mci_number    text
 *   phone         text
 *   program       text
 *   speciality    text
 *   college       text
 *   joining_year  int
 *   state         text
 *   hometown      text
 *   zone          text
 *   neet_rank     text
 *   created_at    timestamptz default now()
 *
 * artifacts:
 *   id            uuid primary key default gen_random_uuid()
 *   title         text
 *   subject       text
 *   type          text
 *   size          text
 *   uploaded_by   text
 *   date          date
 *   status        text  -- 'pending' | 'approved'
 *   downloads     int   default 0
 *   pages         int
 *   emoji         text
 *   access        text  -- 'all' | 'md_ms' | 'dm_mch'
 *   description   text
 *   created_at    timestamptz default now()
 *
 * NOTE: Disable RLS on both tables for the prototype,
 * or add permissive policies for anon/authenticated roles.
 */

export function getAdminSetupInstructions() {
  return {
    superAdmin: { email: 'admin@iconnect.in', password: 'Admin@123' },
    contentAdmin: { email: 'content@iconnect.in', password: 'Content@123' },
    supabaseUrl: 'https://supabase.com/dashboard/project/kzxsyeznpudomeqxbnvp/auth/users',
  };
}
