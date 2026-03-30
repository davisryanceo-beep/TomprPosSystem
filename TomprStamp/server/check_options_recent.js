import { db } from './db.js';

async function checkOptions() {
    const { data, error } = await db.from('modifiergroups')
        .select('id, name, options')
        .order('id', { ascending: false })
        .limit(5);

    if (error) {
        console.error("DB Error:", error);
    } else {
        for (const row of data) {
            console.log(`\nID: ${row.id}`);
            console.log(`Name: ${row.name}`);
            console.log(`Options raw value:`, JSON.stringify(row.options));
            console.log(`Options type:`, typeof row.options);
            if (Array.isArray(row.options)) {
                console.log(`Array length:`, row.options.length);
            }
        }
    }
    process.exit(0);
}

checkOptions();
