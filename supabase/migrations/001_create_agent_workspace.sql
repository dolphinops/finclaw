-- =========================================================================
-- Agent Workspace Files & Settings
-- =========================================================================

-- Core agent personality files (IDENTITY.md, SOUL.md, etc.)
CREATE TABLE IF NOT EXISTS public.agent_workspace_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.agent_workspace_files ENABLE ROW LEVEL SECURITY;

-- Only admins can manage workspace files
CREATE POLICY "admin_read_workspace_files"
    ON public.agent_workspace_files FOR SELECT TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_insert_workspace_files"
    ON public.agent_workspace_files FOR INSERT TO authenticated
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_workspace_files"
    ON public.agent_workspace_files FOR UPDATE TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_delete_workspace_files"
    ON public.agent_workspace_files FOR DELETE TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Single-row settings table
CREATE TABLE IF NOT EXISTS public.agent_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    enabled_skills TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX agent_settings_single_row ON public.agent_settings ((true));

ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_settings"
    ON public.agent_settings FOR SELECT TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_update_settings"
    ON public.agent_settings FOR UPDATE TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Seed default workspace files
INSERT INTO public.agent_workspace_files (name, content) VALUES
    ('IDENTITY.md', '# Agent Identity\n\nDefine who your agent is here.\n'),
    ('SOUL.md', '# Soul / Core Directives\n\nDefine your agent''s personality and values.\n'),
    ('TOOLS.md', '# Tools Reference\n\nDocument your custom tools here.\n'),
    ('USER.md', '# User Preferences\n\nStore user-facing preferences here.\n');

-- Seed default settings
INSERT INTO public.agent_settings (default_model, enabled_skills)
    VALUES ('claude-sonnet-4-20250514', ARRAY['greeting']);
