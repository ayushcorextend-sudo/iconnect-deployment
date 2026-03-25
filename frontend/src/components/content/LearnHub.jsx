import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import QuizPlayer from '../quiz/QuizPlayer';
import FlashcardPlayer from './FlashcardPlayer';
import SignedImg from '../ui/SignedImg';

const TABS = [
  { key: 'quizzes',    label: '📝 Mock Tests' },
  { key: 'videos',     label: '🎥 Video Lectures' },
  { key: 'flashcards', label: '🃏 Flashcards' },
  { key: 'doubts',     label: '💬 Ask a Doubt' },
];

// ── YouTube embed URL helper ─────────────────────────────────
function getEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
    }
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace('/', '');
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch (_) {}
  return null;
}

const relTime = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return             Math.floor(s / 86400) + 'd ago';
};

export default function LearnHub({ userId, addToast }) {
  const [tab, setTab]         = useState('quizzes');
  const [quizzes, setQuizzes] = useState([]);
  const [videos, setVideos]   = useState([]);
  const [decks, setDecks]     = useState([]);
  const [loading, setLoading] = useState(false);

  // Sub-views
  const [playQuizId, setPlayQuizId]   = useState(null);
  const [playDeckId, setPlayDeckId]   = useState(null);
  const [watchVideo, setWatchVideo]   = useState(null);

  // Doubt form
  const [doubtTitle, setDoubtTitle]     = useState('');
  const [doubtSubject, setDoubtSubject] = useState('');
  const [doubtBody, setDoubtBody]       = useState('');
  const [myDoubts, setMyDoubts]         = useState([]);
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    if (tab === 'quizzes' && !quizzes.length)     loadQuizzes();
    if (tab === 'videos' && !videos.length)       loadVideos();
    if (tab === 'flashcards' && !decks.length)    loadDecks();
    if (tab === 'doubts' && !myDoubts.length)     loadMyDoubts();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('quizzes').select('id, title, subject, time_limit_sec').eq('status', 'approved').order('created_at', { ascending: false });
      if (error) throw error;
      setQuizzes(data || []);
    } catch (e) {
      addToast('error', 'Failed to load quizzes: ' + e.message);
    } finally { setLoading(false); }
  };

  const loadVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('video_lectures').select('*').eq('status', 'approved').order('created_at', { ascending: false });
      if (error) throw error;
      setVideos(data || []);
    } catch (e) {
      addToast('error', 'Failed to load videos: ' + e.message);
    } finally { setLoading(false); }
  };

  const loadDecks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('flashcard_decks').select('id, title, subject, description').eq('status', 'approved').order('created_at', { ascending: false });
      if (error) throw error;
      setDecks(data || []);
    } catch (e) {
      addToast('error', 'Failed to load decks: ' + e.message);
    } finally { setLoading(false); }
  };

  const loadMyDoubts = async () => {
    if (userId?.startsWith('local_')) return;
    try {
      const { data, error } = await supabase.from('doubts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      setMyDoubts(data || []);
    } catch (e) {
      addToast('error', 'Failed to load your doubts: ' + e.message);
    }
  };

  const submitDoubt = async () => {
    if (!doubtTitle.trim()) { addToast('error', 'Title is required.'); return; }
    if (!doubtBody.trim())  { addToast('error', 'Description is required.'); return; }
    if (userId?.startsWith('local_')) { addToast('error', 'Not available in demo mode.'); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('doubts')
        .insert({ user_id: userId, title: doubtTitle.trim(), body: doubtBody.trim(), subject: doubtSubject || null, status: 'open' })
        .select().single();
      if (error) throw error;
      setMyDoubts(prev => [data, ...prev]);
      setDoubtTitle(''); setDoubtSubject(''); setDoubtBody('');
      addToast('success', 'Doubt submitted! An admin will respond shortly.');
    } catch (e) {
      addToast('error', 'Submit failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // ── Sub-view: Quiz Player ────────────────────────────────────
  if (playQuizId) {
    return <QuizPlayer quizId={playQuizId} userId={userId} addToast={addToast} onBack={() => setPlayQuizId(null)} />;
  }

  // ── Sub-view: Flashcard Player ───────────────────────────────
  if (playDeckId) {
    return <FlashcardPlayer deckId={playDeckId} addToast={addToast} onBack={() => setPlayDeckId(null)} />;
  }

  // ── Sub-view: Video Watch ────────────────────────────────────
  if (watchVideo) {
    const embedUrl = getEmbedUrl(watchVideo.video_url);
    return (
      <div>
        <button className="btn btn-s btn-sm" onClick={() => setWatchVideo(null)} style={{ marginBottom: 16 }}>← Back to Videos</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{watchVideo.title}</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>{watchVideo.subject}</div>
        {embedUrl ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            <iframe
              src={embedUrl}
              title={watchVideo.title}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Direct embed not available for this URL.</div>
            <a href={watchVideo.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-p btn-sm">
              Open Video ↗
            </a>
          </div>
        )}
        {watchVideo.description && (
          <div className="card" style={{ marginTop: 16, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{watchVideo.description}</div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📚 Learn Hub</div>
        <div className="ps">Mock tests, video lectures, flashcards, and ask doubts</div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'act' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── QUIZZES ─────────────────────────────────────────── */}
      {tab === 'quizzes' && (
        loading ? <Spinner /> : quizzes.length === 0 ? (
          <div className="empty"><div className="empty-ic">📝</div><div className="empty-t">No quizzes available yet</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>
            {quizzes.map(q => (
              <div key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 28 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{q.title}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{q.subject}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>⏱ {Math.floor(q.time_limit_sec / 60)} min</div>
                <button className="btn btn-p btn-sm" onClick={() => setPlayQuizId(q.id)} style={{ marginTop: 4 }}>Start Quiz →</button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── VIDEOS ──────────────────────────────────────────── */}
      {tab === 'videos' && (
        loading ? <Spinner /> : videos.length === 0 ? (
          <div className="empty"><div className="empty-ic">🎥</div><div className="empty-t">No video lectures yet</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
            {videos.map(v => (
              <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ height: 140, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {v.thumbnail_url
                    ? <SignedImg src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={<span style={{ fontSize: 40 }}>🎥</span>} />
                    : <span style={{ fontSize: 40 }}>🎥</span>}
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{v.subject}</div>
                  <button className="btn btn-p btn-sm" onClick={() => setWatchVideo(v)}>Watch →</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── FLASHCARDS ──────────────────────────────────────── */}
      {tab === 'flashcards' && (
        loading ? <Spinner /> : decks.length === 0 ? (
          <div className="empty"><div className="empty-ic">🃏</div><div className="empty-t">No flashcard decks yet</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
            {decks.map(d => (
              <div key={d.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 28 }}>🃏</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.title}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{d.subject}</div>
                {d.description && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{d.description}</div>}
                <button className="btn btn-p btn-sm" onClick={() => setPlayDeckId(d.id)} style={{ marginTop: 4 }}>Study →</button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── DOUBTS ──────────────────────────────────────────── */}
      {tab === 'doubts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16, alignItems: 'start' }}>
          {/* Submit new doubt */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Ask a Doubt</div>
            <div className="fg">
              <label className="fl">Title / Question <span className="req">*</span></label>
              <input className="fi-in" value={doubtTitle} onChange={e => setDoubtTitle(e.target.value)} placeholder="Brief title of your doubt…" />
            </div>
            <div className="fg">
              <label className="fl">Subject (optional)</label>
              <input className="fi-in" value={doubtSubject} onChange={e => setDoubtSubject(e.target.value)} placeholder="e.g. Pharmacology" />
            </div>
            <div className="fg">
              <label className="fl">Describe your doubt <span className="req">*</span></label>
              <textarea className="fi-ta" rows={4} value={doubtBody} onChange={e => setDoubtBody(e.target.value)} placeholder="Explain your question in detail…" />
            </div>
            <button className="btn btn-p btn-sm" onClick={submitDoubt} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Doubt'}
            </button>
          </div>

          {/* My doubts history */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>My Doubts</div>
            {myDoubts.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>You haven't asked any doubts yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myDoubts.map(d => (
                  <div key={d.id} className="card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{d.title}</div>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: d.status === 'open' ? '#FEF3C7' : '#DCFCE7',
                        color: d.status === 'open' ? '#D97706' : '#15803D' }}>
                        {d.status === 'open' ? 'Open' : 'Resolved'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{relTime(d.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
