import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const TYPE_CONFIG = {
  info:    { label: 'Info',    icon: 'ℹ️',  color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  success: { label: 'Success', icon: '✅', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  warn:    { label: 'Warning', icon: '⚠️',  color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  error:   { label: 'Alert',   icon: '🚨', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
};

export default function BroadcastPage({ role, userId, users, darkMode, addToast }) {
  // ── Gate: superadmin only ──────────────────────────────────────────
  if (role !== 'superadmin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
        Access denied.
      </div>
    );
  }

  // ── State ──────────────────────────────────────────────────────────
  const [scores, setScores] = useState({});
  const [loadingScores, setLoadingScores] = useState(true);

  // Filters
  const [collegeFilter, setCollegeFilter] = useState('');
  const [specialityFilter, setSpecialityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [behaviorFilter, setBehaviorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Compose form
  const [form, setForm] = useState({ title: '', body: '', type: 'info' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dark mode theme tokens
  const dm = darkMode;
  const bg = dm ? '#0F172A' : '#F8FAFC';
  const cardBg = dm ? '#1E293B' : '#fff';
  const border = dm ? '#334155' : '#E5E7EB';
  const textP = dm ? '#F1F5F9' : '#111827';
  const textS = dm ? '#94A3B8' : '#6B7280';

  // ── Fetch scores ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchScores() {
      setLoadingScores(true);
      try {
        const { data } = await supabase
          .from('user_scores')
          .select('user_id, total_score');
        const map = {};
        (data || []).forEach(s => { map[s.user_id] = s.total_score || 0; });
        setScores(map);
      } catch (e) {
        console.error('Score fetch failed:', e);
      } finally {
        setLoadingScores(false);
      }
    }
    fetchScores();
  }, []);

  // ── Doctors list (active only, with scores merged) ─────────────────
  const doctors = useMemo(() => {
    return (users || [])
      .filter(u => u.role === 'doctor' && u.status === 'active')
      .map(u => ({ ...u, score: scores[u.id] || 0 }));
  }, [users, scores]);

  // ── Unique filter options derived from live data ───────────────────
  const filterOptions = useMemo(() => ({
    colleges:    [...new Set(doctors.map(d => d.college).filter(Boolean))].sort(),
    specialities:[...new Set(doctors.map(d => d.speciality).filter(Boolean))].sort(),
    states:      [...new Set(doctors.map(d => d.state).filter(Boolean))].sort(),
  }), [doctors]);

  // ── The Intersection Engine: AND logic across all filters ──────────
  const filteredUsers = useMemo(() => {
    return doctors.filter(d => {
      // Demographic filters (AND)
      if (collegeFilter    && d.college    !== collegeFilter)    return false;
      if (specialityFilter && d.speciality !== specialityFilter) return false;
      if (stateFilter      && d.state      !== stateFilter)      return false;

      // Full-text search on name + email
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${d.name || ''} ${d.email || ''}`.toLowerCase().includes(q)) return false;
      }

      // Behavioral segment
      if (behaviorFilter === 'top') {
        const sorted = doctors.map(x => x.score).sort((a, b) => b - a);
        const threshold = doctors.length > 5
          ? (sorted[Math.floor(doctors.length * 0.2)] || 500)
          : 500;
        if (d.score < Math.max(500, threshold)) return false;
      }
      if (behaviorFilter === 'at_risk') {
        if (d.score > 0) return false;
      }
      if (behaviorFilter === 'inactive') {
        const accountAge = (Date.now() - new Date(d.created_at).getTime()) / 86400000;
        if (d.score > 0 || accountAge < 14) return false;
      }

      return true;
    });
  }, [doctors, collegeFilter, specialityFilter, stateFilter, searchQuery, behaviorFilter]);

  // ── Clear selection when filters change ───────────────────────────
  useEffect(() => {
    setSelectedIds(new Set());
  }, [collegeFilter, specialityFilter, stateFilter, searchQuery, behaviorFilter]);

  // ── Toggle individual user ─────────────────────────────────────────
  const toggleUser = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Smart Select All: operates only on filtered set ───────────────
  const allFilteredSelected = filteredUsers.length > 0 &&
    filteredUsers.every(u => selectedIds.has(u.id));

  const handleSelectAll = useCallback(() => {
    const filteredIdSet = new Set(filteredUsers.map(u => u.id));
    if (allFilteredSelected) {
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
  }, [filteredUsers, allFilteredSelected]);

  // ── Dispatch ───────────────────────────────────────────────────────
  const handleDispatch = async () => {
    if (selectedIds.size === 0) return;
    if (!form.title.trim()) { addToast?.('error', 'Title is required.'); return; }
    if (!form.body.trim())  { addToast?.('error', 'Message body is required.'); return; }

    if (!window.confirm(`Dispatch this notification to ${selectedIds.size} doctor(s)?`)) return;

    setIsSubmitting(true);
    try {
      const typeConf = TYPE_CONFIG[form.type] || TYPE_CONFIG.info;

      // Build payload array using REAL schema columns:
      //   body (NOT message), unread (NOT is_read)
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
      console.error('Dispatch failed:', err);
      addToast?.('error', 'Dispatch failed: ' + (err.message || 'Try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConf = TYPE_CONFIG[form.type] || TYPE_CONFIG.info;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', gap: 0,
      height: 'calc(100vh - 80px)',
      overflow: 'hidden',
    }}>

      {/* ══════════════════════════════════════════════════════════════
          LEFT PANEL — AUDIENCE BUILDER (65%)
          ══════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: '0 0 65%', display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${border}`, overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, background: cardBg }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: textP }}>📡 Smart Broadcast Engine</div>
          <div style={{ fontSize: 12, color: textS, marginTop: 4 }}>
            Segment your audience and send targeted notifications
          </div>
        </div>

        {/* Filter dashboard */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, background: cardBg }}>

          {/* Row 1: search + demographic dropdowns */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: '1 1 200px', padding: '7px 12px', borderRadius: 8,
                border: `1px solid ${border}`, fontSize: 13,
                background: dm ? '#0F172A' : '#fff', color: textP, outline: 'none',
              }}
            />
            <select
              value={collegeFilter}
              onChange={e => setCollegeFilter(e.target.value)}
              style={{
                padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`,
                fontSize: 12, background: dm ? '#0F172A' : '#fff', color: textP, minWidth: 130,
              }}
            >
              <option value="">All Colleges</option>
              {filterOptions.colleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={specialityFilter}
              onChange={e => setSpecialityFilter(e.target.value)}
              style={{
                padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`,
                fontSize: 12, background: dm ? '#0F172A' : '#fff', color: textP, minWidth: 130,
              }}
            >
              <option value="">All Specialities</option>
              {filterOptions.specialities.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              style={{
                padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`,
                fontSize: 12, background: dm ? '#0F172A' : '#fff', color: textP, minWidth: 120,
              }}
            >
              <option value="">All States</option>
              {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Row 2: behavioral pills + result count */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: textS, marginRight: 4 }}>SEGMENT:</span>
            {[
              { key: 'all',      label: 'All Doctors' },
              { key: 'top',      label: '🏆 Top Performers' },
              { key: 'at_risk',  label: '⚠️ At-Risk (0 pts)' },
              { key: 'inactive', label: '💤 Inactive' },
            ].map(pill => (
              <button
                key={pill.key}
                onClick={() => setBehaviorFilter(pill.key)}
                style={{
                  padding: '5px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  background: behaviorFilter === pill.key ? '#2563EB' : (dm ? '#334155' : '#F3F4F6'),
                  color: behaviorFilter === pill.key ? '#fff' : textS,
                }}
              >
                {pill.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: textS, fontWeight: 600 }}>
              {filteredUsers.length} doctor{filteredUsers.length !== 1 ? 's' : ''} matched
              {selectedIds.size > 0 && (
                <span style={{ color: '#2563EB', marginLeft: 8 }}>
                  · {selectedIds.size} selected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User table */}
        <div style={{ flex: 1, overflowY: 'auto', background: bg }}>

          {/* Sticky header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr 80px',
            padding: '8px 20px', borderBottom: `1px solid ${border}`,
            background: cardBg, position: 'sticky', top: 0, zIndex: 2,
            fontSize: 11, fontWeight: 700, color: textS,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={handleSelectAll}
                disabled={filteredUsers.length === 0}
                title={`Select all ${filteredUsers.length} filtered doctors`}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
            </div>
            <div>Doctor</div>
            <div>College</div>
            <div>Speciality</div>
            <div style={{ textAlign: 'right' }}>Score</div>
          </div>

          {/* Body */}
          {loadingScores ? (
            <div style={{ padding: 40, textAlign: 'center', color: textS }}>
              Loading scores…
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: textS }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>No doctors match these filters.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your criteria.</div>
            </div>
          ) : (
            filteredUsers.map(doc => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleUser(doc.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr 80px',
                    padding: '10px 20px', borderBottom: `1px solid ${dm ? '#1E293B' : '#F3F4F6'}`,
                    cursor: 'pointer', transition: 'background 0.1s',
                    background: isSelected ? (dm ? '#1E3A5F' : '#EFF6FF') : 'transparent',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = dm ? '#1E293B' : '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(doc.id)}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? '#2563EB' : (dm ? '#334155' : '#E5E7EB'),
                      color: isSelected ? '#fff' : textS,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12,
                    }}>
                      {(doc.name || doc.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: textP }}>
                        {doc.name || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: textS }}>{doc.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: textS }}>{doc.college || '—'}</div>
                  <div style={{ fontSize: 12, color: textS }}>{doc.speciality || '—'}</div>
                  <div style={{
                    textAlign: 'right', fontWeight: 700, fontSize: 13,
                    color: doc.score > 0 ? '#10B981' : textS,
                  }}>
                    {doc.score || 0}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL — COMPOSE CONSOLE (35%)
          ══════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: '0 0 35%', display: 'flex', flexDirection: 'column',
        background: cardBg, overflow: 'hidden',
      }}>

        {/* Compose header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: textP }}>✍️ Compose Broadcast</div>
          <div style={{
            fontSize: 12, fontWeight: 600, marginTop: 4,
            color: selectedIds.size > 0 ? '#2563EB' : textS,
          }}>
            {selectedIds.size > 0
              ? `Targeting ${selectedIds.size} selected doctor${selectedIds.size > 1 ? 's' : ''}`
              : 'Select users from the table to begin'}
          </div>
        </div>

        {/* Form */}
        <div style={{
          flex: 1, padding: 20, overflowY: 'auto',
          opacity: selectedIds.size === 0 ? 0.4 : 1,
          pointerEvents: selectedIds.size === 0 ? 'none' : 'auto',
          transition: 'opacity 0.2s',
        }}>

          {/* Type selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: textP, display: 'block', marginBottom: 6 }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center',
                    background: form.type === key ? conf.bg : 'transparent',
                    color: form.type === key ? conf.color : textS,
                    outline: form.type === key ? `2px solid ${conf.color}` : `1px solid ${border}`,
                  }}
                >
                  {conf.icon} {conf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: textP, display: 'block', marginBottom: 6 }}>
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Important Update for NEET-PG Aspirants"
              maxLength={100}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${border}`, fontSize: 14,
                background: dm ? '#0F172A' : '#fff', color: textP,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 10, color: textS, marginTop: 2 }}>
              {form.title.length}/100
            </div>
          </div>

          {/* Message body */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: textP, display: 'block', marginBottom: 6 }}>
              Message *
            </label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Write your notification message here..."
              rows={5}
              maxLength={500}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, resize: 'vertical',
                border: `1px solid ${border}`, fontSize: 13, lineHeight: 1.6,
                background: dm ? '#0F172A' : '#fff', color: textP,
                minHeight: 100, maxHeight: 200, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 10, color: textS, marginTop: 2 }}>
              {form.body.length}/500
            </div>
          </div>

          {/* Live preview */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: textP, display: 'block', marginBottom: 6 }}>
              Live Preview
            </label>
            <div style={{
              padding: 14, borderRadius: 10,
              background: dm ? '#0F172A' : typeConf.bg,
              border: `1px solid ${dm ? typeConf.color + '44' : typeConf.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{typeConf.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: textP }}>
                  {form.title || 'Notification Title'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: textS, lineHeight: 1.5 }}>
                {form.body || 'Your message will appear here...'}
              </div>
              <div style={{ fontSize: 10, color: textS, marginTop: 8, opacity: 0.6 }}>
                Just now · via iConnect
              </div>
            </div>
          </div>

          {/* Dispatch button */}
          <button
            onClick={handleDispatch}
            disabled={isSubmitting || selectedIds.size === 0 || !form.title.trim() || !form.body.trim()}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
              fontWeight: 800, fontSize: 15, color: '#fff', transition: 'all 0.2s',
              background: isSubmitting
                ? '#9CA3AF'
                : (selectedIds.size > 0 && form.title.trim() && form.body.trim())
                  ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
                  : (dm ? '#334155' : '#E5E7EB'),
              cursor: isSubmitting
                ? 'wait'
                : (selectedIds.size > 0 && form.title.trim() && form.body.trim())
                  ? 'pointer'
                  : 'not-allowed',
              boxShadow: (selectedIds.size > 0 && form.title.trim() && form.body.trim())
                ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
            }}
          >
            {isSubmitting
              ? '⏳ Dispatching...'
              : `🚀 Dispatch to ${selectedIds.size} Doctor${selectedIds.size !== 1 ? 's' : ''}`}
          </button>

          {selectedIds.size > 0 && (
            <p style={{ fontSize: 11, color: textS, textAlign: 'center', marginTop: 8 }}>
              This creates {selectedIds.size} notification{selectedIds.size !== 1 ? 's' : ''} delivered instantly via Supabase Realtime.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
