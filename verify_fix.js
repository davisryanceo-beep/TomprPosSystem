import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = "https://pthpxqzisshrcnjwwzlu.supabase.co";
const key = "sb_publishable_Re3CVb4I1OZhhyX7QmIv8g_Aqjyc-PY";

const supabase = createClient(url, key);

async function testUpdate() {
   const storeId = "store1-downtown";
   console.log("Testing Boolean FALSE update for cashDeclarationRequired...");
   
   // Simulating what the backend would do now: convert false to 0
   const { error } = await supabase
     .from('stores')
     .update({ cashDeclarationRequired: 0 }) 
     .eq('id', storeId);

   if (error) {
     console.error("Update failed:", error.message);
   } else {
     const { data } = await supabase.from('stores').select('cashDeclarationRequired').eq('id', storeId).single();
     console.log("Database value after update (should be 0):", data.cashDeclarationRequired);
     
     console.log("Testing Boolean TRUE update for cashDeclarationRequired...");
     await supabase.from('stores').update({ cashDeclarationRequired: 1 }).eq('id', storeId);
     const { data: data2 } = await supabase.from('stores').select('cashDeclarationRequired').eq('id', storeId).single();
     console.log("Database value after update (should be 1):", data2.cashDeclarationRequired);
   }
}

testUpdate();
