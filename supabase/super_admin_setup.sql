-- ==========================================
-- SUPER ADMIN SYSTEM FOR KB CHATBOT V2
-- ==========================================

-- 1. Add Columns to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

-- 2. Update Admin Check and Add Super Admin Check
CREATE OR REPLACE FUNCTION public.check_user_is_super_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_settings WHERE user_id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Redefine Admin View components
DROP VIEW IF EXISTS public.admin_user_view CASCADE;
CREATE OR REPLACE VIEW public.admin_user_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.last_sign_in_at,
    COALESCE(us.is_admin, false) as is_admin,
    COALESCE(us.is_super_admin, false) as is_super_admin,
    COALESCE(us.is_enabled, true) as is_enabled,
    COALESCE(us.is_frozen, false) as is_frozen,
    COALESCE(us.is_deleted, false) as is_deleted,
    u.created_at
FROM 
    auth.users u
LEFT JOIN 
    public.user_settings us ON u.id = us.user_id
WHERE 
    public.check_user_is_admin() OR public.check_user_is_super_admin();

GRANT SELECT ON public.admin_user_view TO authenticated;

-- 4. Update RLS Policies for Super Admin across core tables

-- user_settings
DROP POLICY IF EXISTS "Superadmins manage all settings" ON public.user_settings;
CREATE POLICY "Superadmins manage all settings" ON public.user_settings FOR ALL USING (public.check_user_is_super_admin());

-- user_files
DROP POLICY IF EXISTS "Superadmins manage all files" ON public.user_files;
CREATE POLICY "Superadmins manage all files" ON public.user_files FOR ALL USING (public.check_user_is_super_admin());

-- conversations
DROP POLICY IF EXISTS "Superadmins manage all conversations" ON public.conversations;
CREATE POLICY "Superadmins manage all conversations" ON public.conversations FOR ALL USING (public.check_user_is_super_admin());

-- chat_messages
DROP POLICY IF EXISTS "Superadmins manage all messages" ON public.chat_messages;
CREATE POLICY "Superadmins manage all messages" ON public.chat_messages FOR ALL USING (public.check_user_is_super_admin());
