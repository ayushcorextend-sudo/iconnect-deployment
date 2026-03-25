import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import FilterDropdown from './FilterDropdown';

/* ═══════════════════════════════════════════════════
   TYPE CONFIG
   ═══════════════════════════════════════════════════ */
const TYPE_CONFIG = {
  info:    { label: 'Info',    icon: 'ℹ️',  color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  success: { label: 'Success', icon: '✅', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  warn:    { label: 'Warning', icon: '⚠️',  color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  error:   { label: 'Alert',   icon: '🚨', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
};

/* ═══════════════════════════════════════════════════
   SCORE BUCKETS
   ═══════════════════════════════════════════════════ */
const SCORE_BUCKETS = [
  { key: 'zero',   label: '0 points (At-Risk)',  icon: '⚠️',  check: s => s === 0 },
  { key: 'low',    label: '1 – 100 pts',         icon: '📊', check: s => s >= 1 && s <= 100 },
  { key: 'medium', label: '101 – 500 pts',       icon: '📈', check: s => s >= 101 && s <= 500 },
  { key: 'high',   label: '500+ pts (Top)',       icon: '🏆', check: s => s > 500 },
];

/* ═══════════════════════════════════════════════════
   DOCTOR ENGAGE VIEW — full doctor broadcast UI
   with top horizontal filters (no sidebar)
   ═══════════════════════════════════════════════════ */
export default function DoctorEngageView({ userId, addToast, darkMode, onBack }) {
  const dm      = darkMode;
  const bg      = dm ? '#0F172A' : '#F8FAFC';
  const cardBg  = dm ? '#1E293B' : '#fff';
  const border  = dm ? '#334155' : '#E5E7EB';
  const borderL = dm ? '#1E293B' : '#F3F4F6';
  const textP   = dm ? '#F1F5F9' : '#111827';
  const textS   = dm ? '#94A3B8' : '#6B7280';
  const accent  = '#2563EB';

  const [localDoctors, setLocalDoctors] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [filters, setFilters] = useState({
    colleges: [], specialities: [], states: [], zones: [], programs: [], scoreRanges: [],
  });
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const scoreDropRef = useRef(null);

  const [form, setForm]           = useState({ title: '', body: '', type: 'info' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rightTab, setRightTab]   = useState('broadcast');
  const [confirmPending, setConfirmPending] = useState(false);
  const confirmTimerRef = useRef(null);

  // Event form
  const [eventForm, setEventForm]     = useState({ title: '', date: '', description: '', color: '#EF4444' });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [recentEvents, setRecentEvents]       = useState([]);
  const [eventsLoading, setEventsLoading]     = useState(false);

  // Fetch doctors + scores
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profilesRes, scoresRes] = await Promise.all([
          supabase.from('profiles')
            .select('id, name, email, role, status, speciality, college, state, zone, program, mci_number, created_at')
            .eq('role', 'doctor').eq('status', 'active'),
          supabase.from('user_scores').select('user_id, total_score'),
        ]);
        const profiles = profilesRes.data || [];
        const scores   = scoresRes.data  || [];
        const scoreMap = {};
        scores.forEach(s => { scoreMap[s.user_id] = s.total_score || 0; });
        const merged = profiles.map(p => ({
          ...p,
          score: scoreMap[p.id] || 0,
          _college:    p.college    || 'Unspecified',
          _speciality: p.speciality || 'Unspecified',
          _state:      p.state      || 'Unspecified',
          _zone:       p.zone       || 'Unspecified',
          _program:    p.program    || 'Unspecified',
        }));
        setLocalDoctors(merged);
      } catch (err) {
        console.error('[DoctorEngageView] Fetch failed:', err);
        addToast?.('error', 'Failed to load doctor data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch recent events
  useEffect(() => {
    const load = async () => {
      setEventsLoading(true);
      try {
        const { data } = await supabase.from('admin_calendar_events')
          .select('*').order('date', { ascending: true }).limit(10);
        setRecentEvents(data || []);
      } catch (_) {}
      setEventsLoading(false);
    };
    load();
  }, []);

  // Close score dropdown on outside click
  useEffect(() => {
    if (activeDropdown !== 'score') return;
    const handler = (e) => {
      if (scoreDropRef.current && !scoreDropRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeDropdown]);

  // Filter options
  const filterOptions = useMemo(() => {
    const unique = arr => [...new Set(arr)].sort((a, b) => {
      if (a === 'Unspecified') return 1;
      if (b === 'Unspecified') return -1;
      return a.localeCompare(b);
    });
    return {
      colleges:     unique(localDoctors.map(d => d._college)),
      specialities: unique(localDoctors.map(d => d._speciality)),
      states:       unique(localDoctors.map(d => d._state)),
      zones:        unique(localDoctors.map(d => d._zone)),
      programs:     unique(localDoctors.map(d => d._program)),
    };
  }, [localDoctors]);

  const toggleFilter = useCallback((category, value) => {
    setFilters(prev => {
      const arr    = prev[category] || [];
      const exists = arr.includes(value);
      return { ...prev, [category]: exists ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ colleges: [], specialities: [], states: [], zones: [], programs: [], scoreRanges: [] });
    setSearchQuery('');
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filters).reduce((s, a) => s + a.length, 0) + (searchQuery ? 1 : 0),
    [filters, searchQuery]
  );

  // Filtered doctors
  const filteredUsers = useMemo(() => localDoctors.filter(d => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const hay = `${d.name || ''} ${d.email || ''} ${d.mci_number || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.colleges.length    > 0 && !filters.colleges.includes(d._college))       return false;
    if (filters.specialities.length > 0 && !filters.specialities.includes(d._speciality)) return false;
    if (filters.states.length      > 0 && !filters.states.includes(d._state))           return false;
    if (filters.zones.length       > 0 && !filters.zones.includes(d._zone))             return false;
    if (filters.programs.length    > 0 && !filters.programs.includes(d._program))       return false;
    if (filters.scoreRanges.length > 0) {
      const match = filters.scoreRanges.some(k => {
        const b = SCORE_BUCKETS.find(b => b.key === k);
        return b ? b.check(d.score) : false;
      });
      if (!match) return false;
    }
    return true;
  }), [localDoctors, searchQuery, filters]);

  // Selection
  useEffect(() => { setSelectedIds(new Set()); }, [filters, searchQuery]);

  const toggleUser = useCallback(id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const ids = new Set(filteredUsers.map(u => u.id));
    const allSel = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSel) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, [filteredUsers, selectedIds]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));

  // Dispatch — 2-step confirmation (no confirm() dialog)
  const handleDispatch = async () => {
    if (selectedIds.size === 0) return;
    if (!form.title.trim()) { addToast?.('error', 'Title is required.'); return; }
    if (!form.body.trim())  { addToast?.('error', 'Message body is required.'); return; }
    if (!confirmPending) {
      setConfirmPending(true);
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmPending(false), 5000);
      return;
    }
    clearTimeout(confirmTimerRef.current);
    setConfirmPending(false);
    setIsSubmitting(true);
    try {
      const tc = TYPE_CONFIG[form.type] || TYPE_CONFIG.info;
      const payloads = [...selectedIds].map(uid => ({
        user_id: uid,
        sender_id: userId,
        title: form.title.trim(), body: form.body.trim(),
        type: form.type, icon: tc.icon, is_read: false,
      }));
      const { error } = await supabase.from('notifications').insert(payloads);
      if (error) throw error;
      addToast?.('success', `✅ Broadcast sent to ${selectedIds.size} doctor(s)!`);
      setSelectedIds(new Set());
      setForm({ title: '', body: '', type: 'info' });
    } catch (err) {
      addToast?.('error', 'Dispatch failed: ' + (err.message || 'Try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Push event
  const handleEventDispatch = async () => {
    if (!eventForm.title.trim()) { addToast?.('error', 'Event title is required.'); return; }
    if (!eventForm.date)         { addToast?.('error', 'Event date is required.'); return; }
    setEventSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from('admin_calendar_events')
        .insert([{ title: eventForm.title.trim(), date: eventForm.date, description: eventForm.description.trim() || null, color: eventForm.color, is_compulsory: true, created_by: userId || null }])
        .select().single();
      if (error) throw error;
      addToast?.('success', `📅 Event "${eventForm.title}" pushed to all doctor calendars!`);
      setEventForm({ title: '', date: '', description: '', color: '#EF4444' });
      setRecentEvents(prev => [inserted, ...prev].slice(0, 10));
    } catch (err) {
      addToast?.('error', 'Failed to push event: ' + (err.message || 'Check admin_calendar_events table'));
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleDeleteEvent = async id => {
    const { error } = await supabase.from('admin_calendar_events').delete().eq('id', id);
    if (!error) {
      setRecentEvents(prev => prev.filter(e => e.id !== id));
      addToast?.('success', 'Event removed.');
    } else {
      addToast?.('error', 'Delete failed: ' + error.message);
    }
  };

  const countFor = (field, val) => localDoctors.filter(d => d[field] === val).length;
  const typeConf = TYPE_CONFIG[form.type] || TYPE_CONFIG.info;

  // Active filter chips (for display below filter bar)
  const activeChips = useMemo(() => {
    const chips = [];
    const pushChips = (arr, cat, field) => arr.forEach(v => chips.push({ key: `${cat}:${v}`, label: v, remove: () => toggleFilter(cat, v) }));
    pushChips(filters.specialities, 'specialities', '_speciality');
    pushChips(filters.colleges,     'colleges',     '_college');
    pushChips(filters.states,       'states',       '_state');
    pushChips(filters.zones,        'zones',        '_zone');
    pushChips(filters.programs,     'programs',     '_program');
    filters.scoreRanges.forEach(k => {
      const b = SCORE_BUCKETS.find(b => b.key === k);
      if (b) chips.push({ key: `score:${k}`, label: `${b.icon} ${b.label}`, remove: () => toggleFilter('scoreRanges', k) });
    });
    return chips;
  }, [filters, toggleFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden', background: bg }}>

      {/* ── TOP BAR: Back + Title + Filters ── overflow:visible so dropdown panels show below */}
      <div style={{
        background: cardBg, borderBottom: `1px solid ${border}`,
        flexShrink: 0, overflow: 'visible', position: 'relative', zIndex: 10,
      }}>
        {/* Row 1: back + title + search */}
        <div style={{
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 99, border: `1px solid ${border}`, background: 'transparent',
              color: textS, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ← Back
          </button>

          <div style={{ fontSize: 15, fontWeight: 900, color: textP, flexShrink: 0 }}>
            👨‍⚕️ Doctor's Database
            <span style={{ fontWeight: 400, color: textS, fontSize: 12, marginLeft: 8 }}>
              ({filteredUsers.length} of {localDoctors.length})
            </span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
            <input
              type="text"
              placeholder="🔍 Search name, email, MCI..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '8px 14px', borderRadius: 99,
                border: `1px solid ${border}`, fontSize: 12,
                background: dm ? '#0F172A' : '#F9FAFB', color: textP,
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {selectedIds.size > 0 && (
            <div style={{
              padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: '#DBEAFE', color: accent, flexShrink: 0,
            }}>
              ✓ {selectedIds.size} selected
            </div>
          )}
        </div>

        {/* Row 2: filter pills — overflow:visible is critical so dropdown panels aren't clipped */}
        <div style={{
          padding: '0 16px 10px',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', overflow: 'visible',
          position: 'relative', zIndex: 10,
        }}>
          <FilterDropdown
            id="speciality" label="Speciality" icon="🩺"
            options={filterOptions.specialities} selected={filters.specialities}
            onToggle={v => toggleFilter('specialities', v)}
            activeId={activeDropdown} setActiveId={setActiveDropdown}
            dm={dm} border={border} textP={textP} textS={textS} accent={accent}
            countFor={v => countFor('_speciality', v)}
          />
          <FilterDropdown
            id="college" label="College" icon="🏥"
            options={filterOptions.colleges} selected={filters.colleges}
            onToggle={v => toggleFilter('colleges', v)}
            activeId={activeDropdown} setActiveId={setActiveDropdown}
            dm={dm} border={border} textP={textP} textS={textS} accent={accent}
            countFor={v => countFor('_college', v)}
          />
          <FilterDropdown
            id="state" label="State" icon="📍"
            options={filterOptions.states} selected={filters.states}
            onToggle={v => toggleFilter('states', v)}
            activeId={activeDropdown} setActiveId={setActiveDropdown}
            dm={dm} border={border} textP={textP} textS={textS} accent={accent}
            countFor={v => countFor('_state', v)}
          />
          <FilterDropdown
            id="zone" label="Zone" icon="🗺️"
            options={filterOptions.zones} selected={filters.zones}
            onToggle={v => toggleFilter('zones', v)}
            activeId={activeDropdown} setActiveId={setActiveDropdown}
            dm={dm} border={border} textP={textP} textS={textS} accent={accent}
            countFor={v => countFor('_zone', v)}
          />
          <FilterDropdown
            id="program" label="Program" icon="🎓"
            options={filterOptions.programs} selected={filters.programs}
            onToggle={v => toggleFilter('programs', v)}
            activeId={activeDropdown} setActiveId={setActiveDropdown}
            dm={dm} border={border} textP={textP} textS={textS} accent={accent}
            countFor={v => countFor('_program', v)}
          />
          {/* Score buckets */}
          <div ref={scoreDropRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'score' ? null : 'score')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: filters.scoreRanges.length > 0 ? 700 : 600,
                background: filters.scoreRanges.length > 0 ? (dm ? accent + '22' : '#DBEAFE') : (dm ? '#1E293B' : '#F3F4F6'),
                color: filters.scoreRanges.length > 0 ? accent : textS,
                outline: filters.scoreRanges.length > 0 ? `2px solid ${accent}` : `1px solid ${border}`,
              }}
            >
              📊 Performance
              {filters.scoreRanges.length > 0 && (
                <span style={{ background: accent, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                  {filters.scoreRanges.length}
                </span>
              )}
              <span style={{ fontSize: 9, opacity: 0.7 }}>{activeDropdown === 'score' ? '▲' : '▼'}</span>
            </button>
            {activeDropdown === 'score' && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200, minWidth: 220, background: dm ? '#1E293B' : '#fff', border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '8px 0' }}>
                {SCORE_BUCKETS.map(b => (
                  <label key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', background: filters.scoreRanges.includes(b.key) ? (dm ? accent + '18' : '#EFF6FF') : 'transparent' }}>
                    <input type="checkbox" checked={filters.scoreRanges.includes(b.key)} onChange={() => toggleFilter('scoreRanges', b.key)} style={{ width: 15, height: 15, accentColor: accent, cursor: 'pointer' }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: filters.scoreRanges.includes(b.key) ? 700 : 400, color: filters.scoreRanges.includes(b.key) ? (dm ? '#93C5FD' : accent) : textP }}>
                      {b.icon} {b.label}
                    </span>
                    <span style={{ fontSize: 10, color: textS, background: dm ? '#334155' : '#F3F4F6', padding: '1px 7px', borderRadius: 8 }}>
                      {localDoctors.filter(d => b.check(d.score)).length}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '7px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, color: '#EF4444',
                background: dm ? '#450A0A' : '#FEF2F2',
              }}
            >
              ✕ Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Row 3: active chips */}
        {activeChips.length > 0 && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {activeChips.map(chip => (
              <span key={chip.key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: dm ? '#1E3A5F' : '#EFF6FF', color: accent,
                border: `1px solid ${dm ? '#1E40AF' : '#BFDBFE'}`,
              }}>
                {chip.label}
                <button onClick={e => { e.stopPropagation(); chip.remove(); }} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── BODY: Doctor Table + Right Panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Doctor Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `1px solid ${border}` }}>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '36px 1.5fr 1fr 1fr 70px',
            padding: '8px 16px', borderBottom: `1px solid ${borderL}`, background: cardBg,
            fontSize: 10, fontWeight: 700, color: textS, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <div>
              <input type="checkbox" checked={allFilteredSelected} onChange={handleSelectAll}
                disabled={filteredUsers.length === 0}
                style={{ cursor: 'pointer', width: 15, height: 15 }}
                title={`Select all ${filteredUsers.length} filtered`} />
            </div>
            <div>Doctor</div>
            <div>College</div>
            <div>Speciality</div>
            <div style={{ textAlign: 'right' }}>Score</div>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: textS }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>Loading doctors...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: textS }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No doctors match</div>
                <div style={{ fontSize: 12 }}>Try removing some filters</div>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} style={{ marginTop: 12, padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: accent, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Clear all filters
                  </button>
                )}
              </div>
            ) : filteredUsers.map(doc => {
              const isSel = selectedIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleUser(doc.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '36px 1.5fr 1fr 1fr 70px',
                    padding: '9px 16px', borderBottom: `1px solid ${borderL}`,
                    cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center',
                    background: isSel ? (dm ? '#1E3A5F' : '#EFF6FF') : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = dm ? '#1E293B' : '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleUser(doc.id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isSel ? accent : (dm ? '#334155' : '#E5E7EB'),
                      color: isSel ? '#fff' : textS,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 11,
                    }}>
                      {(doc.name || doc.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: textP, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || '—'}</div>
                      <div style={{ fontSize: 10, color: textS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: textS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.college || '—'}</div>
                  <div style={{ fontSize: 11, color: textS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.speciality || '—'}</div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: doc.score > 500 ? '#10B981' : doc.score > 0 ? textP : (dm ? '#64748B' : '#D1D5DB') }}>
                    {doc.score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ flexShrink: 0, width: 340, display: 'flex', flexDirection: 'column', background: cardBg, overflow: 'hidden' }}>
          {/* Tab header */}
          <div style={{ padding: '14px 16px 0', borderBottom: `1px solid ${border}` }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[{ key: 'broadcast', icon: '📢', label: 'Broadcast' }, { key: 'event', icon: '📅', label: 'Push Event' }].map(tab => (
                <button key={tab.key} onClick={() => setRightTab(tab.key)} style={{
                  padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  color: rightTab === tab.key ? accent : textS,
                  borderBottom: rightTab === tab.key ? `2px solid ${accent}` : '2px solid transparent',
                  borderRadius: 0, transition: 'all 0.15s',
                }}>{tab.icon} {tab.label}</button>
              ))}
            </div>
          </div>

          {/* Sub-header */}
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${border}` }}>
            {rightTab === 'broadcast' ? (
              <p style={{ fontSize: 12, margin: 0, fontWeight: 600, color: selectedIds.size > 0 ? accent : textS }}>
                {selectedIds.size > 0 ? `Targeting ${selectedIds.size} doctor${selectedIds.size > 1 ? 's' : ''}` : 'Select doctors from the table'}
              </p>
            ) : (
              <p style={{ fontSize: 12, margin: 0, fontWeight: 600, color: '#059669' }}>
                📅 Push a compulsory event to every doctor's calendar
              </p>
            )}
          </div>

          {/* Broadcast form */}
          {rightTab === 'broadcast' && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', opacity: selectedIds.size === 0 ? 0.35 : 1, pointerEvents: selectedIds.size === 0 ? 'none' : 'auto', transition: 'opacity 0.25s' }}>
              {/* Type selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                    <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))} style={{
                      padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, textAlign: 'center',
                      background: form.type === key ? conf.bg : 'transparent',
                      color: form.type === key ? conf.color : textS,
                      outline: form.type === key ? `2px solid ${conf.color}` : `1px solid ${border}`,
                    }}>
                      <div style={{ fontSize: 16, marginBottom: 2 }}>{conf.icon}</div>
                      {conf.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Title */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Important NEET-PG Update" maxLength={100}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, background: dm ? '#0F172A' : '#fff', color: textP, boxSizing: 'border-box' }} />
              </div>
              {/* Body */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message *</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} maxLength={500}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, resize: 'vertical', border: `1px solid ${border}`, fontSize: 13, background: dm ? '#0F172A' : '#fff', color: textP, minHeight: 90, maxHeight: 180, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                <div style={{ textAlign: 'right', fontSize: 10, color: textS, marginTop: 2 }}>{form.body.length}/500</div>
              </div>
              {/* Preview */}
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: dm ? '#0F172A' : typeConf.bg, border: `1px solid ${dm ? typeConf.color + '33' : typeConf.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15 }}>{typeConf.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: textP }}>{form.title || 'Notification Title'}</span>
                </div>
                <div style={{ fontSize: 11, color: textS }}>{form.body || 'Preview will appear here...'}</div>
              </div>
              {/* Dispatch — 2-step confirm */}
              {confirmPending && (
                <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', fontWeight: 600 }}>
                  ⚠️ Click again to confirm sending to {selectedIds.size} doctor{selectedIds.size !== 1 ? 's' : ''}
                </div>
              )}
              <button onClick={handleDispatch} disabled={isSubmitting || selectedIds.size === 0 || !form.title.trim() || !form.body.trim()} style={{
                width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                background: isSubmitting ? (dm ? '#334155' : '#E5E7EB')
                  : confirmPending ? 'linear-gradient(135deg, #D97706, #B45309)'
                  : (!form.title.trim() || !form.body.trim()) ? (dm ? '#334155' : '#E5E7EB')
                  : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: (isSubmitting || (!form.title.trim() && !confirmPending) || !form.body.trim()) ? textS : '#fff',
                boxShadow: confirmPending ? '0 4px 16px rgba(217,119,6,0.4)' : (form.title.trim() && form.body.trim() && !isSubmitting) ? '0 4px 16px rgba(37,99,235,0.35)' : 'none',
              }}>
                {isSubmitting ? '⏳ Dispatching...' : confirmPending ? `⚠️ Confirm — Send to ${selectedIds.size}?` : `🚀 Dispatch to ${selectedIds.size} Doctor${selectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Event form */}
          {rightTab === 'event' && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {/* Color presets */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Type</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {[{ color: '#EF4444', label: '🔴 Deadline' }, { color: '#F59E0B', label: '🟡 Exam' }, { color: '#10B981', label: '🟢 Session' }, { color: '#3B82F6', label: '🔵 Webinar' }, { color: '#8B5CF6', label: '🟣 Event' }].map(opt => (
                    <button key={opt.color} onClick={() => setEventForm(f => ({ ...f, color: opt.color }))} style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: eventForm.color === opt.color ? opt.color + '22' : (dm ? '#1E293B' : '#F9FAFB'),
                      color: eventForm.color === opt.color ? opt.color : textS,
                      outline: eventForm.color === opt.color ? `2px solid ${opt.color}` : `1px solid ${border}`,
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Title *</label>
                <input type="text" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., NEET-PG Result Declaration" maxLength={100}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, background: dm ? '#0F172A' : '#fff', color: textP, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date *</label>
                <input type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, background: dm ? '#0F172A' : '#fff', color: textP, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description (optional)</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={300}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, resize: 'vertical', border: `1px solid ${border}`, fontSize: 12, background: dm ? '#0F172A' : '#fff', color: textP, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <button onClick={handleEventDispatch} disabled={eventSubmitting || !eventForm.title.trim() || !eventForm.date} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                background: (eventSubmitting || !eventForm.title.trim() || !eventForm.date) ? (dm ? '#334155' : '#E5E7EB') : 'linear-gradient(135deg, #059669, #047857)',
                color: (eventSubmitting || !eventForm.title.trim() || !eventForm.date) ? textS : '#fff',
                boxShadow: (eventForm.title.trim() && eventForm.date && !eventSubmitting) ? '0 4px 16px rgba(5,150,105,0.35)' : 'none',
              }}>
                {eventSubmitting ? '⏳ Pushing…' : '📅 Push to All Doctor Calendars'}
              </button>
              {recentEvents.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: textS, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Events</div>
                  {recentEvents.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, marginBottom: 5, background: dm ? '#1E293B' : '#F9FAFB', border: `1px solid ${border}` }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color || '#3B82F6', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: textP, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                        <div style={{ fontSize: 10, color: textS }}>{ev.date}</div>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
