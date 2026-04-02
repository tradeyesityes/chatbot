-- Add onboarding completion flag to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;
