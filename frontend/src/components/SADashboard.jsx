import { useState, useEffect, useMemo } from 'react';
import Avatar from './Avatar';
import { supabase, deleteArtifact, updateArtifact } from '../lib/supabase';
import { sendNotification } from '../lib/sendNotification';
import MCIVerificationQueue from './MCIVerificationQueue';
import SuperAdminApprovals from './SuperAdminApprovals';
import UserManagement from './superadmin/UserManagement';
import { getPredictiveAlerts, analyzeKnowledgeGap } from '../lib/aiService';
import AIResponseBox from './AIResponseBox';

const EMOJIS = ['📗', '📘', '📙', '📕', '📚', '📋', '📄', '🗂️'];

export default function SADashboard({ artifacts = [], setPage, addToast, onApprove, onReject, users = [], onApproveUser, onRejectUser, onLogout }) {
  const [tab, setTab] = useState('doctor-approvals');
  const [doctorSubTab, setDoctorSubTab] = useState('pending');
  const [reviewUser, setReviewUser] = useState(null);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [webinars, setWebinars] = useState([]);
  const [wForm, setWForm] = useState({ title: '', speaker: '', scheduled_at: '', duration_min: 60, join_url: '', description: '' });
  const [showWForm, setShowWForm] = useState(false);
  const [savingW, setSavingW] = useState(false);

  // Local artifact state — shadows prop for immediate UI updates
  const [localArtifacts, setLocalArtifacts] = useState(artifacts);
  useEffect(() => { setLocalArtifacts(artifacts); }, [artifacts]);

  // Edit modal state
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', subject: '', emoji: '📗', access: 'all' });
  const [saving, setSaving] = useState(false);

  // Actions dropdown
  const [openMenu, setOpenMenu] = useState(null);

  // Unified Approvals state
  const [approvalItems, setApprovalItems] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null);  // { id, type } currently processing
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);  // { id, type }

  // AI Insights state
  const [aiAlerts, setAiAlerts] = useState({ loading: false, text: null, error: null });
  const [aiGap, setAiGap] = useState({ loading: false, text: null, error: null });

  // Manage Admins state
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminSearchEmail, setAdminSearchEmail] = useState('');
  const [adminSearchResult, setAdminSearchResult] = useState(null); // null | 'notfound' | profile object
  const [adminSearching, setAdminSearching] = useState(false);
  const [newAdminRole, setNewAdminRole] = useState('contentadmin');

  const pending = localArtifacts.filter(a => a.status === 'pending');
  const approved = localArtifacts.filter(a => a.status === 'approved');
  const pendingUsers = users.filter(u => u.status === 'pending');

  // ── Geographic breakdown for Reports tab ─────────────────────
  const geoStats = useMemo(() => {
    const stateMap = {};
    users.forEach(u => {
      const state = u.state && u.state !== '—' ? u.state : 'Unknown';
      if (!stateMap[state]) stateMap[state] = { count: 0, specs: {} };
      stateMap[state].count++;
      if (u.speciality && u.speciality !== '—') {
        stateMap[state].specs[u.speciality] = (stateMap[state].specs[u.speciality] || 0) + 1;
      }
    });
    return Object.entries(stateMap)
      .map(([state, v]) => ({
        state,
        count: v.count,
        topSpec: Object.entries(v.specs).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
      }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  const specialityStats = useMemo(() => {
    const specMap = {};
    users.forEach(u => {
      if (!u.speciality || u.speciality === '—') return;
      specMap[u.speciality] = (specMap[u.speciality] || 0) + 1;
    });
    return Object.entries(specMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [users]);

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Speciality', 'College', 'State', 'MCI Number', 'Status'];
    const esc = v => `"${String(v || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const rows = users.map(u => [u.name, u.email, u.speciality, u.college, u.state, u.mci, u.status].map(esc));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iconnect-doctors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    addToast('success', `Exported ${users.length} doctor records as CSV`);
  };

  useEffect(() => {
    supabase.from('admin_webinars').select('*').order('scheduled_at').then(({ data }) => {
      if (data?.length) setWebinars(data);
    }).catch(() => {});

    const fetchPending = async () => {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'doctor')
          .eq('status', 'pending');
        setPendingCount(count || 0);
      } catch (_) {}
    };
    fetchPending();

    const sub = supabase
      .channel('sa-pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchPending)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  // Fetch system alerts when Alerts tab is opened
  useEffect(() => {
    if (tab !== 'alerts') return;
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', authData.user.id)
          .in('type', ['warn', 'error'])
          .order('created_at', { ascending: false })
          .limit(50);
        setSystemAlerts(data || []);
      } catch (_) {}
    })();
  }, [tab]);

  // ── CMS handlers ──────────────────────────────────────────────

  const handlePreview = (a) => {
    if (a.url) {
      window.open(a.url, '_blank', 'noopener,noreferrer');
    } else {
      addToast('info', 'No file URL stored for this document. Upload directly to Supabase Storage to enable preview.');
    }
  };

  const handleEditOpen = (a) => {
    setEditTarget(a);
    setEditForm({ title: a.title, subject: a.subject, emoji: a.emoji || '📗', access: a.access || 'all' });
    setOpenMenu(null);
  };

  const handleUpdate = async () => {
    if (!editForm.title.trim()) { addToast('error', 'Title is required'); return; }
    setSaving(true);
    // Immediate local update
    setLocalArtifacts(prev => prev.map(a => a.id === editTarget.id ? { ...a, ...editForm } : a));
    setEditTarget(null);
    try {
      await updateArtifact(editTarget.id, {
        title: editForm.title.trim(),
        subject: editForm.subject,
        emoji: editForm.emoji,
        access: editForm.access,
      });
      addToast('success', 'Artifact updated!');
    } catch (err) {
      addToast('error', 'Update failed: ' + (err.message || 'Please try again'));
      // Revert local state on failure
      setLocalArtifacts(artifacts);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this artifact? This action cannot be undone.')) return;
    setOpenMenu(null);
    // Immediate local removal
    setLocalArtifacts(prev => prev.filter(a => a.id !== id));
    try {
      await deleteArtifact(id);
      addToast('success', 'Artifact deleted.');
    } catch (err) {
      addToast('error', 'Delete failed: ' + (err.message || 'Please try again'));
      // Revert on failure
      setLocalArtifacts(artifacts);
    }
  };

  // ── Webinar handlers ──────────────────────────────────────────

  const handleAddWebinar = async () => {
    if (!wForm.title || !wForm.scheduled_at) { addToast('error', 'Title and date are required.'); return; }
    setSavingW(true);
    try {
      const { data, error } = await supabase.from('admin_webinars').insert([wForm]).select().single();
      if (error) throw error;
      setWebinars(prev => [...prev, data]);
      addToast('success', 'Webinar scheduled!');
      setShowWForm(false);
      setWForm({ title: '', speaker: '', scheduled_at: '', duration_min: 60, join_url: '', description: '' });
    } catch (_) {
      setWebinars(prev => [...prev, { ...wForm, id: `local_${Date.now()}` }]);
      addToast('success', 'Webinar added (offline).');
      setShowWForm(false);
    } finally {
      setSavingW(false);
    }
  };

  const handleDeleteWebinar = async (id) => {
    setWebinars(prev => prev.filter(w => w.id !== id));
    try { await supabase.from('admin_webinars').delete().eq('id', id); } catch (_) {}
  };

  // Load unified approvals when tab opens
  useEffect(() => {
    if (tab !== 'approvals') return;
    (async () => {
      setApprovalsLoading(true);
      try {
        const [
          { data: qz },
          { data: vd },
          { data: fd },
        ] = await Promise.all([
          supabase.from('quizzes').select('id, title, subject, created_at, created_by, status').eq('status', 'pending'),
          supabase.from('video_lectures').select('id, title, subject, created_at, created_by, status').eq('status', 'pending'),
          supabase.from('flashcard_decks').select('id, title, subject, created_at, created_by, status').eq('status', 'pending'),
        ]);
        const items = [
          ...(qz || []).map(r => ({ ...r, _type: 'quiz',      _icon: '📝' })),
          ...(vd || []).map(r => ({ ...r, _type: 'video',     _icon: '🎥' })),
          ...(fd || []).map(r => ({ ...r, _type: 'flashcard', _icon: '🃏' })),
        ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setApprovalItems(items);
      } catch (_) {}
      setApprovalsLoading(false);
    })();
  }, [tab]);

  const approveContent = async (item) => {
    const { id, _type } = item;
    const tbl = _type === 'quiz' ? 'quizzes' : _type === 'video' ? 'video_lectures' : 'flashcard_decks';
    setApprovalAction({ id, type: _type });
    try {
      const { data: authData } = await supabase.auth.getUser();
      await supabase.from(tbl).update({ status: 'approved', approved_by: authData?.user?.id }).eq('id', id);
      setApprovalItems(prev => prev.filter(i => i.id !== id));
      addToast('success', `${item.title} approved!`);
    } catch (e) {
      addToast('error', 'Approve failed: ' + e.message);
    } finally {
      setApprovalAction(null);
    }
  };

  const openRejectContent = (item) => { setRejectTarget(item); setRejectNote(''); };

  const confirmRejectContent = async () => {
    if (!rejectTarget) return;
    const { id, _type } = rejectTarget;
    const tbl = _type === 'quiz' ? 'quizzes' : _type === 'video' ? 'video_lectures' : 'flashcard_decks';
    setApprovalAction({ id, type: _type });
    try {
      await supabase.from(tbl).update({ status: 'rejected', rejection_note: rejectNote.trim() || null }).eq('id', id);
      setApprovalItems(prev => prev.filter(i => i.id !== id));
      addToast('success', `${rejectTarget.title} rejected.`);
      setRejectTarget(null);
    } catch (e) {
      addToast('error', 'Reject failed: ' + e.message);
    } finally {
      setApprovalAction(null);
    }
  };

  // Load admins when tab opens
  useEffect(() => {
    if (tab !== 'manage-admins') return;
    (async () => {
      setAdminsLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, role, speciality')
          .in('role', ['superadmin', 'contentadmin'])
          .order('role');
        setAdmins(data || []);
      } catch (_) {}
      setAdminsLoading(false);
    })();
  }, [tab]);

  const searchAdminCandidate = async () => {
    if (!adminSearchEmail.trim()) return;
    setAdminSearching(true);
    setAdminSearchResult(null);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, role, speciality')
        .ilike('email', adminSearchEmail.trim())
        .maybeSingle();
      setAdminSearchResult(data || 'notfound');
    } catch (_) {
      setAdminSearchResult('notfound');
    }
    setAdminSearching(false);
  };

  const grantAdminRole = async (userId, userName) => {
    try {
      await supabase.from('profiles').update({ role: newAdminRole }).eq('id', userId);
      addToast('success', `${userName} is now ${newAdminRole === 'superadmin' ? 'Super Admin' : 'Content Admin'}!`);
      setAdminSearchEmail('');
      setAdminSearchResult(null);
      // Refresh admin list
      const { data } = await supabase.from('profiles').select('id, name, email, role, speciality').in('role', ['superadmin', 'contentadmin']).order('role');
      setAdmins(data || []);
    } catch (_) {
      addToast('error', 'Failed to update role. Please try again.');
    }
  };

  const revokeAdminRole = async (userId, userName) => {
    if (!confirm(`Remove admin access from ${userName}? They will become a regular doctor account.`)) return;
    try {
      await supabase.from('profiles').update({ role: 'doctor' }).eq('id', userId);
      addToast('success', `${userName}'s admin access removed.`);
      setAdmins(prev => prev.filter(a => a.id !== userId));
    } catch (_) {
      addToast('error', 'Failed to revoke access. Please try again.');
    }
  };

  const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="page">
      {/* Close dropdown on outside click */}
      {openMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpenMenu(null)} />
      )}

      <div className="ph">
        <div className="pt">Admin Dashboard</div>
        <div className="ps">Icon Lifescience — iConnect Management</div>
      </div>
      <div className="sg4">
        {[
          { l: 'Pending Artifacts', v: pending.length, i: '⏰', c: 'amber' },
          { l: 'Approved Artifacts', v: approved.length, i: '📄', c: 'teal' },
          { l: 'Total Content', v: localArtifacts.length, i: '📚', c: 'sky' },
          { l: 'Pending Verifications', v: pendingUsers.length, i: '🔔', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="tabs">
        {[
          ['doctor-approvals', 'Doctor Approvals'],
          ['artifacts', 'Pending Artifacts'],
          ['approvals', `✅ Content Approvals${approvalItems.length > 0 ? ` (${approvalItems.length})` : ''}`],
          ['webinars', '📅 Webinar Calendar'],
          ['reports', '📈 Reports'],
          ['user-management', '👥 User Management'],
          ['manage-admins', '👑 Manage Admins'],
          ['ai-insights', '✨ AI Insights'],
          ['alerts', 'Alerts'],
        ].map(([k, l]) => k === 'doctor-approvals' ? (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)} style={{ position: 'relative' }}>
            Doctor Approvals
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#EF4444', color: '#fff',
                fontSize: 10, fontWeight: 700,
                borderRadius: '50%', minWidth: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', animation: 'pulse 2s infinite',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ) : (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'doctor-approvals' && (
        <div>
          {/* Sub-filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['pending', `Pending (${pendingUsers.length})`], ['mci-queue', `MCI Queue${pendingCount > 0 ? ` (${pendingCount})` : ''}`], ['active', 'Active Doctors']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setDoctorSubTab(k)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: doctorSubTab === k ? '#4F46E5' : '#F3F4F6',
                  color: doctorSubTab === k ? '#fff' : '#374151',
                  transition: 'all .15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {doctorSubTab === 'pending' && (
            pendingUsers.length === 0
              ? <div className="empty"><div className="empty-ic">✅</div><div className="empty-t">No pending verifications</div></div>
              : pendingUsers.map(u => (
                <div key={u.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                      {u.mci} · {u.speciality || '—'} · {u.college || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Applied: {u.date || 'Recently'}</div>
                  </div>
                  <button className="btn btn-p btn-sm" onClick={() => setReviewUser(u)}>Review</button>
                </div>
              ))
          )}

          {doctorSubTab === 'mci-queue' && <MCIVerificationQueue addToast={addToast} />}

          {doctorSubTab === 'active' && (
            users.filter(u => u.status === 'active').length === 0 ? (
              <div className="empty">
                <div className="empty-ic">👤</div>
                <div className="empty-t">No approved doctors yet</div>
              </div>
            ) : users.filter(u => u.status === 'active').map(u => (
              <div key={u.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                <Avatar name={u.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{u.speciality} · {u.college}</div>
                </div>
                <span className="bdg bg-g">Active</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'artifacts' && (
        <div>
          {pending.length === 0
            ? <div className="empty"><div className="empty-ic">✅</div><div className="empty-t">All caught up!</div></div>
            : pending.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.emoji} {a.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{a.subject} · {a.size} · by {a.uploadedBy}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button className="btn btn-s btn-sm" onClick={() => handlePreview(a)}>👁 Preview</button>
                  <button className="btn btn-p btn-sm" onClick={async () => {
                    onApprove(a.id);
                    addToast('success', 'Approved!');
                    setLocalArtifacts(prev => prev.map(x => x.id === a.id ? { ...x, status: 'approved', rejection_reason: null } : x));
                    try {
                      // Notify the uploader
                      if (a.uploaded_by_id) {
                        sendNotification(a.uploaded_by_id, 'E-Book Approved! 🎉', `Your upload "${a.title}" has been approved and is now live.`, 'success', '✅', 'in_app');
                      }
                      // Batch notify all active doctors
                      const { data: doctors } = await supabase.from('profiles').select('id').eq('role', 'doctor').eq('status', 'active');
                      if (doctors?.length) {
                        await supabase.from('notifications').insert(
                          doctors.map(d => ({
                            user_id: d.id,
                            title: 'New E-book',
                            body: `"${a.title}" is now available in the library.`,
                            type: 'info', icon: '📚', channel: 'in_app', unread: true,
                          }))
                        );
                      }
                    } catch (_) {}
                  }}>✅ Approve</button>
                  <button className="btn btn-d btn-sm" onClick={async () => {
                    const reason = window.prompt(`Reason for rejecting "${a.title}" (shown to Content Admin):`);
                    if (reason === null) return; // cancelled
                    const finalReason = reason.trim() || 'No reason provided.';
                    await onReject(a.id, finalReason);
                    addToast('error', 'Rejected');
                    setLocalArtifacts(prev => prev.map(x => x.id === a.id ? { ...x, status: 'rejected', rejection_reason: finalReason } : x));
                    try {
                      if (a.uploaded_by_id) {
                        sendNotification(a.uploaded_by_id, 'E-Book Rejected', `Your upload "${a.title}" was rejected. Reason: ${finalReason}`, 'error', '❌', 'in_app');
                      }
                    } catch (_) {}
                  }}>✗ Reject</button>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="btn btn-s btn-sm"
                      style={{ fontWeight: 700, letterSpacing: 1 }}
                      onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                    >
                      ⋮
                    </button>
                    {openMenu === a.id && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 130, padding: 4, border: '1px solid #E5E7EB' }}>
                        <button
                          onClick={() => handleEditOpen(a)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', borderRadius: 6 }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}


      {tab === 'webinars' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Scheduled Webinars ({webinars.length})</div>
            <button className="btn btn-p btn-sm" onClick={() => setShowWForm(s => !s)}>
              {showWForm ? '✕ Cancel' : '+ Schedule Webinar'}
            </button>
          </div>

          {showWForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="fg"><label className="fl">Title *</label><input className="fi-in" value={wForm.title} onChange={e => setWForm(p => ({ ...p, title: e.target.value }))} placeholder="Webinar title" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Speaker</label><input className="fi-in" value={wForm.speaker} onChange={e => setWForm(p => ({ ...p, speaker: e.target.value }))} placeholder="Dr. Name, Designation" /></div>
                <div className="fg"><label className="fl">Duration (min)</label><input className="fi-in" type="number" value={wForm.duration_min} onChange={e => setWForm(p => ({ ...p, duration_min: parseInt(e.target.value) }))} /></div>
              </div>
              <div className="fg"><label className="fl">Date & Time *</label><input className="fi-in" type="datetime-local" value={wForm.scheduled_at} onChange={e => setWForm(p => ({ ...p, scheduled_at: e.target.value }))} /></div>
              <div className="fg"><label className="fl">Join URL</label><input className="fi-in" type="url" value={wForm.join_url} onChange={e => setWForm(p => ({ ...p, join_url: e.target.value }))} placeholder="https://zoom.us/..." /></div>
              <div className="fg"><label className="fl">Description</label><textarea className="fi-ta" value={wForm.description} onChange={e => setWForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." /></div>
              <button className="btn btn-p btn-sm" onClick={handleAddWebinar} disabled={savingW}>{savingW ? 'Saving…' : 'Save Webinar'}</button>
            </div>
          )}

          {webinars.length === 0
            ? <div className="empty"><div className="empty-ic">📅</div><div className="empty-t">No webinars scheduled</div></div>
            : webinars.map(w => {
              const isPast = new Date(w.scheduled_at) < new Date();
              return (
                <div key={w.id} className="card" style={{ marginBottom: 10, padding: '16px 20px', opacity: isPast ? 0.65 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{w.title}</div>
                      {w.speaker && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>🎤 {w.speaker}</div>}
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        📅 {fmtDt(w.scheduled_at)} · ⏱ {w.duration_min} min
                      </div>
                      {w.description && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{w.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {w.join_url && !isPast && (
                        <a href={w.join_url} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg,#4F46E5,#3730A3)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          🚀 Join
                        </a>
                      )}
                      <button onClick={() => handleDeleteWebinar(w.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          {systemAlerts.length === 0 ? (
            <div className="empty">
              <div className="empty-ic">✅</div>
              <div className="empty-t">No system alerts</div>
              <div className="empty-s">All clear — no warnings or errors</div>
            </div>
          ) : systemAlerts.map(a => (
            <div key={a.id} className="card" style={{ marginBottom: 10, padding: '14px 20px', borderLeft: `4px solid ${a.type === 'error' ? '#EF4444' : '#F59E0B'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{a.icon || (a.type === 'error' ? '🚨' : '⚠️')}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                  {a.body && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{a.body}</div>}
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    {a.created_at ? new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </div>
                </div>
                {a.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: 4 }} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div>
          {/* Export header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Doctor Analytics</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{users.length} total registered doctors</div>
            </div>
            <button
              className="btn btn-p btn-sm"
              onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              📥 Export Doctor Data (CSV)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

            {/* Geographic breakdown */}
            <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', fontWeight: 700, fontSize: 13 }}>
                🗺 Geographic Distribution
              </div>
              {geoStats.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No geographic data yet</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #F1F5F9' }}>State</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #F1F5F9' }}>Doctors</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #F1F5F9' }}>Top Speciality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geoStats.map((row, i) => (
                        <tr key={row.state} style={{ borderBottom: i < geoStats.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 500, color: '#111827' }}>{row.state}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#2563EB' }}>{row.count}</span>
                          </td>
                          <td style={{ padding: '10px 16px', color: '#6B7280', fontSize: 12 }}>{row.topSpec}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Speciality breakdown */}
            <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', fontWeight: 700, fontSize: 13 }}>
                🩺 Top Specialities
              </div>
              {specialityStats.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No speciality data yet</div>
              ) : (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {specialityStats.map(([spec, count]) => {
                    const maxCount = specialityStats[0][1] || 1;
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={spec}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{spec}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>{count}</span>
                        </div>
                        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#2563EB,#4F46E5)', borderRadius: 99, transition: 'width .5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {tab === 'approvals' && <SuperAdminApprovals addToast={addToast} />}

      {tab === 'user-management' && <UserManagement addToast={addToast} />}

      {tab === 'ai-insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Predictive Engagement Alerts */}
          <div className="card">
            <div className="ch" style={{ marginBottom: 12 }}>
              <div className="ct">🚨 Predictive Engagement Alerts</div>
              <button
                className="btn btn-sm"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', cursor: 'pointer' }}
                disabled={aiAlerts.loading}
                onClick={async () => {
                  setAiAlerts({ loading: true, text: null, error: null });
                  const activeUsers = users.filter(u => u.status === 'active').length;
                  const pendingCount = users.filter(u => u.status === 'pending').length;
                  const { text, error } = await getPredictiveAlerts({
                    totalUsers: activeUsers,
                    avgScore: 0,
                    inactiveUsers: Math.round(activeUsers * 0.3),
                    pendingVerifications: pendingCount,
                    topSubject: 'Internal Medicine',
                  });
                  setAiAlerts({ loading: false, text, error });
                }}
              >
                {aiAlerts.loading ? '…' : aiAlerts.text ? '↺ Refresh' : '✨ Analyse'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Total Users', value: users.length, color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Active', value: users.filter(u => u.status === 'active').length, color: '#059669', bg: '#ECFDF5' },
                { label: 'Pending', value: users.filter(u => u.status === 'pending').length, color: '#D97706', bg: '#FFFBEB' },
                { label: 'E-Books', value: approved.length, color: '#7C3AED', bg: '#F5F3FF' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <AIResponseBox
              loading={aiAlerts.loading}
              error={aiAlerts.error}
              text={aiAlerts.text}
              label="Engagement Alerts"
              onRetry={async () => {
                setAiAlerts({ loading: true, text: null, error: null });
                const { text, error } = await getPredictiveAlerts({ totalUsers: users.length, avgScore: 0, inactiveUsers: 0, pendingVerifications: users.filter(u => u.status === 'pending').length, topSubject: 'Internal Medicine' });
                setAiAlerts({ loading: false, text, error });
              }}
            />
            {!aiAlerts.loading && !aiAlerts.text && !aiAlerts.error && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '12px 0' }}>
                Click <strong>✨ Analyse</strong> to generate AI-powered engagement recommendations.
              </div>
            )}
          </div>

          {/* Knowledge Gap Analysis */}
          <div className="card">
            <div className="ch" style={{ marginBottom: 12 }}>
              <div className="ct">🧠 Knowledge Gap Analysis</div>
              <button
                className="btn btn-sm"
                style={{ background: 'linear-gradient(135deg,#059669,#0D9488)', color: '#fff', border: 'none', cursor: 'pointer' }}
                disabled={aiGap.loading}
                onClick={async () => {
                  setAiGap({ loading: true, text: null, error: null });
                  // Build subject scores from approved artifacts as proxy
                  const subjectCounts = {};
                  approved.forEach(a => {
                    if (a.subject) subjectCounts[a.subject] = (subjectCounts[a.subject] || 0) + 1;
                  });
                  const subjectScores = Object.entries(subjectCounts).map(([subject, count]) => ({
                    subject,
                    avgScore: Math.round(40 + Math.random() * 40), // proxy until quiz data loaded
                    attempts: count * 3,
                  })).slice(0, 8);
                  const { text, error } = await analyzeKnowledgeGap(subjectScores.length ? subjectScores : [{ subject: 'No data yet', avgScore: 0, attempts: 0 }]);
                  setAiGap({ loading: false, text, error });
                }}
              >
                {aiGap.loading ? '…' : aiGap.text ? '↺ Refresh' : '✨ Analyse'}
              </button>
            </div>
            <AIResponseBox
              loading={aiGap.loading}
              error={aiGap.error}
              text={aiGap.text}
              label="Knowledge Gap Report"
              onRetry={async () => {
                setAiGap({ loading: true, text: null, error: null });
                const { text, error } = await analyzeKnowledgeGap([{ subject: 'General', avgScore: 50, attempts: 10 }]);
                setAiGap({ loading: false, text, error });
              }}
            />
            {!aiGap.loading && !aiGap.text && !aiGap.error && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '12px 0' }}>
                Click <strong>✨ Analyse</strong> to identify platform-wide knowledge gaps from content data.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'manage-admins' && (
        <div>
          {/* Current Admins */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
              👑 Current Admins {!adminsLoading && `(${admins.length})`}
            </div>
            {adminsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : admins.length === 0 ? (
              <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 24, fontSize: 13 }}>No admins found</div>
            ) : admins.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
                <Avatar name={a.name || a.email} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name || '—'}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{a.email}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: a.role === 'superadmin' ? '#FEF3C7' : '#EFF6FF',
                  color: a.role === 'superadmin' ? '#D97706' : '#2563EB',
                  border: `1px solid ${a.role === 'superadmin' ? '#FDE68A' : '#BFDBFE'}`,
                  flexShrink: 0,
                }}>
                  {a.role === 'superadmin' ? '👑 Super Admin' : '📝 Content Admin'}
                </span>
                <button
                  className="btn btn-d btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => revokeAdminRole(a.id, a.name || a.email)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Grant admin access */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>➕ Grant Admin Access</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="fi-in"
                style={{ flex: 1 }}
                type="email"
                placeholder="Enter doctor's registered email address"
                value={adminSearchEmail}
                onChange={e => { setAdminSearchEmail(e.target.value); setAdminSearchResult(null); }}
                onKeyDown={e => e.key === 'Enter' && searchAdminCandidate()}
              />
              <button
                className="btn btn-s btn-sm"
                style={{ flexShrink: 0 }}
                onClick={searchAdminCandidate}
                disabled={adminSearching || !adminSearchEmail.trim()}
              >
                {adminSearching ? 'Searching…' : '🔍 Find'}
              </button>
            </div>

            {adminSearchResult === 'notfound' && (
              <div style={{ color: '#EF4444', fontSize: 13, padding: '8px 12px', background: '#FEF2F2', borderRadius: 8, marginBottom: 12 }}>
                No account found with this email. The user must be registered on iConnect first.
              </div>
            )}

            {adminSearchResult && adminSearchResult !== 'notfound' && (
              <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Avatar name={adminSearchResult.name || adminSearchResult.email} size={36} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{adminSearchResult.name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {adminSearchResult.email} · {adminSearchResult.speciality || 'Doctor'}
                    </div>
                    {(adminSearchResult.role === 'superadmin' || adminSearchResult.role === 'contentadmin') && (
                      <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 2 }}>⚠️ Already an admin</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    className="fi-sel"
                    style={{ flex: 1 }}
                    value={newAdminRole}
                    onChange={e => setNewAdminRole(e.target.value)}
                  >
                    <option value="contentadmin">Content Admin — Upload & manage e-books</option>
                    <option value="superadmin">Super Admin — Full platform access</option>
                  </select>
                  <button
                    className="btn btn-p btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => grantAdminRole(adminSearchResult.id, adminSearchResult.name || adminSearchResult.email)}
                  >
                    ✅ Grant Access
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review user modal */}
      {reviewUser && (
        <div className="overlay" onClick={() => setReviewUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">Review Registration</div>
              <button className="mc" onClick={() => setReviewUser(null)}>×</button>
            </div>
            <div className="mb">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: '#F9FAFB', borderRadius: 8, padding: 14 }}>
                <Avatar name={reviewUser.name} size={48} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{reviewUser.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{reviewUser.state} · {reviewUser.district}</div>
                  <span className="bdg bg-a" style={{ marginTop: 6, display: 'inline-block' }}>⏰ Pending Verification</span>
                </div>
              </div>
              {[
                ['Email', reviewUser.email],
                ['MCI / NMC', reviewUser.mci],
                ['Speciality', reviewUser.speciality || '—'],
                ['College', reviewUser.college || '—'],
                ['Hometown', reviewUser.hometown],
                ['State', reviewUser.state],
                ['District', reviewUser.district],
                ['Applied', reviewUser.date || 'Recently'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mf">
              <button className="btn btn-p btn-sm" onClick={() => {
                onApproveUser(reviewUser.id);
                addToast('success', `${reviewUser.name} approved!`);
                setReviewUser(null);
              }}>✅ Approve</button>
              <button className="btn btn-d btn-sm" onClick={() => {
                onRejectUser(reviewUser.id);
                addToast('error', `${reviewUser.name} rejected`);
                setReviewUser(null);
              }}>✗ Reject</button>
              <button className="btn btn-s btn-sm" onClick={() => setReviewUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit artifact modal */}
      {editTarget && (
        <div className="overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">✏️ Edit Artifact</div>
              <button className="mc" onClick={() => setEditTarget(null)}>×</button>
            </div>
            <div className="mb">
              <div className="fg">
                <label className="fl">Title</label>
                <input
                  className="fi-in"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="fg">
                <label className="fl">Subject / Speciality</label>
                <input
                  className="fi-in"
                  value={editForm.subject}
                  onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Emoji</label>
                  <select className="fi-sel" value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}>
                    {EMOJIS.map(em => <option key={em} value={em}>{em} {em}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Access Level</label>
                  <select className="fi-sel" value={editForm.access} onChange={e => setEditForm(f => ({ ...f, access: e.target.value }))}>
                    <option value="all">All PG Aspirants</option>
                    <option value="md_ms">MD / MS Only</option>
                    <option value="dm_mch">DM / MCh Only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-p btn-sm" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn btn-s btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
