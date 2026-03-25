import { supabase } from './supabase';
import { validateInsert, NotificationSchema } from './schemas';

export async function sendNotification(userId, title, body, type = 'info', icon = '🔔', channel = 'in_app', skipEmail = false) {
  // Only works for real Supabase users (not local_ demo IDs)
  if (!userId || userId.startsWith('local_')) return;
  try {
    const payload = validateInsert(NotificationSchema, {
      user_id: userId, title, body, type, icon, channel, is_read: false,
    });
    await supabase.from('notifications').insert(payload);
  } catch (e) {
    console.warn('[sendNotification] failed silently:', e.message);
  }

  // Fire-and-forget email if preferences allow and not a broadcast notification
  if (!skipEmail) {
    (async () => {
      try {
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('email_enabled')
          .eq('user_id', userId)
          .maybeSingle();

        if (prefs?.email_enabled === true) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .maybeSingle();

          const email = profile?.email;
          if (email) {
            await supabase.functions.invoke('send-notification-email', {
              body: { to: email, subject: title, bodyText: body },
            });
          }
        }
      } catch (e) {
        console.warn('[sendNotification] email dispatch failed:', e.message);
      }
    })();
  }
}
