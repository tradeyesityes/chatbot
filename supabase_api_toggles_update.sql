-- Run this script in your Supabase SQL Editor to add toggle switches for OpenAI and Gemini

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS use_openai BOOLEAN DEFAULT TRUE;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS use_gemini BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.use_openai IS 'Flag to enable OpenAI API';
COMMENT ON COLUMN user_settings.use_gemini IS 'Flag to enable Gemini API';
