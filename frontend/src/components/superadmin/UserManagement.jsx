import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import { downloadCSV } from '../../lib/exportUtils';

const ROLES      = { superadmin: 'Super Admin', contentadmin: 'Content Admin', doctor: 'PG Aspirant' };
const STATUSES   = { active: '#10B981', pending: '#F59E0B', rejected: '#EF4444', suspended: '#6B7280' };
const NOTIF_TYPES = ['info', 'success', 'warning', 'error'];
const TYPE_ICONS  = { info: '💬', success: '✅', warning: '⚠️', error: '🔴' };

// DD-MM-YYYY formatter for CSV cells
const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
};

// Readable date for the table UI
const relDate = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function BtnSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12, marginRight: 5,
      border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'currentColor',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle',
    }} />
  );
}

export default function UserManagement({ addToast }) {
  const [users, setUsers]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [roleFilter, setRoleFilter]       = useState('all');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [selectedIds, setSelectedIds]     = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [sending, setSending]             = useState(false);
  const [form, setForm]                   = useState({ title: '', body: '', type: 'info' });
  // null | 'zone' | 'state' | 'speciality' | 'verification' | 'activity'
  const [generatingReport, setGeneratingReport] = useState(null);

  // ── Data Fetching — includes all metadata for reports ─────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, status, created_at, state, zone, speciality, hometown, is_verified')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      addToast('error', 'Could not load users: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    const matchRole   = roleFilter   === 'all' || u.role   === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  // ── Selection ─────────────────────────────────────────────────────────────
  const allSelected  = filtered.length > 0 && filtered.every(u => selectedIds.includes(u.id));
  const someSelected = filtered.some(u => selectedIds.includes(u.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filtered.map(u => u.id).includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filtered.map(u => u.id)])]);
    }
  };

  const toggleOne = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── CSV helper ─────────────────────────────────────────────────────────────
  const stamp = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD for filename

  // ── REPORT: Zone-wise ─────────────────────────────────────────────────────
  const reportZone = async () => {
    setGeneratingReport('zone');
    try {
      const groups = {};
      users.forEach(u => {
        const key = u.zone?.trim() || 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(u.name || u.email || '—');
      });

      const data = Object.entries(groups)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([zone, names]) => ({
          'Zone':        zone,
          'Total Users': names.length,
          'User Names':  names.join('; '),
        }));

      if (!downloadCSV(data, `iConnect_Zone_Report_${stamp()}`)) {
        addToast('info', 'No data available for this report yet.');
        return;
      }
      addToast('success', `Zone report downloaded — ${data.length} zone(s), ${users.length} users.`);
    } catch (e) {
      addToast('error', 'Zone report failed: ' + e.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  // ── REPORT: State-wise ────────────────────────────────────────────────────
  const reportState = async () => {
    setGeneratingReport('state');
    try {
      const groups = {};
      users.forEach(u => {
        const key = u.state?.trim() || 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(u.email || '—');
      });

      const data = Object.entries(groups)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([state, emails]) => ({
          'State':       state,
          'Total Users': emails.length,
          'User Emails': emails.join('; '),
        }));

      if (!downloadCSV(data, `iConnect_State_Report_${stamp()}`)) {
        addToast('info', 'No data available for this report yet.');
        return;
      }
      addToast('success', `State report downloaded — ${data.length} state(s), ${users.length} users.`);
    } catch (e) {
      addToast('error', 'State report failed: ' + e.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  // ── REPORT: Speciality-wise ───────────────────────────────────────────────
  const reportSpeciality = async () => {
    setGeneratingReport('speciality');
    try {
      const groups = {};
      users.forEach(u => {
        const key = u.speciality?.trim();
        if (!key) return; // skip null/empty — only meaningful data
        if (!groups[key]) groups[key] = [];
        groups[key].push(u.name || u.email || '—');
      });

      const data = Object.entries(groups)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([spec, names]) => ({
          'Speciality': spec,
          'Count':      names.length,
          'User Names': names.join('; '),
        }));

      if (!downloadCSV(data, `iConnect_Speciality_Report_${stamp()}`)) {
        addToast('info', 'No speciality data found. Ask users to complete their profiles.');
        return;
      }
      addToast('success', `Speciality report downloaded — ${data.length} specialit${data.length !== 1 ? 'ies' : 'y'}.`);
    } catch (e) {
      addToast('error', 'Speciality report failed: ' + e.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  // ── REPORT: Verification (unverified users) ───────────────────────────────
  const reportVerification = async () => {
    setGeneratingReport('verification');
    try {
      const unverified = users.filter(u => u.is_verified === false);

      if (unverified.length === 0) {
        addToast('info', 'All users are verified — no pending verification entries.');
        return;
      }

      const data = unverified.map(u => ({
        'Name':        u.name  || '—',
        'Email':       u.email || '—',
        'Role':        ROLES[u.role] || u.role || '—',
        'Status':      u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : '—',
        'Joined Date': fmtDate(u.created_at),
      }));

      if (!downloadCSV(data, `iConnect_Unverified_Users_${stamp()}`)) {
        addToast('info', 'No data available for this report yet.');
        return;
      }
      addToast('success', `Verification report downloaded — ${data.length} unverified user(s).`);
    } catch (e) {
      addToast('error', 'Verification report failed: ' + e.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  // ── REPORT: Activity (quiz engagement) ───────────────────────────────────
  const reportActivity = async () => {
    setGeneratingReport('activity');
    try {
      // Fetch all quiz attempts — SA RLS allows full read
      const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, finished_at');
      if (error) throw error;

      if (!attempts || attempts.length === 0) {
        addToast('info', 'No quiz activity recorded yet.');
        return;
      }

      // Aggregate per user
      const byUser = {};
      attempts.forEach(a => {
        if (!byUser[a.user_id]) byUser[a.user_id] = { attempts: 0, totalScore: 0, lastActivity: null };
        byUser[a.user_id].attempts++;
        byUser[a.user_id].totalScore += a.score || 0;
        if (a.finished_at && (!byUser[a.user_id].lastActivity || a.finished_at > byUser[a.user_id].lastActivity)) {
          byUser[a.user_id].lastActivity = a.finished_at;
        }
      });

      // Build map for quick lookup
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u; });

      const data = Object.entries(byUser)
        .map(([uid, stats]) => {
          const u = userMap[uid];
          return {
            'Name':           u?.name  || '—',
            'Email':          u?.email || '—',
            'Role':           ROLES[u?.role] || u?.role || '—',
            'Quiz Attempts':  stats.attempts,
            'Total Score':    stats.totalScore,
            'Avg Score':      stats.attempts > 0 ? Math.round(stats.totalScore / stats.attempts) : 0,
            'Last Activity':  fmtDate(stats.lastActivity),
          };
        })
        .sort((a, b) => b['Quiz Attempts'] - a['Quiz Attempts']);

      if (!downloadCSV(data, `iConnect_Activity_Report_${stamp()}`)) {
        addToast('info', 'No data available for this report yet.');
        return;
      }
      addToast('success', `Activity report downloaded — ${data.length} active user(s).`);
    } catch (e) {
      addToast('error', 'Activity report failed: ' + e.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  // ── Broadcast notification ────────────────────────────────────────────────
  const sendBroadcast = async () => {
    if (!form.title.trim()) { addToast('error', 'Title is required.'); return; }
    if (!form.body.trim())  { addToast('error', 'Message body is required.'); return; }
    if (selectedIds.length === 0) { addToast('error', 'No users selected.'); return; }

    setSending(true);
    try {
      const icon = TYPE_ICONS[form.type] || '📣';
      const payloads = selectedIds.map(uid => ({
        user_id: uid, title: form.title.trim(), body: form.body.trim(),
        type: form.type, icon, channel: 'in_app', is_read: false,
      }));
      const CHUNK = 100;
      for (let i = 0; i < payloads.length; i += CHUNK) {
        const { error } = await supabase.from('notifications').insert(payloads.slice(i, i + CHUNK));
        if (error) throw error;
      }
      addToast('success', `Notifications sent to ${selectedIds.length} user${selectedIds.length !== 1 ? 's' : ''}!`);
      setShowModal(false);
      setSelectedIds([]);
      setForm({ title: '', body: '', type: 'info' });
    } catch (e) {
      addToast('error', e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Report button config ──────────────────────────────────────────────────
  const REPORTS = [
    {
      key: 'zone', icon: '🗺️', label: 'Zone-wise Report',
      desc: 'Users grouped by geographic zone',
      color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE',
      action: reportZone,
    },
    {
      key: 'state', icon: '📍', label: 'State-wise Report',
      desc: 'Users grouped by state with emails',
      color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC',
      action: reportState,
    },
    {
      key: 'speciality', icon: '🩺', label: 'Speciality Report',
      desc: 'Doctors grouped by medical speciality',
      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
      action: reportSpeciality,
    },
    {
      key: 'verification', icon: '🔍', label: 'Verification Report',
      desc: 'All unverified users pending action',
      color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
      action: reportVerification,
    },
    {
      key: 'activity', icon: '📊', label: 'Activity Report',
      desc: 'Quiz engagement & scores per user',
      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
      action: reportActivity,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>👥 User Management</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{users.length} total users</div>
        </div>
        <button className="btn btn-s btn-sm" onClick={loadUsers} disabled={loading}>
          {loading ? '⟳ Loading…' : '⟳ Refresh'}
        </button>
      </div>

      {/* ── Reports Panel ── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          📥 Export Reports
          <span style={{ fontSize: 11, fontWeight: 500, color: '#6B7280' }}>— click any button to generate & download a CSV</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {REPORTS.map(r => {
            const busy = generatingReport === r.key;
            return (
              <button
                key={r.key}
                onClick={r.action}
                disabled={!!generatingReport || loading}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px', borderRadius: 10, cursor: busy || generatingReport ? 'wait' : 'pointer',
                  border: `1px solid ${r.border}`, background: r.bg,
                  textAlign: 'left', transition: 'all 0.15s',
                  opacity: generatingReport && !busy ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!generatingReport) e.currentTarget.style.filter = 'brightness(0.95)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{r.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: r.color, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {busy && <BtnSpinner />}
                    {busy ? 'Generating…' : r.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 1.35 }}>{r.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{
            flex: '1 1 200px', padding: '8px 12px', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 13, background: 'var(--white)', color: 'var(--text)',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--white)', color: 'var(--text)', cursor: 'pointer' }}
        >
          <option value="all">All Roles</option>
          <option value="doctor">PG Aspirant</option>
          <option value="contentadmin">Content Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--white)', color: 'var(--text)', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* ── User Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
            No users match the current filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surf)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: 15, height: 15 }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>User</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Role</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Speciality</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => {
                  const checked = selectedIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => toggleOne(u.id)}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                        background: checked ? 'rgba(79,70,229,0.05)' : 'transparent',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--surf)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = checked ? 'rgba(79,70,229,0.05)' : 'transparent'; }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="checkbox" checked={checked}
                          onChange={() => toggleOne(u.id)} onClick={e => e.stopPropagation()}
                          style={{ cursor: 'pointer', width: 15, height: 15 }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={u.name || u.email} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name || '—'}</div>
                            <div style={{ fontSize: 11, color: '#6B7280' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                          background: u.role === 'superadmin' ? '#FEF3C7' : u.role === 'contentadmin' ? '#EFF6FF' : '#F0FDF4',
                          color: u.role === 'superadmin' ? '#D97706' : u.role === 'contentadmin' ? '#2563EB' : '#16A34A',
                        }}>
                          {ROLES[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: STATUSES[u.status] || '#6B7280' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUSES[u.status] || '#6B7280', display: 'inline-block' }} />
                          {(u.status || 'unknown').charAt(0).toUpperCase() + (u.status || 'unknown').slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#6B7280', fontSize: 12 }}>
                        {u.speciality || <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#6B7280' }}>{relDate(u.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Floating action bar ── */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1E1B4B', color: '#fff', borderRadius: 14, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          zIndex: 900, animation: 'scaleIn 0.2s ease', whiteSpace: 'nowrap',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {selectedIds.length} user{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📣 Send Notification
          </button>
          <button
            onClick={() => setSelectedIds([])}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}
            title="Clear selection"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Compose Notification Modal ── */}
      {showModal && (
        <div className="overlay" onClick={() => !sending && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <span>📣 Send Notification</span>
              <button onClick={() => !sending && setShowModal(false)} className="mh-close">×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#1D4ED8' }}>
                Broadcasting to <strong>{selectedIds.length}</strong> selected user{selectedIds.length !== 1 ? 's' : ''}.
              </div>
              <div className="fg">
                <label className="fl">Notification Type</label>
                <select className="fi-sel" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {NOTIF_TYPES.map(t => (
                    <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Title <span style={{ color: '#EF4444' }}>*</span></label>
                <input className="fi-in" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New study material available" maxLength={120} />
              </div>
              <div className="fg">
                <label className="fl">Message <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea className="fi-ta" rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your notification message here…" maxLength={500} />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{form.body.length}/500</div>
              </div>
            </div>
            <div className="mf" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-s btn-sm" onClick={() => !sending && setShowModal(false)}>Cancel</button>
              <button className="btn btn-p btn-sm" onClick={sendBroadcast} disabled={sending || !form.title.trim() || !form.body.trim()}>
                {sending ? 'Sending…' : `📣 Broadcast to ${selectedIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
