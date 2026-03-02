import { useState } from 'react';
import Avatar from './Avatar';
import { ZONES, STATES } from '../data/constants';

export default function UsersPage({ users = [], addToast }) {
  const [search, setSearch] = useState('');
  const [zone, setZone] = useState('');
  const [state, setState] = useState('');
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('users');

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase()) && !(u.mci || '').toLowerCase().includes(search.toLowerCase()) && !(u.hometown || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (zone && u.zone !== zone) return false;
    if (state && u.state !== state) return false;
    return true;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const pendingUsers = users.filter(u => u.status === 'pending').length;
  const adminUsers = users.filter(u => u.role !== 'PG Aspirant').length;

  const exportCSV = () => {
    const rows = [['Name', 'Email', 'Role', 'MCI/NMC', 'State', 'Zone', 'Status'], ...filtered.map(u => [u.name, u.email, u.role, u.mci, u.state, u.zone, u.status])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'iConnect_users.csv';
    a.click();
    addToast('success', `Exported ${filtered.length} users!`);
  };

  return (
    <div className="page">
      <div className="ph-row ph">
        <div>
          <div className="pt">User Management</div>
          <div className="ps">Manage roles, access levels, and user status</div>
        </div>
        <button className="btn btn-s btn-sm" onClick={exportCSV}>⬇️ Export Report</button>
      </div>

      <div className="sg4">
        {[
          { l: 'Total Users', v: totalUsers, i: '👥', c: 'teal' },
          { l: 'Active', v: activeUsers, i: '👤', c: 'violet' },
          { l: 'Pending', v: pendingUsers, i: '⏰', c: 'amber' },
          { l: 'Admin Roles', v: adminUsers, i: '🛡️', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-ic">{s.i}</div><div className="stat-v">{s.v}</div><div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['users', 'All Users'], ['reports', 'Reports'], ['roles', 'Role Definitions']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                <span>🔍</span>
                <input placeholder="Search by name, email, MCI, or hometown..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="fi-sel" style={{ width: 'auto' }} value={zone} onChange={e => setZone(e.target.value)}>
                <option value="">All Zones</option>
                {Object.keys(ZONES).map(z => <option key={z}>{z}</option>)}
              </select>
              <select className="fi-sel" style={{ width: 'auto' }} value={state} onChange={e => setState(e.target.value)}>
                <option value="">All States</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="fi-sel" style={{ width: 'auto' }}><option>All Specializations</option></select>
            </div>
          </div>
          <div className="card">
            <div className="tw">
              <table>
                <thead>
                  <tr><th>Name</th><th>MCI/NMC</th><th>Location</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={u.name} size={30} />
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: '#6B7280' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{u.mci}</td>
                      <td>
                        <div style={{ fontSize: 13 }}>{u.hometown}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{u.state} · {u.zone}</div>
                      </td>
                      <td><span className={`bdg ${u.role === 'Content Admin' ? 'bg-s' : 'bg-v'}`}>{u.role}</span></td>
                      <td>
                        {u.status === 'pending'
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#92400E' }}><span>⏰</span>Pending</div>
                          : <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#166534' }}><span>👤</span>Active</div>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-s btn-sm" onClick={() => setSel(u)}>👁</button>
                          <button className="btn btn-s btn-sm">✏️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'reports' && (
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>Generate Reports</div>
          <div className="grid2">
            {[{ t: 'Zone-wise Report', i: '🗺' }, { t: 'State-wise Report', i: '📍' }, { t: 'Speciality Report', i: '🩺' }, { t: 'Activity Report', i: '📈' }, { t: 'Verification Report', i: '✅' }, { t: 'Hometown Report', i: '🏡' }].map((r, i) => (
              <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: 14, cursor: 'pointer', border: '1px solid #E5E7EB' }} onClick={() => addToast('success', `${r.t} downloaded!`)}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{r.i}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.t}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="card">
          {[
            { role: 'Super Admin', desc: 'Full access — approvals, user management, reports, settings' },
            { role: 'Content Admin', desc: 'Upload and manage e-books, submit for Super Admin review' },
            { role: 'PG Aspirant', desc: 'Read approved e-books, view leaderboard, manage own profile' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.role}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      )}

      {sel && (
        <div className="overlay" onClick={() => setSel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">Doctor Profile</div>
              <button className="mc" onClick={() => setSel(null)}>×</button>
            </div>
            <div className="mb">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: '#F9FAFB', borderRadius: 8, padding: 14 }}>
                <Avatar name={sel.name} size={48} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{sel.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{sel.state} · {sel.zone}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span className={`bdg ${sel.status === 'active' ? 'bg-g' : 'bg-a'}`}>{sel.status}</span>
                    {sel.verified && <span className="bdg bg-sky">✅ Verified</span>}
                  </div>
                </div>
              </div>
              {[['Email', sel.email], ['MCI/NMC', sel.mci], ['Hometown', sel.hometown], ['State', sel.state], ['Zone', sel.zone], ['Role', sel.role]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mf">
              <button className="btn btn-p btn-sm" onClick={() => { addToast('success', `${sel.name}'s profile downloaded!`); setSel(null); }}>⬇️ Download Profile</button>
              <button className="btn btn-s btn-sm" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
