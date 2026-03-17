export const ROLES = {
  superadmin:   { label: 'Super Admin',   icon: '🛡️' },
  contentadmin: { label: 'Content Admin', icon: '📚' },
  doctor:       { label: 'PG Aspirant',   icon: '🩺' },
};

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir',
];

export const DISTRICTS_BY_STATE = {
  'Andhra Pradesh': ['Visakhapatnam', 'East Godavari', 'West Godavari', 'Krishna', 'Guntur', 'Kurnool', 'Nellore', 'Chittoor', 'Kadapa', 'Anantapur', 'Srikakulam', 'Vizianagaram'],
  'Arunachal Pradesh': ['Papum Pare', 'East Kameng', 'Lower Subansiri', 'East Siang', 'West Siang', 'Tirap', 'Changlang'],
  'Assam': ['Kamrup Metro', 'Sonitpur', 'Dibrugarh', 'Cachar', 'Nagaon', 'Jorhat', 'Barpeta', 'Lakhimpur', 'Golaghat', 'Sivasagar'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Rohtas', 'Siwan', 'Vaishali', 'Samastipur', 'Nalanda', 'Aurangabad'],
  'Chhattisgarh': ['Raipur', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Surguja', 'Korba', 'Raigarh', 'Janjgir-Champa', 'Jagdalpur'],
  'Goa': ['North Goa', 'South Goa'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Mehsana', 'Bharuch', 'Amreli'],
  'Haryana': ['Gurugram', 'Faridabad', 'Ambala', 'Hisar', 'Rohtak', 'Karnal', 'Panipat', 'Sonipat', 'Yamunanagar', 'Kurukshetra', 'Jhajjar'],
  'Himachal Pradesh': ['Shimla', 'Kangra', 'Mandi', 'Solan', 'Una', 'Kullu', 'Hamirpur', 'Sirmaur', 'Bilaspur', 'Chamba'],
  'Jharkhand': ['Ranchi', 'Dhanbad', 'Bokaro', 'East Singhbhum', 'Hazaribagh', 'Giridih', 'Deoghar', 'Dumka', 'West Singhbhum'],
  'Karnataka': ['Bangalore Urban', 'Mysore', 'Tumkur', 'Belgaum', 'Dakshina Kannada', 'Shimoga', 'Dharwad', 'Gulbarga', 'Mandya', 'Hassan', 'Bijapur', 'Udupi'],
  'Kerala': ['Thiruvananthapuram', 'Ernakulam', 'Thrissur', 'Kozhikode', 'Palakkad', 'Malappuram', 'Kollam', 'Alappuzha', 'Kottayam', 'Kannur', 'Wayanad', 'Pathanamthitta'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna', 'Chhindwara', 'Morena', 'Vidisha', 'Dewas'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nashik', 'Aurangabad', 'Nagpur', 'Thane', 'Solapur', 'Amravati', 'Kolhapur', 'Satara', 'Raigad', 'Osmanabad'],
  'Manipur': ['Imphal East', 'Imphal West', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Senapati', 'Ukhrul'],
  'Meghalaya': ['East Khasi Hills', 'West Khasi Hills', 'Ri Bhoi', 'East Jaintia Hills', 'East Garo Hills', 'West Garo Hills'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip', 'Lawngtlai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Phek', 'Tuensang', 'Wokha', 'Mon'],
  'Odisha': ['Khordha', 'Cuttack', 'Sambalpur', 'Ganjam', 'Sundargarh', 'Balasore', 'Koraput', 'Puri', 'Kendrapara', 'Jagatsinghpur'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Gurdaspur', 'Hoshiarpur', 'Faridkot', 'Rupnagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner', 'Udaipur', 'Alwar', 'Bharatpur', 'Sikar', 'Sri Ganganagar', 'Nagaur', 'Jhalawar'],
  'Sikkim': ['East Sikkim', 'West Sikkim', 'North Sikkim', 'South Sikkim'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Vellore', 'Erode', 'Tirunelveli', 'Dindigul', 'Thanjavur', 'Tiruppur', 'Kanchipuram'],
  'Telangana': ['Hyderabad', 'Ranga Reddy', 'Medchal-Malkajgiri', 'Karimnagar', 'Warangal Urban', 'Khammam', 'Nizamabad', 'Nalgonda', 'Mahabubnagar', 'Sangareddy'],
  'Tripura': ['West Tripura', 'South Tripura', 'Gomati', 'Sipahijala', 'Khowai', 'North Tripura'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur Nagar', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Ghaziabad', 'Gautam Buddha Nagar', 'Bareilly', 'Gorakhpur', 'Aligarh', 'Moradabad'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Udham Singh Nagar', 'Nainital', 'Pauri Garhwal', 'Almora', 'Tehri Garhwal', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Howrah', 'Purba Medinipur', 'Paschim Medinipur', 'Bardhaman', 'Murshidabad', 'Nadia'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'South Delhi', 'West Delhi', 'South West Delhi', 'North West Delhi'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Pulwama', 'Kupwara', 'Rajouri', 'Poonch', 'Budgam', 'Kathua'],
};

// Hierarchical zone mapping for analytics — auto-derived from State, never user-selected
export const STATE_TO_ZONE = {
  // North
  'Delhi': 'North', 'Haryana': 'North', 'Himachal Pradesh': 'North',
  'Jammu & Kashmir': 'North', 'Punjab': 'North', 'Rajasthan': 'North',
  'Uttarakhand': 'North', 'Uttar Pradesh': 'North',
  // South
  'Andhra Pradesh': 'South', 'Karnataka': 'South', 'Kerala': 'South',
  'Tamil Nadu': 'South', 'Telangana': 'South',
  // East
  'Arunachal Pradesh': 'East', 'Assam': 'East', 'Bihar': 'East',
  'Jharkhand': 'East', 'Manipur': 'East', 'Meghalaya': 'East',
  'Mizoram': 'East', 'Nagaland': 'East', 'Odisha': 'East',
  'Sikkim': 'East', 'Tripura': 'East', 'West Bengal': 'East',
  // West
  'Goa': 'West', 'Gujarat': 'West', 'Maharashtra': 'West',
  // Central
  'Chhattisgarh': 'Central', 'Madhya Pradesh': 'Central',
};

export const getZone = (state) => STATE_TO_ZONE[state] || null;

export const ZONE_CONFIG = {
  North:   { color: '#2563EB', bg: '#EFF6FF', emoji: '🔷' },
  South:   { color: '#10B981', bg: '#ECFDF5', emoji: '🟢' },
  East:    { color: '#F59E0B', bg: '#FFFBEB', emoji: '🟡' },
  West:    { color: '#8B5CF6', bg: '#F5F3FF', emoji: '🟣' },
  Central: { color: '#EF4444', bg: '#FEF2F2', emoji: '🔴' },
};

export const SPECIALITIES = {
  MD: ['Internal Medicine', 'Paediatrics', 'Psychiatry', 'Radiology', 'Dermatology', 'Pathology', 'Microbiology', 'Biochemistry', 'Physiology', 'Anatomy', 'Pharmacology', 'Community Medicine', 'Anaesthesiology', 'Emergency Medicine'],
  MS: ['General Surgery', 'Orthopaedics', 'Ophthalmology', 'ENT', 'Obstetrics & Gynaecology', 'Urology'],
  DM: ['Cardiology', 'Neurology', 'Nephrology', 'Gastroenterology', 'Endocrinology', 'Pulmonology', 'Rheumatology', 'Medical Oncology'],
  MCh: ['Cardiothoracic Surgery', 'Neurosurgery', 'Plastic Surgery', 'Paediatric Surgery', 'Vascular Surgery'],
  DNB: ['General Medicine', 'Family Medicine', 'Hospital Administration'],
};

export const PROG_YEARS = { MD: 3, MS: 3, DM: 3, MCh: 3, DNB: 3 };


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
  kahoot: '🎮 Live Quiz',
  conferences: '🏥 Medical Conferences',
  exam: '📝 NEET-PG Exam Prep',
  docs: '📄 Documentation',
  performance: '📊 My Performance',
  learn: '📖 Learn Hub',
  'arena-host': '🏟️ Host Live Arena',
  'arena-student': '🏟️ Live Arena',
  calendar: '📅 Study Calendar',
  'case-sim': '🏥 Case Simulator',
  'study-plan': '🗓 Study Plan Engine',
  'exam-manage': '📋 Exam Manager',
};
