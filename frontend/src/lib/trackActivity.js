import { supabase } from './supabase';

const SCORE_MAP = {
  quiz_attempted: 5,
  quiz_passed: 20,
  article_read: 10,
  note_viewed: 5,
  document_downloaded: 5,
  webinar_attended: 30,
};

export async function trackActivity(activityType, referenceId = '') {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return; // silent bail in demo/offline mode

    const scoreDelta = SCORE_MAP[activityType] || 0;

    const { error: logError } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: activityType,
      reference_id: String(referenceId),
      score_delta: scoreDelta,
    });
    if (logError) throw logError;

    // Get current scores, upsert with increments
    const { data: existing } = await supabase
      .from('user_scores')
      .select('total_score, quiz_score, reading_score')
      .eq('user_id', user.id)
      .maybeSingle();

    const isQuiz = activityType.startsWith('quiz');
    const isReading = ['article_read', 'note_viewed'].includes(activityType);

    await supabase.from('user_scores').upsert({
      user_id: user.id,
      total_score: (existing?.total_score || 0) + scoreDelta,
      quiz_score: (existing?.quiz_score || 0) + (isQuiz ? scoreDelta : 0),
      reading_score: (existing?.reading_score || 0) + (isReading ? scoreDelta : 0),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  } catch (e) {
    // Never crash the UI for tracking failures
    console.warn('[trackActivity] failed silently:', e.message);
  }
}
