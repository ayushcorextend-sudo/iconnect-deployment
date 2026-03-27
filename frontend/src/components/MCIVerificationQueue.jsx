import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ab } from '../data/constants';

// SEC-003: Anon key and project URL removed from source — use supabase.functions.invoke()
// which automatically attaches the authenticated session token.

function Avatar({ name, size = 40 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ab(name || 'U'),
      color: '#fff', fontWeight: 700, fontSize: size * 0.35,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

const STATUS_TABS = ['pending', 'approved', 'rejected'];

const waitingDays = (createdAt) => {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
};

// Calls send-approval-email edge function with authenticated session (no hardcoded key).
const sendEmail = (payload) =>
  supabase.functions.invoke('send-approval-email', { body: payload }).catch(() => {});

export default function MCIVerificationQueue({ addToast = () => {} }) {
  const [tab, setTab] = useState('pending');
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchProfiles = async (status) => {
    setLoading(true);
    try {
      // Approved doctors are stored with status='active' in the DB
      const dbStatus = status === 'approved' ? 'active' : status;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .eq('status', dbStatus)
        .order('created_at', { ascending: false });
      if (!error) setProfiles(data || []);
    } catch (e) { console.warn('MCIVerificationQueue: failed to fetch profiles:', e.message); }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles(tab);
    const sub = supabase
      .channel('mci-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfiles(tab);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [tab]);

  const approve = async (profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active', verified: true })
        .eq('id', profile.id);
      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: profile.id,
        type: 'success',
        icon: '✅',
        title: 'Account Verified!',
        body: 'Your MCI/NMC number has been verified. You now have full access to iConnect.',
        channel: 'in_app',
        unread: true,
      }]);

      sendEmail({
        doctorEmail: profile.email,
        doctorName: profile.name || 'Doctor',
        mciNumber: profile.mci_number || '',
        college: profile.college || '',
        approved: true,
      });

      setProfiles(prev => prev.filter(p => p.id !== profile.id));
      addToast('success', `✅ ${profile.name || 'Doctor'} approved and activated.`);
    } catch (err) {
      addToast('error', err.message || 'Failed to approve. Please try again.');
    }
  };

  const reject = async (profile, reason) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected', verified: false, rejection_reason: reason || null })
        .eq('id', profile.id);
      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: profile.id,
        type: 'error',
        icon: '❌',
        title: 'Verification Rejected',
        body: reason
          ? `Your account could not be verified: ${reason}`
          : 'Your MCI/NMC number could not be verified. Please contact support for assistance.',
        channel: 'in_app',
        unread: true,
      }]);

      sendEmail({
        doctorEmail: profile.email,
        doctorName: profile.name || 'Doctor',
        mciNumber: profile.mci_number || '',
        college: profile.college || '',
        approved: false,
        rejectionReason: reason || '',
      });

      setProfiles(prev => prev.filter(p => p.id !== profile.id));
      setRejectingId(null);
      setRejectReason('');
      addToast('success', `${profile.name || 'Doctor'} rejected.`);
    } catch (err) {
      addToast('error', err.message || 'Failed to reject. Please try again.');
    }
  };

  const tabStyle = (t) => ({
    padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    background: tab === t ? '#4F46E5' : '#F3F4F6',
    color: tab === t ? '#fff' : '#6B7280',
    transition: 'all .15s',
  });

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 4px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: '#1E1B4B', margin: 0 }}>
          MCI / NMC Verification Queue
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Review and approve doctor registrations
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_TABS.map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40, fontSize: 14 }}>
          Loading…
        </div>
      ) : profiles.length === 0 ? (
        <div style={{
          textAlign: 'center', background: '#F9FAFB', borderRadius: 16,
          padding: 48, color: '#9CA3AF', fontSize: 14,
        }}>
          {tab === 'pending' ? '🎉 No pending verifications' : `No ${tab} records`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {profiles.map(p => {
            const days = waitingDays(p.created_at);
            return (
              <div key={p.id} style={{
                background: '#fff', borderRadius: 14,
                border: '1px solid #E5E7EB',
                padding: '18px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <Avatar name={p.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name + waiting days */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{p.name || '—'}</div>
                      {tab === 'pending' && days > 0 && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                          ⏳ Waiting {days} day{days !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Email + phone */}
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {p.email}{p.phone ? ` · ${p.phone}` : ''}
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {p.mci_number && (
                        <span style={{ background: '#EDE9FE', color: '#4F46E5', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                          MCI: {p.mci_number}
                        </span>
                      )}
                      {p.program && (
                        <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                          {p.program}
                        </span>
                      )}
                      {p.speciality && (
                        <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                          {p.speciality}
                        </span>
                      )}
                      {p.college && (
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                          🏥 {p.college}
                        </span>
                      )}
                      {p.joining_year && (
                        <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                          Joined {p.joining_year}
                        </span>
                      )}
                      {p.hometown && (
                        <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                          📍 {p.hometown}{p.state ? `, ${p.state}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Rejection reason for rejected tab */}
                    {tab === 'rejected' && p.rejection_reason && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '6px 10px' }}>
                        Reason: {p.rejection_reason}
                      </div>
                    )}

                    {/* Inline reject reason input */}
                    {tab === 'pending' && rejectingId === p.id && (
                      <div style={{ marginTop: 12, padding: '12px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
                        <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginBottom: 8 }}>
                          Enter rejection reason (optional)
                        </div>
                        <input
                          style={{
                            width: '100%', padding: '7px 10px', borderRadius: 8,
                            border: '1px solid #FECACA', fontSize: 13,
                            background: '#fff', boxSizing: 'border-box', marginBottom: 8,
                          }}
                          placeholder="e.g. MCI number not found in records"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#374151' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => reject(p, rejectReason.trim())}
                            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {tab === 'pending' && rejectingId !== p.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => approve(p)}
                        style={{
                          padding: '7px 18px', borderRadius: 8, border: 'none',
                          background: '#10B981', color: '#fff',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => { setRejectingId(p.id); setRejectReason(''); }}
                        style={{
                          padding: '7px 18px', borderRadius: 8, border: '1px solid #FECACA',
                          background: '#FEF2F2', color: '#DC2626',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {tab === 'approved' && (
                    <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>
                      Verified ✓
                    </span>
                  )}
                  {tab === 'rejected' && (
                    <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
