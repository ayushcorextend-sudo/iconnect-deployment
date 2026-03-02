-- Create auth users first
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES 
(
  '99810dee-0942-40e4-a791-7cd7aa1d0766',
  'admin@iconnect.in',
  crypt('Admin@123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Dr. Rajesh Kumar"}'
),
(
  'e977be55-bb7d-4cc3-ba01-5a5aad179a01',
  'content@iconnect.in',
  crypt('Content@123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Priya Sharma"}'
);

-- Now insert their profiles
INSERT INTO profiles (id, name, email, role, verified) VALUES
('99810dee-0942-40e4-a791-7cd7aa1d0766', 'Dr. Rajesh Kumar', 'admin@iconnect.in', 'superadmin', true),
('e977be55-bb7d-4cc3-ba01-5a5aad179a01', 'Priya Sharma', 'content@iconnect.in', 'contentadmin', true);