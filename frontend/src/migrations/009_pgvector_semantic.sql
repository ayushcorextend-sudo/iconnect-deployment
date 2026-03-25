-- ─── 009_pgvector_semantic.sql ───────────────────────────────────────────────
-- Semantic search for artifacts using pgvector + HNSW index.
-- Requires pgvector extension (available in Supabase via the Extensions page).

-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Artifact chunks table (each artifact is split into overlapping text chunks)
CREATE TABLE IF NOT EXISTS artifact_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  chunk_index  int         NOT NULL,
  chunk_text   text        NOT NULL,
  embedding    vector(1536),          -- OpenAI text-embedding-ada-002 / Gemini embedding-001
  token_count  int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3. HNSW index for fast approximate nearest-neighbor search
--    m=16, ef_construction=64 → good balance of speed vs recall
CREATE INDEX IF NOT EXISTS idx_artifact_chunks_embedding
  ON artifact_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Scalar indexes for filtering before vector search
CREATE INDEX IF NOT EXISTS idx_artifact_chunks_artifact
  ON artifact_chunks (artifact_id);

-- 5. RLS: read-only for authenticated users; inserts by service role only
ALTER TABLE artifact_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_chunks" ON artifact_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Semantic search RPC function
--    Returns artifact IDs ranked by cosine similarity to query embedding
CREATE OR REPLACE FUNCTION semantic_search(
  query_embedding vector(1536),
  match_count     int DEFAULT 10,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  artifact_id  uuid,
  title        text,
  subject      text,
  similarity   float,
  chunk_text   text
)
LANGUAGE sql STABLE AS $$
  SELECT
    ac.artifact_id,
    a.title,
    a.subject,
    1 - (ac.embedding <=> query_embedding) AS similarity,
    ac.chunk_text
  FROM artifact_chunks ac
  JOIN artifacts a ON a.id = ac.artifact_id
  WHERE
    a.status = 'approved'
    AND 1 - (ac.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ac.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION semantic_search TO authenticated;
