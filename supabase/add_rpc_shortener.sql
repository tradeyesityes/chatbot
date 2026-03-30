-- ============================================================
-- MIGRATION: Server-Side URL Shortener (100% Stable)
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ---- STEP 1: Enable HTTP extension if not exists ----
-- Note: You might need to enable this in the extensions tab first if this fails.
CREATE EXTENSION IF NOT EXISTS http;

-- ---- STEP 2: Create shorten_url function ----
-- This function is a security definer, meaning it runs with elevated privileges 
-- to perform the HTTP request.
CREATE OR REPLACE FUNCTION public.shorten_url(p_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response http_response;
BEGIN
    -- Perform the GET request to is.gd via the Supabase server
    -- This avoids all browser-side CORS and network blocking.
    v_response := http_get('https://is.gd/create.php?format=simple&url=' || urlencode(p_url));
    
    RETURN v_response.content;
END;
$$;

-- ---- STEP 3: Grant access to anon and authenticated ----
GRANT EXECUTE ON FUNCTION public.shorten_url TO anon, authenticated;

-- ---- STEP 4: Comment ----
COMMENT ON FUNCTION public.shorten_url IS 'Server-side proxy for ultra-short URL generation.';
