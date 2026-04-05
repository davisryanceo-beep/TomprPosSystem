import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("No Supabase URL or Key found!");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkColumns() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching store:", error.message);
  } else if (data && data.length > 0) {
    console.log("Columns found in 'stores' table:", Object.keys(data[0]));
  } else {
    console.log("No data in 'stores' table to check columns.");
  }
}

checkColumns();
