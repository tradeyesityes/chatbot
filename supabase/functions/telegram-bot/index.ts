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

        if (!tokenFromUrl) return new Response('Missing token', { status: 400 })

        const body = await req.json()
        await logDebug('WebhookReceived', 'Data from Telegram', { body })

        if (!body.message) return new Response('OK', { status: 200 })

        const chatId = body.message.chat.id
        const text = body.message.text
        const senderName = body.message.from.first_name || 'User'

        if (!text) return new Response('OK', { status: 200 })

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

        // --- Save Message & Create Conversation ---
        const telegramKey = `telegram_${chatId}`
        const { data: convId } = await supabase.rpc('get_or_create_whatsapp_conversation', {
            p_user_id: userId,
            p_phone: telegramKey,
            p_title: `Telegram: ${senderName}`,
            p_visitor_name: senderName
        })

        if (convId) {
             await supabase.rpc('save_whatsapp_message', {
                p_user_id: userId,
                p_conversation_id: convId,
                p_role: 'user',
                p_content: text
            });
        }

        // Handover Detection
        const handoverKeywords = settings.handover_keywords || ['تواصل مع موظف', 'خدمة العملاء', 'talk to human', 'support', 'أريد التحدث مع موظف'];
        const isHandoverRequested = handoverKeywords.some(k => text.toLowerCase().includes(k.toLowerCase()));

        if (isHandoverRequested && settings.support_email) {
            await logDebug('Handover', 'Handover requested via Telegram', { chatId, userId })
            // 1. Send handover email notification
            supabase.functions.invoke('send-handover-email', {
                body: {
                    userId: userId,
                    customerName: senderName,
                    customerEmail: null,
                    customerPhone: `TG_${chatId}`,
                    message: text,
                    channel: 'Telegram'
                }
            }).catch(e => console.error('Handover notification failed:', e.message));

            // 2. Respond to user
            const handoverMsg = 'تم إرسال طلبك للإدارة. سيتواصل معك أحد موظفينا قريباً. شكراً لصبرك.'
            await fetch(`https://api.telegram.org/bot${tokenFromUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: handoverMsg })
            })

            // Save assistant message to DB
            if (convId) {
                await supabase.rpc('save_whatsapp_message', {
                    p_user_id: userId,
                    p_conversation_id: convId,
                    p_role: 'assistant',
                    p_content: handoverMsg
                });
            }
            return new Response('OK', { status: 200 })
        }

        // --- AI Processing ---
        const { data: files } = await supabase.from('user_files').select('name, content').eq('user_id', userId)
        const context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء على تيليقرام. أجب بناءً على المعلومات التالية فقط:\n\n${context}`

        let aiResponse = ''

        try {
            // Check for Remote Ollama (selected in your UI)
            if (settings.use_remote_ollama && settings.ollama_api_key) {
                const baseUrl = settings.ollama_base_url || 'https://ollama.com'
                const modelName = settings.local_model_name || 'gemma2:9b'
                
                await logDebug('AIStart', 'Using Ollama Cloud Proxy', { model: modelName, baseUrl })
                
                const response = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${settings.ollama_api_key}` 
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: 'system', content: systemPrompt }, 
                            { role: 'user', content: text }
                        ],
                        stream: false
                    })
                })
                
                if (!response.ok) {
                    const errText = await response.text()
                    await logDebug('AIError', 'Ollama Proxy returned error', { status: response.status, error: errText })
                } else {
                    const result = await response.json()
                    aiResponse = result.message?.content || ''
                }
            } else if (settings.use_gemini && settings.gemini_api_key) {
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
        } catch (aiErr: any) {
            await logDebug('AIError', 'AI fetch failed', { message: aiErr.message })
        }

        if (aiResponse) {
             await fetch(`https://api.telegram.org/bot${tokenFromUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: aiResponse })
             })
             
             if (convId) {
                await supabase.rpc('save_whatsapp_message', {
                    p_user_id: userId,
                    p_conversation_id: convId,
                    p_role: 'assistant',
                    p_content: aiResponse
                });
             }
        } else {
            await logDebug('End', 'Processing finished but aiResponse empty')
        }

        return new Response('OK', { status: 200 })
    } catch (err: any) {
        await logDebug('FatalError', 'Unhandled error', { message: err.message })
        return new Response(err.message, { status: 500 })
    }
})
