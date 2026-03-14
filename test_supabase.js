import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log('Fetching...');
    const { data, error } = await supabase.from('user_settings').select('*');
    console.log('Error:', error);
    console.log('Data count:', data ? data.length : 0);
}
await test();
