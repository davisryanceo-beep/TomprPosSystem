import { db } from './db.js';

async function checkRows() {
    const { data } = await db.from('modifiergroups').select('*').limit(1);
    if (data && data.length) {
        console.log("KEYS ARE: ", Object.keys(data[0]));
    }
    process.exit(0);
}
checkRows();
