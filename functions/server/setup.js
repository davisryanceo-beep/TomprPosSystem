import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function init() {
    console.log('Inserting default store...');
    const store = {
        id: 'store-1',
        name: 'Main Cafe',
        address: '123 Coffee St',
        phone: '555-0123'
    };

    const { data: sData, error: sErr } = await supabase.from('stores').upsert(store).select();
    if (sErr) console.error('Store error:', sErr);
    else console.log('Store inserted:', sData);

    console.log('Waiting for commit...');
    await new Promise(r => setTimeout(r, 2000));

    console.log('Inserting default product...');
    const product = {
        id: 'prod-1',
        storeId: 'store-1',
        name: 'Espresso',
        price: 3.50,
        category: 'Coffee',
        description: 'A classic espresso shot',
        stock: 100
    };

    const { data: pData, error: pErr } = await supabase.from('products').upsert(product).select();
    if (pErr) console.error('Product error:', pErr);
    else console.log('Product inserted:', pData);
}

init();
