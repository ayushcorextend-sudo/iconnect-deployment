import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ═══════════════════════════════════════════════════
   TYPE CONFIG — maps notification types to visual styles
   ═══════════════════════════════════════════════════ */
const TYPE_CONFIG = {
  info:    { label: 'Info',    icon: 'ℹ️',  color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  success: { label: 'Success', icon: '✅', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  warn:    { label: 'Warning', icon: '⚠️',  color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  error:   { label: 'Alert',   icon: '🚨', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
};

/* ═══════════════════════════════════════════════════
   SCORE BUCKETS — for the performance filter
   ═══════════════════════════════════════════════════ */
const SCORE_BUCKETS = [
  { key: 'zero',   label: '0 points (At-Risk)',  icon: '⚠️',  check: s => s === 0 },
  { key: 'low',    label: '1 – 100 pts',         icon: '📊', check: s => s >= 1 && s <= 100 },
  { key: 'medium', label: '101 – 500 pts',       icon: '📈', check: s => s >= 101 && s <= 500 },
  { key: 'high',   label: '500+ pts (Top)',       icon: '🏆', check: s => s > 500 },
];

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function BroadcastPage({ role, userId, darkMode, addToast }) {

  // ─── GATE: Superadmin only ───
  if (role !== 'superadmin') {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Access Restricted</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Only Super Admins can access the Broadcast Engine.</div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════

  // Independent data (NOT from commonProps — fetched fresh)
  const [localDoctors, setLocalDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Multi-select filter state (arrays — supports multiple selections per category)
  const [filters, setFilters] = useState({
    colleges: [],
    specialities: [],
    states: [],
    zones: [],
    programs: [],
    scoreRanges: [],
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sidebar section collapse state
  const [collapsed, setCollapsed] = useState({});

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Compose form
  const [form, setForm] = useState({ title: '', body: '', type: 'info' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Theme
  const dm = darkMode;
  const bg = dm ? '#0F172A' : '#F8FAFC';
  const cardBg = dm ? '#1E293B' : '#fff';
  const sidebarBg = dm ? '#0F172A' : '#FAFAFA';
  const border = dm ? '#334155' : '#E5E7EB';
  const borderLight = dm ? '#1E293B' : '#F3F4F6';
  const textP = dm ? '#F1F5F9' : '#111827';
  const textS = dm ? '#94A3B8' : '#6B7280';
  const accent = '#2563EB';

  // ═══════════════════════════════════════════════
  // DATA FETCHING (independent — profiles + scores)
  // ═══════════════════════════════════════════════

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch profiles and scores in parallel
        const [profilesRes, scoresRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, name, email, role, status, speciality, college, state, zone, program, mci_number, phone, created_at')
            .eq('role', 'doctor')
            .eq('status', 'active'),
          supabase
            .from('user_scores')
            .select('user_id, total_score'),
        ]);

        const profiles = profilesRes.data || [];
        const scores = scoresRes.data || [];

        // Build score lookup map
        const scoreMap = {};
        scores.forEach(s => { scoreMap[s.user_id] = s.total_score || 0; });

        // Merge into enriched doctor objects
        const merged = profiles.map(p => ({
          ...p,
          score: scoreMap[p.id] || 0,
          // Normalize nulls to 'Unspecified' for filter grouping
          _college:    p.college    || 'Unspecified',
          _speciality: p.speciality || 'Unspecified',
          _state:      p.state      || 'Unspecified',
          _zone:       p.zone       || 'Unspecified',
          _program:    p.program    || 'Unspecified',
        }));

        setLocalDoctors(merged);
      } catch (err) {
        console.error('[BroadcastPage] Fetch failed:', err);
        addToast?.('error', 'Failed to load doctor data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ═══════════════════════════════════════════════
  // DYNAMIC FILTER OPTIONS (derived from actual data)
  // ═══════════════════════════════════════════════

  const filterOptions = useMemo(() => {
    const unique = (arr) => [...new Set(arr)].sort((a, b) => {
      if (a === 'Unspecified') return 1;
      if (b === 'Unspecified') return -1;
      return a.localeCompare(b);
    });

    return {
      colleges:    unique(localDoctors.map(d => d._college)),
      specialities:unique(localDoctors.map(d => d._speciality)),
      states:      unique(localDoctors.map(d => d._state)),
      zones:       unique(localDoctors.map(d => d._zone)),
      programs:    unique(localDoctors.map(d => d._program)),
    };
  }, [localDoctors]);

  // ═══════════════════════════════════════════════
  // FILTER TOGGLE FUNCTION
  // ═══════════════════════════════════════════════

  const toggleFilter = useCallback((category, value) => {
    setFilters(prev => {
      const arr = prev[category] || [];
      const exists = arr.includes(value);
      return {
        ...prev,
        [category]: exists ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ colleges: [], specialities: [], states: [], zones: [], programs: [], scoreRanges: [] });
    setSearchQuery('');
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).reduce((sum, arr) => sum + arr.length, 0) + (searchQuery ? 1 : 0);
  }, [filters, searchQuery]);

  // ═══════════════════════════════════════════════
  // THE MULTI-DIMENSIONAL INTERSECTION ENGINE
  // (AND across categories, OR within each category)
  // ═══════════════════════════════════════════════

  const filteredUsers = useMemo(() => {
    return localDoctors.filter(d => {

      // 1. Text search (name, email, or MCI number)
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${d.name || ''} ${d.email || ''} ${d.mci_number || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // 2. College filter (OR within category)
      if (filters.colleges.length > 0) {
        if (!filters.colleges.includes(d._college)) return false;
      }

      // 3. Speciality filter
      if (filters.specialities.length > 0) {
        if (!filters.specialities.includes(d._speciality)) return false;
      }

      // 4. State filter
      if (filters.states.length > 0) {
        if (!filters.states.includes(d._state)) return false;
      }

      // 5. Zone filter
      if (filters.zones.length > 0) {
        if (!filters.zones.includes(d._zone)) return false;
      }

      // 6. Program filter
      if (filters.programs.length > 0) {
        if (!filters.programs.includes(d._program)) return false;
      }

      // 7. Score range filter (OR within — doctor matches ANY selected bucket)
      if (filters.scoreRanges.length > 0) {
        const matchesBucket = filters.scoreRanges.some(bucketKey => {
          const bucket = SCORE_BUCKETS.find(b => b.key === bucketKey);
          return bucket ? bucket.check(d.score) : false;
        });
        if (!matchesBucket) return false;
      }

      return true;
    });
  }, [localDoctors, searchQuery, filters]);

  // ═══════════════════════════════════════════════
  // SELECTION LOGIC
  // ═══════════════════════════════════════════════

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, searchQuery]);

  const toggleUser = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // SMART SELECT ALL: operates on filteredUsers only
  const handleSelectAll = useCallback(() => {
    const filteredIdSet = new Set(filteredUsers.map(u => u.id));
    const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));

    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIdSet.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIdSet.forEach(id => next.add(id));
        return next;
      });
    }
  }, [filteredUsers, selectedIds]);

  const allFilteredSelected = filteredUsers.length > 0 &&
    filteredUsers.every(u => selectedIds.has(u.id));

  // ═══════════════════════════════════════════════
  // DISPATCH — Bulk insert into notifications
  // ═══════════════════════════════════════════════

  const handleDispatch = async () => {
    if (selectedIds.size === 0) return;
    if (!form.title.trim()) { addToast?.('error', 'Title is required.'); return; }
    if (!form.body.trim())  { addToast?.('error', 'Message body is required.'); return; }
    if (!confirm(`Dispatch this broadcast to ${selectedIds.size} doctor(s)?`)) return;

    setIsSubmitting(true);
    try {
      const typeConf = TYPE_CONFIG[form.type] || TYPE_CONFIG.info;

      const payloads = [...selectedIds].map(uid => ({
        user_id: uid,
        title:   form.title.trim(),
        body:    form.body.trim(),
        type:    form.type,
        icon:    typeConf.icon,
        channel: 'in_app',
        unread:  true,
      }));

      const { error } = await supabase.from('notifications').insert(payloads);
      if (error) throw error;

      addToast?.('success', `✅ Broadcast sent to ${selectedIds.size} doctor(s)!`);
      setSelectedIds(new Set());
      setForm({ title: '', body: '', type: 'info' });
    } catch (err) {
      console.error('[BroadcastPage] Dispatch failed:', err);
      addToast?.('error', 'Dispatch failed: ' + (err.message || 'Try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════
  // HELPER: Filter Section Component (reusable)
  // ═══════════════════════════════════════════════

  const FilterSection = ({ id, title, icon, children }) => {
    const isOpen = collapsed[id] !== true; // default open
    return (
      <div style={{ borderBottom: `1px solid ${borderLight}` }}>
        <button
          onClick={() => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: textP, textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span>{icon} {title}</span>
          <span style={{ fontSize: 10, color: textS, transition: 'transform 0.2s', transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}>▼</span>
        </button>
        {isOpen && (
          <div style={{ padding: '0 14px 10px', maxHeight: 200, overflowY: 'auto' }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const CheckboxItem = ({ checked, label, count, onChange }) => (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
      cursor: 'pointer', fontSize: 12, color: checked ? textP : textS,
      fontWeight: checked ? 600 : 400,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: accent, flexShrink: 0 }}
      />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: 10, color: textS, background: dm ? '#334155' : '#F3F4F6', padding: '1px 6px', borderRadius: 8, flexShrink: 0 }}>
          {count}
        </span>
      )}
    </label>
  );

  // Count helpers
  const countFor = (field, value) => localDoctors.filter(d => d[field] === value).length;

  const typeConf = TYPE_CONFIG[form.type] || TYPE_CONFIG.info;

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden', background: bg }}>

      {/* ═════════════════════════════════════════════
          LEFT PANEL: AUDIENCE BUILDER (65%)
          Layout: [Filter Sidebar 240px] [User Table flex:1]
          ═════════════════════════════════════════════ */}
      <div style={{ flex: '0 0 65%', display: 'flex', overflow: 'hidden', borderRight: `1px solid ${border}` }}>

        {/* ── FILTER SIDEBAR (240px) ── */}
        <div style={{
          width: 240, flexShrink: 0, borderRight: `1px solid ${borderLight}`,
          background: sidebarBg, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '12px 14px', borderBottom: `1px solid ${borderLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: textP }}>🔍 Filters</span>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} style={{
                fontSize: 10, color: '#EF4444', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 700, padding: '2px 6px',
              }}>
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Scrollable filter sections */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* ── SEARCH ── */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${borderLight}` }}>
              <input
                type="text"
                placeholder="Name, email, or MCI..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 6,
                  border: `1px solid ${border}`, fontSize: 12,
                  background: dm ? '#1E293B' : '#fff', color: textP,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* ── PERFORMANCE (Score Buckets) ── */}
            <FilterSection id="score" title="Performance" icon="📊">
              {SCORE_BUCKETS.map(bucket => (
                <CheckboxItem
                  key={bucket.key}
                  checked={filters.scoreRanges.includes(bucket.key)}
                  label={`${bucket.icon} ${bucket.label}`}
                  count={localDoctors.filter(d => bucket.check(d.score)).length}
                  onChange={() => toggleFilter('scoreRanges', bucket.key)}
                />
              ))}
            </FilterSection>

            {/* ── SPECIALITY ── */}
            <FilterSection id="speciality" title="Speciality" icon="🩺">
              {filterOptions.specialities.map(val => (
                <CheckboxItem
                  key={val}
                  checked={filters.specialities.includes(val)}
                  label={val}
                  count={countFor('_speciality', val)}
                  onChange={() => toggleFilter('specialities', val)}
                />
              ))}
            </FilterSection>

            {/* ── PROGRAM ── */}
            <FilterSection id="program" title="Program" icon="🎓">
              {filterOptions.programs.map(val => (
                <CheckboxItem
                  key={val}
                  checked={filters.programs.includes(val)}
                  label={val}
                  count={countFor('_program', val)}
                  onChange={() => toggleFilter('programs', val)}
                />
              ))}
            </FilterSection>

            {/* ── COLLEGE ── */}
            <FilterSection id="college" title="College" icon="🏥">
              {filterOptions.colleges.map(val => (
                <CheckboxItem
                  key={val}
                  checked={filters.colleges.includes(val)}
                  label={val}
                  count={countFor('_college', val)}
                  onChange={() => toggleFilter('colleges', val)}
                />
              ))}
            </FilterSection>

            {/* ── STATE ── */}
            <FilterSection id="state" title="State" icon="📍">
              {filterOptions.states.map(val => (
                <CheckboxItem
                  key={val}
                  checked={filters.states.includes(val)}
                  label={val}
                  count={countFor('_state', val)}
                  onChange={() => toggleFilter('states', val)}
                />
              ))}
            </FilterSection>

            {/* ── ZONE ── */}
            <FilterSection id="zone" title="Zone" icon="🗺️">
              {filterOptions.zones.map(val => (
                <CheckboxItem
                  key={val}
                  checked={filters.zones.includes(val)}
                  label={val}
                  count={countFor('_zone', val)}
                  onChange={() => toggleFilter('zones', val)}
                />
              ))}
            </FilterSection>

          </div>

          {/* Sidebar Footer — match summary */}
          <div style={{
            padding: '10px 14px', borderTop: `1px solid ${borderLight}`,
            fontSize: 12, fontWeight: 700, color: accent, background: cardBg,
          }}>
            {filteredUsers.length} of {localDoctors.length} doctors
          </div>
        </div>

        {/* ── USER TABLE (flex: 1) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Table Header Bar */}
          <div style={{
            padding: '10px 16px', borderBottom: `1px solid ${border}`, background: cardBg,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: textP }}>
              📡 Audience <span style={{ fontWeight: 400, color: textS, fontSize: 12 }}>({filteredUsers.length} matched)</span>
            </div>
            {selectedIds.size > 0 && (
              <div style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: '#DBEAFE', color: '#2563EB',
              }}>
                {selectedIds.size} selected
              </div>
            )}
          </div>

          {/* Column Headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '36px 1.4fr 1fr 1fr 70px',
            padding: '6px 16px', borderBottom: `1px solid ${borderLight}`, background: cardBg,
            fontSize: 10, fontWeight: 700, color: textS, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <div>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={handleSelectAll}
                disabled={filteredUsers.length === 0}
                style={{ cursor: 'pointer', width: 15, height: 15 }}
                title={`Select all ${filteredUsers.length} filtered`}
              />
            </div>
            <div>Doctor</div>
            <div>College</div>
            <div>Speciality</div>
            <div style={{ textAlign: 'right' }}>Score</div>
          </div>

          {/* Rows (scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: textS }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                Loading doctors...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: textS }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No doctors match these filters</div>
                <div style={{ fontSize: 12 }}>Try removing some filter criteria</div>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} style={{
                    marginTop: 12, padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`,
                    background: 'transparent', color: accent, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              filteredUsers.map(doc => {
                const isSelected = selectedIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleUser(doc.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '36px 1.4fr 1fr 1fr 70px',
                      padding: '9px 16px', borderBottom: `1px solid ${borderLight}`,
                      cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center',
                      background: isSelected ? (dm ? '#1E3A5F' : '#EFF6FF') : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = dm ? '#1E293B' : '#F9FAFB'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleUser(doc.id)}
                        style={{ cursor: 'pointer', width: 15, height: 15 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: isSelected ? accent : (dm ? '#334155' : '#E5E7EB'),
                        color: isSelected ? '#fff' : textS,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 11,
                      }}>
                        {(doc.name || doc.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: textP, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.name || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: textS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: textS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.college || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: textS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.speciality || '—'}
                    </div>
                    <div style={{
                      textAlign: 'right', fontWeight: 700, fontSize: 12,
                      color: doc.score > 500 ? '#10B981' : doc.score > 0 ? textP : (dm ? '#64748B' : '#D1D5DB'),
                    }}>
                      {doc.score}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>


      {/* ═════════════════════════════════════════════
          RIGHT PANEL: COMPOSE CONSOLE (35%)
          ═════════════════════════════════════════════ */}
      <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', background: cardBg, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: textP, margin: 0 }}>✍️ Compose Broadcast</h2>
          <p style={{
            fontSize: 12, margin: '4px 0 0', fontWeight: 600,
            color: selectedIds.size > 0 ? accent : textS,
          }}>
            {selectedIds.size > 0
              ? `Targeting ${selectedIds.size} doctor${selectedIds.size > 1 ? 's' : ''}`
              : 'Select doctors from the table to begin'}
          </p>
        </div>

        {/* Form */}
        <div style={{
          flex: 1, padding: 20, overflowY: 'auto',
          opacity: selectedIds.size === 0 ? 0.35 : 1,
          pointerEvents: selectedIds.size === 0 ? 'none' : 'auto',
          transition: 'opacity 0.25s',
        }}>

          {/* Type Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notification Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                  style={{
                    padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, textAlign: 'center',
                    background: form.type === key ? conf.bg : 'transparent',
                    color: form.type === key ? conf.color : textS,
                    outline: form.type === key ? `2px solid ${conf.color}` : `1px solid ${border}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{conf.icon}</div>
                  {conf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Important NEET-PG Update"
              maxLength={100}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${border}`, fontSize: 14, fontWeight: 500,
                background: dm ? '#0F172A' : '#fff', color: textP,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Message *
            </label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Write your notification message..."
              rows={4}
              maxLength={500}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, resize: 'vertical',
                border: `1px solid ${border}`, fontSize: 13, lineHeight: 1.6,
                background: dm ? '#0F172A' : '#fff', color: textP,
                minHeight: 90, maxHeight: 180, boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 10, color: textS, marginTop: 2 }}>
              {form.body.length}/500
            </div>
          </div>

          {/* Live Preview */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Preview
            </label>
            <div style={{
              padding: 14, borderRadius: 10,
              background: dm ? '#0F172A' : typeConf.bg,
              border: `1px solid ${dm ? typeConf.color + '33' : typeConf.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{typeConf.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: textP }}>
                  {form.title || 'Notification Title'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: textS, lineHeight: 1.5 }}>
                {form.body || 'Your message preview will appear here...'}
              </div>
              <div style={{ fontSize: 9, color: textS, marginTop: 6, opacity: 0.5 }}>
                Just now · via iConnect
              </div>
            </div>
          </div>

          {/* Dispatch Button */}
          <button
            onClick={handleDispatch}
            disabled={isSubmitting || selectedIds.size === 0 || !form.title.trim() || !form.body.trim()}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
              fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              background: (isSubmitting || selectedIds.size === 0 || !form.title.trim() || !form.body.trim())
                ? (dm ? '#334155' : '#E5E7EB')
                : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: (isSubmitting || selectedIds.size === 0 || !form.title.trim() || !form.body.trim())
                ? textS : '#fff',
              boxShadow: (selectedIds.size > 0 && form.title.trim() && form.body.trim() && !isSubmitting)
                ? '0 4px 16px rgba(37, 99, 235, 0.35)' : 'none',
            }}
          >
            {isSubmitting
              ? '⏳ Dispatching...'
              : `🚀 Dispatch to ${selectedIds.size} Doctor${selectedIds.size !== 1 ? 's' : ''}`}
          </button>

          {selectedIds.size > 0 && form.title.trim() && form.body.trim() && (
            <p style={{ fontSize: 10, color: textS, textAlign: 'center', marginTop: 6 }}>
              Delivered instantly via Supabase Realtime
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
