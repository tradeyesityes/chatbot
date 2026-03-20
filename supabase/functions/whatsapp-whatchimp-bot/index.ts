import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const logDebug = async (step: string, message: string, details: any = {}) => {
    console.log(`[${step}] ${message}`, details)
    try {
        await supabase.from('bot_debug_logs').insert({
            instance_name: details?.instanceName || 'whatchimp',
            step,
            message,
            details: details
        })
    } catch (e) {
        console.error('Failed to log to DB:', e)
    }
}

serve(async (req) => {
    try {
        const body = await req.json()
        
        // Whatchimp: { "message": "...", "subscriber_id": "9665...", "type": "text", "to_number": "9665..." }
        // Looking at common Whatchimp Webhooks: 
        // to_number is our number, subscriber_id is the user's number.
        const userPhone = body.subscriber_id;
        const ourPhone = body.to_number;
        const text = body.message;

        await logDebug('Start', 'Received Whatchimp Webhook', body)

        if (!text || !userPhone) return new Response('Ignored', { status: 200 })

        // Fetch User by our phone number (Channel ID)
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('wa_whatchimp_phone_number', ourPhone)
            .eq('wa_whatchimp_enabled', true)
            .maybeSingle()

        if (settingsError || !settings) {
            await logDebug('Error', 'Whatchimp Bot not found or disabled', { ourPhone })
            return new Response('Not configured', { status: 200 })
        }

        const userId = settings.user_id
        
        // --- Conversation Handling ---
        const senderPhone = userPhone.toString();
        const title = `WhatChimp: ${senderPhone}`;
        
        const { data: convId } = await supabase.rpc('get_or_create_whatsapp_conversation', {
            p_user_id: userId,
            p_phone: senderPhone,
            p_title: title,
            p_visitor_name: senderPhone
        });
        
        if (convId) {
            await supabase.rpc('save_whatsapp_message', {
                p_user_id: userId,
                p_conversation_id: convId,
                p_role: 'user',
                p_content: text
            });
        }

        // --- Fetch Context & AI ---
        const { data: files } = await supabase
            .from('user_files')
            .select('name, content')
            .eq('user_id', userId)
        const context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''

        let aiResponse = ''
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء. أجب بناءً على المعلومات التالية فقط:\n\n${context}`
        
        if (settings.use_gemini && settings.gemini_api_key) {
             const model = settings.gemini_model_name || 'gemini-1.5-flash-latest'
             const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.gemini_api_key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\nالسؤال: ${text}` }] }] })
             })
             const result = await response.json()
             aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        } else if (settings.openai_api_key) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.openai_api_key}` },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }] })
            })
            const result = await response.json()
            aiResponse = result.choices?.[0]?.message?.content || ''
        }

        if (aiResponse) {
             // Send via WhatChimp API
             // Enpoint: POST https://whatchimp.com/api/v1/whatsapp/send
             const apiKey = settings.wa_whatchimp_api_key
             
             await fetch('https://whatchimp.com/api/v1/whatsapp/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    receiver: senderPhone,
                    message: aiResponse,
                    type: 'text'
                })
             })

             // Save Assistant Msg
             if (convId) {
                await supabase.rpc('save_whatsapp_message', {
                    p_user_id: userId,
                    p_conversation_id: convId,
                    p_role: 'assistant',
                    p_content: aiResponse
                });
             }
        }

        return new Response('OK', { status: 200 })

    } catch (err: any) {
        await logDebug('FatalError', 'Whatchimp Bot Error', { message: err.message })
        return new Response(err.message, { status: 500 })
    }
})
