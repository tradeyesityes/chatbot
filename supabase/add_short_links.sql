-- ============================================================
-- MIGRATION: Internal Short Link System
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ---- STEP 1: Create short_links table ----
CREATE TABLE IF NOT EXISTS public.short_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- The short code (e.g. a1b2c3)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_full_mode BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---- STEP 2: Add index for performance ----
CREATE INDEX IF NOT EXISTS idx_short_links_code ON public.short_links(code);

-- ---- STEP 3: Enable RLS ----
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- ---- STEP 4: RLS Policies ----
-- Allow anyone to read short links (for resolution)
DROP POLICY IF EXISTS "Public can read short links" ON short_links;
CREATE POLICY "Public can read short links" ON short_links FOR SELECT USING (true);

-- Allow users to manage their own short links
DROP POLICY IF EXISTS "Users can manage own short links" ON short_links;
CREATE POLICY "Users can manage own short links" ON short_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- STEP 5: Comment ----
COMMENT ON TABLE public.short_links IS 'Internal system for shortening chatbot direct links.';
