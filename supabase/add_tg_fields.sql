-- Add Telegram specific fields to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS tg_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tg_token TEXT,
ADD COLUMN IF NOT EXISTS tg_bot_username TEXT;
