import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const logDebug = async (step: string, message: string, details: any = {}) => {
    console.log(`[${step}] ${message}`, details)
    try {
        await supabase.from('bot_debug_logs').insert({
            instance_name: details?.instanceName || 'wa_cloud',
            step,
            message,
            details: details
        })
    } catch (e) {
        console.error('Failed to log to DB:', e)
    }
}

serve(async (req) => {
    const url = new URL(req.url)

    // 1. Webhook Verification (GET)
    if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        if (mode && token) {
            // Check if the verify token matches any enabled cloud bot
            const { data: settings } = await supabase
                .from('user_settings')
                .select('wa_cloud_verify_token')
                .eq('wa_cloud_verify_token', token)
                .eq('wa_cloud_enabled', true)
                .maybeSingle()

            if (settings || token === 'meow') { // Fallback for initial setup
                await logDebug('Verify', 'Webhook verified successfully', { token })
                return new Response(challenge, { status: 200 })
            }
        }
        return new Response('Verification failed', { status: 403 })
    }

    // 2. Message Handling (POST)
    try {
        const payload = await req.json()
        await logDebug('Start', 'Received Cloud Webhook', { payload })

        const entry = payload.entry?.[0]
        const changes = entry?.changes?.[0]
        const value = changes?.value
        const message = value?.messages?.[0]

        if (!message) {
            return new Response(JSON.stringify({ status: 'no_message' }), { status: 200 })
        }

        const phoneNumberId = value.metadata?.phone_number_id
        const from = message.from // User's phone number
        const text = message.text?.body || ''

        if (!text) {
             return new Response(JSON.stringify({ status: 'not_text' }), { status: 200 })
        }

        // Fetch Settings
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('wa_cloud_phone_number_id', phoneNumberId)
            .eq('wa_cloud_enabled', true)
            .maybeSingle()

        if (settingsError || !settings) {
            await logDebug('Error', 'Bot not found or disabled', { phoneNumberId })
            return new Response(JSON.stringify({ status: 'not_configured' }), { status: 200 })
        }

        const userId = settings.user_id
        const instanceName = `cloud_${phoneNumberId.substring(0, 6)}`

        // Save and Process AI (same logic as Evolution Bot)
        // [Logic continues similar to whatsapp-bot/index.ts but adapted for Cloud API]
        
        // --- Borrowing Logic ---
        let conversationId = null;
        const senderName = value?.contacts?.[0]?.profile?.name || from;
        const title = `Cloud WA: ${from}`;
        
        const { data: convId } = await supabase.rpc('get_or_create_whatsapp_conversation', {
            p_user_id: userId,
            p_phone: from,
            p_title: title,
            p_visitor_name: senderName
        });
        
        conversationId = convId;
        if (conversationId) {
            await supabase.rpc('save_whatsapp_message', {
                p_user_id: userId,
                p_conversation_id: conversationId,
                p_role: 'user',
                p_content: text
            });
        }

        // Fetch Context & AI
        // (Simplified for this first output to ensure it works, then we can expand)
        
        // --- Fetch Knowledge Base ---
        let context = ''
        const { data: files } = await supabase
            .from('user_files')
            .select('name, content')
            .eq('user_id', userId)
        context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''

        // --- Generate AI ---
        let aiResponse = ''
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء. أجب باختصار بناءً على المعلومات التالية فقط:\n\n${context}`
        
        if (settings.use_gemini && settings.gemini_api_key) {
             const model = settings.gemini_model_name || 'gemini-1.5-flash-latest'
             const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.gemini_api_key}`
             const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\nالسؤال: ${text}` }] }]
                })
             })
             const result = await response.json()
             aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        } else if (settings.openai_api_key) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.openai_api_key}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }]
                })
            })
            const result = await response.json()
            aiResponse = result.choices?.[0]?.message?.content || ''
        }

        if (aiResponse) {
             // Send via Meta API
             const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`
             await fetch(metaUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.wa_cloud_access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: from,
                    type: 'text',
                    text: { body: aiResponse }
                })
             })

             // Save Assistant Msg
             if (conversationId) {
                await supabase.rpc('save_whatsapp_message', {
                    p_user_id: userId,
                    p_conversation_id: conversationId,
                    p_role: 'assistant',
                    p_content: aiResponse
                });
             }
        }

        return new Response(JSON.stringify({ status: 'success' }), { status: 200 })

    } catch (err: any) {
        await logDebug('FatalError', 'Cloud Bot Error', { message: err.message })
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
