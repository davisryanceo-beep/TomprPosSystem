import { db } from './db.js';

async function checkRows() {
    const { data, error } = await db.from('modifiergroups').select('*').limit(3);
    if (error) {
        console.error("DB Error:", error);
    } else {
        for (const row of data) {
            console.log(`\nID: ${row.id}`);
            console.log(`Options raw value:`, row.options);
            console.log(`Options type:`, typeof row.options);
            if (Array.isArray(row.options)) {
                console.log(`Array length:`, row.options.length);
            }
        }
    }

    process.exit(0);
}

checkRows();
