-- =========================================================================
-- Profiles Table (required by Finclaw for user role resolution)
-- =========================================================================
-- NOTE: If your project already has a profiles table, skip this migration
-- and ensure it has at minimum: id (UUID, FK to auth.users), role (TEXT),
-- full_name (TEXT), and email (TEXT).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "admins_read_all_profiles"
    ON public.profiles FOR SELECT TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Service role full access
CREATE POLICY "service_role_full_access_profiles"
    ON public.profiles FOR ALL
    USING (true) WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;
