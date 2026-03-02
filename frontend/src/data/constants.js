export const ROLES = {
  superadmin: { label: 'Super Admin', icon: '🛡️', name: 'Dr. Rajesh Kumar', email: 'admin@iconnect.in' },
  contentadmin: { label: 'Content Admin', icon: '📚', name: 'Priya Sharma', email: 'content@iconnect.in' },
  doctor: { label: 'PG Aspirant', icon: '🩺', name: 'Dr. Sneha Verma', email: 'sneha@iconnect.in' },
};

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir',
];

export const ZONES = {
  North: ['Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Uttarakhand', 'Himachal Pradesh', 'Jammu & Kashmir'],
  South: ['Andhra Pradesh', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Telangana'],
  East: ['Bihar', 'Jharkhand', 'Odisha', 'West Bengal', 'Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'],
  West: ['Goa', 'Gujarat', 'Maharashtra', 'Rajasthan'],
  Central: ['Chhattisgarh', 'Madhya Pradesh'],
};

export const getZone = state => {
  for (const [z, states] of Object.entries(ZONES))
    if (states.includes(state)) return z;
  return 'Central';
};

export const SPECIALITIES = {
  MD: ['Internal Medicine', 'Paediatrics', 'Psychiatry', 'Radiology', 'Dermatology', 'Pathology', 'Microbiology', 'Biochemistry', 'Physiology', 'Anatomy', 'Pharmacology', 'Community Medicine', 'Anaesthesiology', 'Emergency Medicine'],
  MS: ['General Surgery', 'Orthopaedics', 'Ophthalmology', 'ENT', 'Obstetrics & Gynaecology', 'Urology'],
  DM: ['Cardiology', 'Neurology', 'Nephrology', 'Gastroenterology', 'Endocrinology', 'Pulmonology', 'Rheumatology', 'Medical Oncology'],
  MCh: ['Cardiothoracic Surgery', 'Neurosurgery', 'Plastic Surgery', 'Paediatric Surgery', 'Vascular Surgery'],
  DNB: ['General Medicine', 'Family Medicine', 'Hospital Administration'],
};

export const PROG_YEARS = { MD: 3, MS: 3, DM: 3, MCh: 3, DNB: 3 };

export const ARTIFACTS_INIT = [
  { id: 1, title: "Harrison's Principles of Internal Medicine", subject: 'Internal Medicine', type: 'PDF', size: '24.5 MB', uploadedBy: 'Priya Sharma', date: '2024-01-15', status: 'approved', downloads: 342, pages: 890, emoji: '📗', access: 'all' },
  { id: 2, title: "Gray's Anatomy for Students", subject: 'Anatomy', type: 'PDF', size: '38.2 MB', uploadedBy: 'Priya Sharma', date: '2024-01-20', status: 'approved', downloads: 289, pages: 742, emoji: '📘', access: 'all' },
  { id: 3, title: 'Pharmacology by Rang & Dale', subject: 'Pharmacology', type: 'PDF', size: '19.1 MB', uploadedBy: 'Priya Sharma', date: '2024-02-01', status: 'pending', downloads: 0, pages: 620, emoji: '📙', access: 'all' },
  { id: 4, title: 'Robbins Pathology — Core Concepts', subject: 'Pathology', type: 'PDF', size: '31.0 MB', uploadedBy: 'Priya Sharma', date: '2024-02-05', status: 'pending', downloads: 0, pages: 512, emoji: '📕', access: 'md_ms' },
  { id: 5, title: "Netter's Clinical Anatomy", subject: 'Anatomy', type: 'PDF', size: '45.8 MB', uploadedBy: 'Priya Sharma', date: '2024-02-08', status: 'approved', downloads: 156, pages: 640, emoji: '📗', access: 'all' },
];

export const LB_DATA = [
  { id: 1, name: 'Dr. Arjun Mehta', college: 'AIIMS Delhi', score: 9840, speciality: 'Cardiology', quizPts: 3800, readPts: 3200, notesPts: 1540, resPts: 1300 },
  { id: 2, name: 'Dr. Kavya Nair', college: 'CMC Vellore', score: 9420, speciality: 'Neurology', quizPts: 3600, readPts: 3100, notesPts: 1420, resPts: 1300 },
  { id: 3, name: 'Dr. Rohan Patel', college: 'KEM Mumbai', score: 9100, speciality: 'Surgery', quizPts: 3400, readPts: 3000, notesPts: 1400, resPts: 1300 },
  { id: 4, name: 'Dr. Sneha Verma', college: 'PGIMER', score: 8750, speciality: 'Internal Medicine', quizPts: 3200, readPts: 2950, notesPts: 1300, resPts: 1300, isMe: true },
  { id: 5, name: 'Dr. Aditya Singh', college: 'JIPMER', score: 8420, speciality: 'Orthopaedics', quizPts: 3000, readPts: 2800, notesPts: 1300, resPts: 1320 },
  { id: 6, name: 'Dr. Pooja Iyer', college: 'Madras Medical College', score: 8100, speciality: 'Paediatrics', quizPts: 2900, readPts: 2800, notesPts: 1200, resPts: 1200 },
  { id: 7, name: 'Dr. Vikram Joshi', college: 'BHU Varanasi', score: 7890, speciality: 'Radiology', quizPts: 2800, readPts: 2700, notesPts: 1200, resPts: 1190 },
  { id: 8, name: 'Dr. Ananya Rao', college: 'Manipal', score: 7650, speciality: 'Gynaecology', quizPts: 2700, readPts: 2600, notesPts: 1200, resPts: 1150 },
];

export const NOTIFS_INIT = [
  { id: 1, type: 'success', icon: '🎉', title: 'Welcome to iConnect!', body: 'Your account has been created. Complete your profile to get verified. — Yokesh (Admin)', time: 'Just now', unread: true, channel: 'in_app' },
  { id: 2, type: 'info', icon: '📗', title: 'New E-Book Available', body: '"Harrison\'s Principles" has been approved and is now available in the library.', time: '1 hr ago', unread: true, channel: 'in_app' },
  { id: 3, type: 'info', icon: '🏆', title: 'Leaderboard Update', body: 'You moved up 3 positions! You are now ranked #4 in your batch.', time: '3 hrs ago', unread: true, channel: 'in_app' },
  { id: 4, type: 'warn', icon: '⏰', title: 'Upcoming CME Webinar', body: 'Live Cardiology Advances session — Tomorrow at 6:00 PM IST. Tap to add to calendar.', time: 'Yesterday', unread: false, channel: 'whatsapp' },
  { id: 5, type: 'info', icon: '📝', title: 'Quiz Available: NEET-PG Mock #4', body: 'New quiz has been published. 90 minutes, 100 questions. Attempt now!', time: '2 days ago', unread: false, channel: 'email' },
];

export const USERS_DATA = [
  { id: 1, name: 'Dr. Sneha Verma', email: 'sneha@iconnect.in', role: 'PG Aspirant', prog: 'MD', speciality: 'Internal Medicine', college: 'PGIMER', year: '2nd Year', joining: 2023, state: 'Punjab', hometown: 'Chandigarh', zone: 'North', status: 'active', verified: true, score: 8750 },
  { id: 2, name: 'Dr. Arjun Mehta', email: 'arjun@iconnect.in', role: 'PG Aspirant', prog: 'DM', speciality: 'Cardiology', college: 'AIIMS Delhi', year: '1st Year', joining: 2024, state: 'Delhi', hometown: 'New Delhi', zone: 'North', status: 'active', verified: true, score: 9840 },
  { id: 3, name: 'Dr. Kavya Nair', email: 'kavya@iconnect.in', role: 'PG Aspirant', prog: 'MD', speciality: 'Neurology', college: 'CMC Vellore', year: '3rd Year', joining: 2022, state: 'Tamil Nadu', hometown: 'Thiruvananthapuram', zone: 'South', status: 'active', verified: true, score: 9420 },
  { id: 4, name: 'Dr. Rohan Patel', email: 'rohan@iconnect.in', role: 'PG Aspirant', prog: 'MS', speciality: 'Surgery', college: 'KEM Mumbai', year: '2nd Year', joining: 2023, state: 'Maharashtra', hometown: 'Pune', zone: 'West', status: 'inactive', verified: false, score: 9100 },
  { id: 5, name: 'Priya Sharma', email: 'content@iconnect.in', role: 'Content Admin', prog: '—', speciality: '—', college: '—', year: '—', joining: 2023, state: 'Madhya Pradesh', hometown: 'Bhopal', zone: 'Central', status: 'active', verified: true, score: 0 },
];

export const ab = n => {
  const c = ['#2563EB', '#7C6FF7', '#FFB347', '#FF6B8A', '#38BDF8'];
  return c[n.charCodeAt(0) % c.length];
};

export const titles = {
  dashboard: '🏠 Dashboard',
  ebooks: '📚 E-Book Library',
  upload: '⬆️ Upload E-Book',
  leaderboard: '🏆 My Leaderboard',
  activity: '📅 My Activity',
  notifications: '🔔 Notifications',
  profile: '👤 My Profile',
  users: '👥 User Management',
  reports: '📈 Reports',
  settings: '⚙️ Settings',
  registration: '📋 Registration',
  social: '👥 Social Features',
  groups: '🎯 Interest Groups',
  kahoot: '🎮 Kahoot Quiz',
};
