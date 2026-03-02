import { useState } from 'react';
import Avatar from './Avatar';
import { USERS_DATA } from '../data/constants';

export default function SADashboard({ artifacts = [], setPage, addToast, onApprove, onReject, users = [], onApproveUser, onRejectUser }) {
  const pending = artifacts.filter(a => a.status === 'pending');
  const approved = artifacts.filter(a => a.status === 'approved');
  const [tab, setTab] = useState('verifications');
  const [reviewUser, setReviewUser] = useState(null);

  const pendingUsers = users.filter(u => u.status === 'pending');

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Admin Dashboard</div>
        <div className="ps">Icon Lifescience — iConnect Management</div>
      </div>
      <div className="sg4">
        {[
          { l: 'Pending Artifacts', v: pending.length, i: '⏰', c: 'amber' },
          { l: 'Approved Artifacts', v: approved.length, i: '📄', c: 'teal' },
          { l: 'Total Content', v: artifacts.length, i: '📚', c: 'sky' },
          { l: 'Pending Verifications', v: pendingUsers.length, i: '🔔', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-s" onClick={() => setPage('users')}>👤 User Management</button>
        <button className="btn btn-s" onClick={() => setPage('ebooks')}>📁 Content Management</button>
      </div>
      <div className="tabs">
        {[['verifications', 'Pending Verifications'], ['artifacts', 'Pending Artifacts'], ['approved', 'Approved Doctors'], ['alerts', 'Alerts']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'verifications' && (
        <div>
          {pendingUsers.length === 0
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
          }
        </div>
      )}

      {tab === 'artifacts' && (
        <div>
          {pending.length === 0
            ? <div className="empty"><div className="empty-ic">✅</div><div className="empty-t">All caught up!</div></div>
            : pending.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{a.subject} · {a.size}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-p btn-sm" onClick={() => { onApprove(a.id); addToast('success', 'Approved!'); }}>✅ Approve</button>
                  <button className="btn btn-d btn-sm" onClick={() => { onReject(a.id); addToast('error', 'Rejected'); }}>✗ Reject</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'approved' && (
        <div>
          {USERS_DATA.filter(u => u.status === 'active').map(u => (
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
          <div className="empty-t">3 system alerts pending</div>
          <div className="empty-s">Check notifications for details</div>
        </div>
      )}

      {/* Review modal */}
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
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{reviewUser.state} · {reviewUser.zone}</div>
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
                ['Zone', reviewUser.zone],
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
    </div>
  );
}
