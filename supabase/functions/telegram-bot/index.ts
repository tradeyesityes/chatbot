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

        // 1. Fetch current handover state
        const { data: conv } = await supabase
            .from('conversations')
            .select('handover_status, handover_data')
            .eq('id', convId)
            .single();

        let status = conv?.handover_status || 'idle';
        let data = conv?.handover_data || {};

        const keywords = settings.handover_keywords || ['تواصل مع موظف', 'خدمة العملاء', 'talk to human', 'support', 'أريد التحدث مع موظف'];
        const isTrigger = keywords.some(k => text.toLowerCase().includes(k.toLowerCase()));

        let handoverResponse = null;

        if (isTrigger && status === 'idle') {
            status = 'collecting_name';
            handoverResponse = "يسعدنا خدمتك وتحويلك للموظف المختص. من فضلك زودنا باسمك الكريم للبدء.";
        } else if (status === 'collecting_name') {
            data.name = text;
            status = 'collecting_phone';
            handoverResponse = `شكراً ${text}. من فضلك زودنا برقم جوالك لنتمكن من التواصل معك.`;
        } else if (status === 'collecting_phone') {
            data.phone = text;
            status = 'collecting_email';
            handoverResponse = "شكراً. من فضلك زودنا ببريدك الإلكتروني (اختياري، اكتب 'تخطي' للمتابعة).";
        } else if (status === 'collecting_email') {
            data.email = (text.toLowerCase().includes('تخطي') || text.toLowerCase().includes('skip')) ? 'N/A' : text;
            const ticketId = `T-${Math.floor(10000 + Math.random() * 90000)}`;
            data.ticket_id = ticketId;

            // Trigger Email Notification
            supabase.functions.invoke('send-handover-email', {
                body: {
                    userId: userId,
                    customerName: data.name,
                    customerEmail: data.email,
                    customerPhone: data.phone,
                    ticketId: data.ticket_id,
                    message: text,
                    channel: 'Telegram'
                }
            }).catch(e => console.error('Handover notification failed:', e.message));

            status = 'idle';
            data = {};
            handoverResponse = `تم إنشاء تذكرة برقم #${ticketId}. سيتواصل معك أحد موظفينا قريباً. شكراً لصبرك.`;
        }

        if (handoverResponse) {
            // Update state in DB
            if (convId) {
                await supabase.from('conversations').update({ 
                    handover_status: status, 
                    handover_data: data,
                    updated_at: new Date().toISOString()
                }).eq('id', convId);
            }

            // Send message via Telegram API
            await fetch(`https://api.telegram.org/bot${tokenFromUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: handoverResponse })
            })

            // Save response to DB
            if (convId) {
                await supabase.rpc('save_whatsapp_message', {
                    p_user_id: userId,
                    p_conversation_id: convId,
                    p_role: 'assistant',
                    p_content: handoverResponse
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
