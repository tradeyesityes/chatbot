const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = 'ad45f0f7-2704-4835-a9fa-46c708ec11d3';
    
    console.log(`--- Checking User: ${userId} ---`);
    const { data, error } = await supabase
        .from('user_settings')
        .select('evolution_api_key, evolution_global_api_key')
        .eq('user_id', userId)
        .single();
    
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('evolution_api_key:', JSON.stringify(data.evolution_api_key));
        console.log('evolution_global_api_key:', JSON.stringify(data.evolution_global_api_key));
    }
}
main();
