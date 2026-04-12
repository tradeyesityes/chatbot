const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('--- Repairing Database API Keys ---');
    
    // Find users where evolution_api_key is null/empty but evolution_global_api_key is set
    const { data: users, error } = await supabase
        .from('user_settings')
        .select('user_id, evolution_global_api_key, evolution_api_key');
    
    if (error) {
        console.error('Error fetching users:', error.message);
        return;
    }

    let repairedCount = 0;
    for (const u of users) {
        if (!u.evolution_api_key && u.evolution_global_api_key) {
            console.log(`Repairing user: ${u.user_id}...`);
            const { error: updateError } = await supabase
                .from('user_settings')
                .update({ evolution_api_key: u.evolution_global_api_key })
                .eq('user_id', u.user_id);
            
            if (updateError) {
                console.error(`Failed to repair user ${u.user_id}:`, updateError.message);
            } else {
                repairedCount++;
            }
        }
    }
    
    console.log(`Finished. Repaired ${repairedCount} users.`);
}
main();
