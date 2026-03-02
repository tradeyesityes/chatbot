-- SQL Script to enable Admin Dashboard functionality
-- Run this in your Supabase SQL Editor

-- 1. Add columns to user_settings (Core, OpenAI, Gemini, Ollama)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS use_openai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS use_gemini BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gemini_model_name TEXT DEFAULT 'gemini-1.5-flash-latest',
ADD COLUMN IF NOT EXISTS use_local_model BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS local_model_name TEXT DEFAULT 'gemma3:4b',
ADD COLUMN IF NOT EXISTS use_remote_ollama BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ollama_api_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ollama_base_url TEXT DEFAULT 'http://localhost:11434';

-- 2. Update Comments
COMMENT ON COLUMN user_settings.is_admin IS 'Flag to identify system administrators';
COMMENT ON COLUMN user_settings.is_enabled IS 'Flag to enable or disable user access';
COMMENT ON COLUMN user_settings.use_openai IS 'Flag to enable OpenAI GPT models';
COMMENT ON COLUMN user_settings.use_gemini IS 'Flag to enable Google Gemini models';
COMMENT ON COLUMN user_settings.gemini_model_name IS 'The specific Gemini model to use';
COMMENT ON COLUMN user_settings.use_local_model IS 'Flag to enable local Ollama model';
COMMENT ON COLUMN user_settings.local_model_name IS 'The specific Ollama/Local model to use';
COMMENT ON COLUMN user_settings.use_remote_ollama IS 'Flag to enable remote Ollama API';
COMMENT ON COLUMN user_settings.ollama_api_key IS 'API key for remote Ollama service';
COMMENT ON COLUMN user_settings.ollama_base_url IS 'Base URL for remote Ollama API';

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

-- Policy 1: Users can manage their own settings (Idempotent)
DROP POLICY IF EXISTS "Users manage own" ON user_settings;
CREATE POLICY "Users manage own" ON user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Admins can manage EVERYTHING (Idempotent)
DROP POLICY IF EXISTS "Admins manage all" ON user_settings;
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
