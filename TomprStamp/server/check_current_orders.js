import { db } from './db.js';

async function checkRows() {
    const { data, error } = await db.from('current_orders').select('*').limit(1);
    if (error) {
        console.error("DB Error:", error);
    } else if (data.length > 0) {
        console.log(`\nItems raw value:`, JSON.stringify(data[0].items));
        console.log(`Items type:`, typeof data[0].items);
        if (Array.isArray(data[0].items)) {
            console.log(`Array length:`, data[0].items.length);
        }
    } else {
        console.log("No current orders found");
    }

    process.exit(0);
}

checkRows();
