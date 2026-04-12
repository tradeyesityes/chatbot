const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    console.log('Fetching latest WhatsApp Bot logs...');
    
    // Fetch from bot_debug_logs
    const { data: logs, error } = await supabase
        .from('bot_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
        
    if (error) {
        console.error('Error fetching logs:', error.message);
        return;
    }
    
    if (!logs || logs.length === 0) {
        console.log('No recent logs found.');
        return;
    }
    
    logs.forEach(log => {
        console.log(`[${new Date(log.created_at).toLocaleTimeString()}] [${log.step}] ${log.message}`);
        if (log.step === 'FatalError' || log.step === 'DBError' || log.step === 'Error') {
            console.error(JSON.stringify(log.details, null, 2));
        }
    });
}

checkLogs();
