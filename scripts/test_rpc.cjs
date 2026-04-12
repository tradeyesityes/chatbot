const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWhatsappRPC() {
    console.log('Testing WhatsApp RPC...');
    
    // Get a real user_id to test with
    const { data: users, error: userErr } = await supabase.from('user_settings').select('user_id').limit(1);
    
    if (userErr || !users || users.length === 0) {
        console.error('Could not fetch a user_id to test:', userErr?.message);
        return;
    }
    
    const testUserId = users[0].user_id;
    const testPhone = '966500000000@s.whatsapp.net';
    
    console.log(`Using user_id: ${testUserId}`);
    console.log('1. Testing get_or_create_whatsapp_conversation...');
    
    const { data: convId, error: convErr } = await supabase.rpc('get_or_create_whatsapp_conversation', {
        p_user_id: testUserId,
        p_phone: testPhone,
        p_title: 'Test WA Chat',
        p_visitor_name: 'Test Visitor'
    });
    
    if (convErr) {
        console.error('❌ Failed create conversation:', convErr.message);
        return;
    }
    
    console.log(`✅ Success! Created Conv ID: ${convId}`);
    
    console.log('2. Testing save_whatsapp_message...');
    
    const { error: msgErr } = await supabase.rpc('save_whatsapp_message', {
        p_user_id: testUserId,
        p_conversation_id: convId,
        p_role: 'user',
        p_content: 'Test message from script'
    });
    
    if (msgErr) {
        console.error('❌ Failed save message:', msgErr.message);
        return;
    }
    
    console.log('✅ Success! Message saved.');
}

testWhatsappRPC().catch(console.error);
