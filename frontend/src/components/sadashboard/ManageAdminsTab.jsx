import { useState, useEffect } from 'react';
import Avatar from '../Avatar';
import { supabase } from '../../lib/supabase';

export default function ManageAdminsTab({ addToast, setPendingRevokeUser }) {
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminSearchEmail, setAdminSearchEmail] = useState('');
  const [adminSearchResult, setAdminSearchResult] = useState(null); // null | 'notfound' | profile object
  const [adminSearching, setAdminSearching] = useState(false);
  const [newAdminRole, setNewAdminRole] = useState('contentadmin');

  useEffect(() => {
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
  }, []);

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

  return (
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
              onClick={() => setPendingRevokeUser({ id: a.id, name: a.name || a.email })}
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
  );
}
