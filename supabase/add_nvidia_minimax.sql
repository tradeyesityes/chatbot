-- Migration: Add MiniMax M2.7 (NVIDIA Build) configuration
-- Date: April 2026

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS use_minimax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS minimax_api_key TEXT DEFAULT NULL;

-- Metadata/Comments
COMMENT ON COLUMN public.user_settings.use_minimax IS 'Flag to enable MiniMax M2.7 (NVIDIA Build) models';
COMMENT ON COLUMN public.user_settings.minimax_api_key IS 'API key for NVIDIA Build platform';
