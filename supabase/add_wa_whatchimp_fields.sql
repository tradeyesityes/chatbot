-- Add Whatchimp specific fields to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS wa_whatchimp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wa_whatchimp_api_key TEXT,
ADD COLUMN IF NOT EXISTS wa_whatchimp_phone_number TEXT;
