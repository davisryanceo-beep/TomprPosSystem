import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function enableLoyalty() {
    const { data, error } = await supabase
        .from('stores')
        .update({ loyaltyEnabled: true, stampsPerItem: 1, stampsToRedeem: 10, loyaltyRewardDescription: 'Free Coffee' })
        .match({ id: 'store1-downtown' });

    if (error) {
        console.error('Error enabling loyalty:', error);
        return;
    }
    console.log('Loyalty enabled for Amble Specialty Cafe - Downtown');

    const { data: data2, error: error2 } = await supabase
        .from('stores')
        .update({ loyaltyEnabled: true, stampsPerItem: 1, stampsToRedeem: 10, loyaltyRewardDescription: 'Free Specialty Drink' })
        .match({ id: 'store-1769421861055' });

    if (error2) {
        console.error('Error enabling loyalty for Solace:', error2);
        return;
    }
    console.log('Loyalty enabled for Solace Cafe');
}

enableLoyalty();
