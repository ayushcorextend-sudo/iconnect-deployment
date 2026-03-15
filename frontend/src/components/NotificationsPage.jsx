import { useState, useEffect, useRef } from 'react';
import Toggle from './Toggle';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/dataCache';

// Default prefs shape — mirrors notification_preferences table columns
const DEFAULT_CHANNELS = { in_app_enabled: true, email_enabled: true, whatsapp_enabled: false, sms_enabled: false };
const DEFAULT_TRIGGERS = { new_ebook: true, webinar_reminders: true, quiz_available: true, admin_messages: true, leaderboard_changes: false, study_group_invites: false };

const relTime = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return Math.floor(s / 60)    + 'm ago';
  if (s < 86400) return Math.floor(s / 3600)  + 'h ago';
  return             Math.floor(s / 86400) + 'd ago';
};

export default function NotificationsPage({ addToast, setPage }) {
  const [notifs, setNotifs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('all');
  const [channels, setChannels]     = useState(DEFAULT_CHANNELS);
  const [triggers, setTriggers]     = useState(DEFAULT_TRIGGERS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const userIdRef                   = useRef(null);

  // ── Load notifications + preferences on mount ──────────────
  useEffect(() => {
    let realtimeChannel;

    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) { setLoading(false); return; }
        userIdRef.current = user.id;

        // ── Restore cached prefs instantly (no flicker) ─────────────────────
        const cachedPrefs = getCached(`notif_prefs_${user.id}`);
        if (cachedPrefs) {
          setChannels(cachedPrefs.channels);
          setTriggers(cachedPrefs.triggers);
          setPrefsLoaded(true);
          setLoading(false);
        }

        // Fetch notifications (always fresh — new ones may have arrived)
        const { data: rows, error: notifErr } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (notifErr) throw notifErr;
        setNotifs(rows || []);

        // Fetch preferences (always refresh in background)
        const { data: prefs, error: prefsErr } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefsErr) throw prefsErr;

        const freshChannels = {
          in_app_enabled:   prefs?.in_app_enabled   ?? true,
          email_enabled:    prefs?.email_enabled     ?? true,
          whatsapp_enabled: prefs?.whatsapp_enabled  ?? false,
          sms_enabled:      prefs?.sms_enabled       ?? false,
        };
        const freshTriggers = {
          new_ebook:           prefs?.new_ebook           ?? true,
          webinar_reminders:   prefs?.webinar_reminders   ?? true,
          quiz_available:      prefs?.quiz_available       ?? true,
          admin_messages:      prefs?.admin_messages       ?? true,
          leaderboard_changes: prefs?.leaderboard_changes  ?? false,
          study_group_invites: prefs?.study_group_invites  ?? false,
        };

        if (prefs) {
          setChannels(freshChannels);
          setTriggers(freshTriggers);
          // Cache prefs for next visit (5-min TTL — these rarely change)
          setCached(`notif_prefs_${user.id}`, { channels: freshChannels, triggers: freshTriggers }, 5 * 60 * 1000);
        }
        setPrefsLoaded(true);

        // Realtime — push new notifications live
        realtimeChannel = supabase
          .channel('notifs_live_' + user.id)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          }, payload => setNotifs(prev => [payload.new, ...prev]))
          .subscribe();

      } catch (e) {
        addToast('error', 'Could not load notifications: ' + (e.message || 'Try again.'));
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => { if (realtimeChannel) supabase.removeChannel(realtimeChannel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mark single notification as read ───────────────────────
  const markRead = async (id) => {
    // Optimistic update
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    } catch (e) {
      // Roll back on failure
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
      addToast('error', 'Could not mark as read: ' + e.message);
    }
  };

  // ── Mark all as read ────────────────────────────────────────
  const markAll = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', uid)
        .eq('is_read', false);
      if (error) throw error;
    } catch (e) {
      addToast('error', 'Could not mark all read: ' + e.message);
      // Reload to restore accurate state
      const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (data) setNotifs(data);
    }
  };

  // ── Upsert a single preference key ─────────────────────────
  const upsertPref = async (patch) => {
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: uid, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (e) {
      addToast('error', 'Preference save failed: ' + e.message);
    }
  };

  // ── Toggle a channel ────────────────────────────────────────
  const toggleChannel = (key) => {
    const next = !channels[key];
    setChannels(c => ({ ...c, [key]: next }));
    upsertPref({ [key]: next });
  };

  // ── Toggle an alert trigger ─────────────────────────────────
  const toggleTrigger = (key) => {
    const next = !triggers[key];
    setTriggers(t => ({ ...t, [key]: next }));
    upsertPref({ [key]: next });
  };

  // ── Notification click → mark read + navigate ───────────────
  const handleClick = async (n) => {
    if (!n.is_read) await markRead(n.id);
    if (!setPage) return;
    const text = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
    if (/quiz|exam|score/.test(text))                       { setPage('exam');        return; }
    if (/e-book|ebook|artifact|library/.test(text))        { setPage('ebooks');      return; }
    if (/leaderboard|rank/.test(text))                     { setPage('leaderboard'); return; }
    if (/verified|verification|approved|rejected/.test(text)) { setPage('profile');  return; }
    if (/webinar/.test(text))                              { setPage('dashboard');   return; }
  };

  // ── Derived values ──────────────────────────────────────────
  const isUnread = (n) => n.is_read === false;
  const unreadCount = notifs.filter(isUnread).length;
  const filtered = tab === 'unread'   ? notifs.filter(isUnread)
                 : tab === 'academic' ? notifs.filter(n => ['success', 'info'].includes(n.type))
                 : tab === 'alerts'   ? notifs.filter(n => ['warn', 'error'].includes(n.type))
                 : notifs;

  const typeBg = { info: '#EFF6FF', success: '#EFF6FF', warn: '#FFFBEB', error: '#FEF2F2' };

  const CHANNEL_OPTS = [
    ['📱', 'In-App Notifications', 'Real-time alerts inside iConnect',      'in_app_enabled'],
    ['📧', 'Email Digest',         'Daily summary to your registered email', 'email_enabled'],
    ['💬', 'WhatsApp Alerts',      'Important updates via WhatsApp',          'whatsapp_enabled'],
    ['📲', 'SMS Alerts',           'Critical alerts via SMS',                 'sms_enabled'],
  ];

  const TRIGGER_OPTS = [
    ['New E-book',          'new_ebook'],
    ['Webinar reminders',   'webinar_reminders'],
    ['Quiz available',      'quiz_available'],
    ['Admin messages',      'admin_messages'],
    ['Leaderboard changes', 'leaderboard_changes'],
    ['Study group invites', 'study_group_invites'],
  ];

  return (
    <div className="page">
      <div className="ph-row ph">
        <div>
          <div className="pt">🔔 Notifications</div>
          <div className="ps">{unreadCount} unread</div>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-s btn-sm" onClick={markAll}>✓ Mark all read</button>
        )}
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>

        {/* ── Left: notification list ── */}
        <div>
          <div className="tabs">
            {[
              ['all',      'All'],
              ['unread',   `Unread (${unreadCount})`],
              ['academic', 'Academic'],
              ['alerts',   'Alerts'],
            ].map(([k, l]) => (
              <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-ic">🔕</div>
              <div className="empty-t">All clear!</div>
              <div className="empty-s">{tab === 'all' ? 'No notifications yet.' : `No ${tab} notifications.`}</div>
            </div>
          ) : (
            filtered.map(n => (
              <div
                key={n.id}
                className={`ni ${isUnread(n) ? 'unr' : ''}`}
                style={{
                  cursor: 'pointer',
                  background: isUnread(n) ? 'rgba(37,99,235,0.06)' : 'transparent',
                  borderLeft: isUnread(n) ? '3px solid #EF4444' : '3px solid transparent',
                }}
                onClick={() => handleClick(n)}
              >
                {/* Unread red dot */}
                <div style={{ paddingTop: 4, flexShrink: 0 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isUnread(n) ? '#EF4444' : 'transparent',
                    border: isUnread(n) ? 'none' : '1px solid #E5E7EB',
                  }} />
                </div>
                <div className="ni-ic" style={{ background: typeBg[n.type] || '#F9FAFB' }}>{n.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div className="ni-t" style={{ fontWeight: isUnread(n) ? 700 : 500 }}>{n.title}</div>
                    {isUnread(n) && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead(n.id); }}
                        title="Mark as read"
                        style={{
                          flexShrink: 0, background: 'none',
                          border: '1px solid #D1D5DB', borderRadius: 6,
                          cursor: 'pointer', padding: '2px 8px',
                          fontSize: 11, color: '#6B7280',
                          display: 'flex', alignItems: 'center', gap: 3,
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#6B7280'; }}
                      >
                        ✓ Mark read
                      </button>
                    )}
                  </div>
                  <div className="ni-b">{n.body}</div>
                  <div className="ni-time">{relTime(n.created_at)} · via {n.channel}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Right: preferences ── */}
        <div>
          {/* Channels */}
          <div className="card">
            <div className="ct" style={{ marginBottom: 14 }}>🔔 Notification Channels</div>
            {!prefsLoaded ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Loading preferences…</div>
            ) : (
              CHANNEL_OPTS.map(([ic, label, desc, key]) => (
                <div key={key} className="ch-toggle">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 20 }}>{ic}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{desc}</div>
                    </div>
                  </div>
                  <Toggle on={channels[key]} onChange={() => toggleChannel(key)} />
                </div>
              ))
            )}
          </div>

          {/* Alert triggers */}
          <div className="card mt4">
            <div className="ct" style={{ marginBottom: 12 }}>⚡ Alert Triggers</div>
            {!prefsLoaded ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Loading preferences…</div>
            ) : (
              TRIGGER_OPTS.map(([label, key]) => (
                <div key={key} className="ch-toggle">
                  <span style={{ fontSize: 13 }}>{label}</span>
                  <Toggle on={triggers[key]} onChange={() => toggleTrigger(key)} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
