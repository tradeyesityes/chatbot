-- Add Twilio WhatsApp specific fields to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS wa_twilio_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wa_twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS wa_twilio_auth_token TEXT,
ADD COLUMN IF NOT EXISTS wa_twilio_phone_number TEXT;
