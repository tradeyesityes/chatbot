-- ============================================================
-- MIGRATION: Add Telegram Source support
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Update CHECK constraints to allow 'telegram'
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_source_check;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_source_check 
CHECK (source IN ('webchat', 'whatsapp', 'public', 'telegram'));

ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_source_check;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_source_check 
CHECK (source IN ('webchat', 'whatsapp', 'public', 'telegram'));

-- 2. Update RPC: get_or_create_whatsapp_conversation to support p_source
-- We keep the original name for backward compatibility but add a parameter
CREATE OR REPLACE FUNCTION public.get_or_create_whatsapp_conversation(
    p_user_id    UUID,
    p_phone      TEXT,
    p_title      TEXT,
    p_visitor_name TEXT DEFAULT NULL,
    p_source     TEXT DEFAULT 'whatsapp'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_new_id      UUID;
BEGIN
    -- Try to find existing conversation for this phone and source
    SELECT id INTO v_existing_id
    FROM public.conversations
    WHERE user_id = p_user_id
      AND phone_number = p_phone
      AND source = p_source
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN v_existing_id;
    END IF;

    -- Create a new one
    INSERT INTO public.conversations (
        user_id, title, source, phone_number, visitor_name
    ) VALUES (
        p_user_id, p_title, p_source, p_phone, p_visitor_name
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_new_id;

    -- Handle race condition
    IF v_new_id IS NULL THEN
        SELECT id INTO v_new_id
        FROM public.conversations
        WHERE user_id = p_user_id
          AND phone_number = p_phone
          AND source = p_source
        LIMIT 1;
    END IF;

    RETURN v_new_id;
END;
$$;

-- 3. Update RPC: save_whatsapp_message to support p_source
CREATE OR REPLACE FUNCTION public.save_whatsapp_message(
    p_user_id        UUID,
    p_conversation_id UUID,
    p_role           TEXT,
    p_content        TEXT,
    p_source         TEXT DEFAULT 'whatsapp'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.chat_messages (
        user_id, conversation_id, role, content, source
    ) VALUES (
        p_user_id, p_conversation_id, p_role, p_content, p_source
    );
END;
$$;

-- Re-grant permissions specifying signatures to avoid ambiguity
GRANT EXECUTE ON FUNCTION public.get_or_create_whatsapp_conversation(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_whatsapp_message(UUID, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
