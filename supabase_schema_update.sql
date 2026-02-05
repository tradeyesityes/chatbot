-- Run this script in your Supabase SQL Editor to update the user_settings table

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS use_local_model BOOLEAN DEFAULT FALSE;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS local_model_name TEXT DEFAULT 'gemma3:4b';

-- Update RLS policies if necessary (usually existing ones cover updates to own rows)
-- Ensure the columns are visible to the API
COMMENT ON COLUMN user_settings.use_local_model IS 'Flag to enable local Ollama model';
COMMENT ON COLUMN user_settings.local_model_name IS 'Name of the local Ollama model';
