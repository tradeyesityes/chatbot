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

        // Fetch user settings to get API key
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('evolution_global_api_key, evolution_api_key')
            .eq('user_id', user.id)
            .single()

        if (settingsError || !settings?.evolution_global_api_key) {
            return new Response(JSON.stringify({ error: 'Evolution API key not found in settings' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const cleanBaseUrl = evolutionBaseUrl.replace(/\/$/, '')
        const apiKey = settings.evolution_api_key || settings.evolution_global_api_key

        // Check connection status
        const statusResponse = await fetch(`${cleanBaseUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: {
                'apikey': apiKey
            }
        })

        if (!statusResponse.ok) {
            return new Response(JSON.stringify({
                connected: false,
                state: 'error',
                error: 'Failed to fetch connection status'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const statusData = await statusResponse.json()
        const isConnected = statusData.state === 'open'

        // If connected, update user settings
        if (isConnected) {
            await supabase
                .from('user_settings')
                .update({
                    evolution_bot_enabled: true,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
        }

        return new Response(JSON.stringify({
            connected: isConnected,
            state: statusData.state,
            instanceName
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(JSON.stringify({
            connected: false,
            state: 'error',
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
