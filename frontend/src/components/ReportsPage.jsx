import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { downloadCSV } from '../lib/downloadCSV';
import { ZONE_CONFIG } from '../data/constants';

const ACTION_LABELS = {
  approve_artifact: { icon: '✅', label: 'Approved content', color: '#10B981' },
  reject_artifact:  { icon: '✗', label: 'Rejected content', color: '#EF4444' },
  approve_user:     { icon: '✅', label: 'Approved user', color: '#10B981' },
  reject_user:      { icon: '✗', label: 'Rejected user', color: '#EF4444' },
  update_settings:  { icon: '⚙️', label: 'Updated settings', color: '#F59E0B' },
  upload_artifact:  { icon: '📤', label: 'Uploaded content', color: '#3B82F6' },
};

const relTime = (d) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};


export default function ReportsPage({ addToast }) {
  const [placeRows, setPlaceRows] = useState([]);
  const [activeTab, setActiveTab] = useState('reports');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Doctor reports state
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorStats, setDoctorStats] = useState({ total: 0, active: 0, pending: 0 });
  const [recentDoctors, setRecentDoctors] = useState([]);
  const [doctorDataLoaded, setDoctorDataLoaded] = useState(false);

  // Geography state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoData, setGeoData] = useState({ zones: {}, districts: {}, states: {}, total: 0 });
  const [geoLoaded, setGeoLoaded] = useState(false);

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

  // Eagerly load doctor stats so the Reports summary tab has real data on first visit
  useEffect(() => { loadDoctorData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audit Logs ─────────────────────────────────────────────────
  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setAuditLogs(data || []);
    } catch (_) {}
    setAuditLoading(false);
  };

  const exportAuditCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Resource', 'Resource ID', 'Details'];
    const rows = auditLogs.map(l => [
      l.created_at || '',
      l.actor_email || '',
      l.action || '',
      l.resource || '',
      l.resource_id || '',
      JSON.stringify(l.details || {}).replace(/"/g, "'"),
    ]);
    downloadCSV('audit_log.csv', headers, rows);
    addToast('success', 'Audit log exported!');
  };

  const exportPlaceCSV = () => {
    downloadCSV('place_of_study_report.csv', ['College/Institute', 'Student Count'], placeRows.map(r => [r.college, r.count]));
    addToast('success', 'CSV exported!');
  };

  // ── Doctor Reports ─────────────────────────────────────────────
  const loadDoctorData = async () => {
    if (doctorDataLoaded) return;
    setDoctorLoading(true);
    try {
      const [totRes, actRes, pendRes, recentRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'doctor'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'doctor').eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'doctor').eq('status', 'pending'),
        supabase.from('profiles')
          .select('name, email, mci_number, speciality, college, state, district, joining_year, passout_year, created_at')
          .eq('role', 'doctor')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setDoctorStats({
        total: totRes.count || 0,
        active: actRes.count || 0,
        pending: pendRes.count || 0,
      });
      setRecentDoctors(recentRes.data || []);
      setDoctorDataLoaded(true);
    } catch (_) {}
    setDoctorLoading(false);
  };

  const exportDoctorCSV = async () => {
    setDoctorLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, mci_number, speciality, college, state, district, joining_year, passout_year')
        .eq('role', 'doctor')
        .order('name');

      if (error) throw error;

      const headers = ['Name', 'Email', 'MCI Number', 'Speciality', 'College', 'State', 'District', 'Joining Year', 'Passout Year'];
      const rows = (data || []).map(d => [
        d.name || '',
        d.email || '',
        d.mci_number || '',
        d.speciality || '',
        d.college || '',
        d.state || '',
        d.district || '',
        d.joining_year || '',
        d.passout_year || '',
      ]);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`iConnect_Doctor_Directory_${date}.csv`, headers, rows);
      addToast('success', `Exported ${(data || []).length} doctors to CSV!`);
    } catch (e) {
      addToast('error', 'Export failed. Please try again.');
    } finally {
      setDoctorLoading(false);
    }
  };

  // ── Geography Analytics ────────────────────────────────────────
  const loadGeoData = async () => {
    if (geoLoaded) return;
    setGeoLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('state, district, zone')
        .eq('role', 'doctor')
        .eq('status', 'active');

      const zones = {};
      const districts = {};
      const states = {};

      (data || []).forEach(p => {
        if (p.zone) zones[p.zone] = (zones[p.zone] || 0) + 1;
        if (p.district) districts[p.district] = (districts[p.district] || 0) + 1;
        if (p.state) states[p.state] = (states[p.state] || 0) + 1;
      });

      setGeoData({ zones, districts, states, total: (data || []).length });
      setGeoLoaded(true);
    } catch (_) {}
    setGeoLoading(false);
  };

  // Sorted top states (descending by count)
  const topStates = Object.entries(geoData.states)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxStateCount = topStates[0]?.count || 1;

  const zoneTotal = Object.values(geoData.zones).reduce((s, v) => s + v, 0) || 1;
  const zoneRows = ['North', 'South', 'East', 'West', 'Central'].map(z => ({
    zone: z, count: geoData.zones[z] || 0, pct: Math.round(((geoData.zones[z] || 0) / zoneTotal) * 100),
    ...ZONE_CONFIG[z],
  }));

  const topDistricts = Object.entries(geoData.districts)
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxDistrictCount = topDistricts[0]?.count || 1;

  const handleTabClick = (k) => {
    setActiveTab(k);
    if (k === 'audit' && auditLogs.length === 0) loadAuditLogs();
    if (k === 'doctors') loadDoctorData();
    if (k === 'geography') loadGeoData();
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📈 Reports & Analytics</div>
        <div className="ps">Platform-wide performance insights</div>
      </div>

      <div className="tabs">
        {[
          ['reports', '📊 Reports'],
          ['doctors', '👨‍⚕️ Doctor Reports'],
          ['geography', '🗺 Geography'],
          ['audit', '🔍 Audit Logs'],
        ].map(([k, l]) => (
          <button key={k} className={`tab ${activeTab === k ? 'act' : ''}`} onClick={() => handleTabClick(k)}>
            {l}
          </button>
        ))}
      </div>

      {/* ── AUDIT LOGS ───────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Admin Action History ({auditLogs.length})</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={loadAuditLogs} disabled={auditLoading}>🔄 Refresh</button>
              {auditLogs.length > 0 && <button className="btn btn-s btn-sm" onClick={exportAuditCSV}>⬇️ Export CSV</button>}
            </div>
          </div>
          {auditLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="empty">
              <div className="empty-ic">🔍</div>
              <div className="empty-t">No audit logs yet</div>
              <div className="empty-s">Admin actions will be recorded here automatically.</div>
            </div>
          ) : (
            <div className="card">
              <div className="tw">
                <table>
                  <thead>
                    <tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(l => {
                      const meta = ACTION_LABELS[l.action] || { icon: '📋', label: l.action, color: '#6B7280' };
                      return (
                        <tr key={l.id}>
                          <td style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{relTime(l.created_at)}</td>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>{l.actor_email || 'Unknown'}</td>
                          <td>
                            <span style={{ background: '#F3F4F6', color: meta.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                              {meta.icon} {meta.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#6B7280' }}>{l.resource}{l.resource_id ? ` #${l.resource_id.slice(0, 8)}` : ''}</td>
                          <td style={{ fontSize: 12, color: '#6B7280' }}>
                            {Object.entries(l.details || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOCTOR REPORTS ───────────────────────────────────── */}
      {activeTab === 'doctors' && (
        <div>
          {/* Summary stats */}
          <div className="sg3" style={{ marginBottom: 20 }}>
            {[
              { l: 'Total Doctors', v: doctorStats.total, i: '👥', c: '#2563EB', bg: '#EFF6FF' },
              { l: 'Active Doctors', v: doctorStats.active, i: '✅', c: '#059669', bg: '#ECFDF5' },
              { l: 'Pending Review', v: doctorStats.pending, i: '⏰', c: '#D97706', bg: '#FFFBEB' },
            ].map(s => (
              <div key={s.l} className="card" style={{ textAlign: 'center', background: s.bg, border: `1px solid ${s.c}20` }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>{s.i}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.c }}>{doctorLoading ? '…' : s.v}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Export card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📋 Doctor Directory Export</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                  Downloads a complete CSV of all registered doctors with the following columns:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Name', 'Email', 'MCI Number', 'Speciality', 'College', 'State', 'District', 'Joining Year', 'Passout Year'].map(col => (
                    <span key={col} style={{
                      background: '#F3F4F6', color: '#374151',
                      borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      border: '1px solid #E5E7EB',
                    }}>{col}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                  ✓ Null values are exported as empty strings · ✓ Quotes escaped for Excel compatibility
                </div>
              </div>
              <button
                className="btn btn-p"
                onClick={exportDoctorCSV}
                disabled={doctorLoading}
                style={{ flexShrink: 0, minWidth: 180 }}
              >
                {doctorLoading ? '⏳ Fetching…' : '⬇️ Download Doctor Directory (CSV)'}
              </button>
            </div>
          </div>

          {/* Recent doctors preview */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>🕐 Recently Registered Doctors</div>
            {doctorLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : recentDoctors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: 13 }}>No doctors registered yet.</div>
            ) : (
              <div className="tw">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Speciality</th><th>College</th><th>State / District</th><th>Passout</th><th>Registered</th></tr>
                  </thead>
                  <tbody>
                    {recentDoctors.map((d, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{d.name || '—'}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{d.email}</div>
                        </td>
                        <td style={{ fontSize: 12, color: '#6B7280' }}>{d.speciality || '—'}</td>
                        <td style={{ fontSize: 12, color: '#6B7280' }}>{d.college || '—'}</td>
                        <td>
                          <div style={{ fontSize: 12 }}>{d.state || '—'}</div>
                          {d.district && (
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{d.district}</div>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{d.passout_year || '—'}</td>
                        <td style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{relTime(d.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GEOGRAPHY ANALYTICS ──────────────────────────────── */}
      {activeTab === 'geography' && (
        <div>
          {geoLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* ── MACRO VIEW: Zone Distribution ── */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>🗺 Macro View — Doctors by Zone</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    High-level geographic distribution · {geoData.total} active doctors
                  </div>
                </div>

                {/* Zone stat tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {zoneRows.map(({ zone, count, pct, color, bg, emoji }) => (
                    <div key={zone} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{zone}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{pct}%</div>
                    </div>
                  ))}
                </div>

                {/* Stacked bar chart */}
                <div style={{ height: 14, borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 2 }}>
                  {zoneRows.filter(z => z.count > 0).map(({ zone, pct, color }) => (
                    <div key={zone} title={`${zone}: ${pct}%`} style={{ width: `${pct}%`, background: color, transition: 'width .6s ease', minWidth: pct > 0 ? 4 : 0 }} />
                  ))}
                  {zoneTotal === 1 && <div style={{ flex: 1, background: '#E5E7EB' }} />}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {zoneRows.map(({ zone, color }) => (
                    <div key={zone} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                      {zone}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── MICRO VIEW: District Distribution ── */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🏘 District Distribution</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      Active doctors by district · {geoData.total} total
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Top {topDistricts.length}</span>
                </div>

                {topDistricts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>
                    No active doctor data available yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topDistricts.map(({ district, count }, i) => {
                      const barPct = (count / maxDistrictCount) * 100;
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                      return (
                        <div key={district} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 28, textAlign: 'center', fontSize: medal ? 16 : 12, fontWeight: 700, color: '#9CA3AF', flexShrink: 0 }}>
                            {medal || `#${i + 1}`}
                          </div>
                          <div style={{ width: 160, fontSize: 13, fontWeight: 500, color: '#374151', flexShrink: 0 }}>
                            {district}
                          </div>
                          <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${barPct}%`,
                              background: i === 0 ? '#2563EB' : i === 1 ? '#7C3AED' : i === 2 ? '#F59E0B' : '#10B981',
                              borderRadius: 99,
                              transition: 'width .6s ease',
                            }} />
                          </div>
                          <div style={{ width: 60, textAlign: 'right', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>
                            {count} <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>docs</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top States */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>📍 Top States by Registration</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      States ranked by number of active registered doctors
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Top {topStates.length}</span>
                </div>

                {topStates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>
                    No state data available yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topStates.map(({ state, count }, i) => {
                      const barPct = (count / maxStateCount) * 100;
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                      return (
                        <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Rank */}
                          <div style={{
                            width: 28, textAlign: 'center', fontSize: medal ? 16 : 12,
                            fontWeight: 700, color: '#9CA3AF', flexShrink: 0,
                          }}>
                            {medal || `#${i + 1}`}
                          </div>
                          {/* State name */}
                          <div style={{ width: 140, fontSize: 13, fontWeight: 500, color: '#374151', flexShrink: 0 }}>
                            {state}
                          </div>
                          {/* Bar */}
                          <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${barPct}%`,
                              background: i === 0 ? '#2563EB' : i === 1 ? '#7C3AED' : i === 2 ? '#F59E0B' : '#10B981',
                              borderRadius: 99,
                              transition: 'width .6s ease',
                            }} />
                          </div>
                          {/* Count */}
                          <div style={{
                            width: 60, textAlign: 'right', flexShrink: 0,
                            fontSize: 13, fontWeight: 700, color: '#374151',
                          }}>
                            {count} <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>docs</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── REPORTS ──────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <>
          <div className="sg3" style={{ marginBottom: 24 }}>
            {[
              { l: 'Total Registered', v: doctorStats.total, i: '👥', c: '#2563EB', bg: '#EFF6FF' },
              { l: 'Active Doctors',   v: doctorStats.active, i: '✅', c: '#059669', bg: '#ECFDF5' },
              { l: 'Pending Review',   v: doctorStats.pending, i: '⏰', c: '#D97706', bg: '#FFFBEB' },
            ].map(s => (
              <div key={s.l} className="card" style={{ textAlign: 'center', background: s.bg, border: `1px solid ${s.c}20` }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>{s.i}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.c }}>{doctorLoading ? '…' : s.v}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
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
        </>
      )}
    </div>
  );
}
