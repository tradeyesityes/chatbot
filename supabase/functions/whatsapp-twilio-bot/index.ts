import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const logDebug = async (step: string, message: string, details: any = {}) => {
    console.log(`[${step}] ${message}`, details)
    try {
        await supabase.from('bot_debug_logs').insert({
            instance_name: details?.instanceName || 'twilio',
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
        // Twilio sends data as form-urlencoded
        const bodyText = await req.text()
        const params = new URLSearchParams(bodyText)
        
        const from = params.get('From') // e.g. whatsapp:+12345678
        const to = params.get('To')     // Our Twilio WhatsApp number
        const text = params.get('Body') || ''
        const messageSid = params.get('MessageSid')

        await logDebug('Start', 'Received Twilio Webhook', { from, to, text, messageSid })

        if (!text) return new Response('No text', { status: 200 })

        // Fetch User Settings by Twilio Phone Number
        // Twilio 'To' is our WhatsApp number
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('wa_twilio_phone_number', to)
            .eq('wa_twilio_enabled', true)
            .maybeSingle()

        if (settingsError || !settings) {
            await logDebug('Error', 'Twilio Bot not found or disabled', { to })
            return new Response('Not configured', { status: 200 })
        }

        const userId = settings.user_id
        
        // --- Save & Process AI (Same as before) ---
        let conversationId = null;
        const senderPhone = from.replace('whatsapp:', '');
        const title = `Twilio WA: ${senderPhone}`;
        
        const { data: convId } = await supabase.rpc('get_or_create_whatsapp_conversation', {
            p_user_id: userId,
            p_phone: from,
            p_title: title,
            p_visitor_name: senderPhone
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

        // --- Fetch Context & AI ---
        let context = ''
        const { data: files } = await supabase
            .from('user_files')
            .select('name, content')
            .eq('user_id', userId)
        context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''

        let aiResponse = ''
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء. أجب بناءً على المعلومات التالية فقط:\n\n${context}`
        
        // Logic for AI providers (Simplified duplication for now)
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
             // Send via Twilio API
             const accountSid = settings.wa_twilio_account_sid
             const authToken = settings.wa_twilio_auth_token
             const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
             
             const auth = btoa(`${accountSid}:${authToken}`)
             const replyBody = new URLSearchParams()
             replyBody.set('To', from)
             replyBody.set('From', to)
             replyBody.set('Body', aiResponse)

             await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: replyBody.toString()
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

        return new Response('OK', { status: 200 })

    } catch (err: any) {
        await logDebug('FatalError', 'Twilio Bot Error', { message: err.message })
        return new Response(err.message, { status: 500 })
    }
})
