import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TelegramUpdate {
    message?: {
        chat: { id: number };
        text?: string;
        from: { first_name?: string };
    };
}

const logDebug = async (step: string, message: string, details: Record<string, unknown> = {}) => {
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

serve(async (req: Request) => {
    try {
        const url = new URL(req.url)
        const tokenFromUrl = url.searchParams.get('token')

        if (!tokenFromUrl) return new Response('Missing token', { status: 400 })

        const body: TelegramUpdate = await req.json()
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

        const normalizeArabic = (t: string) => {
            if (!t) return '';
            return t
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/[\u064B-\u0652]/g, '')
                .trim();
        };

        const textNormalized = normalizeArabic(text.toLowerCase());
        const keywords = settings.handover_keywords || ['تواصل مع موظف', 'خدمة العملاء', 'talk to human', 'support', 'أريد التحدث مع موظف'];
        const baseKeywords: string[] = keywords.length > 0 ? keywords : ['موظف', 'مساعدة', 'تحدث مع', 'خدمة عملاء', 'تواصل', 'مشرف'];
        const normalizedKeywords = baseKeywords.map((k: string) => normalizeArabic(k.toLowerCase()));
        
        const isTrigger = normalizedKeywords.some((k: string) => textNormalized.includes(k));

        let status = conv?.handover_status || 'idle';
        let data = conv?.handover_data || {};

        await logDebug('HandoverCheck', `Input: ${text}, Status: ${status}, isTrigger: ${isTrigger}`, { chatId })

        let handoverResponse = null;

        if ((isTrigger || status !== 'idle') && status !== 'completed') {
            if (status === 'idle') {
                if (!settings.support_email) {
                    handoverResponse = "عذراً، يجب على صاحب المتجر إعداد (البريد الإلكتروني للدعم) في الإعدادات لتفعيل نظام التحدث مع الموظفين والتذاكر.";
                } else {
                    status = 'collecting_name';
                    handoverResponse = "نحن في خدمتك وتحويلك للموظف المختص. من فضلك زودنا باسمك الكريم للبدء.";
                }
            } else if (status === 'collecting_name') {
                data.name = text;
                status = 'collecting_phone';
                handoverResponse = `شكراً ${text}. من فضلك زودنا برقم جوالك لنتمكن من التواصل معك.`;
            } else if (status === 'collecting_phone') {
                data.phone = text;
                status = 'collecting_email';
                handoverResponse = "شكراً. من فضلك زودنا ببريدك الإلكتروني (اختياري، اكتب 'تخطي' للمتابعة).";
            } else if (status === 'collecting_email') {
                data.email = (textNormalized.includes('تخطي') || textNormalized.includes('skip')) ? 'N/A' : text;
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
                }).catch((e: Error) => console.error('Handover notification failed:', e.message));

                status = 'idle';
                data = {};
                handoverResponse = `تم إنشاء تذكرة برقم #${ticketId}. سيتواصل معك أحد موظفينا قريباً. شكراً لصبرك.`;
            }
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

        // --- Step 2: Semantic Search (RAG) Integration ---
        const apiKey = settings.openai_api_key || Deno.env.get('OPENAI_API_KEY')
        let context = ''

        if (apiKey) {
            try {
                await logDebug('RAGStart', 'Generating embedding for query', { query: text })
                // 1. Generate Embedding
                const embRes = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' })
                })
                
                if (!embRes.ok) throw new Error(`Embedding failed: ${embRes.statusText}`)
                const embData = await embRes.json()
                const embedding = embData.data[0].embedding

                // 2. Vector Search (Supabase RPC)
                await logDebug('VectorSearch', 'Matching segments in DB', { userId })
                const { data: segments, error: vError } = await supabase.rpc('match_file_segments', {
                    query_embedding: embedding,
                    match_threshold: 0.20,
                    match_count: 8,
                    p_user_id: userId
                })

                if (vError) throw vError

                if (segments && segments.length > 0) {
                    context = segments.map((s: any) => s.content).join('\n\n---\n\n')
                    await logDebug('RAGSuccess', `Found ${segments.length} relevant segments`)
                }
            } catch (err: any) {
                await logDebug('RAGError', 'Semantic search failed, falling back to full context', { error: err.message })
            }
        }

        // --- Step 3: AI Processing ---
        if (!context) {
            const { data: files } = await supabase.from('user_files').select('name, content').eq('user_id', userId)
            context = files?.map((f: { name: string, content: string }) => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''
        }

        // Truncate context if still too long for safety
        if (context.length > 30000) {
            context = context.substring(0, 30000) + '... [Context truncated]';
        }

        const botName = settings.tg_bot_name || 'مساعد ذكي'
        const systemPrompt = `أنت ${botName}، مساعد ذكي لخدمة العملاء على تيليقرام. أجب بناءً على المعلومات التالية فقط:

معلومات السياق:
${context}`

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
                await logDebug('AIStart', 'Using OpenAI', { model: 'gpt-4o-mini' })
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.openai_api_key}` },
                    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }] })
                })
                const result = await response.json()
                aiResponse = result.choices?.[0]?.message?.content || ''
            } else {
                await logDebug('AIError', 'No AI provider configured or keys missing', { 
                    hasOpenAI: !!settings.openai_api_key, 
                    hasGemini: !!settings.gemini_api_key,
                    useGemini: settings.use_gemini,
                    useOllama: settings.use_remote_ollama
                })
            }
        } catch (aiErr: unknown) {
            const message = aiErr instanceof Error ? aiErr.message : String(aiErr)
            await logDebug('AIError', 'AI fetch failed', { message })
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
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await logDebug('FatalError', 'Unhandled error', { message })
        return new Response(message, { status: 500 })
    }
})

