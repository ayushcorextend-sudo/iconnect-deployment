import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/* ═══════════════════════════════════════════════════
   CONTENT ADMIN — Notification Center
   Lets content admins send notifications about their
   uploaded content and view past sends.
   ═══════════════════════════════════════════════════ */
export default function ContentAdminNotificationCenter({ userId, addToast, darkMode }) {
  const dm = darkMode;
  const bg        = dm ? '#0F172A' : '#F8FAFC';
  const cardBg    = dm ? '#1E293B' : '#fff';
  const border    = dm ? '#334155' : '#E5E7EB';
  const textP     = dm ? '#F1F5F9' : '#111827';
  const textS     = dm ? '#94A3B8' : '#6B7280';

  const [myContent, setMyContent]       = useState([]);
  const [sentNotifs, setSentNotifs]     = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [form, setForm]                 = useState({ title: '', body: '', type: 'info', contentId: '' });
  const [sending, setSending]           = useState(false);
  const [targetCount, setTargetCount]   = useState(null);

  const typeColors = {
    info:    { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    success: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    warn:    { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
    error:   { bg: '#FEF2F2', color: '#EF4444', border: '#FECACA' },
  };

  const relTime = (ts) => {
    const d = new Date(ts), now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  };

  // Fetch this content admin's uploaded artifacts + their past sent notifications
  useEffect(() => {
    async function load() {
      if (!userId) return;
      try {
        // My uploaded content
        const { data: arts } = await supabase
          .from('artifacts')
          .select('id, title, subject, emoji, status, downloads')
          .eq('uploaded_by_id', userId)
          .order('id', { ascending: false })
          .limit(30);
        setMyContent(arts || []);

        // Count verified doctors to show as target
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'doctor')
          .eq('status', 'active');
        setTargetCount(count ?? 0);

        // Past sent notifications by this CA
        const { data: sent } = await supabase
          .from('notifications')
          .select('id, title, body, type, created_at')
          .eq('sender_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        setSentNotifs(sent || []);
      } catch (err) {
        console.error('[CANotifCenter] Load failed:', err);
      } finally {
        setLoadingContent(false);
      }
    }
    load();
  }, [userId]);

  const handleSend = async () => {
    if (!form.title.trim()) { addToast?.('error', 'Title is required.'); return; }
    if (!form.body.trim())  { addToast?.('error', 'Message is required.'); return; }
    setSending(true);
    try {
      // Fetch all active doctor IDs
      const { data: doctors } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'doctor')
        .eq('status', 'active');

      const typeConf = typeColors[form.type] || typeColors.info;
      const iconMap  = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '🚨' };

      const payloads = (doctors || []).map(d => ({
        user_id:   d.id,
        sender_id: userId,
        title:     form.title.trim(),
        body:      form.body.trim(),
        type:      form.type,
        icon:      iconMap[form.type] || 'ℹ️',
        is_read:   false,
      }));

      const { error } = await supabase.from('notifications').insert(payloads);
      if (error) throw error;

      addToast?.('success', `📣 Sent to ${payloads.length} doctors!`);
      setSentNotifs(prev => [{
        id: Date.now(), title: form.title.trim(), body: form.body.trim(),
        type: form.type, created_at: new Date().toISOString(),
      }, ...prev].slice(0, 20));
      setForm({ title: '', body: '', type: 'info', contentId: '' });
    } catch (err) {
      addToast?.('error', 'Send failed: ' + (err.message || 'Try again'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: textP }}>📣 Notification Center</div>
          <div style={{ fontSize: 13, color: textS, marginTop: 4 }}>Send notifications about your content to all active doctors</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* LEFT: Compose Form */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: textP, marginBottom: 16 }}>✍️ Compose Notification</div>

            {/* Type selector */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: textS, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(typeColors).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, type: k }))}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                      background: form.type === k ? v.bg : (dm ? '#334155' : '#F9FAFB'),
                      color: form.type === k ? v.color : textS,
                      outline: form.type === k ? `2px solid ${v.color}` : `1px solid ${border}`,
                    }}>
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Content reference */}
            {myContent.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: textS, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reference Content (optional)</div>
                <select
                  value={form.contentId}
                  onChange={e => setForm(f => ({ ...f, contentId: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: dm ? '#334155' : '#fff', color: textP, fontSize: 12 }}
                >
                  <option value="">None</option>
                  {myContent.map(a => <option key={a.id} value={a.id}>{a.emoji || '📚'} {a.title}</option>)}
                </select>
              </div>
            )}

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: textS, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</div>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. New content just uploaded!"
                maxLength={80}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: dm ? '#334155' : '#fff', color: textP, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: textS, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message</div>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Describe what's new or why users should check it out…"
                rows={3}
                maxLength={300}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: dm ? '#334155' : '#fff', color: textP, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ fontSize: 10, color: textS, textAlign: 'right', marginTop: 2 }}>{form.body.length}/300</div>
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !form.title.trim() || !form.body.trim()}
              style={{
                width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
                background: sending ? '#E5E7EB' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: sending ? '#9CA3AF' : '#fff', fontWeight: 700, fontSize: 14, transition: 'all .2s',
              }}
            >
              {sending ? '⏳ Sending…' : `📣 Send to ${targetCount ?? '…'} users`}
            </button>
          </div>

          {/* RIGHT: My Uploads + Sent History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* My Uploads */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: textP, marginBottom: 14 }}>📚 My Uploads</div>
              {loadingContent ? (
                [1,2,3].map(i => <div key={i} style={{ height: 40, background: dm ? '#334155' : '#F3F4F6', borderRadius: 8, marginBottom: 8 }} />)
              ) : myContent.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: textS, fontSize: 13 }}>No uploads yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {myContent.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: dm ? '#334155' : '#F9FAFB', border: `1px solid ${border}` }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{a.emoji || '📚'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: textP, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: textS }}>{a.subject} · ⬇️ {a.downloads || 0}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: a.status === 'approved' ? '#ECFDF5' : '#FFFBEB',
                        color: a.status === 'approved' ? '#059669' : '#D97706',
                      }}>
                        {a.status === 'approved' ? '✅ Live' : '⏳ Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent History */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: textP, marginBottom: 14 }}>📬 Recent Sends</div>
              {sentNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: textS, fontSize: 13 }}>
                  No notifications sent yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sentNotifs.map(n => {
                    const tc = typeColors[n.type] || typeColors.info;
                    return (
                      <div key={n.id} style={{ padding: '10px 12px', borderRadius: 10, background: dm ? '#334155' : tc.bg, border: `1px solid ${border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: dm ? '#E2E8F0' : tc.color, flex: 1 }}>{n.title}</div>
                          <div style={{ fontSize: 10, color: textS, flexShrink: 0 }}>{relTime(n.created_at)}</div>
                        </div>
                        <div style={{ fontSize: 11, color: textS, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
