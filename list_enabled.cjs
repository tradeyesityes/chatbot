const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
        .from('user_settings')
        .select('user_id, evolution_instance_name, evolution_bot_enabled')
        .eq('evolution_bot_enabled', true);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${data.length} enabled bots.`);
        data.forEach(u => {
            console.log(`- User: "${u.user_id}", Instance: "${u.evolution_instance_name}"`);
        });
    }
}
main();
