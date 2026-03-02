-- ==========================================
-- FULL DATABASE SETUP FOR KB CHATBOT V2
-- ==========================================
-- This script sets up all necessary tables and RLS policies.
-- Run this in your Supabase SQL Editor.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. USER SETTINGS TABLE (If not already created)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    use_openai BOOLEAN DEFAULT FALSE,
    openai_api_key TEXT DEFAULT NULL,
    use_gemini BOOLEAN DEFAULT FALSE,
    gemini_api_key TEXT DEFAULT NULL,
    gemini_model_name TEXT DEFAULT 'gemini-1.5-flash-latest',
    use_local_model BOOLEAN DEFAULT FALSE,
    local_model_name TEXT DEFAULT 'gemma3:4b',
    use_remote_ollama BOOLEAN DEFAULT FALSE,
    ollama_api_key TEXT DEFAULT NULL,
    ollama_base_url TEXT DEFAULT 'http://localhost:11434',
    use_qdrant BOOLEAN DEFAULT FALSE,
    qdrant_url TEXT DEFAULT NULL,
    qdrant_api_key TEXT DEFAULT NULL,
    qdrant_collection TEXT DEFAULT 'segments',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER FILES TABLE (For persistence)
CREATE TABLE IF NOT EXISTS public.user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT,
    size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 4. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'model')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FILE SEGMENTS (For Internal Vector Search)
CREATE TABLE IF NOT EXISTS public.file_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id TEXT, 
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_segments ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- User Settings
DROP POLICY IF EXISTS "Users manage own" ON user_settings;
CREATE POLICY "Users manage own" ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User Files
DROP POLICY IF EXISTS "Users manage own files" ON user_files;
CREATE POLICY "Users manage own files" ON user_files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Conversations
DROP POLICY IF EXISTS "Users manage own conversations" ON conversations;
CREATE POLICY "Users manage own conversations" ON conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat Messages
DROP POLICY IF EXISTS "Users manage own messages" ON chat_messages;
CREATE POLICY "Users manage own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- File Segments
DROP POLICY IF EXISTS "Users manage own segments" ON file_segments;
CREATE POLICY "Users manage own segments" ON file_segments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. ADMIN SECURITY DEFINER FUNCTION
CREATE OR REPLACE FUNCTION public.check_user_is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_settings WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. ADMIN OVERRIDE POLICIES
DROP POLICY IF EXISTS "Admins manage all settings" ON user_settings;
CREATE POLICY "Admins manage all settings" ON user_settings FOR ALL USING (public.check_user_is_admin());

-- 11. INDEXES
CREATE INDEX IF NOT EXISTS idx_files_user ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_msgs_conv ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_segments_embedding ON file_segments USING hnsw (embedding vector_cosine_ops);
