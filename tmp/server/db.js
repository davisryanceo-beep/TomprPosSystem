import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure env vars are loaded when running locally
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('CRITICAL ERROR: Missing Supabase Environment Variables inside Vercel Node runtime.');
}

console.log('------------------------------------------------');
console.log('Initializing Supabase Postgres connection');
console.log(`URL: ${supabaseUrl}`);
console.log('------------------------------------------------');

// Define db as the Supabase client
const db = createClient(supabaseUrl || '', supabaseServiceKey || '');

export { db };
