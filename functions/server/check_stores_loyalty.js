import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStores() {
    const { data, error } = await supabase.from('stores').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('--- Stores with loyaltyEnabled: true ---');
    console.log(JSON.stringify(data.filter(s => s.loyaltyEnabled === true).map(s => ({
        id: s.id,
        name: s.name,
        loyaltyEnabled: s.loyaltyEnabled
    })), null, 2));

    console.log('\n--- All Stores (for debugging) ---');
    console.log(JSON.stringify(data.map(s => ({
        id: s.id,
        name: s.name,
        loyaltyEnabled: s.loyaltyEnabled
    })), null, 2));
}

checkStores();
