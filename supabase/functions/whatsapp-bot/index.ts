import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const logDebug = async (step: string, message: string, details: any = {}) => {
    console.log(`[${step}] ${message}`, details)
    try {
        await supabase.from('bot_debug_logs').insert({
            instance_name: details?.instanceName || 'unknown',
            step,
            message,
            details: details
        })
    } catch (e) {
        console.error('Failed to log to DB:', e)
    }
}

serve(async (req) => {
    let instanceName = 'unknown'
    try {
        const payload = await req.json()
        instanceName = payload.instance || 'unknown'

        await logDebug('Start', 'Received Webhook', { payload, instanceName })

        // 1. Validate Payload
        const event = payload.event
        // console.log(`Processing event: ${event} for instance: ${payload.instance}`) // Replaced by logDebug

        if (event !== 'messages.upsert') {
            await logDebug('Ignored', 'Event is not messages.upsert', { event, instanceName })
            return new Response(JSON.stringify({ status: 'ignored', reason: 'not_upsert' }), { status: 200 })
        }

        if (payload.data?.key?.fromMe) {
            await logDebug('Ignored', 'Message is from me', { key: payload.data.key, instanceName })
            return new Response(JSON.stringify({ status: 'ignored', reason: 'from_me' }), { status: 200 })
        }

        const remoteJid = payload.data?.key?.remoteJid

        // Comprehensive text extraction
        const message = payload.data?.message
        const incomingText = message?.conversation ||
            message?.extendedTextMessage?.text ||
            message?.imageMessage?.caption ||
            message?.videoMessage?.caption ||
            message?.documentMessage?.caption || ''

        await logDebug('ExtractText', `Extracted text: "${incomingText}"`, { remoteJid, incomingText, instanceName })

        if (!incomingText) {
            await logDebug('Error', 'No text found in message', { message, instanceName })
            return new Response(JSON.stringify({ status: 'no_text_to_process' }), { status: 200 })
        }

        // 2. Fetch User Settings by Instance Name
        // Using ilike for case-insensitive matching is safer as users might type it differently
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .ilike('evolution_instance_name', instanceName)
            .eq('evolution_bot_enabled', true)
            .maybeSingle()

        if (settingsError) {
            await logDebug('DBError', 'Error fetching settings', { error: settingsError, instanceName })
            return new Response(JSON.stringify({ status: 'db_error', error: settingsError.message }), { status: 500 })
        }

        if (!settings) {
            await logDebug('ConfigError', 'No enabled bot configuration found for instance', { instanceName })
            // Log all instances to debug potential mismatches
            const { data: allInstances } = await supabase
                .from('user_settings')
                .select('evolution_instance_name, evolution_bot_enabled')

            await logDebug('DebugInstances', 'Available instances in DB', { allInstances, instanceName })

            return new Response(JSON.stringify({ status: 'not_configured', instance: instanceName }), { status: 200 })
        }

        const userId = settings.user_id
        await logDebug('SettingsFound', `Found enabled bot for user: ${userId}`, { userId, botEnabled: settings.evolution_bot_enabled, instanceName })

        // 2.5 Send "Composing" Presence
        try {
            const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
            const presenceUrl = `${cleanBaseUrl}/message/sendPresence/${instanceName}`
            await fetch(presenceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': settings.evolution_api_key
                },
                body: JSON.stringify({
                    number: remoteJid,
                    presence: 'composing',
                    delay: 1200
                })
            })
            await logDebug('Presence', 'Sent composing presence', { instanceName })
        } catch (presenceError) {
            console.error('Presence Error:', presenceError)
        }

        // 3. Fetch Knowledge Base Context
        const { data: files, error: filesError } = await supabase
            .from('user_files')
            .select('name, content')
            .eq('user_id', userId)

        if (filesError) await logDebug('FilesError', 'Error fetching files', { error: filesError, userId, instanceName })

        const context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''
        await logDebug('Context', `Fetched ${files?.length || 0} files for context.`, { contextLength: context.length, userId, instanceName })

        // 4. Generate AI Response
        let aiResponse = ''
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء في شركتنا، وترد على استفسارات العملاء بدقة واحترافية.
**قاعدة صارمة جداً:** أجب فقط بناءً على المعلومات الموجودة في "سياق المعلومات" أدناه. لا تستخدم أي معرفة خارجية أو عامة أبداً.
**قاعدة صارمة:** لا تذكر أبداً أسماء الملفات.
**قاعدة صارمة:** لا تقم أبداً بسرد أو عرض جميع البيانات المتوفرة لديك دفعة واحدة (مثل عرض كل الجداول أو القوائم الطويلة).
إذا طلب العميل "ما هي البيانات لديك؟" أو "اعرض لي الجدول"، اعتذر بلطف واطلب منه أن يسأل عن اسم محدد أو معلومة معينة.
إذا كان السؤال خارج نطاق المعلومات المتوفرة، قل بوضوح: "عذراً، هذه المعلومة غير متوفرة في قاعدة بياناتنا الحالية."
فقط أجب على السؤال المحدد بدقة واختصار.
إذا اضطررت لذكر مصدر معلوماتك، قل فقط: "أعتمد في إجاباتي على البيانات التي تم تزويدي بها من قبل فريق الشركة".

سياق المعلومات:
${context}`

        if (settings.use_gemini && settings.gemini_api_key) {
            await logDebug('AI', 'Using Gemini for response...', { model: settings.gemini_model_name, userId, instanceName })
            const model = settings.gemini_model_name || 'gemini-1.5-flash-latest'
            const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${settings.gemini_api_key}`

            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\nالسؤال: ${incomingText}` }]
                    }]
                })
            })
            const result = await response.json()
            if (result.error) await logDebug('AIError', 'Gemini API Error', { error: result.error, userId, instanceName })
            aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        } else if (settings.use_openai && settings.openai_api_key) {
            await logDebug('AI', 'Using OpenAI for response...', { model: 'gpt-4o-mini', userId, instanceName })
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.openai_api_key}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: incomingText }
                    ]
                })
            })
            const result = await response.json()
            if (result.error) await logDebug('AIError', 'OpenAI API Error', { error: result.error, userId, instanceName })
            aiResponse = result.choices?.[0]?.message?.content || ''
        } else if (settings.use_remote_ollama && settings.ollama_base_url) {
            const modelName = settings.local_model_name || 'gemma:2b'
            await logDebug('AI', 'Using Remote Ollama', { model: modelName, baseUrl: settings.ollama_base_url, userId, instanceName })

            // Normalize URL: remove trailing slash and ensure it doesn't end in /v1 (we add that)
            // Actually, Ollama's OpenAI compatible endpoint is /v1/chat/completions
            let baseUrl = settings.ollama_base_url.replace(/\/$/, '')
            if (baseUrl.endsWith('/v1')) {
                baseUrl = baseUrl.slice(0, -3)
            }
            const apiUrl = `${baseUrl}/v1/chat/completions`

            const headers: any = { 'Content-Type': 'application/json' }
            if (settings.ollama_api_key) {
                headers['Authorization'] = `Bearer ${settings.ollama_api_key}`
            }

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: incomingText }
                        ],
                        stream: false
                    })
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    await logDebug('AIError', 'Ollama HTTP Error', { status: response.status, text: errorText, userId, instanceName })
                } else {
                    const result = await response.json()
                    aiResponse = result.choices?.[0]?.message?.content || ''
                }
            } catch (fetchError: any) {
                await logDebug('AIError', 'Ollama Network Error', { error: fetchError.message, userId, instanceName })
            }
        }

        if (!aiResponse) {
            await logDebug('AIError', 'AI failed to generate a response.', { userId, instanceName })
            return new Response(JSON.stringify({ status: 'ai_error' }), { status: 200 })
        }

        await logDebug('AIResponse', 'Generated AI response', { aiResponseLength: aiResponse.length, userId, instanceName })

        // 5. Send Response back to Evolution API
        const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
        const sendUrl = `${cleanBaseUrl}/message/sendText/${instanceName}`

        // Fix: Evolution API sendText endpoint often expects "text" at the root, or "textMessage" property depending on version.
        // The error "instance requires property 'text'" suggests it wants "text" at the root.
        const sendResponse = await fetch(sendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': settings.evolution_api_key
            },
            body: JSON.stringify({
                number: remoteJid,
                text: aiResponse, // Corrected: moved text to root
                delay: 1200,
                linkPreview: false
            })
        })

        const sendResult = await sendResponse.json()
        await logDebug('EvolutionResponse', 'Evolution API Response', { result: sendResult, userId, instanceName })

        return new Response(JSON.stringify({ status: 'success', evolution_response: sendResult }), { status: 200 })
    } catch (err: any) {
        await logDebug('FatalError', 'Bot Error', { message: err.message, stack: err.stack, instanceName })
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
