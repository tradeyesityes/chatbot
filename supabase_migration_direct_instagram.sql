-- Add Instagram direct integration columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_account_id TEXT,
ADD COLUMN IF NOT EXISTS meta_app_id TEXT,
ADD COLUMN IF NOT EXISTS meta_app_secret TEXT;
