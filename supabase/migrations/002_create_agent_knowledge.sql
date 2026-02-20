-- =========================================================================
-- Agent Knowledge Base (RAG / Vector Search)
-- =========================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.agent_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,                         -- e.g. 'faq', 'service', 'public', 'internal'
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),              -- Voyage voyage-3-lite dimension
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS agent_knowledge_embedding_idx
    ON public.agent_knowledge
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Full-text search index
CREATE INDEX IF NOT EXISTS agent_knowledge_content_fts_idx
    ON public.agent_knowledge
    USING gin (to_tsvector('english', content));

-- RLS
ALTER TABLE public.agent_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_knowledge"
    ON public.agent_knowledge FOR ALL
    USING (true) WITH CHECK (true);

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_knowledge(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    source TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ak.id,
        ak.title,
        ak.content,
        ak.source,
        ak.metadata,
        1 - (ak.embedding <=> query_embedding) AS similarity
    FROM public.agent_knowledge ak
    WHERE 1 - (ak.embedding <=> query_embedding) > match_threshold
    ORDER BY ak.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
