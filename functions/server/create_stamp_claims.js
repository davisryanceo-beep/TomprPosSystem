import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createStampClaimsTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS stamp_claims (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        stamps INTEGER NOT NULL,
        claimed BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMP WITH TIME ZONE,
        customer_id UUID REFERENCES customers(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
    );
    `;

    console.log("Creating/verifying stamp_claims table...");
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error("Error creating table via RPC:", error);
        // Fallback: This might fail if exec_sql doesn't exist. 
        // In that case, I'll inform the user or try another way if I have it.
        // But usually I have this rpc for these kinds of tasks in this environment.
    } else {
        console.log("stamp_claims table verified/created successfully.");
    }
}

createStampClaimsTable();
