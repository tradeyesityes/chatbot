-- ============================================================
-- SUPABASE SECURITY REMEDIATION (APRIL 2026)
-- Addresses: rls_disabled_in_public, sensitive_columns_exposed, auth_users_exposed
-- ============================================================

-- ---- 1. HARDEN RLS ON ALL TABLES ----
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- ---- 2. FIX SENSITIVE DATA EXPOSURE (global_settings) ----
-- Issue: Anyone could read 'evolution_global_api_key' because of USING(true) policy.

DROP POLICY IF EXISTS "Allow public read access" ON public.global_settings;
DROP POLICY IF EXISTS "Allow public select" ON public.global_settings;

-- New Policy: Only admins can read global settings (including API keys)
CREATE POLICY "Admins manage global settings" ON public.global_settings
    FOR ALL
    TO authenticated
    USING (public.check_user_is_admin())
    WITH CHECK (public.check_user_is_admin());

-- Optional: Allow non-admins to read NON-SENSITIVE keys only (if needed)
-- CREATE POLICY "Users read non-sensitive settings" ON public.global_settings
--    FOR SELECT
--    USING (key NOT LIKE '%api_key%' AND key NOT LIKE '%token%');

-- ---- 3. FIX BOT DEBUG LOGS EXPOSURE ----
-- Issue: Anyone could read or insert logs.

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.bot_debug_logs;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.bot_debug_logs;

-- New Policy: Only authenticated users can insert (for bot functions), only admins can read.
CREATE POLICY "Bot functions can insert logs" ON public.bot_debug_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can view logs" ON public.bot_debug_logs
    FOR SELECT
    TO authenticated
    USING (public.check_user_is_admin());

-- ---- 4. FIX AUTH USERS EXPOSURE THROUGH VIEW ----
-- Issue: Direct selection from auth.users flagged as a vulnerability.

-- Step 4a: Drop the existing view
DROP VIEW IF EXISTS public.admin_user_view CASCADE;

-- Step 4b: Security Definer Function to safely fetch user data
-- This is more secure than a direct view as it encapsulates the "admin check" logic.
CREATE OR REPLACE FUNCTION public.get_admin_users_safe()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN,
    is_super_admin BOOLEAN,
    is_enabled BOOLEAN,
    is_deleted BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as creator (service_role) to access auth.users
SET search_path = public, auth
AS $$
BEGIN
    -- CRITICAL: Verify the caller IS an admin before returning any data
    IF NOT EXISTS (
        SELECT 1 FROM public.user_settings us_check
        WHERE us_check.user_id = auth.uid() 
        AND (us_check.is_admin = true OR us_check.is_super_admin = true)
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email::TEXT,
        u.last_sign_in_at,
        COALESCE(us.is_admin, false),
        COALESCE(us.is_super_admin, false),
        COALESCE(us.is_enabled, true),
        COALESCE(us.is_deleted, false),
        u.created_at
    FROM 
        auth.users u
    LEFT JOIN 
        public.user_settings us ON u.id = us.user_id;
END;
$$;

-- Step 4c: Re-create the view using the safe function
-- This satisfies the advisor because the view doesn't directly query auth.users,
-- and the access logic is hidden behind a SECURITY DEFINER function.
CREATE OR REPLACE VIEW public.admin_user_view AS
SELECT * FROM public.get_admin_users_safe();

-- Grant access only to authenticated users (The function handles the admin check internally)
GRANT SELECT ON public.admin_user_view TO authenticated;
REVOKE SELECT ON public.admin_user_view FROM anon;

-- ---- 5. FINAL AUDIT CHECK ----
COMMENT ON VIEW public.admin_user_view IS 'Hardened view for admin user management. Uses get_admin_users_safe() for RLS compliance.';
COMMENT ON TABLE public.global_settings IS 'Protects sensitive API keys by restricting access to system administrators.';
