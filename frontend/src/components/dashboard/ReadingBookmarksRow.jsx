export default function ReadingBookmarksRow({ recentlyRead, bookmarked, contentStates, setPage }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>

      {/* Recently Read */}
      <div className="card" style={{ margin: 0 }}>
        <div className="ch" style={{ marginBottom: 14 }}>
          <div className="ct">📖 Recently Read</div>
          {recentlyRead.length > 0 && (
            <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>View All</button>
          )}
        </div>
        {recentlyRead.length === 0 ? (
          <div style={{ border: '2px dashed #E5E7EB', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No books read yet</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>Start your journey in the Library!</div>
            <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>Browse Library →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentlyRead.map(a => {
              const savedPage = contentStates[String(a.id)]?.currentPage || 1;
              return (
                <div
                  key={a.id}
                  onClick={() => setPage('ebooks')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', cursor: 'pointer', border: '1px solid #F3F4F6', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                >
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji || '📗'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{a.subject}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>
                    p.{savedPage}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bookmarks */}
      <div className="card" style={{ margin: 0 }}>
        <div className="ch" style={{ marginBottom: 14 }}>
          <div className="ct">🔖 Bookmarks</div>
          {bookmarked.length > 0 && (
            <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>View All</button>
          )}
        </div>
        {bookmarked.length === 0 ? (
          <div style={{ border: '2px dashed #E5E7EB', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏷</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No bookmarks yet</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Your saved materials will appear here for quick access.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookmarked.map(a => (
              <div
                key={a.id}
                onClick={() => setPage('ebooks')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', cursor: 'pointer', border: '1px solid #F3F4F6', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
              >
                <div style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji || '📗'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{a.subject}</div>
                </div>
                <span style={{ fontSize: 14, flexShrink: 0 }}>🔖</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
