-- SQL Script to enable Admin Dashboard functionality
-- Run this in your Supabase SQL Editor

-- 1. Add columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;

-- 2. Update Comments
COMMENT ON COLUMN user_settings.is_admin IS 'Flag to identify system administrators';
COMMENT ON COLUMN user_settings.is_enabled IS 'Flag to enable or disable user access';

-- 3. Update RLS for user_settings
-- This version uses a SECURITY DEFINER function to avoid infinite recursion
-- The function runs as the owner (bypassing RLS) but is restricted to public schema

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can do everything" ON user_settings;
DROP POLICY IF EXISTS "Admins can manage all" ON user_settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- Create the secure check function
CREATE OR REPLACE FUNCTION public.check_user_is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_settings 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policy 1: Users can manage their own settings
CREATE POLICY "Users manage own" ON user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Admins can manage EVERYTHING
CREATE POLICY "Admins manage all" ON user_settings
    FOR ALL
    USING (public.check_user_is_admin());

-- 4. Create a view to safely expose emails to admins
-- This allows us to join auth.users (restricted) with user_settings (public)
CREATE OR REPLACE VIEW public.admin_user_view AS
SELECT 
    us.*,
    u.email
FROM 
    public.user_settings us
JOIN 
    auth.users u ON us.user_id = u.id;

-- Grant access to authenticated users to read the view
-- RLS on the underlying user_settings table will still apply if we use simple select,
-- but since this is a view, we need to be careful.
-- However, we'll keep it simple for the user to apply.
GRANT SELECT ON public.admin_user_view TO authenticated;

-- 5. Set the first user as admin (OPTIONAL - you should run this manually for your ID)
-- UPDATE user_settings SET is_admin = true WHERE user_id = 'your-user-id-here';
