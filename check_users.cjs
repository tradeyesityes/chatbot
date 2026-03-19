const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('--- Checking User Settings (Auth focus) ---');
    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .order('updated_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching settings:', error.message);
    } else {
        settings.slice(0, 5).forEach(s => {
            console.log(`User: ${s.user_id}`);
            console.log(`- Instance: ${s.evolution_instance_name}`);
            console.log(`- Instance API Key: ${s.evolution_api_key || 'MISSING'}`);
            console.log(`- Global API Key: ${s.evolution_global_api_key || 'MISSING'}`);
            const match = s.evolution_api_key === s.evolution_global_api_key;
            console.log(`- Keys Match: ${match}`);
            console.log('---');
        });
    }
}
main();
