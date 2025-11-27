-- Migration: Add vector embeddings support to feedback table
-- This migration adds the content_embedding column and creates an index for vector similarity search

-- Add the content_embedding column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'feedback' 
        AND column_name = 'content_embedding'
    ) THEN
        ALTER TABLE public.feedback 
        ADD COLUMN content_embedding vector(1536);
    END IF;
END $$;

-- Create the vector similarity index if it doesn't exist
-- Note: This will only work if there are some rows with embeddings already
-- You may need to run this after backfilling some embeddings
CREATE INDEX IF NOT EXISTS feedback_content_embedding_idx 
ON public.feedback 
USING ivfflat (content_embedding vector_cosine_ops) 
WITH (lists = 100);

-- Note: The pgvector extension must be enabled first (should already be done from initial schema)
-- If not, run: CREATE EXTENSION IF NOT EXISTS vector;

