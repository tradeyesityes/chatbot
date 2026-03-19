const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    console.log(`Using Supabase URL: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.from('user_settings').select('count', { count: 'exact', head: true });
    if (error) console.error('Error:', error.message);
    else console.log(`Total rows in user_settings: ${data.length === 0 ? 0 : 'N/A'} (Count: ${error ? 'error' : 'see below'})`);
    
    const { count } = await supabase.from('user_settings').select('*', { count: 'exact', head: true });
    console.log(`Actual Count: ${count}`);
}
main();
