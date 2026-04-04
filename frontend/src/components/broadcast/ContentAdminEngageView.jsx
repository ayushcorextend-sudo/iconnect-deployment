import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { TYPE_CONFIG } from './broadcastTypes';
import { Z } from '../../styles/zIndex';

/* ═══════════════════════════════════════════════════
   CONTENT ADMIN ENGAGE VIEW — new superadmin tool
   Filter and broadcast to content admins
   ═══════════════════════════════════════════════════ */
export default function ContentAdminEngageView({ userId, addToast, darkMode, onBack }) {
  const dm     = darkMode;
  const bg     = dm ? '#0F172A' : '#F8FAFC';
  const cardBg = dm ? '#1E293B' : '#fff';
  const border = dm ? '#334155' : '#E5E7EB';
  const borderL= dm ? '#1E293B' : '#F3F4F6';
  const textP  = dm ? '#F1F5F9' : '#111827';
  const textS  = dm ? '#94A3B8' : '#6B7280';
  const accent = '#7C3AED';

  const [allCAs, setAllCAs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Filters
  const [filterVolume, setFilterVolume]   = useState('all');  // all|none|low|active
  const [filterStatus, setFilterStatus]   = useState('all');  // all|has_approved|has_pending|has_rejected
  const [filterActivity, setFilterActivity] = useState('all'); // all|recent|inactive

  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [form, setForm]                   = useState({ title: '', body: '', type: 'info' });
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const confirmTimerRef = useRef(null);
  const caFilterRowRef = useRef(null);

  // Fetch content admins + their artifact stats
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: cas } = await supabase
          .from('profiles')
          .select('id, name, email, created_at, status')
          .eq('role', 'contentadmin');

        if (!cas?.length) { setAllCAs([]); setLoading(false); return; }

        const caIds = cas.map(c => c.id);
        const { data: arts } = await supabase
          .from('artifacts')
          .select('id, status, uploaded_by_id, created_at')
          .in('uploaded_by_id', caIds);

        // Build per-CA stats
        const statsMap = {};
        cas.forEach(c => { statsMap[c.id] = { total: 0, pending: 0, approved: 0, rejected: 0, lastUpload: null }; });
        (arts || []).forEach(a => {
          const s = statsMap[a.uploaded_by_id];
          if (!s) return;
          s.total++;
          if (a.status === 'pending')  s.pending++;
          if (a.status === 'approved') s.approved++;
          if (a.status === 'rejected') s.rejected++;
          const d = new Date(a.created_at);
          if (!s.lastUpload || d > new Date(s.lastUpload)) s.lastUpload = a.created_at;
        });

        const merged = cas.map(c => ({ ...c, ...statsMap[c.id] }));
        setAllCAs(merged);
      } catch (err) {
        console.error('[ContentAdminEngageView] Fetch failed:', err);
        addToast?.('error', 'Failed to load content admin data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close CA filter dropdowns on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    const handler = (e) => {
      if (caFilterRowRef.current && !caFilterRowRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeDropdown]);

  // Filtering
  const filteredCAs = useMemo(() => {
    return allCAs.filter(ca => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        if (!`${ca.name || ''} ${ca.email || ''}`.toLowerCase().includes(q)) return false;
      }
      // Upload volume
      if (filterVolume === 'none'   && ca.total !== 0) return false;
      if (filterVolume === 'low'    && (ca.total < 1 || ca.total > 5)) return false;
      if (filterVolume === 'active' && ca.total <= 5) return false;
      // Content status
      if (filterStatus === 'has_approved' && ca.approved === 0) return false;
      if (filterStatus === 'has_pending'  && ca.pending  === 0) return false;
      if (filterStatus === 'has_rejected' && ca.rejected === 0) return false;
      // Activity
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (filterActivity === 'recent'   && (!ca.lastUpload || new Date(ca.lastUpload) < thirtyDaysAgo)) return false;
      if (filterActivity === 'inactive' && ca.lastUpload && new Date(ca.lastUpload) >= thirtyDaysAgo) return false;
      return true;
    });
  }, [allCAs, searchQuery, filterVolume, filterStatus, filterActivity]);

  useEffect(() => { setSelectedIds(new Set()); }, [searchQuery, filterVolume, filterStatus, filterActivity]);

  const toggleCA = useCallback(id => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const allFiltered = filteredCAs.length > 0 && filteredCAs.every(c => selectedIds.has(c.id));
  const handleSelectAll = () => {
    const ids = new Set(filteredCAs.map(c => c.id));
    const all = filteredCAs.every(c => selectedIds.has(c.id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (all) ids.forEach(id => n.delete(id)); else ids.forEach(id => n.add(id));
      return n;
    });
  };

  const hasActiveFilters = filterVolume !== 'all' || filterStatus !== 'all' || filterActivity !== 'all' || searchQuery;

  const handleDispatch = async () => {
    if (selectedIds.size === 0) return;
    if (!form.title.trim()) { addToast?.('error', 'Title is required.'); return; }
    if (!form.body.trim())  { addToast?.('error', 'Message required.'); return; }
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
      addToast?.('success', `✅ Broadcast sent to ${selectedIds.size} content admin(s)!`);
      setSelectedIds(new Set());
      setForm({ title: '', body: '', type: 'info' });
    } catch (err) {
      addToast?.('error', 'Dispatch failed: ' + (err.message || 'Try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConf = TYPE_CONFIG[form.type] || TYPE_CONFIG.info;

  const VOLUME_OPTIONS  = [{ v: 'all', l: '📦 All Volumes' }, { v: 'none', l: '🚫 No Uploads' }, { v: 'low', l: '📉 Low (1–5)' }, { v: 'active', l: '📈 Active (6+)' }];
  const STATUS_OPTIONS  = [{ v: 'all', l: '🏷 All Statuses' }, { v: 'has_approved', l: '✅ Has Approved' }, { v: 'has_pending', l: '⏳ Has Pending' }, { v: 'has_rejected', l: '❌ Has Rejected' }];
  const ACTIVITY_OPTIONS= [{ v: 'all', l: '🕐 All Activity' }, { v: 'recent', l: '🟢 Active (30d)' }, { v: 'inactive', l: '🔴 Inactive (30d+)' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden', background: bg }}>

      {/* TOP BAR — overflow:visible so filter dropdowns show below */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${border}`, flexShrink: 0, overflow: 'visible', position: 'relative', zIndex: Z.local }}>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, border: `1px solid ${border}`, background: 'transparent', color: textS, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            ← Back
          </button>

          <div style={{ fontSize: 15, fontWeight: 900, color: textP, flexShrink: 0 }}>
            🎓 Content Admin Reach
            <span style={{ fontWeight: 400, color: textS, fontSize: 12, marginLeft: 8 }}>
              ({filteredCAs.length} of {allCAs.length})
            </span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
            <input
              type="text"
              placeholder="🔍 Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 14px', borderRadius: 99, border: `1px solid ${border}`, fontSize: 12, background: dm ? '#0F172A' : '#F9FAFB', color: textP, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {selectedIds.size > 0 && (
            <div style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: '#F5F3FF', color: accent, flexShrink: 0 }}>
              ✓ {selectedIds.size} selected
            </div>
          )}
        </div>

        {/* Filter row — overflow:visible so dropdowns aren't clipped */}
        <div ref={caFilterRowRef} style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', overflow: 'visible', position: 'relative', zIndex: 5 }}>
          {/* Upload volume dropdown */}
          {[
            { id: 'volume', label: VOLUME_OPTIONS.find(o => o.v === filterVolume)?.l || '📦 Upload Volume', opts: VOLUME_OPTIONS, val: filterVolume, set: setFilterVolume, isActive: filterVolume !== 'all' },
            { id: 'status', label: STATUS_OPTIONS.find(o => o.v === filterStatus)?.l || '🏷 Content Status', opts: STATUS_OPTIONS, val: filterStatus, set: setFilterStatus, isActive: filterStatus !== 'all' },
            { id: 'activity', label: ACTIVITY_OPTIONS.find(o => o.v === filterActivity)?.l || '🕐 Activity', opts: ACTIVITY_OPTIONS, val: filterActivity, set: setFilterActivity, isActive: filterActivity !== 'all' },
          ].map(({ id, label, opts, val, set, isActive }) => (
            <div key={id} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setActiveDropdown(activeDropdown === id ? null : id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 600,
                  background: isActive ? (dm ? accent + '22' : '#F5F3FF') : (dm ? '#1E293B' : '#F3F4F6'),
                  color: isActive ? accent : textS,
                  outline: isActive ? `2px solid ${accent}` : `1px solid ${border}`,
                }}
              >
                {label} <span style={{ fontSize: 9, opacity: 0.7 }}>{activeDropdown === id ? '▲' : '▼'}</span>
              </button>
              {activeDropdown === id && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: Z.modal, minWidth: 200, background: dm ? '#1E293B' : '#fff', border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '8px 0' }}>
                  {opts.map(opt => (
                    <button key={opt.v} onClick={() => { set(opt.v); setActiveDropdown(null); }}
                      style={{ display: 'block', width: '100%', padding: '9px 16px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: val === opt.v ? 700 : 400, background: val === opt.v ? (dm ? accent + '22' : '#F5F3FF') : 'transparent', color: val === opt.v ? accent : textP }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(''); setFilterVolume('all'); setFilterStatus('all'); setFilterActivity('all'); }}
              style={{ padding: '7px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#EF4444', background: dm ? '#450A0A' : '#FEF2F2' }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* CA Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `1px solid ${border}` }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1.6fr 70px 70px 70px 80px', padding: '8px 16px', borderBottom: `1px solid ${borderL}`, background: cardBg, fontSize: 10, fontWeight: 700, color: textS, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <div>
              <input type="checkbox" checked={allFiltered} onChange={handleSelectAll} disabled={filteredCAs.length === 0} style={{ cursor: 'pointer', width: 15, height: 15 }} />
            </div>
            <div>Content Admin</div>
            <div style={{ textAlign: 'center' }}>Total</div>
            <div style={{ textAlign: 'center' }}>✅ Live</div>
            <div style={{ textAlign: 'center' }}>⏳ Pend</div>
            <div style={{ textAlign: 'right' }}>Last Upload</div>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: textS }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>Loading content admins...
              </div>
            ) : filteredCAs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: textS }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No content admins match</div>
                <div style={{ fontSize: 12 }}>Try adjusting the filters</div>
              </div>
            ) : filteredCAs.map(ca => {
              const isSel = selectedIds.has(ca.id);
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              const isRecent = ca.lastUpload && new Date(ca.lastUpload) >= thirtyDaysAgo;
              const lastUpStr = ca.lastUpload
                ? new Date(ca.lastUpload).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—';
              return (
                <div
                  key={ca.id}
                  onClick={() => toggleCA(ca.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '36px 1.6fr 70px 70px 70px 80px',
                    padding: '9px 16px', borderBottom: `1px solid ${borderL}`,
                    cursor: 'pointer', alignItems: 'center',
                    background: isSel ? (dm ? '#2E1065' : '#F5F3FF') : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = dm ? '#1E293B' : '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleCA(ca.id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: isSel ? accent : (dm ? '#334155' : '#EDE9FE'),
                      color: isSel ? '#fff' : (dm ? '#C4B5FD' : accent),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12,
                    }}>
                      {(ca.name || ca.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: textP, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ca.name || '—'}</div>
                      <div style={{ fontSize: 10, color: textS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ca.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: ca.total > 0 ? textP : textS }}>{ca.total}</div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: ca.approved > 0 ? '#059669' : textS }}>{ca.approved}</div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: ca.pending > 0 ? '#D97706' : textS }}>{ca.pending}</div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: isRecent ? '#059669' : textS, fontWeight: isRecent ? 600 : 400 }}>
                    {isRecent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', marginRight: 4 }} />}
                    {lastUpStr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel – Broadcast */}
        <div style={{ flexShrink: 0, width: 340, display: 'flex', flexDirection: 'column', background: cardBg, overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: textP }}>📢 Broadcast to Content Admins</div>
            <div style={{ fontSize: 12, color: selectedIds.size > 0 ? accent : textS, marginTop: 4, fontWeight: 600 }}>
              {selectedIds.size > 0 ? `Targeting ${selectedIds.size} content admin${selectedIds.size > 1 ? 's' : ''}` : 'Select content admins from the list'}
            </div>
          </div>
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', opacity: selectedIds.size === 0 ? 0.35 : 1, pointerEvents: selectedIds.size === 0 ? 'none' : 'auto', transition: 'opacity 0.25s' }}>
            {/* Type selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))} style={{
                    padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'center',
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
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Content Policy Update" maxLength={100}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, background: dm ? '#0F172A' : '#fff', color: textP, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: textS, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message *</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} maxLength={500}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, resize: 'vertical', border: `1px solid ${border}`, fontSize: 13, background: dm ? '#0F172A' : '#fff', color: textP, minHeight: 90, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <div style={{ textAlign: 'right', fontSize: 10, color: textS, marginTop: 2 }}>{form.body.length}/500</div>
            </div>
            {/* Preview */}
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: dm ? '#0F172A' : typeConf.bg, border: `1px solid ${dm ? typeConf.color + '33' : typeConf.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>{typeConf.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: textP }}>{form.title || 'Notification Title'}</span>
              </div>
              <div style={{ fontSize: 11, color: textS }}>{form.body || 'Preview here...'}</div>
            </div>
            {confirmPending && (
              <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', fontWeight: 600 }}>
                ⚠️ Click again to confirm sending to {selectedIds.size} admin{selectedIds.size !== 1 ? 's' : ''}
              </div>
            )}
            <button onClick={handleDispatch} disabled={isSubmitting || selectedIds.size === 0 || !form.title.trim() || !form.body.trim()} style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              background: isSubmitting ? (dm ? '#334155' : '#E5E7EB')
                : confirmPending ? 'linear-gradient(135deg, #D97706, #B45309)'
                : (!form.title.trim() || !form.body.trim()) ? (dm ? '#334155' : '#E5E7EB')
                : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: (isSubmitting || (!confirmPending && (!form.title.trim() || !form.body.trim()))) ? textS : '#fff',
              boxShadow: confirmPending ? '0 4px 16px rgba(217,119,6,0.4)' : (form.title.trim() && form.body.trim() && !isSubmitting) ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
            }}>
              {isSubmitting ? '⏳ Sending...' : confirmPending ? `⚠️ Confirm — Send to ${selectedIds.size}?` : `🚀 Send to ${selectedIds.size} Admin${selectedIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
