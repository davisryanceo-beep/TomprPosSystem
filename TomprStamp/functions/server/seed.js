import { db } from './db.js';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Helper to batch delete
async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}


async function seed() {
    console.log('Starting seed process (Firestore)...');

    console.log('Clearing existing data...');
    const tables = ['users', 'products', 'categories', 'orders', 'supply_items', 'recipes', 'shifts', 'promotions', 'wastage_logs', 'time_logs', 'cash_drawer_logs', 'announcements', 'feedback', 'current_orders', 'stores', 'app_settings'];

    for (const t of tables) {
        try {
            await deleteCollection(t, 20); // Small batch size for safety
        } catch (e) {
            console.error(`Error clearing ${t}:`, e);
        }
    }

    console.log('Inserting fresh data...');

    // INITIAL_STORES
    const defaultStoreId = 'store1-downtown';
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 12);

    const store = {
        id: defaultStoreId,
        name: 'Amble Specialty Cafe - Downtown',
        address: '123 Main St, Anytown',
        contactInfo: '555-1234',
        currencyCode: 'USD',
        timezone: 'America/New_York',
        createdAt: new Date().toISOString(),
        licenseExpiryDate: futureDate.toISOString().split('T')[0],
        logoUrl: 'https://picsum.photos/seed/logo1/200',
        backgroundImageUrl: 'https://picsum.photos/seed/bg1/1920/1080',
        welcomeMessage: 'Welcome! Your order will appear here as items are added at the counter.',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Payment-For-Store-1',
        displayTheme: 'light',
        backgroundColor: '#f5f5f5',
        overlayOpacity: 0.7,
        accentColor: '#10b981',
        fontFamily: 'Nunito',
        headerColor: '#1e293b',
        bodyTextColor: '#334155',
        logoSize: 96
    };
    await db.collection('stores').doc(defaultStoreId).set(store);

    // DEFAULT_USERS
    const hashedAdminPass = await bcrypt.hash('admin123', 10);
    const hashedStoreAdminPass = await bcrypt.hash('storeadmin123', 10);
    const hashedCashierPass = await bcrypt.hash('cashier123', 10);
    const hashedBaristaPass = await bcrypt.hash('barista123', 10);
    const hashedStockPass = await bcrypt.hash('stockmanager123', 10);

    const users = [
        { id: 'admin1', username: 'globaladmin', role: 'Admin', password: hashedAdminPass, pin: null, firstName: 'Global', lastName: 'Admin', profilePictureUrl: null, storeId: null, email: 'global.admin@amble.cafe', phoneNumber: '+1111111111' },
        { id: 'storeadmin1', username: 'storeadmin', role: 'Store Admin', password: hashedStoreAdminPass, pin: null, firstName: 'Store', lastName: 'Admin', profilePictureUrl: null, storeId: defaultStoreId, email: 'store.admin@amble.cafe', phoneNumber: '+1222222222' },
        { id: 'cashier1', username: 'cashier', role: 'Cashier', password: hashedCashierPass, pin: '1111', firstName: 'Default', lastName: 'Cashier', profilePictureUrl: null, storeId: defaultStoreId, email: 'cashier@amble.cafe', phoneNumber: '+1333333333' },
        { id: 'barista1', username: 'barista', role: 'Barista', password: hashedBaristaPass, pin: '2222', firstName: 'Default', lastName: 'Barista', profilePictureUrl: null, storeId: defaultStoreId, email: 'barista@amble.cafe', phoneNumber: '+1444444444' },
        { id: 'stockmanager1', username: 'stockmanager', role: 'Stock Manager', password: hashedStockPass, pin: '3333', firstName: 'Default', lastName: 'Stocker', profilePictureUrl: null, storeId: defaultStoreId, email: 'stocker@amble.cafe', phoneNumber: '+1555555555' }
    ];

    for (const u of users) {
        await db.collection('users').doc(u.id).set(u);
    }

    // INITIAL_CATEGORIES
    const categories = [
        { id: 'cat1', name: 'Coffee', storeId: defaultStoreId },
        { id: 'cat2', name: 'Tea', storeId: defaultStoreId },
        { id: 'cat3', name: 'Pastries', storeId: defaultStoreId },
        { id: 'cat4', name: 'Food', storeId: defaultStoreId },
        { id: 'cat5', name: 'Merchandise', storeId: defaultStoreId },
        { id: 'cat6', name: 'Uncategorized', storeId: defaultStoreId }
    ];

    for (const c of categories) {
        await db.collection('categories').doc(c.id).set(c);
    }

    // INITIAL_PRODUCTS
    const products = [
        { id: 'prod1', name: 'Espresso', price: 2.50, category: 'Coffee', stock: 3, imageUrl: 'https://picsum.photos/seed/espresso/200/200', description: 'Strong and bold, the classic Italian pick-me-up.', storeId: defaultStoreId },
        { id: 'prod2', name: 'Latte', price: 3.50, category: 'Coffee', stock: 80, imageUrl: 'https://picsum.photos/seed/latte/200/200', description: 'Smooth espresso with steamed milk and a thin layer of foam.', storeId: defaultStoreId },
        { id: 'prod3', name: 'Cappuccino', price: 3.25, category: 'Coffee', stock: 0, imageUrl: 'https://picsum.photos/seed/cappuccino/200/200', description: 'A perfect balance of espresso, steamed milk, and rich foam.', storeId: defaultStoreId },
        { id: 'prod4', name: 'Green Tea', price: 2.75, category: 'Tea', stock: 50, imageUrl: 'https://picsum.photos/seed/greentea/200/200', description: 'Refreshing and healthy, packed with antioxidants.', storeId: defaultStoreId },
        { id: 'prod5', name: 'Croissant', price: 2.00, category: 'Pastries', stock: 8, imageUrl: 'https://picsum.photos/seed/croissant/200/200', description: 'Buttery and flaky, a Parisian delight.', storeId: defaultStoreId }
    ];
    for (const p of products) {
        await db.collection('products').doc(p.id).set(p);
    }

    // INITIAL_SUPPLY_ITEMS
    const supplies = [
        { id: 'sup1', name: '12oz Coffee Cups', category: 'Containers', currentStock: 500, unit: 'pieces', lowStockThreshold: 100, notes: 'Standard paper cups for medium drinks.', storeId: defaultStoreId },
        { id: 'sup2', name: '12oz Coffee Cup Lids', category: 'Containers', currentStock: 450, unit: 'pieces', lowStockThreshold: 100, notes: null, storeId: defaultStoreId },
        { id: 'sup3', name: 'Espresso Blend Coffee Beans', category: 'Raw Ingredients', currentStock: 15, unit: 'kg', lowStockThreshold: 5, notes: 'Dark roast blend.', storeId: defaultStoreId }
    ];
    for (const s of supplies) {
        await db.collection('supply_items').doc(s.id).set(s);
    }

    // INITIAL_RECIPES
    const recipes = [
        { id: 'rec1', productId: 'prod1', productName: 'Espresso', ingredients: [{ id: 'ring1', name: 'Coffee Beans', quantity: '18', unit: 'g', supplyItemId: 'supp1' }], instructions: ['Grind beans fine.', 'Tamp evenly.', 'Pull shot for 25-30s.'], notes: 'Standard double shot.', storeId: defaultStoreId },
        { id: 'rec2', productId: 'prod2', productName: 'Latte', ingredients: [{ id: 'ring2', name: 'Espresso', quantity: '1', unit: 'shot', supplyItemId: 'supp1' }, { id: 'ring3', name: 'Milk', quantity: '200', unit: 'ml', supplyItemId: 'supp2' }], instructions: ['Pull espresso shot.', 'Steam milk to 65C.', 'Pour milk over espresso with thin foam.'], notes: 'Latte art optional.', storeId: defaultStoreId }
    ];
    for (const r of recipes) {
        await db.collection('recipes').doc(r.id).set(r);
    }

    // INITIAL_SHIFTS
    const shiftDate = new Date().toISOString().split('T')[0];
    const shiftId = 'shift1';
    await db.collection('shifts').doc(shiftId).set({
        id: shiftId,
        userId: 'cashier1',
        userName: 'Default Cashier',
        role: 'Cashier',
        date: shiftDate,
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Opening shift',
        storeId: defaultStoreId
    });


    // INITIAL_APP_SETTINGS
    await db.collection('app_settings').doc('1').set({
        id: 1,
        registrationEnabled: 1,
        updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('Seeding completed successfully.');
}

// Only run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    seed().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

export { seed };
