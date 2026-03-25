-- ============================================================
-- iConnect Content Hub — Phase 1 DB Migration
-- Tables: quizzes, quiz_questions, quiz_attempts,
--         live_arenas, arena_participants, arena_answers,
--         video_lectures, flashcard_decks, flashcards,
--         doubts, doubt_replies
-- ============================================================

-- ── 1. QUIZZES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  subject       text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending','approved','rejected')),
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by   uuid REFERENCES auth.users(id),
  rejection_note text,
  time_limit_sec int NOT NULL DEFAULT 600,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
-- superadmin: full access
CREATE POLICY "sa_quizzes_all" ON quizzes
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
-- contentadmin: CRUD own, read all approved
CREATE POLICY "ca_quizzes_own" ON quizzes
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
           AND (created_by = auth.uid() OR status = 'approved') )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
               AND created_by = auth.uid() );
-- doctor: read approved only
CREATE POLICY "doc_quizzes_read" ON quizzes
  FOR SELECT TO authenticated
  USING ( status = 'approved' );
-- ── 2. QUIZ QUESTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  sort_order  int  NOT NULL DEFAULT 0,
  stem        text NOT NULL,
  options     jsonb NOT NULL DEFAULT '[]',   -- [{label,text}]
  correct_key text NOT NULL,
  explanation text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_quiz_q_all" ON quiz_questions
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_quiz_q_own" ON quiz_questions
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
           AND (SELECT created_by FROM quizzes WHERE id = quiz_id) = auth.uid() )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
               AND (SELECT created_by FROM quizzes WHERE id = quiz_id) = auth.uid() );
CREATE POLICY "doc_quiz_q_read" ON quiz_questions
  FOR SELECT TO authenticated
  USING ( (SELECT status FROM quizzes WHERE id = quiz_id) = 'approved' );
-- ── 3. QUIZ ATTEMPTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers     jsonb NOT NULL DEFAULT '{}',  -- {question_id: chosen_key}
  score       int  NOT NULL DEFAULT 0,
  total       int  NOT NULL DEFAULT 0,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_quiz_att_all" ON quiz_attempts
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_quiz_att_read" ON quiz_attempts
  FOR SELECT TO authenticated
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin' );
CREATE POLICY "doc_quiz_att_own" ON quiz_attempts
  FOR ALL TO authenticated
  USING  ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );
-- ── 4. LIVE ARENAS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_arenas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  host_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin          text NOT NULL UNIQUE,
  status       text NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting','active','finished')),
  current_q    int  NOT NULL DEFAULT 0,
  question_started_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE live_arenas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_arenas_all" ON live_arenas
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_arenas_host" ON live_arenas
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
           AND host_id = auth.uid() )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
               AND host_id = auth.uid() );
CREATE POLICY "doc_arenas_read" ON live_arenas
  FOR SELECT TO authenticated
  USING ( status IN ('waiting','active') );
-- ── 5. ARENA PARTICIPANTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_participants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id   uuid NOT NULL REFERENCES live_arenas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  score      int  NOT NULL DEFAULT 0,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arena_id, user_id)
);
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_arena_p_all" ON arena_participants
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
-- host (contentadmin) can read participants in their arenas
CREATE POLICY "ca_arena_p_read" ON arena_participants
  FOR SELECT TO authenticated
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
          AND (SELECT host_id FROM live_arenas WHERE id = arena_id) = auth.uid() );
-- participants: insert/read own row
CREATE POLICY "doc_arena_p_own" ON arena_participants
  FOR ALL TO authenticated
  USING  ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );
-- all authenticated can read participants in active arenas (leaderboard)
CREATE POLICY "auth_arena_p_active_read" ON arena_participants
  FOR SELECT TO authenticated
  USING ( (SELECT status FROM live_arenas WHERE id = arena_id) IN ('active','finished') );
-- ── 6. ARENA ANSWERS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id        uuid NOT NULL REFERENCES live_arenas(id) ON DELETE CASCADE,
  participant_id  uuid NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  chosen_key      text,
  is_correct      boolean,
  points_awarded  int  NOT NULL DEFAULT 0,
  answered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arena_id, participant_id, question_id)
);
ALTER TABLE arena_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_arena_ans_all" ON arena_answers
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_arena_ans_read" ON arena_answers
  FOR SELECT TO authenticated
  USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
          AND (SELECT host_id FROM live_arenas WHERE id = arena_id) = auth.uid() );
CREATE POLICY "doc_arena_ans_own" ON arena_answers
  FOR ALL TO authenticated
  USING  ( (SELECT user_id FROM arena_participants WHERE id = participant_id) = auth.uid() )
  WITH CHECK ( (SELECT user_id FROM arena_participants WHERE id = participant_id) = auth.uid() );
-- ── 7. VIDEO LECTURES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_lectures (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  subject      text NOT NULL,
  description  text,
  video_url    text NOT NULL,
  thumbnail_url text,
  duration_sec int,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  created_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by  uuid REFERENCES auth.users(id),
  rejection_note text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE video_lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_videos_all" ON video_lectures
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_videos_own" ON video_lectures
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
           AND (created_by = auth.uid() OR status = 'approved') )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
               AND created_by = auth.uid() );
CREATE POLICY "doc_videos_read" ON video_lectures
  FOR SELECT TO authenticated
  USING ( status = 'approved' );
-- ── 8. FLASHCARD DECKS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  subject     text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES auth.users(id),
  rejection_note text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_decks_all" ON flashcard_decks
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_decks_own" ON flashcard_decks
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
           AND (created_by = auth.uid() OR status = 'approved') )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
               AND created_by = auth.uid() );
CREATE POLICY "doc_decks_read" ON flashcard_decks
  FOR SELECT TO authenticated
  USING ( status = 'approved' );
-- ── 9. FLASHCARDS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id    uuid NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  sort_order int  NOT NULL DEFAULT 0,
  front      text NOT NULL,
  back       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_flashcards_all" ON flashcards
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_flashcards_own" ON flashcards
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
           AND (SELECT created_by FROM flashcard_decks WHERE id = deck_id) = auth.uid() )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin'
               AND (SELECT created_by FROM flashcard_decks WHERE id = deck_id) = auth.uid() );
CREATE POLICY "doc_flashcards_read" ON flashcards
  FOR SELECT TO authenticated
  USING ( (SELECT status FROM flashcard_decks WHERE id = deck_id) = 'approved' );
-- ── 10. DOUBTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doubts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     text,
  title       text NOT NULL,
  body        text NOT NULL,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','resolved')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_doubts_all" ON doubts
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_doubts_all" ON doubts
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin' );
CREATE POLICY "doc_doubts_own_or_read" ON doubts
  FOR ALL TO authenticated
  USING  ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );
-- doctors can read ALL doubts (peer learning) but only write own
CREATE POLICY "doc_doubts_read_all" ON doubts
  FOR SELECT TO authenticated
  USING ( TRUE );
-- ── 11. DOUBT REPLIES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doubt_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id   uuid NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE doubt_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_doubt_r_all" ON doubt_replies
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin' );
CREATE POLICY "ca_doubt_r_all" ON doubt_replies
  FOR ALL TO authenticated
  USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin' )
  WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'contentadmin' );
CREATE POLICY "doc_doubt_r_own_write" ON doubt_replies
  FOR ALL TO authenticated
  USING  ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );
CREATE POLICY "auth_doubt_r_read" ON doubt_replies
  FOR SELECT TO authenticated
  USING ( TRUE );
-- ── REALTIME PUBLICATION ─────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE live_arenas;
ALTER PUBLICATION supabase_realtime ADD TABLE arena_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE arena_answers;
-- ── UPDATED_AT TRIGGERS ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['quizzes','video_lectures','flashcard_decks','doubts']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t);
  END LOOP;
END; $$;
