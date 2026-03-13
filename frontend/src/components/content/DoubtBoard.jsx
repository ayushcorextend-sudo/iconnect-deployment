import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const relTime = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return             Math.floor(s / 86400) + 'd ago';
};

export default function DoubtBoard({ userId, role, addToast }) {
  const [doubts, setDoubts]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('open');  // 'all' | 'open' | 'resolved'
  const [expanded, setExpanded]     = useState(null);     // doubt id
  const [replies, setReplies]       = useState({});        // { doubtId: [reply] }
  const [replyText, setReplyText]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving]   = useState(null);

  const isAdmin = role === 'superadmin' || role === 'contentadmin';

  useEffect(() => { loadDoubts(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDoubts = async () => {
    setLoading(true);
    try {
      let q = supabase.from('doubts').select('*, profiles:user_id(full_name)').order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter);
      const { data, error } = await q;
      if (error) throw error;
      setDoubts(data || []);
    } catch (e) {
      addToast('error', 'Failed to load doubts: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (doubtId) => {
    try {
      const { data, error } = await supabase
        .from('doubt_replies')
        .select('*, profiles:user_id(full_name, role)')
        .eq('doubt_id', doubtId)
        .order('created_at');
      if (error) throw error;
      setReplies(prev => ({ ...prev, [doubtId]: data || [] }));
    } catch (e) {
      addToast('error', 'Failed to load replies: ' + e.message);
    }
  };

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setReplyText('');
    if (!replies[id]) loadReplies(id);
  };

  const submitReply = async (doubtId) => {
    if (!replyText.trim()) return;
    if (userId?.startsWith('local_')) { addToast('error', 'Not available in demo mode.'); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('doubt_replies')
        .insert({ doubt_id: doubtId, user_id: userId, body: replyText.trim(), is_official: isAdmin })
        .select('*, profiles:user_id(full_name, role)').single();
      if (error) throw error;
      setReplies(prev => ({ ...prev, [doubtId]: [...(prev[doubtId] || []), data] }));
      setReplyText('');
    } catch (e) {
      addToast('error', 'Reply failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resolveDoubt = async (doubtId) => {
    setResolving(doubtId);
    try {
      const { error } = await supabase.from('doubts').update({ status: 'resolved' }).eq('id', doubtId);
      if (error) throw error;
      setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, status: 'resolved' } : d));
      addToast('success', 'Doubt marked as resolved.');
    } catch (e) {
      addToast('error', 'Could not resolve: ' + e.message);
    } finally {
      setResolving(null);
    }
  };

  const filtered = filter === 'all' ? doubts : doubts.filter(d => d.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Doubts & Queries</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'open', 'resolved'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: filter === f ? '#4F46E5' : '#F3F4F6', color: filter === f ? '#fff' : '#374151' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">💬</div>
          <div className="empty-t">No doubts {filter !== 'all' ? `(${filter})` : ''}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(d => {
            const isOpen = d.status === 'open';
            const isExp  = expanded === d.id;
            const rList  = replies[d.id] || [];
            return (
              <div key={d.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(d.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</div>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: isOpen ? '#FEF3C7' : '#DCFCE7', color: isOpen ? '#D97706' : '#15803D' }}>
                        {isOpen ? 'Open' : 'Resolved'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {d.subject && `${d.subject} · `}
                      {d.profiles?.full_name || 'Unknown'} · {relTime(d.created_at)}
                    </div>
                  </div>
                  <span style={{ fontSize: 16, color: '#9CA3AF', transition: 'transform .2s', transform: isExp ? 'rotate(90deg)' : 'none' }}>▶</span>
                </div>

                {isExp && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 16px' }}>
                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>{d.body}</div>

                    {/* Replies */}
                    {rList.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        {rList.map(r => (
                          <div key={r.id} style={{
                            marginBottom: 8, padding: '10px 12px', borderRadius: 8,
                            background: r.is_official ? '#EFF6FF' : '#F9FAFB',
                            borderLeft: `3px solid ${r.is_official ? '#2563EB' : '#E5E7EB'}`,
                          }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{r.profiles?.full_name || 'Unknown'}</span>
                              {r.is_official && <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#DBEAFE', padding: '1px 6px', borderRadius: 8 }}>Official</span>}
                              <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{relTime(r.created_at)}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#374151' }}>{r.body}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <textarea
                        className="fi-ta"
                        rows={2}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write a reply…"
                        style={{ flex: 1, resize: 'none' }}
                      />
                      <button
                        className="btn btn-p btn-sm"
                        onClick={() => submitReply(d.id)}
                        disabled={submitting || !replyText.trim()}
                        style={{ alignSelf: 'flex-end' }}
                      >
                        {submitting ? '…' : 'Reply'}
                      </button>
                    </div>

                    {/* Resolve button (admin only) */}
                    {isAdmin && isOpen && (
                      <button
                        className="btn btn-s btn-sm"
                        onClick={() => resolveDoubt(d.id)}
                        disabled={resolving === d.id}
                        style={{ marginTop: 10 }}
                      >
                        {resolving === d.id ? 'Resolving…' : '✓ Mark Resolved'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
