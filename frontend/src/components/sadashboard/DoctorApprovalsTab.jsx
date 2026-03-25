import { useState } from 'react';
import Avatar from '../Avatar';
import MCIVerificationQueue from '../MCIVerificationQueue';

export default function DoctorApprovalsTab({ users, pendingUsers, pendingCount, addToast, onApproveUser, onRejectUser, setReviewUser }) {
  const [doctorSubTab, setDoctorSubTab] = useState('pending');

  return (
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
  );
}
