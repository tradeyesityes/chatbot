-- Add human handover settings to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS handover_keywords TEXT[] DEFAULT '{"تواصل مع موظف", "خدمة العملاء", "talk to human", "support", "أريد التحدث مع موظف"}';

-- Add a comment for documentation
COMMENT ON COLUMN public.user_settings.support_email IS 'Email address to receive human handover notifications';
COMMENT ON COLUMN public.user_settings.handover_keywords IS 'Keywords that trigger a human handover notification';
