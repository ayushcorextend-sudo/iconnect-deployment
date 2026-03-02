CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  name text, email text,
  role text DEFAULT 'doctor',
  mci_number text, phone text, program text,
  speciality text, college text, joining_year int,
  state text, hometown text, zone text,
  neet_rank text, verified boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifacts (
  id serial PRIMARY KEY,
  title text, subject text,
  type text DEFAULT 'PDF',
  size text, uploaded_by text,
  date date DEFAULT now(),
  status text DEFAULT 'pending',
  downloads int DEFAULT 0,
  pages int DEFAULT 0,
  emoji text DEFAULT '📗',
  access text DEFAULT 'all',
  created_at timestamp DEFAULT now()
);

INSERT INTO artifacts (title, subject, size, uploaded_by, date, status, downloads, pages, emoji, access) VALUES
('Harrisons Principles', 'Internal Medicine', '24.5 MB', 'Priya Sharma', '2024-01-15', 'approved', 342, 890, '📗', 'all'),
('Grays Anatomy', 'Anatomy', '38.2 MB', 'Priya Sharma', '2024-01-20', 'approved', 289, 742, '📘', 'all'),
('Pharmacology Rang Dale', 'Pharmacology', '19.1 MB', 'Priya Sharma', '2024-02-01', 'pending', 0, 620, '📙', 'all'),
('Robbins Pathology', 'Pathology', '31.0 MB', 'Priya Sharma', '2024-02-05', 'pending', 0, 512, '📕', 'md_ms'),
('Netters Clinical Anatomy', 'Anatomy', '45.8 MB', 'Priya Sharma', '2024-02-08', 'approved', 156, 640, '📗', 'all');