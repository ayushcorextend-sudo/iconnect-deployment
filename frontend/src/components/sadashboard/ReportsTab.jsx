import { useMemo } from 'react';

export default function ReportsTab({ users, approvedCount, addToast }) {
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

  return (
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
  );
}
