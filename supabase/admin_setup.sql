-- SQL Script to enable Admin Dashboard functionality
-- Run this in your Supabase SQL Editor

-- 1. Add columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;

-- 2. Update Comments
COMMENT ON COLUMN user_settings.is_admin IS 'Flag to identify system administrators';
COMMENT ON COLUMN user_settings.is_enabled IS 'Flag to enable or disable user access';

-- 3. Update RLS for user_settings
-- We need to allow admins to see and edit ALL settings
DROP POLICY IF EXISTS "Admins can do everything" ON user_settings;
CREATE POLICY "Admins can do everything" ON user_settings
    FOR ALL
    USING (
        (SELECT is_admin FROM user_settings WHERE user_id = auth.uid()) = true
    );

-- 4. Set the first user as admin (OPTIONAL - you should run this manually for your ID)
-- UPDATE user_settings SET is_admin = true WHERE user_id = 'your-user-id-here';
