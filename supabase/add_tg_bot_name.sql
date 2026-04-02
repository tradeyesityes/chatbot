-- Add tg_bot_name column to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS tg_bot_name TEXT;

-- Update the comment for clarity
COMMENT ON COLUMN user_settings.tg_bot_name IS 'The display name or username of the Telegram bot';
