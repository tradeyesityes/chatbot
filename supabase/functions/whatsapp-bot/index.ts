import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
    try {
        const payload = await req.json()
        console.log('Incoming Webhook:', JSON.stringify(payload))

        // 1. Validate Payload
        if (payload.event !== 'messages.upsert' || payload.data.key.fromMe) {
            return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 })
        }

        const instanceName = payload.instance
        const remoteJid = payload.data.key.remoteJid
        const incomingText = payload.data.message?.conversation ||
            payload.data.message?.extendedTextMessage?.text || ''

        if (!incomingText) {
            return new Response(JSON.stringify({ status: 'no_text' }), { status: 200 })
        }

        // 2. Fetch User Settings by Instance Name
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('evolution_instance_name', instanceName)
            .eq('evolution_bot_enabled', true)
            .single()

        if (settingsError || !settings) {
            console.error('Settings not found or bot disabled for instance:', instanceName)
            return new Response(JSON.stringify({ status: 'not_configured' }), { status: 200 })
        }

        const userId = settings.user_id

        // 3. Fetch Knowledge Base Context
        const { data: files, error: filesError } = await supabase
            .from('user_files')
            .select('name, content')
            .eq('user_id', userId)

        const context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''

        // 4. Generate AI Response
        let aiResponse = ''
        const systemPrompt = `أنت مساعد ذكي يرد على الأسئلة بناءً على المعلومات التالية فقط. إذا لم تجد الإجابة، قل أنك لا تمتلك المعلومات الكافية.
تواصل باللهجة العربية المفضلة للعميل.

سياق المعلومات:
${context}`

        if (settings.use_gemini && settings.gemini_api_key) {
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
            aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        } else if (settings.use_openai && settings.openai_api_key) {
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
            aiResponse = result.choices?.[0]?.message?.content || ''
        }

        if (!aiResponse) {
            return new Response(JSON.stringify({ status: 'ai_error' }), { status: 200 })
        }

        // 5. Send Response back to Evolution API
        const sendUrl = `${settings.evolution_base_url}/message/sendText/${instanceName}`
        await fetch(sendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': settings.evolution_api_key
            },
            body: JSON.stringify({
                number: remoteJid,
                options: {
                    delay: 1200,
                    presence: 'composing',
                    linkPreview: false
                },
                textMessage: {
                    text: aiResponse
                }
            })
        })

        return new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    } catch (err: any) {
        console.error('Bot Error:', err.message)
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
