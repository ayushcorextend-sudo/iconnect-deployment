import { useState, useEffect, useCallback } from 'react';
import Avatar from './Avatar';
import { STATES } from '../data/constants';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 25;

export default function UsersPage({ addToast, role, userId }) {
  const [tab, setTab] = useState('users');

  // Pagination & data
  const [pageNum, setPageNum] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageData, setPageData] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, admin: 0 });

  // Modal
  const [sel, setSel] = useState(null);

  // Admin management
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminSearchResult, setAdminSearchResult] = useState(null);
  const [adminSearching, setAdminSearching] = useState(false);
  const [newAdminRole, setNewAdminRole] = useState('contentadmin');
  const [promoting, setPromoting] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 0 when filters change
  useEffect(() => { setPageNum(0); }, [debouncedSearch, districtFilter, stateFilter]);

  // Fetch one page of users from Supabase
  const fetchPage = useCallback(async () => {
    setPageLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,mci_number.ilike.%${debouncedSearch}%`
        );
      }
      if (districtFilter) query = query.ilike('district', `%${districtFilter}%`);
      if (stateFilter) query = query.eq('state', stateFilter);

      const { data, count, error } = await query;
      if (!error) {
        setPageData((data || []).map(p => ({
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          role: p.role === 'doctor' ? 'PG Aspirant' : p.role,
          mci: p.mci_number || '—',
          hometown: p.hometown || '—',
          state: p.state || '—',
          district: p.district || '—',
          speciality: p.speciality || '—',
          college: p.college || '—',
          status: p.status || 'pending',
          verified: p.verified || false,
        })));
        setTotalCount(count || 0);
      }
    } catch (_) {}
    setPageLoading(false);
  }, [pageNum, debouncedSearch, districtFilter, stateFilter]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  // Fetch aggregate stats once on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const [tot, act, pend, adm] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['superadmin', 'contentadmin']),
        ]);
        setStats({
          total: tot.count || 0,
          active: act.count || 0,
          pending: pend.count || 0,
          admin: adm.count || 0,
        });
      } catch (_) {}
    }
    fetchStats();
  }, []);

  // Load admins when tab is active
  useEffect(() => {
    if (tab !== 'roles') return;
    setAdminsLoading(true);
    supabase.from('profiles').select('id,name,email,role,created_at')
      .in('role', ['superadmin', 'contentadmin'])
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAdmins(data || []); setAdminsLoading(false); })
      .catch(() => setAdminsLoading(false));
  }, [tab]);

  const searchAdminCandidate = async () => {
    if (!adminSearch.trim()) return;
    setAdminSearching(true);
    setAdminSearchResult(null);
    const { data } = await supabase.from('profiles').select('id,name,email,role')
      .ilike('email', adminSearch.trim()).maybeSingle();
    setAdminSearchResult(data || 'not_found');
    setAdminSearching(false);
  };

  const grantAdminRole = async () => {
    if (!adminSearchResult || adminSearchResult === 'not_found') return;
    setPromoting(true);
    const { error } = await supabase.from('profiles').update({ role: newAdminRole }).eq('id', adminSearchResult.id);
    if (error) { addToast('error', 'Failed: ' + error.message); setPromoting(false); return; }
    addToast('success', `${adminSearchResult.name || adminSearchResult.email} is now ${newAdminRole === 'superadmin' ? 'Super Admin' : 'Content Admin'}.`);
    setAdminSearchResult(null);
    setAdminSearch('');
    // Refresh list
    const { data } = await supabase.from('profiles').select('id,name,email,role,created_at').in('role', ['superadmin', 'contentadmin']).order('created_at', { ascending: false });
    setAdmins(data || []);
    setPromoting(false);
  };

  const revokeAdminRole = async (adminId, adminName) => {
    if (adminId === userId) { addToast('error', 'Cannot revoke your own admin role.'); return; }
    if (!confirm(`Remove admin role from ${adminName}? They will become a regular PG Aspirant.`)) return;
    const { error } = await supabase.from('profiles').update({ role: 'doctor' }).eq('id', adminId);
    if (error) { addToast('error', 'Failed: ' + error.message); return; }
    addToast('success', `${adminName} demoted to PG Aspirant.`);
    setAdmins(prev => prev.filter(a => a.id !== adminId));
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const fromRow = totalCount === 0 ? 0 : pageNum * PAGE_SIZE + 1;
  const toRow = Math.min((pageNum + 1) * PAGE_SIZE, totalCount);

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'MCI/NMC', 'State', 'District', 'Status'],
      ...pageData.map(u => [u.name, u.email, u.role, u.mci, u.state, u.district, u.status]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'iConnect_users.csv';
    a.click();
    addToast('success', `Exported ${pageData.length} users (page ${pageNum + 1})!`);
  };

  return (
    <div className="page">
      <div className="ph-row ph">
        <div>
          <div className="pt">User Management</div>
          <div className="ps">Manage roles, access levels, and user status</div>
        </div>
        <button className="btn btn-s btn-sm" onClick={exportCSV}>⬇️ Export Page</button>
      </div>

      <div className="sg4">
        {[
          { l: 'Total Users', v: stats.total, i: '👥', c: 'teal' },
          { l: 'Active', v: stats.active, i: '👤', c: 'violet' },
          { l: 'Pending', v: stats.pending, i: '⏰', c: 'amber' },
          { l: 'Admin Roles', v: stats.admin, i: '🛡️', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['users', 'All Users'], ['reports', 'Reports'], ['roles', '👑 Manage Admins']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          {/* Search & filter bar */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                <span>🔍</span>
                <input
                  placeholder="Search by name, email, or MCI…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <input
                className="fi-in"
                style={{ width: 150 }}
                placeholder="Filter by district…"
                value={districtFilter}
                onChange={e => setDistrictFilter(e.target.value)}
              />
              <select className="fi-sel" style={{ width: 'auto' }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                <option value="">All States</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            {pageLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                Loading users…
              </div>
            ) : pageData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
                No users found{debouncedSearch ? ` for "${debouncedSearch}"` : ''}.
              </div>
            ) : (
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>MCI/NMC</th>
                      <th>Location</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map(u => (
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
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{u.state} · {u.district}</div>
                        </td>
                        <td>
                          <span className={`bdg ${u.role === 'Content Admin' ? 'bg-s' : 'bg-v'}`}>{u.role}</span>
                        </td>
                        <td>
                          {u.status === 'pending'
                            ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#92400E' }}><span>⏰</span>Pending</div>
                            : <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#166534' }}><span>👤</span>Active</div>
                          }
                        </td>
                        <td>
                          <button className="btn btn-s btn-sm" onClick={() => setSel(u)}>👁</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {!pageLoading && totalCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  Showing {fromRow}–{toRow} of {totalCount} users
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() => setPageNum(p => Math.max(0, p - 1))}
                    disabled={pageNum === 0}
                    style={{ opacity: pageNum === 0 ? 0.4 : 1 }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: 12, color: '#374151', padding: '4px 10px', background: '#F3F4F6', borderRadius: 6, fontWeight: 600 }}>
                    {pageNum + 1} / {totalPages}
                  </span>
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() => setPageNum(p => Math.min(totalPages - 1, p + 1))}
                    disabled={pageNum >= totalPages - 1}
                    style={{ opacity: pageNum >= totalPages - 1 ? 0.4 : 1 }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'reports' && (
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>Generate Reports</div>
          <div className="grid2">
            {[
              { t: 'Zone-wise Report', i: '🗺' }, { t: 'State-wise Report', i: '📍' },
              { t: 'Speciality Report', i: '🩺' }, { t: 'Activity Report', i: '📈' },
              { t: 'Verification Report', i: '✅' }, { t: 'Hometown Report', i: '🏡' },
            ].map((r, i) => (
              <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: 14, cursor: 'pointer', border: '1px solid #E5E7EB' }} onClick={() => addToast('success', `${r.t} downloaded!`)}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{r.i}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.t}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Current admins */}
          <div className="card">
            <div className="ct" style={{ marginBottom: 14 }}>Current Admins</div>
            {adminsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : admins.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>No admins found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {admins.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <Avatar name={a.name || a.email} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name || '—'}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{a.email}</div>
                    </div>
                    <span className={`bdg ${a.role === 'superadmin' ? 'bg-v' : 'bg-s'}`}>
                      {a.role === 'superadmin' ? 'Super Admin' : 'Content Admin'}
                    </span>
                    {a.id !== userId && (
                      <button
                        className="btn btn-d btn-sm"
                        onClick={() => revokeAdminRole(a.id, a.name || a.email)}
                        title="Remove admin role"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grant admin access */}
          <div className="card">
            <div className="ct" style={{ marginBottom: 14 }}>Grant Admin Access</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="fi-in"
                style={{ flex: 1 }}
                placeholder="Search by email…"
                value={adminSearch}
                onChange={e => { setAdminSearch(e.target.value); setAdminSearchResult(null); }}
                onKeyDown={e => e.key === 'Enter' && searchAdminCandidate()}
              />
              <button className="btn btn-s btn-sm" onClick={searchAdminCandidate} disabled={adminSearching}>
                {adminSearching ? '…' : 'Search'}
              </button>
            </div>

            {adminSearchResult === 'not_found' && (
              <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 10 }}>No user found with that email.</div>
            )}
            {adminSearchResult && adminSearchResult !== 'not_found' && (
              <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={adminSearchResult.name || adminSearchResult.email} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{adminSearchResult.name || '—'}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{adminSearchResult.email}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Current role: {adminSearchResult.role}</div>
                </div>
                <select className="fi-sel" style={{ width: 160 }} value={newAdminRole} onChange={e => setNewAdminRole(e.target.value)}>
                  <option value="contentadmin">Content Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <button className="btn btn-p btn-sm" onClick={grantAdminRole} disabled={promoting}>
                  {promoting ? 'Granting…' : 'Grant Role'}
                </button>
              </div>
            )}

            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
              Search for a registered user by their email address to grant them admin access.
            </div>
          </div>
        </div>
      )}

      {/* User detail modal */}
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
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{sel.state} · {sel.district}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span className={`bdg ${sel.status === 'active' ? 'bg-g' : 'bg-a'}`}>{sel.status}</span>
                    {sel.verified && <span className="bdg bg-sky">✅ Verified</span>}
                  </div>
                </div>
              </div>
              {[
                ['Email', sel.email], ['MCI/NMC', sel.mci],
                ['Hometown', sel.hometown], ['State', sel.state],
                ['District', sel.district], ['Role', sel.role],
                ['Speciality', sel.speciality], ['College', sel.college],
              ].map(([l, v]) => (
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
