-- Conferences module

CREATE TABLE IF NOT EXISTS conferences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  organizer     text NOT NULL,
  location      text NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  speciality    text DEFAULT 'All',
  description   text DEFAULT '',
  website_url   text DEFAULT '',
  registration_url text DEFAULT '',
  is_featured   boolean DEFAULT false,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE conferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "conferences_read_all" ON conferences FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "conferences_insert_admin" ON conferences FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superadmin','contentadmin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "conferences_update_admin" ON conferences FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superadmin','contentadmin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "conferences_delete_admin" ON conferences FOR DELETE
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superadmin','contentadmin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Seed 5 real upcoming Indian medical conferences
INSERT INTO conferences (title, organizer, location, start_date, end_date, speciality, description, website_url, is_featured)
VALUES
  (
    'AIIMS New Delhi Annual Medical Conference 2025',
    'AIIMS New Delhi',
    'New Delhi, Delhi',
    '2025-11-14', '2025-11-16',
    'All',
    'Annual mega-conference covering advances across all medical disciplines. CME credits available. NEET-PG aspirants are encouraged to attend for exam-relevant clinical updates.',
    'https://aiims.edu',
    true
  ),
  (
    'APICON 2025 — API National Conference of Medicine',
    'Association of Physicians of India',
    'Mumbai, Maharashtra',
    '2025-12-26', '2025-12-29',
    'Internal Medicine',
    'The premier annual conference for physicians of India. Covers internal medicine, endocrinology, cardiology, and critical care with latest clinical guidelines.',
    'https://apiindia.org',
    true
  ),
  (
    'IAPSM National Conference 2025',
    'Indian Association of Preventive & Social Medicine',
    'Chandigarh, Punjab',
    '2026-02-05', '2026-02-07',
    'Preventive & Social Medicine',
    'National conference on preventive medicine, public health policies, epidemiology, and community health practices. Relevant for MD (Community Medicine) aspirants.',
    'https://iapsmhq.org',
    false
  ),
  (
    'ISCCM Annual Conference — CRITICARE 2026',
    'Indian Society of Critical Care Medicine',
    'Hyderabad, Telangana',
    '2026-01-23', '2026-01-25',
    'Critical Care / Anesthesia',
    'South Asia''s largest critical care conference with workshops on mechanical ventilation, sepsis management, and ICU protocols. Live patient simulations included.',
    'https://isccm.org',
    false
  ),
  (
    'FOGSI AICOG 2026',
    'Federation of Obstetric & Gynaecological Societies of India',
    'Kolkata, West Bengal',
    '2026-01-08', '2026-01-11',
    'Obstetrics & Gynaecology',
    'All India Congress of Obstetrics and Gynaecology — the largest O&G conference in Asia with live surgical demonstrations and NEET-SS oriented sessions.',
    'https://fogsi.org',
    true
  )
ON CONFLICT DO NOTHING;
