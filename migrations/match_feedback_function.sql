-- Function to find similar feedback using vector similarity search
-- This uses pgvector's cosine similarity operator (<=>)
CREATE OR REPLACE FUNCTION match_feedback(
  query_embedding vector(1536),
  match_project_id bigint,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  content text,
  created_at timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    feedback.id,
    feedback.content,
    feedback.created_at,
    1 - (feedback.content_embedding <=> query_embedding) as similarity
  FROM feedback
  WHERE 
    feedback.project_id = match_project_id
    AND feedback.content_embedding IS NOT NULL
  ORDER BY feedback.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

