-- Add WhatsApp Cloud API specific fields to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS wa_cloud_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wa_cloud_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS wa_cloud_access_token TEXT,
ADD COLUMN IF NOT EXISTS wa_cloud_verify_token TEXT;

-- Update types for realtime if needed
-- NOTIFY pgrst, 'reload schema';
