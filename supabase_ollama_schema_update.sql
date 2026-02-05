-- Run this script in your Supabase SQL Editor to add Ollama API key support

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS ollama_api_key TEXT DEFAULT NULL;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS ollama_base_url TEXT DEFAULT 'http://localhost:11434';

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS use_remote_ollama BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.ollama_api_key IS 'API key for Ollama service (optional)';
COMMENT ON COLUMN user_settings.ollama_base_url IS 'Base URL for Ollama API endpoint';
COMMENT ON COLUMN user_settings.use_remote_ollama IS 'Flag to enable remote Ollama API (separate from local)';
