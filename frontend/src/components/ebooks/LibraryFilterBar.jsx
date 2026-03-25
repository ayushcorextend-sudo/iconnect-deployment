export default function LibraryFilterBar({
  searchQuery, setSearchQuery,
  selectedSubject, setSelectedSubject,
  sortBy, setSortBy,
  showOnlyBookmarked, setShowOnlyBookmarked,
  uniqueSubjects, activeFilterCount, resetFilters,
}) {
  return (
    <div style={{
      display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      marginBottom: 16, padding: '12px 14px',
      background: 'var(--surf)', borderRadius: 12,
      border: '1px solid var(--border)',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, pointerEvents: 'none', color: '#9CA3AF',
        }}>🔍</span>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by title…"
          style={{
            width: '100%', padding: '8px 32px 8px 32px',
            border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13,
            background: 'var(--white)', color: 'var(--text)',
            outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = '#2563EB'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#9CA3AF', lineHeight: 1, padding: 2,
            }}
            title="Clear search"
          >✕</button>
        )}
      </div>

      {/* Subject dropdown */}
      <select
        value={selectedSubject}
        onChange={e => setSelectedSubject(e.target.value)}
        style={{
          padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8,
          fontSize: 13, background: 'var(--white)', color: 'var(--text)',
          cursor: 'pointer', minWidth: 150, outline: 'none',
        }}
      >
        <option value="All">All Subjects</option>
        {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Sort dropdown */}
      <select
        value={sortBy}
        onChange={e => setSortBy(e.target.value)}
        style={{
          padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8,
          fontSize: 13, background: 'var(--white)', color: 'var(--text)',
          cursor: 'pointer', minWidth: 140, outline: 'none',
        }}
      >
        <option value="newest">Newest First</option>
        <option value="downloads">Most Downloaded</option>
        <option value="az">A–Z</option>
      </select>

      {/* Bookmarked-only toggle */}
      <button
        onClick={() => setShowOnlyBookmarked(b => !b)}
        style={{
          padding: '8px 16px', borderRadius: 99,
          border: showOnlyBookmarked ? 'none' : '1.5px solid var(--border)',
          background: showOnlyBookmarked ? '#7C3AED' : 'var(--white)',
          color: showOnlyBookmarked ? '#fff' : 'var(--muted)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'background .15s, color .15s, border .15s',
          whiteSpace: 'nowrap',
        }}
      >
        🔖 Bookmarked Only
      </button>

      {/* Reset */}
      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          style={{
            padding: '8px 12px', borderRadius: 8,
            border: '1px solid #FCA5A5', background: '#FFF1F1',
            color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ✕ Reset
        </button>
      )}
    </div>
  );
}
