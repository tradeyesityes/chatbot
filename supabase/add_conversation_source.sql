-- ============================================================
-- MIGRATION: Conversation Source Tracking
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ---- STEP 1: Add columns to conversations ----
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'webchat'
CHECK (source IN ('webchat', 'whatsapp', 'public'));

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT NULL;

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS visitor_name TEXT DEFAULT NULL;

-- ---- STEP 2: Add source column to chat_messages ----
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'webchat'
CHECK (source IN ('webchat', 'whatsapp', 'public'));

-- ---- STEP 3: Indexes ----
CREATE INDEX IF NOT EXISTS idx_conv_source ON public.conversations(source);
CREATE INDEX IF NOT EXISTS idx_conv_phone ON public.conversations(phone_number);

-- Unique: one conversation thread per WhatsApp contact per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_user_phone_unique
ON public.conversations(user_id, phone_number)
WHERE phone_number IS NOT NULL AND source = 'whatsapp';

-- ---- STEP 4: RPC - Create Public (Widget) Conversation ----
-- Called by the public embed widget (anon user) to create a conversation
-- under the OWNER's account. Uses SECURITY DEFINER to bypass RLS.
CREATE OR REPLACE FUNCTION public.create_public_conversation(
    p_owner_id  UUID,
    p_title     TEXT,
    p_visitor_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.conversations (user_id, title, source, visitor_name)
    VALUES (p_owner_id, p_title, 'public', p_visitor_name)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- Grant execute to anon (public widget) and authenticated users
GRANT EXECUTE ON FUNCTION public.create_public_conversation TO anon, authenticated;

-- ---- STEP 5: RPC - Save Public Message ----
-- Called by the public embed widget to save individual messages
-- under the owner's account.
CREATE OR REPLACE FUNCTION public.save_public_message(
    p_owner_id       UUID,
    p_conversation_id UUID,
    p_role           TEXT,
    p_content        TEXT,
    p_visitor_name   TEXT DEFAULT NULL
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
        p_owner_id, p_conversation_id, p_role, p_content, 'public'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_public_message TO anon, authenticated;

-- ---- STEP 6: RPC - Get or Create WhatsApp Conversation ----
-- Called by the WhatsApp Worker (anon key) to create/reuse
-- a conversation per phone contact.
CREATE OR REPLACE FUNCTION public.get_or_create_whatsapp_conversation(
    p_user_id    UUID,
    p_phone      TEXT,
    p_title      TEXT,
    p_visitor_name TEXT DEFAULT NULL
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
    -- Try to find existing conversation for this phone
    SELECT id INTO v_existing_id
    FROM public.conversations
    WHERE user_id = p_user_id
      AND phone_number = p_phone
      AND source = 'whatsapp'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN v_existing_id;
    END IF;

    -- Create a new one
    INSERT INTO public.conversations (
        user_id, title, source, phone_number, visitor_name
    ) VALUES (
        p_user_id, p_title, 'whatsapp', p_phone, p_visitor_name
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_new_id;

    -- Handle race condition: if insert failed due to unique conflict
    IF v_new_id IS NULL THEN
        SELECT id INTO v_new_id
        FROM public.conversations
        WHERE user_id = p_user_id
          AND phone_number = p_phone
          AND source = 'whatsapp'
        LIMIT 1;
    END IF;

    RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_whatsapp_conversation TO anon, authenticated;

-- ---- STEP 7: RPC - Save WhatsApp Message ----
CREATE OR REPLACE FUNCTION public.save_whatsapp_message(
    p_user_id        UUID,
    p_conversation_id UUID,
    p_role           TEXT,
    p_content        TEXT
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
        p_user_id, p_conversation_id, p_role, p_content, 'whatsapp'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_whatsapp_message TO anon, authenticated;

-- ============================================================
-- Done! All 4 functions are created.
-- ============================================================
