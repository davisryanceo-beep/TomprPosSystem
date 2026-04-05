import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function checkData() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, cashDeclarationRequired')
    .limit(1);

  if (error) {
    console.error("Error fetching store:", error.message);
  } else if (data && data.length > 0) {
    console.log("Store Data:", data[0]);
    console.log("Type of cashDeclarationRequired:", typeof data[0].cashDeclarationRequired);
  } else {
    console.log("No data in 'stores' table.");
  }
}

checkData();
