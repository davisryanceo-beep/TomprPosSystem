import { db } from './db.js';

async function checkRows() {
    const { data } = await db.from('modifiergroups').select('options').not('options', 'is', null).limit(5);
    console.log("Raw Options column values:", JSON.stringify(data, null, 2));

    // let's also try to insert one
    const payload = {
        id: "modgroup-test-123",
        name: "Debug Script Mod",
        storeId: "0b157bd7-de29-4fb5-ba37-29bdc8c114ea", // Amble Cafe id
        selectionType: "single",
        minSelections: 0,
        maxSelections: 1,
        options: [{ id: "opt-1", name: "Extra Sugar", priceAdjustment: 0.5, available: true }]
    }

    console.log("\nAttempting insert...");
    const { data: insData, error } = await db.from('modifiergroups').insert(payload).select();
    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Inserted raw options:", JSON.stringify(insData[0].options, null, 2));

        console.log("Cleaning up new test row...");
        await db.from('modifiergroups').delete().eq('id', insData[0].id);
    }

    process.exit(0);
}

checkRows();
