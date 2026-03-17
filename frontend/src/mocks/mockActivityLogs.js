// Fake activity entries for calendar and activity feed development
const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const mockActivityLogs = [
  { id: 1, activity_type: 'daily_login',          score_delta: 2,  created_at: daysAgo(0),  reference_id: null },
  { id: 2, activity_type: 'quiz_passed',           score_delta: 20, created_at: daysAgo(0),  reference_id: 'exam-1' },
  { id: 3, activity_type: 'article_read',          score_delta: 10, created_at: daysAgo(0),  reference_id: 'artifact-12' },
  { id: 4, activity_type: 'clinical_case_logged',  score_delta: 15, created_at: daysAgo(1),  reference_id: 'log-5' },
  { id: 5, activity_type: 'spaced_rep_reviewed',   score_delta: 5,  created_at: daysAgo(1),  reference_id: 'card-8' },
  { id: 6, activity_type: 'quiz_attempted',        score_delta: 5,  created_at: daysAgo(2),  reference_id: 'exam-2' },
  { id: 7, activity_type: 'daily_login',           score_delta: 2,  created_at: daysAgo(2),  reference_id: null },
  { id: 8, activity_type: 'article_read',          score_delta: 10, created_at: daysAgo(3),  reference_id: 'artifact-7' },
  { id: 9, activity_type: 'study_plan_completed',  score_delta: 25, created_at: daysAgo(3),  reference_id: 'plan-1' },
  { id: 10, activity_type: 'daily_login',          score_delta: 2,  created_at: daysAgo(4),  reference_id: null },
  { id: 11, activity_type: 'quiz_passed',          score_delta: 20, created_at: daysAgo(5),  reference_id: 'exam-3' },
  { id: 12, activity_type: 'note_viewed',          score_delta: 5,  created_at: daysAgo(6),  reference_id: 'note-2' },
  { id: 13, activity_type: 'daily_login',          score_delta: 2,  created_at: daysAgo(7),  reference_id: null },
  { id: 14, activity_type: 'webinar_attended',     score_delta: 30, created_at: daysAgo(8),  reference_id: 'webinar-1' },
  { id: 15, activity_type: 'diary_entry',          score_delta: 3,  created_at: daysAgo(9),  reference_id: null },
];
