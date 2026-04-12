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

    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('user_id, evolution_instance_name, evolution_global_api_key, evolution_base_url')
        .eq('evolution_bot_enabled', true);

    if (error) return console.error('Error:', error.message);

    const activeInstances = ['user_62ecd0a4', 'user_87a2c84a'];

    for (const s of settings) {
        const name = s.evolution_instance_name;
        if (!activeInstances.includes(name)) continue;

        const apiKey = s.evolution_global_api_key;
        const baseUrl = (s.evolution_base_url || evolutionBaseUrl).replace(/\/$/, '');

        console.log(`\nChecking Instance Connection: ${name}...`);
        try {
            const res = await axios.get(`${baseUrl}/instance/connectionState/${name}`, {
                headers: { 'apikey': apiKey }
            });
            console.log(`Connection State:`, JSON.stringify(res.data, null, 2));
            
            const req = await axios.get(`${baseUrl}/instance/fetchInstances`, {
                headers: { 'apikey': apiKey }
            });
            
            req.data.forEach(instance => {
                if(instance.instance.instanceName === name) {
                    console.log(`Status:`, instance.instance.status);
                }
            });
        } catch (e) {
            console.error(`Failed connection check:`, e.response?.data || e.message);
        }
    }
}
main();
