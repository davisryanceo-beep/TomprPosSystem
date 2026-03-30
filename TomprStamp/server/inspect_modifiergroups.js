import { db } from './db.js';

async function checkModifierGroups() {
    console.log("Fetching one row from modifiergroups to see structure...");
    const { data, error } = await db.from("modifiergroups").select("*").limit(1);

    if (error) {
        console.error("Error fetching modifiergroups:", error);
    } else {
        console.log("Row:", data);
        if (data && data.length > 0) {
            console.log("Keys:", Object.keys(data[0]));
        } else {
            console.log("No data available to inspect keys.");
            // Let's insert a dummy row to see what fails
            const dummy = { storeId: "test_store" };
            const { error: insError } = await db.from("modifiergroups").insert(dummy);
            console.log("Insert with only storeId error:", insError);
        }
    }
    process.exit(0);
}

checkModifierGroups();
