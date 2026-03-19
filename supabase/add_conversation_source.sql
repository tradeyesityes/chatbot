-- ============================================================
-- Migration: Add source column to conversations table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add source column to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'webchat' CHECK (source IN ('webchat', 'whatsapp', 'public'));

-- 2. Add phone_number column (for WhatsApp conversations - stores the remoteJid)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT NULL;

-- 3. Add visitor_id column (for public embed chat)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS visitor_id UUID REFERENCES public.chat_leads(id) ON DELETE SET NULL DEFAULT NULL;

-- 4. Add visitor_name column (for display in sidebar)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS visitor_name TEXT DEFAULT NULL;

-- 5. Add conversation_id FK to chat_messages (for webchat visitor messages)
-- (Already exists, but let's add visitor_id to chat_messages if missing)
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS visitor_id UUID REFERENCES public.chat_leads(id) ON DELETE SET NULL DEFAULT NULL;

-- 6. Add source to chat_messages as well
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'webchat' CHECK (source IN ('webchat', 'whatsapp', 'public'));

-- 7. Index for faster lookup by source
CREATE INDEX IF NOT EXISTS idx_conv_source ON public.conversations(source);
CREATE INDEX IF NOT EXISTS idx_conv_phone ON public.conversations(phone_number);

-- 8. Allow public embed to insert conversations (for visitor tracking)
-- We need a policy that allows inserting with owner_id context
-- The conversations table currently only allows authenticated users
-- For public chat, we'll use a service-key approach via the worker

-- Add unique constraint for WhatsApp phone conversations per user
-- (so we reuse the same conversation thread per contact)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_user_phone_unique 
ON public.conversations(user_id, phone_number) 
WHERE phone_number IS NOT NULL AND source = 'whatsapp';

COMMENT ON COLUMN public.conversations.source IS 'Source channel: webchat (main app), whatsapp (bot), public (embed widget)';
COMMENT ON COLUMN public.conversations.phone_number IS 'WhatsApp phone number / remoteJid for WhatsApp conversations';
COMMENT ON COLUMN public.conversations.visitor_id IS 'Reference to chat_leads for public embed conversations';
COMMENT ON COLUMN public.conversations.visitor_name IS 'Display name of the visitor (for public and whatsapp chats)';
