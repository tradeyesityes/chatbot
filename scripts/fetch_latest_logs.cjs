const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('--- Fetching latest 15 logs ---');
    const { data, error } = await supabase
        .from('bot_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
    
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}
main();
