/**
 * SemanticSearch.jsx — AI-powered semantic search for the E-Library.
 *
 * - Debounced input (500ms)
 * - Calls query-embedding Edge Function for vector similarity search
 * - Falls back to keyword search on error/unavailable
 * - Displays results with similarity score badges
 */
import { useState, useEffect, useRef } from 'react';
import { semanticSearch, keywordSearch } from '../../lib/semanticSearch';
import { useAppStore } from '../../stores/useAppStore';

export default function SemanticSearch({ onSelectArtifact }) {
  const artifacts = useAppStore(s => s.artifacts);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState('idle'); // 'idle' | 'semantic' | 'keyword'
  const debounceRef             = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setMode('idle');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const semanticResults = await semanticSearch(query);
      if (semanticResults.length > 0) {
        setResults(semanticResults);
        setMode('semantic');
      } else {
        // Keyword fallback
        const kw = keywordSearch(query, artifacts).slice(0, 8).map(a => ({
          artifact_id: a.id,
          title: a.title,
          subject: a.subject,
          similarity: null,
          chunk_text: a.description || '',
        }));
        setResults(kw);
        setMode('keyword');
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query, artifacts]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, pointerEvents: 'none', color: '#9CA3AF',
        }}>🔍</span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search books, topics, subjects…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px 10px 38px',
            border: '1.5px solid #E5E7EB',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            color: '#111827',
            background: '#fff',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#4F46E5'; }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
        />
        {loading && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid #E5E7EB', borderTopColor: '#4F46E5',
            animation: 'spin 0.7s linear infinite',
          }} />
        )}
      </div>

      {/* Mode badge */}
      {mode !== 'idle' && results.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>
          {mode === 'semantic'
            ? '✨ AI semantic results'
            : '🔤 Keyword results (AI search unavailable)'}
        </div>
      )}

      {/* Results Dropdown */}
      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          marginTop: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {results.map((r, i) => (
            <button
              key={r.artifact_id + i}
              onClick={() => {
                onSelectArtifact?.(r.artifact_id);
                setQuery('');
                setResults([]);
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F3F4F6',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {r.subject}
                  {r.similarity !== null && (
                    <span style={{
                      marginLeft: 8, padding: '1px 6px',
                      background: r.similarity > 0.8 ? '#D1FAE5' : '#E0E7FF',
                      color: r.similarity > 0.8 ? '#065F46' : '#3730A3',
                      borderRadius: 20, fontSize: 10, fontWeight: 600,
                    }}>
                      {Math.round(r.similarity * 100)}% match
                    </span>
                  )}
                </div>
                {r.chunk_text && (
                  <div style={{
                    fontSize: 11, color: '#9CA3AF', marginTop: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.chunk_text.slice(0, 100)}…
                  </div>
                )}
              </div>
            </button>
          ))}
          <div style={{ padding: '6px 14px', fontSize: 11, color: '#9CA3AF', borderTop: '1px solid #F3F4F6' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} — press Enter to search all
          </div>
        </div>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && mode !== 'idle' && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          marginTop: 6, padding: '16px 14px', textAlign: 'center',
          color: '#6B7280', fontSize: 13,
        }}>
          No results for "{query}"
        </div>
      )}
    </div>
  );
}
