import { useState } from 'react';
import Avatar from './Avatar';
import { USERS_DATA } from '../data/constants';

export default function CADashboard({ artifacts = [], setPage, addToast }) {
  const mine = artifacts.filter(a => a.uploadedBy === 'Priya Sharma');
  const pending = mine.filter(a => a.status === 'pending');
  const [tab, setTab] = useState('verifications');

  const pendingUsers = [
    { id: 1, name: 'Dr. Ankit Verma', mci: 'MCI-2024-91234', spec: 'Cardiology', college: 'JIPMER Puducherry', date: 'Feb 5, 2026' },
    { id: 2, name: 'Dr. Sneha Patel', mci: 'MCI-2024-88210', spec: 'Neurology', college: 'AIIMS New Delhi', date: 'Feb 7, 2026' },
    { id: 3, name: 'Dr. Rahul Joshi', mci: 'MCI-2023-45123', spec: 'Surgery', college: 'Grant Medical College', date: 'Feb 8, 2026' },
  ];

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Admin Dashboard</div>
        <div className="ps">Icon Lifescience — iConnect Management</div>
      </div>
      <div className="sg4">
        {[
          { l: 'Pending', v: 3, i: '⏰', c: 'amber' },
          { l: 'Approved', v: 2, i: '👤', c: 'teal' },
          { l: 'Content Items', v: mine.length, i: '📄', c: 'sky' },
          { l: 'Alerts', v: 3, i: '🔔', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-s" onClick={() => setPage('ebooks')}>📁 Content Management</button>
      </div>
      <div className="tabs">
        {[['verifications', 'Pending Verifications'], ['artifacts', 'Pending Artifacts'], ['approved', 'Approved Doctors'], ['alerts', 'Alerts']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'verifications' && (
        <div>
          {pendingUsers.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{u.mci} · {u.spec} · {u.college}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Applied: {u.date}</div>
              </div>
              <button className="btn btn-p btn-sm" onClick={() => addToast('info', 'Only Super Admin can approve users.')}>Review</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'artifacts' && (
        <div>
          {pending.length === 0
            ? <div className="empty"><div className="empty-ic">✅</div><div className="empty-t">No pending artifacts</div></div>
            : pending.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{a.subject} · Awaiting Super Admin approval</div>
                </div>
                <span className="bdg bg-a">Pending</span>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'approved' && (
        <div>
          {USERS_DATA.filter(u => u.status === 'active').slice(0, 3).map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
              <Avatar name={u.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{u.speciality} · {u.college}</div>
              </div>
              <span className="bdg bg-g">Active</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="empty">
          <div className="empty-ic">🔔</div>
          <div className="empty-t">3 alerts pending</div>
        </div>
      )}
    </div>
  );
}
