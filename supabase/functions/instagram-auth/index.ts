import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { code, userId, redirectUri } = await req.json()

        if (!code || !userId) {
            throw new Error('Code and UserID are required')
        }

        const appId = Deno.env.get('META_APP_ID')
        const appSecret = Deno.env.get('META_APP_SECRET')

        if (!appId || !appSecret) {
            throw new Error('Meta App configuration missing on server')
        }

        // 1. Exchange code for short-lived access token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
        )
        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('Meta Token Exchange Error:', tokenData)
            throw new Error(tokenData.error?.message || 'Failed to exchange code for token')
        }

        const shortLivedToken = tokenData.access_token

        // 2. Exchange for long-lived token (60 days)
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
        )
        const longLivedData = await longLivedResponse.json()
        const longLivedToken = longLivedData.access_token

        // 3. Get Instagram Account ID (assuming user linked a page and that page is connected to Instagram)
        // This is a simplified version; in production, you might need to list pages and find the IG account
        const accountsResponse = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`
        )
        const accountsData = await accountsResponse.json()

        let instagramAccountId = null
        if (accountsData.data && accountsData.data.length > 0) {
            const pageId = accountsData.data[0].id
            const igResponse = await fetch(
                `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${longLivedToken}`
            )
            const igData = await igResponse.json()
            instagramAccountId = igData.instagram_business_account?.id
        }

        // 4. Update user settings in database
        const { error: updateError } = await supabase
            .from('user_settings')
            .update({
                instagram_access_token: longLivedToken,
                instagram_account_id: instagramAccountId,
                instagram_bot_enabled: true
            })
            .eq('user_id', userId)

        if (updateError) throw updateError

        return new Response(JSON.stringify({ success: true, instagramAccountId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
