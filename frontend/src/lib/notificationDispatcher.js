/**
 * notificationDispatcher.js — Stub for future server-side reminder dispatching.
 *
 * In production this logic runs as a Supabase Edge Function (cron job) that:
 * 1. Queries user_reminders WHERE remind_at <= now() AND dispatched = false
 * 2. For each reminder, sends the appropriate channel notification
 * 3. Updates dispatched = true
 *
 * Client-side functions here are stubs for UI-layer scheduling only.
 */

/**
 * Schedule an in-app notification reminder (client-side only, best-effort).
 * Uses the Web Notifications API if permission is granted.
 *
 * @param {string} title - Notification title
 * @param {string} body  - Notification body
 * @param {number} delayMs - Milliseconds from now to show the notification
 */
export async function scheduleLocalNotification(title, body, delayMs) {
  if (!('Notification' in window)) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    if (delayMs <= 0) {
      new Notification(title, { body, icon: '/icons/icon-192.png' });
    } else {
      setTimeout(() => {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }, Math.min(delayMs, 2147483647)); // clamp to max setTimeout value
    }
  } catch (_) {
    // Silent fail — notifications are best-effort
  }
}

/**
 * Dispatch pending reminders for the current session.
 * Call this on app boot after auth resolves.
 *
 * TODO: Replace with a Supabase cron Edge Function for reliability.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function dispatchPendingReminders(supabase, userId) {
  try {
    const now = new Date().toISOString();
    const { data: reminders } = await supabase
      .from('user_reminders')
      .select('id, remind_at, channels, webinar_id')
      .eq('user_id', userId)
      .eq('dispatched', false)
      .lte('remind_at', now);

    if (!reminders?.length) return;

    for (const r of reminders) {
      if (r.channels?.includes('in_app')) {
        new Notification?.('iConnect Reminder', {
          body: 'Your scheduled webinar is starting soon!',
          icon: '/icons/icon-192.png',
        });
      }
      // Mark as dispatched
      await supabase
        .from('user_reminders')
        .update({ dispatched: true })
        .eq('id', r.id);
    }
  } catch (_) {
    // Silent fail
  }
}
