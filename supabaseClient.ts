import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Robust check: ensure both are present and URL is a valid http/https string
const isValidConfig = (
  supabaseUrl && 
  supabaseAnonKey && 
  typeof supabaseUrl === 'string' && 
  supabaseUrl.startsWith('http') &&
  supabaseUrl !== 'undefined' &&
  supabaseUrl !== 'null'
);

export const supabase = isValidConfig 
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : {
        auth: {
            signOut: async () => {},
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getSession: async () => ({ data: { session: null } }),
        },
        from: () => ({
            select: () => ({ eq: () => ({ order: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null }),
            delete: () => Promise.resolve({ data: null, error: null }),
        })
    } as any;
