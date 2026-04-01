-- ==========================================
-- SECURITY HARDENING FOR KB CHATBOT V2
-- ==========================================
-- This script ensures all tables have RLS enabled and basic protection.

-- 1. Ensure RLS is enabled on all core tables
ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_settings ENABLE ROW LEVEL SECURITY;

-- 2. Audit and Fix Policies
-- Ensure no table has a "FOR ALL TO public" policy without auth.uid() check

-- Example: If there's a loose policy on user_settings, tighten it.
DROP POLICY IF EXISTS "Public access" ON public.user_settings;
DROP POLICY IF EXISTS "Allow all" ON public.user_settings;

-- 3. Protect Sensitive Columns (Optional but recommended)
-- We can restrict the API from returning keys to anyone but the owner.
-- Note: PostgREST (Supabase API) respects column-level permissions if configured.
-- For now, the RLS policies already restrict total row access to the owner.

-- 4. Secure Admin View (Redundancy check)
-- This matches the fix in admin_setup.sql
DROP VIEW IF EXISTS public.admin_user_view CASCADE;
CREATE OR REPLACE VIEW public.admin_user_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.last_sign_in_at,
    COALESCE(us.is_admin, false) as is_admin,
    COALESCE(us.is_enabled, true) as is_enabled,
    COALESCE(us.is_deleted, false) as is_deleted,
    u.created_at -- Using auth.users created_at for reliability
FROM 
    auth.users u
LEFT JOIN 
    public.user_settings us ON u.id = us.user_id
WHERE 
    public.check_user_is_admin();

GRANT SELECT ON public.admin_user_view TO authenticated;

-- 5. Final Audit: Verify RLS status
-- This query can be run to check if any table in public schema has RLS disabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
