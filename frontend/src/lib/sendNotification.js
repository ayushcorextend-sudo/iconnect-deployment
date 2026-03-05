import { supabase } from './supabase';

export async function sendNotification(userId, title, body, type = 'info', icon = '🔔', channel = 'in_app') {
  // Only works for real Supabase users (not local_ demo IDs)
  if (!userId || userId.startsWith('local_')) return;
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      icon,
      channel,
      is_read: false,
    });
  } catch (e) {
    console.warn('[sendNotification] failed silently:', e.message);
  }
}
