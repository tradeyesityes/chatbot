-- Add handover tracking to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS handover_status TEXT DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS handover_data JSONB DEFAULT '{}'::jsonb;

-- Ensure valid statuses
-- ALTER TABLE public.conversations ADD CONSTRAINT check_handover_status CHECK (handover_status IN ('idle', 'collecting_name', 'collecting_phone', 'collecting_email', 'completed'));
