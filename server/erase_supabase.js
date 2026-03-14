import { db as supabase } from './db.js';

const tablesToClear = [
    'feedback',
    'announcements',
    'cash_drawer_logs',
    'time_logs',
    'wastage_logs',
    'promotions',
    'shifts',
    'orders',
    'current_orders',
    'leave_requests',
    'recipes',
    'supply_items',
    'combos',
    'products',
    'addons',
    'modifierGroups',
    'categories',
    'users',
    'stores',
    'app_settings',
    'stamp_cards',
    'stamp_claims',
    'loyalty_customers'
];

async function eraseAll() {
    console.log('Erasing Supabase database tables...');
    for (const table of tablesToClear) {
        try {
            const { error } = await supabase.from(table).delete().not('id', 'is', null);
            if (error) {
                // If the table doesn't exist, it might throw an error. We can just ignore it or log it.
                if (error.code !== '42P01') {
                    console.error(`Error deleting from ${table}:`, error.message);
                } else {
                    console.log(`Table ${table} does not exist. Skipping.`);
                }
            } else {
                console.log(`Cleared table: ${table}`);
            }
        } catch (e) {
            console.error(`Exception clearing ${table}:`, e.message);
        }
    }
    console.log('Done erasing!');
    process.exit(0);
}

eraseAll();
