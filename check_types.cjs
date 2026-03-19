const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('user_settings').select('user_id').limit(5);
    
    if (error) {
        console.error('Error:', error);
    } else {
        data.forEach(u => {
            console.log(`User ID: "${u.user_id}" (Type: ${typeof u.user_id}, Length: ${u.user_id.length})`);
        });
    }
}
main();
