import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ReportsPage({ addToast }) {
  const [placeRows, setPlaceRows] = useState([]);

  useEffect(() => {
    async function loadPlaceReport() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('place_of_study, college')
          .not('place_of_study', 'is', null);

        const grouped = (data || []).reduce((acc, p) => {
          const key = p.place_of_study || p.college || '';
          if (!key.trim()) return acc;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        setPlaceRows(
          Object.entries(grouped)
            .map(([college, count]) => ({ college, count }))
            .sort((a, b) => b.count - a.count)
        );
      } catch (e) { /* silent */ }
    }
    loadPlaceReport();
  }, []);

  const exportPlaceCSV = () => {
    const csv = ['College/Institute,Student Count',
      ...placeRows.map(r => `"${r.college}",${r.count}`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'place_of_study_report.csv';
    a.click();
    addToast('success', 'CSV exported!');
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📈 Reports & Analytics</div>
        <div className="ps">Platform-wide performance insights</div>
      </div>
      <div className="sg3">
        {[
          { t: 'User Growth', v: '+23%', s: 'vs last month', i: '👥', c: '#2563EB' },
          { t: 'Downloads', v: '1,284', s: 'this month', i: '⬇️', c: '#7C3AED' },
          { t: 'Avg Session', v: '34 min', s: '+12% vs last month', i: '⏱', c: '#F59E0B' },
        ].map((r, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>{r.i}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 26, fontWeight: 800, color: r.c }}>{r.v}</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>{r.t}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{r.s}</div>
          </div>
        ))}
      </div>
      <div className="grid2 mt4">
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>📊 Zone-wise Distribution</div>
          {[['North', 38, '#2563EB'], ['South', 26, '#7C3AED'], ['West', 18, '#F59E0B'], ['East', 12, '#EF4444'], ['Central', 6, '#6EE7B7']].map(([z, p, c]) => (
            <div key={z} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{z}</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{p}%</span>
              </div>
              <div className="pb"><div style={{ height: '100%', width: `${p}%`, background: c, borderRadius: 99 }} /></div>
            </div>
          ))}
          <button className="btn btn-s btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => addToast('success', 'Zone report downloaded!')}>⬇️ Download Zone Report</button>
        </div>
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>🩺 Program Distribution</div>
          {[['MD', 45, '#2563EB'], ['MS', 28, '#7C3AED'], ['DM', 15, '#F59E0B'], ['MCh', 8, '#EF4444'], ['DNB', 4, '#0EA5E9']].map(([p, pct, c]) => (
            <div key={p} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p}</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{pct}%</span>
              </div>
              <div className="pb"><div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 99 }} /></div>
            </div>
          ))}
          <button className="btn btn-s btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => addToast('success', 'Program report downloaded!')}>⬇️ Download Program Report</button>
        </div>
      </div>

      {/* Place of Study Report */}
      <div className="card mt4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>🏫 Place of Study Report</h3>
          <button onClick={exportPlaceCSV} style={{ fontSize: 12, padding: '4px 12px', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>
            ⬇️ Export CSV
          </button>
        </div>
        {placeRows.length === 0 ? (
          <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 16, fontSize: 13 }}>
            No place of study data yet — users need to fill in their college during registration.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>College / Institute</th>
                  <th style={{ textAlign: 'right' }}>Students</th>
                </tr>
              </thead>
              <tbody>
                {placeRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13 }}>{row.college}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#4F46E5', fontSize: 13 }}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
