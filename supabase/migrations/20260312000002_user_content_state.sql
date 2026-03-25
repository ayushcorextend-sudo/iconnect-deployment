-- Sprint 1.6: User reading progress + bookmarks
CREATE TABLE IF NOT EXISTS user_content_state (
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artifact_id   BIGINT      NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  is_bookmarked BOOLEAN     NOT NULL DEFAULT false,
  current_page  INTEGER     NOT NULL DEFAULT 1,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
);
ALTER TABLE user_content_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own content state"
  ON user_content_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content state"
  ON user_content_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content state"
  ON user_content_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
