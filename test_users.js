import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function test() {
    const { data: globalSettingsRows } = await supabase.from('global_settings').select('*');
    console.log('Global Settings:', globalSettingsRows);
    
    const { data: activeUsers } = await supabase
        .from('user_settings')
        .select('*')
        .eq('evolution_bot_enabled', true);
    
    console.log(`Active Users:`, activeUsers?.length);
    activeUsers?.forEach(u => {
        console.log(`User: ${u.user_id}, Instance: ${u.evolution_instance_name}`);
    });
}
test();
