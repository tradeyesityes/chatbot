import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const url = new URL(req.url)

        // 1. Webhook Verification (GET)
        if (req.method === 'GET' && url.searchParams.get('hub.mode') === 'subscribe') {
            const verifyToken = Deno.env.get('INSTAGRAM_VERIFY_TOKEN')
            const mode = url.searchParams.get('hub.mode')
            const token = url.searchParams.get('hub.verify_token')
            const challenge = url.searchParams.get('hub.challenge')

            if (mode && token === verifyToken) {
                return new Response(challenge, { status: 200 })
            }
            return new Response('Verification failed', { status: 403 })
        }

        // 2. Webhook Event (POST)
        if (req.method === 'POST') {
            const body = await req.json()
            console.log('Received Webhook:', JSON.stringify(body, null, 2))

            // Process Instagram Messages
            if (body.object === 'instagram') {
                for (const entry of body.entry) {
                    const accountId = entry.id
                    for (const messaging of entry.messaging) {
                        if (messaging.message && !messaging.message.is_echo) {
                            const senderId = messaging.sender.id
                            const text = messaging.message.text

                            // Find user associated with this accountId
                            const { data: settings } = await supabase
                                .from('user_settings')
                                .select('*')
                                .eq('instagram_account_id', accountId)
                                .single()

                            if (settings && settings.instagram_bot_enabled) {
                                // Logic to trigger AI response and send back
                                // This would involve calling the existing AI logic
                                // For simplicity in this demo, we log it
                                console.log(`User ${settings.user_id} received: ${text} from ${senderId}`)
                            }
                        }
                    }
                }
            }

            return new Response(JSON.stringify({ status: 'ok' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response('Not Found', { status: 404 })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
