-- =========================================================================
-- Agent Sessions & Messages (Conversation Memory)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'web',    -- 'web', 'slack', 'api', 'public'
    thread_id TEXT,                          -- External thread identifier
    title TEXT,                              -- Auto-generated conversation summary
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS agent_sessions_user_id_idx ON public.agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS agent_sessions_channel_idx ON public.agent_sessions(channel);
CREATE INDEX IF NOT EXISTS agent_messages_session_id_idx ON public.agent_messages(session_id);
CREATE INDEX IF NOT EXISTS agent_messages_created_at_idx ON public.agent_messages(created_at);

-- RLS
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Users can see their own sessions
CREATE POLICY "users_read_own_sessions"
    ON public.agent_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "service_role_full_access_sessions"
    ON public.agent_sessions FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_messages"
    ON public.agent_messages FOR ALL
    USING (true) WITH CHECK (true);

-- Users can view messages from their sessions
CREATE POLICY "users_read_own_messages"
    ON public.agent_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_sessions
            WHERE agent_sessions.id = agent_messages.session_id
            AND agent_sessions.user_id = auth.uid()
        )
    );
