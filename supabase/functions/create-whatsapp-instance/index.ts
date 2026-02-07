import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Verify user authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const { evolutionBaseUrl, instanceName } = await req.json()

        if (!evolutionBaseUrl || !instanceName) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Fetch user settings to get global API key
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('evolution_global_api_key')
            .eq('user_id', user.id)
            .single()

        if (settingsError || !settings?.evolution_global_api_key) {
            return new Response(JSON.stringify({ error: 'Evolution API key not configured in settings' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const evolutionGlobalApiKey = settings.evolution_global_api_key

        const cleanBaseUrl = evolutionBaseUrl.replace(/\/$/, '')

        // Step 1: Create Evolution API Instance
        console.log(`Creating instance: ${instanceName}`)
        const createResponse = await fetch(`${cleanBaseUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionGlobalApiKey
            },
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            })
        })

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error('Instance creation failed:', errorText)

            // Check if instance already exists (403 or 409 status, or error message contains "already")
            const instanceExists = createResponse.status === 403 ||
                createResponse.status === 409 ||
                errorText.toLowerCase().includes('already')

            if (instanceExists) {
                console.log('Instance already exists, will reuse it and proceed to connect...')
            } else {
                throw new Error(`Failed to create instance: ${errorText}`)
            }
        }

        const createData = await createResponse.json().catch(() => ({}))
        const instanceApiKey = createData.hash?.apikey || evolutionGlobalApiKey

        // Step 2: Connect Instance (triggers QR generation)
        console.log(`Connecting instance: ${instanceName}`)
        const connectResponse = await fetch(`${cleanBaseUrl}/instance/connect/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionGlobalApiKey
            }
        })

        if (!connectResponse.ok) {
            const errorText = await connectResponse.text()
            console.error('Instance connection failed:', errorText)
            throw new Error(`Failed to connect instance: ${errorText}`)
        }

        // Step 3: Fetch QR Code (with retry logic)
        console.log(`Fetching QR code for: ${instanceName}`)
        let qrCode = null
        let retries = 5

        while (retries > 0 && !qrCode) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

            const qrResponse = await fetch(`${cleanBaseUrl}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: {
                    'apikey': evolutionGlobalApiKey
                }
            })

            if (qrResponse.ok) {
                const qrData = await qrResponse.json()
                if (qrData.base64) {
                    qrCode = qrData.base64
                    break
                }
            }

            retries--
            console.log(`QR code not ready, retries left: ${retries}`)
        }

        if (!qrCode) {
            throw new Error('Failed to fetch QR code after multiple attempts')
        }

        // Step 4: Update user settings with instance details
        const { error: updateError } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                evolution_base_url: cleanBaseUrl,
                evolution_api_key: instanceApiKey,
                evolution_global_api_key: evolutionGlobalApiKey,
                evolution_instance_name: instanceName,
                evolution_bot_enabled: false, // Will be enabled after QR scan
                updated_at: new Date().toISOString()
            })

        if (updateError) {
            console.error('Failed to update user settings:', updateError)
        }

        return new Response(JSON.stringify({
            success: true,
            instanceName,
            apiKey: instanceApiKey,
            qrCode
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
