/**
 * seed_doctor.mjs — creates demo doctor account in Supabase
 *
 * Usage:
 *   1. Get your service_role key from Supabase Dashboard > Settings > API
 *   2. Replace SUPABASE_SERVICE_ROLE_KEY below with your actual key
 *   3. Run: node scripts/seed_doctor.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const DEMO_DOCTOR = {
  email: 'doctor@iconnect.in',
  password: 'Doctor@123',
  name: 'Dr. Sneha Verma',
  role: 'doctor',
  speciality: 'Internal Medicine',
  college: 'PGIMER',
  state: 'Punjab',
  zone: 'North',
  verified: true,
  status: 'active',
}

async function seed() {
  console.log('Seeding demo doctor account...')

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_DOCTOR.email,
    password: DEMO_DOCTOR.password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message?.includes('already')) {
      console.log('Auth user already exists — skipping auth creation.')
    } else {
      console.error('Auth error:', authError.message)
      process.exit(1)
    }
  }

  const userId = authData?.user?.id

  if (userId) {
    // Upsert profile row
    const { error: profileError } = await supabase.from('profiles').upsert([{
      id: userId,
      email: DEMO_DOCTOR.email,
      name: DEMO_DOCTOR.name,
      role: DEMO_DOCTOR.role,
      speciality: DEMO_DOCTOR.speciality,
      college: DEMO_DOCTOR.college,
      state: DEMO_DOCTOR.state,
      zone: DEMO_DOCTOR.zone,
      verified: DEMO_DOCTOR.verified,
      status: DEMO_DOCTOR.status,
    }])

    if (profileError) {
      console.error('Profile upsert error:', profileError.message)
    } else {
      console.log('Profile upserted successfully.')
    }
  }

  console.log('Done! Demo doctor credentials:')
  console.log('  Email:    doctor@iconnect.in')
  console.log('  Password: Doctor@123')
}

seed().catch(console.error)
