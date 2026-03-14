import { db } from './db.js';

async function createExtraShotGroup() {
    const storeId = 'store-1769421861055';
    const extraShotGroup = {
        id: `modgroup-${Date.now()}`,
        name: 'Extra Shot',
        storeId: storeId,
        selectionType: 'multiple',
        minSelections: 0,
        maxSelections: null,
        options: JSON.stringify([
            { id: 'mod-shot-1', name: 'Extra Shot', priceAdjustment: 0.50, available: true },
            { id: 'mod-shot-2', name: 'Double Extra Shot', priceAdjustment: 1.00, available: true }
        ])
    };

    const { data, error } = await db.from('modifiergroups').insert(extraShotGroup).select();
    if (error) {
        console.error('Error creating Extra Shot group:', error);
    } else {
        console.log('Extra Shot group created:', data[0].id);
    }
    process.exit(0);
}

createExtraShotGroup();
