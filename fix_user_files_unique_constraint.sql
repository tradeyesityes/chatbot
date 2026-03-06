-- Run this in your Supabase SQL Editor to fix the file upload error
-- This adds the missing unique constraint required for the "upsert" operation

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'user_files_user_id_name_key'
    ) THEN
        ALTER TABLE public.user_files 
        ADD CONSTRAINT user_files_user_id_name_key UNIQUE (user_id, name);
    END IF;
END $$;

-- Also ensure RLS is enabled and correct (safety check)
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own files" ON user_files;
CREATE POLICY "Users manage own files" ON user_files 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
