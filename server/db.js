import { createClient } from '@supabase/supabase-js';
import { fetch } from 'undici';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Polyfill fetch for Supabase inside Vercel Node 18 environments
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure env vars are loaded when running locally
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- VERIFYING VERCEL ENV VARS ---');
console.log('SUPABASE_URL is set:', !!process.env.SUPABASE_URL);
console.log('VITE_SUPABASE_URL is set:', !!process.env.VITE_SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY is set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('VITE_SUPABASE_ANON_KEY is set:', !!process.env.VITE_SUPABASE_ANON_KEY);
console.log('Resolved URL:', supabaseUrl ? 'YES' : 'NO');
console.log('Resolved Key:', supabaseServiceKey ? 'YES' : 'NO');
console.log('---------------------------------');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('CRITICAL ERROR: Missing Supabase Environment Variables inside Vercel Node runtime.');
}

console.log('------------------------------------------------');
console.log('Initializing Supabase Postgres connection');
console.log(`URL: ${supabaseUrl}`);
console.log('------------------------------------------------');

// Define db as the Supabase client
const fallbackUrl = 'https://dummy.supabase.co';
const fallbackKey = 'dummy-key';
const db = createClient(supabaseUrl || fallbackUrl, supabaseServiceKey || fallbackKey);

export { db };
