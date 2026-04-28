import { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { supabase, deleteArtifact, updateArtifact } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../lib/sendNotification';
import { Z } from '../styles/zIndex';
import SuperAdminApprovals from './SuperAdminApprovals';
import UserManagement from './superadmin/UserManagement';
import ConfirmModal from './ui/ConfirmModal';

import DoctorApprovalsTab from './sadashboard/DoctorApprovalsTab';
import ArtifactsTab from './sadashboard/ArtifactsTab';
import WebinarCalendarTab from './sadashboard/WebinarCalendarTab';
import ReportsTab from './sadashboard/ReportsTab';
import AIInsightsTab from './sadashboard/AIInsightsTab';
import ManageAdminsTab from './sadashboard/ManageAdminsTab';

const EMOJIS = ['📗', '📘', '📙', '📕', '📚', '📋', '📄', '🗂️'];

export default function SADashboard({ artifacts = [], setPage, addToast, onApprove, onReject, users = [], onApproveUser, onRejectUser, onLogout }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('doctor-approvals');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingRevokeUser, setPendingRevokeUser] = useState(null);
  const [reviewUser, setReviewUser] = useState(null);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

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

  const pending = localArtifacts.filter(a => a.status === 'pending');
  const approved = localArtifacts.filter(a => a.status === 'approved');
  const pendingUsers = users.filter(u => u.status === 'pending');

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'doctor')
          .eq('status', 'pending');
        setPendingCount(count || 0);
      } catch (e) { console.warn('SADashboard: failed to fetch pending count:', e.message); }
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
        if (!user?.id) return;
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .in('type', ['warn', 'error'])
          .order('created_at', { ascending: false })
          .limit(50);
        setSystemAlerts(data || []);
      } catch (e) { console.warn('SADashboard: failed to load system alerts:', e.message); }
    })();
  }, [tab]);

  // Load unified approvals when tab opens
  useEffect(() => {
    if (tab !== 'approvals') return;
    (async () => {
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
      } catch (e) { console.warn('SADashboard: failed to load unified approval items:', e.message); }
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

  // ── Revoke admin (called from ManageAdminsTab confirm) ────────
  const revokeAdminRole = async (userId, userName) => {
    try {
      await supabase.from('profiles').update({ role: 'doctor' }).eq('id', userId);
      addToast('success', `${userName}'s admin access removed.`);
    } catch (_) {
      addToast('error', 'Failed to revoke access. Please try again.');
    }
  };

  return (
    <div className="page">
      {/* Close dropdown on outside click */}
      {openMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Z.dropdownBackdrop }} onClick={() => setOpenMenu(null)} />
      )}

      <div className="ph">
        <div className="pt">Admin Dashboard</div>
        <div className="ps">ICON LIFE SCIENCES — iConnect Management</div>
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
        <DoctorApprovalsTab
          users={users}
          pendingUsers={pendingUsers}
          pendingCount={pendingCount}
          addToast={addToast}
          onApproveUser={onApproveUser}
          onRejectUser={onRejectUser}
          setReviewUser={setReviewUser}
        />
      )}

      {tab === 'artifacts' && (
        <ArtifactsTab
          pending={pending}
          onApprove={onApprove}
          onReject={onReject}
          addToast={addToast}
          setLocalArtifacts={setLocalArtifacts}
          artifacts={artifacts}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          handlePreview={handlePreview}
          handleEditOpen={handleEditOpen}
          setPendingDeleteId={setPendingDeleteId}
        />
      )}

      {tab === 'webinars' && <WebinarCalendarTab addToast={addToast} />}

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
        <ReportsTab users={users} approvedCount={approved.length} addToast={addToast} />
      )}

      {tab === 'approvals' && <SuperAdminApprovals addToast={addToast} />}

      {tab === 'user-management' && <UserManagement addToast={addToast} />}

      {tab === 'ai-insights' && (
        <AIInsightsTab users={users} approved={approved} />
      )}

      {tab === 'manage-admins' && (
        <ManageAdminsTab addToast={addToast} setPendingRevokeUser={setPendingRevokeUser} />
      )}

      {/* Review user modal */}
      {reviewUser && (
        <div className="overlay" onClick={() => setReviewUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">Review Registration</div>
              <button aria-label="Close" className="mc" onClick={() => setReviewUser(null)}>×</button>
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
              <button aria-label="Close" className="mc" onClick={() => setEditTarget(null)}>×</button>
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

      {pendingDeleteId && (
        <ConfirmModal
          message="Delete this artifact? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => { const id = pendingDeleteId; setPendingDeleteId(null); handleDelete(id); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
      {pendingRevokeUser && (
        <ConfirmModal
          message={`Remove admin access from ${pendingRevokeUser.name}? They will become a regular doctor account.`}
          confirmLabel="Revoke Access"
          onConfirm={() => { const u = pendingRevokeUser; setPendingRevokeUser(null); revokeAdminRole(u.id, u.name); }}
          onCancel={() => setPendingRevokeUser(null)}
        />
      )}
    </div>
  );
}
