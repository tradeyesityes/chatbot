import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const logDebug = async (step: string, message: string, details: any = {}) => {
    console.log(`[${step}] ${message}`, details)
    try {
        await supabase.from('bot_debug_logs').insert({
            instance_name: 'telegram',
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
        const url = new URL(req.url)
        const tokenFromUrl = url.searchParams.get('token')

        if (!tokenFromUrl) {
            return new Response('Missing token', { status: 400 })
        }

        const body = await req.json()
        await logDebug('WebhookReceived', 'Data from Telegram', { body })

        if (!body.message) return new Response('OK', { status: 200 })

        const chatId = body.message.chat.id
        const text = body.message.text
        const senderName = body.message.from.first_name || 'User'

        if (!text) return new Response('OK', { status: 200 })

        // Find user by Telegram Token
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('tg_token', tokenFromUrl)
            .eq('tg_enabled', true)
            .maybeSingle()

        if (settingsError || !settings) {
            await logDebug('Error', 'User settings not found', { token: tokenFromUrl, error: settingsError })
            return new Response('Not configured', { status: 200 })
        }

        const userId = settings.user_id
        await logDebug('UserFound', `Processing for user: ${userId}`, { userId })

        // --- Save Message & Create Conversation ---
        const telegramKey = `telegram_${chatId}`
        const { data: convId, error: rpcErr } = await supabase.rpc('get_or_create_whatsapp_conversation', {
            p_user_id: userId,
            p_phone: telegramKey,
            p_title: `Telegram: ${senderName}`,
            p_visitor_name: senderName
        })

        if (rpcErr) {
            await logDebug('RPCError', 'Failed to get/create conversation', rpcErr)
        }

        if (convId) {
             await supabase.rpc('save_whatsapp_message', {
                p_user_id: userId,
                p_conversation_id: convId,
                p_role: 'user',
                p_content: text
            });
        }

        await logDebug('AIStart', 'Starting AI generation', { useGemini: settings.use_gemini })

        // --- AI Processing ---
        const { data: files } = await supabase
            .from('user_files')
            .select('name, content')
            .eq('user_id', userId)
        const context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''

        let aiResponse = ''
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء على تيليقرام. أجب بناءً على المعلومات التالية فقط:\n\n${context}`

        try {
            if (settings.use_gemini && settings.gemini_api_key) {
                const model = settings.gemini_model_name || 'gemini-1.5-flash-latest'
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.gemini_api_key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\nالسؤال: ${text}` }] }] })
                })
                const result = await response.json()
                aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
                if (!aiResponse) await logDebug('AILog', 'Gemini returned empty response', { result })
            } else if (settings.openai_api_key) {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.openai_api_key}` },
                    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }] })
                })
                const result = await response.json()
                aiResponse = result.choices?.[0]?.message?.content || ''
                if (!aiResponse) await logDebug('AILog', 'OpenAI returned empty response', { result })
            } else {
                await logDebug('AIWarning', 'No AI provider configured (No Gemini or OpenAI key)')
            }
        } catch (aiErr: any) {
            await logDebug('AIError', 'AI fetch failed', { message: aiErr.message })
        }

        if (aiResponse) {
             await logDebug('SendingReply', 'Sending message back to Telegram', { chatId })
             
             // Send reply to Telegram
             const tgResponse = await fetch(`https://api.telegram.org/bot${tokenFromUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: aiResponse
                })
             })
             
             const tgResult = await tgResponse.json()
             if (!tgResult.ok) {
                 await logDebug('ReplyError', 'Failed to send TG message', tgResult)
             } else {
                 await logDebug('Success', 'Response sent successfully')
             }

             // Save Assistant Msg
             if (convId) {
                await supabase.rpc('save_whatsapp_message', {
                    p_user_id: userId,
                    p_conversation_id: convId,
                    p_role: 'assistant',
                    p_content: aiResponse
                });
             }
        } else {
            await logDebug('End', 'Processing finished but aiResponse was empty')
        }

        return new Response('OK', { status: 200 })

    } catch (err: any) {
        await logDebug('FatalError', 'Unhandled function error', { message: err.message, stack: err.stack })
        return new Response(err.message, { status: 500 })
    }
})
