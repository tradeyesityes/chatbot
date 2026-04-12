const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

async function main() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = 'ad45f0f7-2704-4835-a9fa-46c708ec11d3';
    const newKey = 'n8rgLXlpJc1yBXMQNCIlk5KJc1aX895j';
    
    console.log(`--- Testing Update for User: ${userId} ---`);
    
    // 1. Update
    const { data: updateData, error: updateError } = await supabase
        .from('user_settings')
        .update({ evolution_api_key: newKey })
        .eq('user_id', userId)
        .select();
    
    if (updateError) {
        console.error('Update Error:', updateError.message);
    } else {
        console.log('Update Success. Returned Data:', JSON.stringify(updateData));
    }
    
    // 2. Immediate Fetch
    const { data: fetchData, error: fetchError } = await supabase
        .from('user_settings')
        .select('evolution_api_key')
        .eq('user_id', userId)
        .single();
    
    if (fetchError) {
        console.error('Fetch Error:', fetchError.message);
    } else {
        console.log('Final evolution_api_key:', JSON.stringify(fetchData.evolution_api_key));
    }
}
main();
