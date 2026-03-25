export default function LatestContentSection({ latestContent, contentStates, handleBookmarkToggle, setPage }) {
  return (
    <div className="card">
      <div className="ch" style={{ marginBottom: 16 }}>
        <div className="ct">📚 Latest Content</div>
        <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>View Library →</button>
      </div>

      {latestContent.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 13 }}>No approved content yet</div>
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: 12,
          overflowX: 'auto', paddingBottom: 8,
          scrollbarWidth: 'thin',
          scrollbarColor: '#E5E7EB transparent',
        }}>
          {latestContent.map(a => {
            const state = contentStates[String(a.id)];
            const isBookmarked = state?.isBookmarked || false;
            const savedPage = state?.currentPage || 1;
            return (
              <div
                key={a.id}
                onClick={() => setPage('ebooks')}
                style={{
                  flexShrink: 0, width: 180,
                  background: '#F9FAFB', borderRadius: 12,
                  padding: 14, cursor: 'pointer',
                  border: '1px solid #F3F4F6',
                  transition: 'transform .2s, box-shadow .2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Cover with bookmark overlay */}
                <div style={{
                  position: 'relative',
                  width: '100%', height: 90, borderRadius: 8, marginBottom: 10,
                  background: 'linear-gradient(135deg,#EFF6FF,#EDE9FE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 40,
                }}>
                  {a.emoji || '📗'}
                  {/* Bookmark toggle icon */}
                  <button
                    onClick={e => handleBookmarkToggle(e, a.id)}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: isBookmarked ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.8)',
                      border: 'none', borderRadius: 6, padding: '3px 5px',
                      fontSize: 14, cursor: 'pointer', lineHeight: 1,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      transition: 'background .15s',
                    }}
                  >
                    {isBookmarked ? '🔖' : '🏷'}
                  </button>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4, lineHeight: 1.3 }}>
                  {a.title.length > 40 ? a.title.substring(0, 40) + '…' : a.title}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: savedPage > 1 ? 4 : 8 }}>{a.subject}</div>
                {savedPage > 1 && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#2563EB',
                      background: '#EFF6FF', borderRadius: 99, padding: '2px 8px',
                    }}>
                      ▶ Resume p.{savedPage}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{a.pages}pg</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#059669',
                    background: '#ECFDF5', borderRadius: 99, padding: '2px 7px',
                  }}>Available</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
