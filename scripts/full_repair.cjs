const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;
const evolutionBaseUrl = process.env.VITE_EVOLUTION_BASE_URL;
const evolutionGlobalApiKey = process.env.VITE_EVOLUTION_GLOBAL_API_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-bot`;

    console.log(`--- FULL SYSTEM REPAIR ---`);
    console.log(`Target Webhook URL: ${webhookUrl}`);

    // 1. Fetch enabled bots
    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('evolution_bot_enabled', true);

    if (error) {
        console.error('Error fetching settings:', error.message);
        return;
    }

    console.log(`Found ${settings.length} enabled bots to verify/repair.`);

    for (const s of settings) {
        const userId = s.user_id;
        const name = s.evolution_instance_name;
        const globalKey = s.evolution_global_api_key || evolutionGlobalApiKey;
        const baseUrl = (s.evolution_base_url || evolutionBaseUrl).replace(/\/$/, '');
        
        console.log(`\n--- Processing User: ${userId} (Instance: ${name}) ---`);

        // A. Repair DB API Key if missing
        if (!s.evolution_api_key) {
            console.log(`- DB: evolution_api_key is missing. Setting to global key.`);
            const { error: dbError } = await supabase
                .from('user_settings')
                .update({ evolution_api_key: globalKey })
                .eq('user_id', userId);
            if (dbError) console.error(`  Failed to update DB:`, dbError.message);
            else console.log(`  DB updated successfully.`);
        } else {
            console.log(`- DB: evolution_api_key exists.`);
        }

        // B. Repair Webhook in Evolution API
        if (name && globalKey) {
            console.log(`- Evolution: Checking/Setting webhook for ${name}...`);
            try {
                const res = await axios.post(`${baseUrl}/webhook/set/${name}`, {
                    webhook: {
                        enabled: true,
                        url: webhookUrl,
                        webhookByEvents: false,
                        events: ["MESSAGES_UPSERT"]
                    }
                }, {
                    headers: { 'apikey': globalKey }
                });
                console.log(`  Evolution Success: Webhook configured.`);
            } catch (e) {
                console.error(`  Evolution Failed:`, JSON.stringify(e.response?.data || e.message, null, 2));
            }
        } else {
            console.log(`- Evolution: Skipping (missing name or key)`);
        }
    }
}
main();
