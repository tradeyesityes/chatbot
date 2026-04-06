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

const buildKeywordContext = (allContent: string, query: string, maxChars: number = 40000): string => {
    if (!allContent || allContent.length <= maxChars) return allContent;
    
    const paragraphs = allContent.split(/\n\s*\n/);
    const queryKeywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scoredParagraphs = paragraphs.map(p => {
        let score = 0;
        const lowerP = p.toLowerCase();
        queryKeywords.forEach(kw => {
            if (lowerP.includes(kw)) score += 1;
        });
        return { text: p, score };
    });

    scoredParagraphs.sort((a, b) => b.score - a.score);
    
    let result = "";
    for (const p of scoredParagraphs) {
        if ((result.length + p.text.length) > maxChars) break;
        result += (result ? "\n\n---\n\n" : "") + p.text;
    }
    return result || allContent.substring(0, maxChars);
}

serve(async (req: Request) => {
    // Health check
    if (req.method === 'GET') {
        return new Response('OK', { status: 200 });
    }

    try {
        const url = new URL(req.url)
        const tokenFromUrl = url.searchParams.get('token')?.trim()

        if (!tokenFromUrl) return new Response('Missing token', { status: 400 });

        const body: TelegramUpdate = await req.json()

        // --- Silent return for non-messages ---
        if (!body.message || !body.message.text) return new Response('OK', { status: 200 })

        const chatId = body.message.chat.id
        const text = body.message.text
        const senderName = body.message.from?.first_name || 'User'

        // 1. Fetch User Settings
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('tg_token', tokenFromUrl)
            .maybeSingle()

        // If not found or disabled, returned 200 OK to stop Telegram retries
        if (settingsError || !settings || !settings.tg_enabled) {
            console.log('[Info] Bot disabled or settings missing');
            return new Response('OK', { status: 200 })
        }

        const userId = settings.user_id

        // 2. Manage Conversation
        let convId = null;
        try {
            const telegramKey = `telegram_${chatId}`
            const { data: rpcConvId } = await supabase.rpc('get_or_create_whatsapp_conversation', {
                p_user_id: userId,
                p_phone: telegramKey,
                p_title: `Telegram: ${senderName}`,
                p_visitor_name: senderName,
                p_source: 'telegram'
            })
            convId = rpcConvId;
        } catch (e) {
            console.error('Conv Error:', e);
        }

        // 3. Handover Logic
        if (convId) {
            // Save user message asynchronously
            supabase.rpc('save_whatsapp_message', {
                p_user_id: userId,
                p_conversation_id: convId,
                p_role: 'user',
                p_content: text,
                p_source: 'telegram'
            }).catch(() => {});

            const { data: handoverData } = await supabase.rpc('process_handover_message', {
                p_conversation_id: convId,
                p_message_text: text,
                p_keywords: settings.handover_keywords || [],
                p_channel: 'Telegram'
            });

            if (handoverData?.[0]?.response_text) {
                const handoverResponse = handoverData[0].response_text;
                await fetch(`https://api.telegram.org/bot${tokenFromUrl}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: handoverResponse })
                });

                return new Response('OK', { status: 200 });
            }
        }

        // 4. RAG & AI Processing
        let context = '';
        const apiKey = settings.openai_api_key || Deno.env.get('OPENAI_API_KEY');
        
        if (apiKey) {
            try {
                const embRes = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' })
                });
                
                if (embRes.ok) {
                    const embData = await embRes.json();
                    const { data: segments } = await supabase.rpc('match_file_segments', {
                        query_embedding: embData.data[0].embedding,
                        match_threshold: 0.20,
                        match_count: 5,
                        p_user_id: userId
                    });

                    if (segments?.length > 0) {
                        context = segments.map((s: any) => s.content).join('\n\n---\n\n');
                    }
                }
            } catch (e) {
                console.error('[RAG Error]', e);
            }
        }

        if (!context) {
            const { data: files } = await supabase.from('user_files').select('name, content').eq('user_id', userId);
            const allContent = files?.map((f: any) => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || '';
            context = buildKeywordContext(allContent, text, 30000);
        }

        let aiResponse = '';
        const botName = settings.tg_bot_name || 'مساعد ذكي';
        const systemPrompt = `أنت ${botName}، مساعد ذكي لخدمة العملاء على تيليقرام. أجب بناءً على المعلومات التالية فقط:\n\n${context}`;

        if (settings.use_remote_ollama && settings.ollama_api_key) {
            const response = await fetch(`${settings.ollama_base_url || 'https://ollama.com'}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.ollama_api_key}` },
                body: JSON.stringify({
                    model: settings.local_model_name || 'gemma2:9b',
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
                    stream: false
                })
            });
            const res = await response.json();
            aiResponse = res.message?.content || '';
        } else if (settings.use_gemini && settings.gemini_api_key) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${settings.gemini_model_name || 'gemini-1.5-flash-latest'}:generateContent?key=${settings.gemini_api_key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\nالسؤال: ${text}` }] }] })
            });
            const res = await response.json();
            aiResponse = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (apiKey) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }] })
            });
            const res = await response.json();
            aiResponse = res.choices?.[0]?.message?.content || '';
        }

        if (aiResponse) {
            await fetch(`https://api.telegram.org/bot${tokenFromUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: aiResponse })
            });

                supabase.rpc('save_whatsapp_message', {
                    p_user_id: userId,
                    p_conversation_id: convId,
                    p_role: 'assistant',
                    p_content: aiResponse,
                    p_source: 'telegram'
                }).catch(() => {});
        }

        return new Response('OK', { status: 200 })
    } catch (err: unknown) {
        console.error('[Fatal Error]', err);
        return new Response('OK', { status: 200 }) // Return 200 even on fatal to stop Telegram retries
    }
})

