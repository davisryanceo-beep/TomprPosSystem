import { db } from './db.js';

async function enableLoyalty() {
    console.log("Fixing dropped loyalty flags in stores...");
    const { data: stores, error } = await db.from('stores').select('id, name');

    if (error) {
        console.error("Error fetching stores:", error);
        process.exit(1);
    }

    let count = 0;
    for (const store of stores) {
        const { error: updateError } = await db.from('stores').update({
            loyaltyEnabled: true,
            stampsPerItem: 1,
            stampsToRedeem: 10,
            loyaltyRewardDescription: "One free coffee of your choice!"
        }).eq('id', store.id);

        if (updateError) {
            console.error(`Failed to update store ${store.name}:`, updateError);
        } else {
            console.log(`Enabled loyalty for store: ${store.name}`);
            count++;
        }
    }

    console.log(`Successfully updated ${count} stores.`);
    process.exit(0);
}

enableLoyalty();
