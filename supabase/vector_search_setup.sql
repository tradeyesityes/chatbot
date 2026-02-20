-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create table for granular file segments (chunks)
CREATE TABLE IF NOT EXISTS file_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id TEXT, -- Reference to the file name or ID in user_files
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Optimized for openai text-embedding-3-small
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add Index for Vector Search (HNSW for speed on larger datasets)
CREATE INDEX ON file_segments USING hnsw (embedding vector_cosine_ops);

-- 4. Function for Semantic Search (Retrieval)
CREATE OR REPLACE FUNCTION match_file_segments (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  file_id TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.id,
    fs.content,
    fs.file_id,
    1 - (fs.embedding <=> query_embedding) AS similarity
  FROM file_segments fs
  WHERE fs.user_id = p_user_id
    AND 1 - (fs.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 5. Enable RLS
ALTER TABLE file_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own file segments"
ON file_segments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
