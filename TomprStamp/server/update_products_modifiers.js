import { db } from './db.js';

async function updateProducts() {
    const sugarGroupId = 'modgroup-1772511692294';
    const extraShotGroupId = 'modgroup-1772515289338';

    console.log('Fetching Coffee and Tea products...');
    const { data: products, error: fetchErr } = await db
        .from('products')
        .select('id, name, category')
        .in('category', ['Coffee', 'Tea']);

    if (fetchErr) {
        console.error('Error fetching products:', fetchErr);
        process.exit(1);
    }

    console.log(`Found ${products.length} products to update.`);

    for (const product of products) {
        console.log(`Updating ${product.name}...`);
        const { error: updateErr } = await db
            .from('products')
            .update({
                modifierGroups: [sugarGroupId, extraShotGroupId],
                allowAddOns: true
            })
            .eq('id', product.id);

        if (updateErr) {
            console.error(`Error updating ${product.name}:`, updateErr);
        }
    }

    console.log('Update complete!');
    process.exit(0);
}

updateProducts();
