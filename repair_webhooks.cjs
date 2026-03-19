const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;
const evolutionBaseUrl = process.env.VITE_EVOLUTION_BASE_URL;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-bot`;

    console.log(`--- Repairing Webhooks (V3) ---`);
    console.log(`Target Webhook URL: ${webhookUrl}`);

    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('user_id, evolution_instance_name, evolution_global_api_key, evolution_base_url')
        .eq('evolution_bot_enabled', true);

    if (error) {
        console.error('Error fetching settings:', error.message);
        return;
    }

    const activeInstances = ['user_62ecd0a4', 'user_87a2c84a'];

    for (const s of settings) {
        const name = s.evolution_instance_name;
        if (!activeInstances.includes(name)) continue;

        const apiKey = s.evolution_global_api_key;
        const baseUrl = (s.evolution_base_url || evolutionBaseUrl).replace(/\/$/, '');

        console.log(`\nRepairing Instance: ${name}...`);
        
        // Variation 3: Nested webhook object
        console.log('Trying Variation 3 (nested webhook object)...');
        try {
            const res = await axios.post(`${baseUrl}/webhook/set/${name}`, {
                webhook: {
                    enabled: true,
                    url: webhookUrl,
                    webhookByEvents: false,
                    events: ["MESSAGES_UPSERT"]
                }
            }, {
                headers: { 'apikey': apiKey }
            });
            console.log(`Success:`, JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.error(`Failed:`, JSON.stringify(e.response?.data || e.message, null, 2));
        }
    }
}
main();
