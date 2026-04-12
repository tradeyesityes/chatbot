-- ============================================================
-- SUPER ADMIN SELF-MANAGEMENT HARDENING
-- ============================================================

-- This function prevents Super Admins from:
-- 1. Deleting their own record.
-- 2. Disabling their own account.
-- 3. Downgrading their own status (removing is_super_admin).
-- 4. Deleting the absolute last Super Admin in the system.

CREATE OR REPLACE FUNCTION public.prevent_super_admin_self_action()
RETURNS TRIGGER AS $$
DECLARE
    v_super_admin_count INTEGER;
BEGIN
    -- 1. Total Super Admin Count Check (Pre-emptive)
    SELECT count(*) INTO v_super_admin_count 
    FROM public.user_settings 
    WHERE is_super_admin = true AND is_deleted = false AND is_enabled = true;

    -- 2. Logic for DELETE operations
    IF (TG_OP = 'DELETE') THEN
        -- Prevent deleting self
        IF OLD.user_id = auth.uid() THEN
            RAISE EXCEPTION 'لا يمكنك حذف حسابك المشرف بنفسك. يرجى الطلب من مشرف آخر القيام بذلك.';
        END IF;

        -- Prevent deleting the last super admin
        IF OLD.is_super_admin = true AND v_super_admin_count <= 1 THEN
            RAISE EXCEPTION 'لا يمكن حذف آخر مشرف (Super Admin) في النظام.';
        END IF;
        
        RETURN OLD;
    END IF;

    -- 3. Logic for UPDATE operations
    IF (TG_OP = 'UPDATE') THEN
        -- Only enforce if the current operator is the user being modified
        IF OLD.user_id = auth.uid() THEN
            
            -- Prevent self-downgrade from Super Admin
            IF OLD.is_super_admin = true AND NEW.is_super_admin = false THEN
                RAISE EXCEPTION 'لا يمكنك إلغاء صلاحيات المشرف الخاص بك بنفسك.';
            END IF;

            -- Prevent self-disable
            IF OLD.is_enabled = true AND NEW.is_enabled = false THEN
                RAISE EXCEPTION 'لا يمكنك تعطيل حسابك الخاص. يرجى الطلب من مشرف آخر القيام بذلك.';
            END IF;

            -- Prevent self-mark as deleted
            IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
                RAISE EXCEPTION 'لا يمكنك حذف حسابك الخاص. يرجى الطلب من مشرف آخر القيام بذلك.';
            END IF;

            -- Prevent self-freeze (if applicable)
            IF OLD.is_frozen = false AND NEW.is_frozen = true THEN
                 RAISE EXCEPTION 'لا يمكنك تجميد حسابك الخاص.';
            END IF;
        END IF;

        -- Global check: If someone is trying to remove the last super admin status
        IF OLD.is_super_admin = true AND NEW.is_super_admin = false AND v_super_admin_count <= 1 THEN
            RAISE EXCEPTION 'لا يمكن سلب صلاحيات آخر مشرف (Super Admin) في النظام.';
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger
DROP TRIGGER IF EXISTS tr_super_admin_safety ON public.user_settings;
CREATE TRIGGER tr_super_admin_safety
BEFORE UPDATE OR DELETE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_self_action();

-- Update Comments
COMMENT ON FUNCTION public.prevent_super_admin_self_action IS 'Protects Super Admins from self-deletion, self-disabling, and ensures at least one Super Admin exists.';
