-- ============================================================
-- MIGRATION: Custom Slug Support for Short Links
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ---- STEP 1: Add slug column to user_settings ----
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE DEFAULT NULL;

-- ---- STEP 2: Add index for performance ----
CREATE INDEX IF NOT EXISTS idx_settings_slug ON public.user_settings(slug);

-- ---- STEP 3: RPC - Get User ID by Slug ----
-- This function allows public (anon) resolution of slugs to user IDs 
-- without exposing the entire user_settings row (which contains API keys).
CREATE OR REPLACE FUNCTION public.get_user_id_by_slug(p_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM public.user_settings
    WHERE slug = p_slug
    LIMIT 1;
    
    RETURN v_user_id;
END;
$$;

-- Grant execute to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_by_slug TO anon, authenticated;

-- ---- STEP 4: Update Comment ----
COMMENT ON COLUMN public.user_settings.slug IS 'A unique human-readable identifier for shorter chatbot links.';
