-- Add Ollama specific fields to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS use_ollama BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ollama_api_key TEXT,
ADD COLUMN IF NOT EXISTS ollama_model_name TEXT DEFAULT 'gemma2:9b';
