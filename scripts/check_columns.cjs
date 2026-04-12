const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('user_settings').select('*').limit(1);
    
    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in user_settings:', Object.keys(data[0]));
    } else {
        console.log('No data found to check columns.');
    }
}
main();
