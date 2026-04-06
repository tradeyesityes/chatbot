-- ============================================================
-- UNIFIED HUMAN HANDOVER SYSTEM (v2.0)
-- Consolidates state logic into a single database RPC.
-- ============================================================

-- ---- STEP 1: Arabic Normalization Function ----
CREATE OR REPLACE FUNCTION public.normalize_arabic(text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF text IS NULL THEN RETURN ''; END IF;
    RETURN TRIM(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        LOWER(text),
                        '[أإآ]', 'ا', 'g'
                    ),
                    'ة', 'ه', 'g'
                ),
                'ى', 'ي', 'g'
            ),
            '[\u064B-\u0652]', '', 'g'
        )
    );
END;
$$;

-- ---- STEP 2: Unified Handover RPC ----
CREATE OR REPLACE FUNCTION public.process_handover_message(
    p_conversation_id UUID,
    p_message_text    TEXT,
    p_keywords        TEXT[],
    p_channel         TEXT DEFAULT 'Web'
)
RETURNS TABLE (
    response_text       TEXT,
    should_send_email   BOOLEAN,
    customer_name       TEXT,
    customer_email      TEXT,
    customer_phone      TEXT,
    ticket_id           TEXT,
    user_id             UUID
)
LANGUAGE plpgsql
SECURITY DEFINER -- Essential to bypass RLS for public/anon users
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_status            TEXT;
    v_data              JSONB;
    v_user_id           UUID;
    v_normalized_input  TEXT;
    v_is_trigger        BOOLEAN := FALSE;
    v_manual_keywords   TEXT[] := ARRAY['موظف', 'مساعده', 'تواصل', 'تحدث', 'خدمه عملاء', 'تذكره', 'مشرف', 'human', 'support', 'agent'];
    v_all_keywords      TEXT[];
    v_keyword           TEXT;
    v_support_email     TEXT;
BEGIN
    -- 1. Fetch current conversation state
    SELECT 
        c.user_id, 
        COALESCE(c.handover_status, 'idle'), 
        COALESCE(c.handover_data, '{}'::jsonb)
    INTO v_user_id, v_status, v_data
    FROM public.conversations c
    WHERE c.id = p_conversation_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Check if support email is configured
    SELECT support_email INTO v_support_email
    FROM public.user_settings
    WHERE user_id = v_user_id;

    -- 3. Trigger Detection
    v_normalized_input := public.normalize_arabic(p_message_text);
    
    -- Combine user keywords with manual ones
    v_all_keywords := v_manual_keywords;
    IF p_keywords IS NOT NULL AND array_length(p_keywords, 1) > 0 THEN
        FOREACH v_keyword IN ARRAY p_keywords LOOP
            v_all_keywords := array_append(v_all_keywords, public.normalize_arabic(v_keyword));
        END LOOP;
    END IF;

    -- Check if input contains any keyword
    FOREACH v_keyword IN ARRAY v_all_keywords LOOP
        IF v_normalized_input LIKE '%' || v_keyword || '%' THEN
            v_is_trigger := TRUE;
            EXIT;
        END IF;
    END LOOP;

    -- 4. State Machine Logic (Simple transitions)
    response_text := NULL;
    should_send_email := FALSE;
    customer_name := (v_data->>'name')::TEXT;
    customer_email := (v_data->>'email')::TEXT;
    customer_phone := (v_data->>'phone')::TEXT;
    ticket_id := (v_data->>'ticket_id')::TEXT;
    user_id := v_user_id;

    -- Check if it's already in progress or triggered
    IF v_is_trigger OR v_status != 'idle' THEN
        
        IF v_status = 'idle' THEN
            IF v_support_email IS NULL OR v_support_email = '' THEN
                response_text := 'نظام تواصل الموظفين غير مفعّل حالياً (الإيميل غير متاح).';
            ELSE
                v_status := 'collecting_name';
                response_text := 'أهلاً بك! سيتم تحويلك للموظف المختص. ما هو اسمك الكريم؟';
            END IF;

        ELSIF v_status = 'collecting_name' THEN
            customer_name := p_message_text;
            v_status := 'collecting_phone';
            response_text := 'شكراً ' || customer_name || '. يرجى تزويدنا برقم جوالك لنتمكن من التواصل معك.';

        ELSIF v_status = 'collecting_phone' THEN
            customer_phone := p_message_text;
            v_status := 'collecting_email';
            response_text := 'تسلم. من فضلك زودنا ببريدك الإلكتروني (او اكتب "تخطي").';

        ELSIF v_status = 'collecting_email' THEN
            customer_email := CASE 
                WHEN v_normalized_input LIKE '%تخطي%' OR v_normalized_input LIKE '%skip%' THEN 'N/A'
                ELSE p_message_text 
            END;
            ticket_id := 'T-' || floor(random()*90000 + 10000)::TEXT;
            should_send_email := TRUE;
            v_status := 'idle'; -- Reset for next time
            
            -- Prepare the final response text
            response_text := 'تم ربط طلبك برقم تذكرة #' || ticket_id || '. سيتواصل معك أحد المختصين قريباً. شكراً لك.';
        END IF;

        -- We only update if we have a state change or content update
        IF v_status = 'idle' AND should_send_email = TRUE THEN
             -- Save ticket stats before clearing v_data
             v_data := jsonb_build_object(
                 'name', customer_name,
                 'phone', customer_phone,
                 'email', customer_email,
                 'ticket_id', ticket_id,
                 'completed_at', NOW()
             );
             
             UPDATE public.conversations
             SET 
                 handover_status = 'idle',
                 handover_data = '{}'::jsonb, -- Reset for next session 
                 updated_at = NOW()
             WHERE id = p_conversation_id;
        ELSE
             -- Partial update
             v_data := jsonb_build_object(
                 'name', customer_name,
                 'phone', customer_phone,
                 'email', customer_email,
                 'ticket_id', ticket_id
             );
             UPDATE public.conversations
             SET 
                 handover_status = v_status,
                 handover_data = v_data,
                 updated_at = NOW()
             WHERE id = p_conversation_id;
        END IF;

        -- Return the final data
        RETURN NEXT;
    END IF;

END;
$$;

-- Grant access to BOTH authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.process_handover_message TO anon, authenticated;
