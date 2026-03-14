import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = "https://gttxvvenzqdoiultoupc.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dHh2dmVuenFkb2l1bHRvdXBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTMwMjk0NSwiZXhwIjoyMDg2ODc4OTQ1fQ.9jCO9q9m7yGwDgBNc_FtI2fs0ZYUlwdtcLpDwLx6QR4";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function seed() {
    console.log('Starting final full seed process for Dev Database...');

    // 1. INITIAL_STORES
    const defaultStoreId = 'store1-downtown';
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 12);

    const store = {
        id: defaultStoreId,
        name: 'Amble Specialty Cafe - Downtown',
        address: '123 Main St, Anytown',
        contactinfo: '555-1234',
        currencycode: 'USD',
        timezone: 'America/New_York',
        createdat: new Date().toISOString(),
        licenseexpirydate: futureDate.toISOString().split('T')[0],
        logourl: 'https://picsum.photos/seed/logo1/200',
        backgroundimageurl: 'https://picsum.photos/seed/bg1/1920/1080',
        welcomemessage: 'Welcome! Your order will appear here as items are added at the counter.',
        qrcodeurl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Payment-For-Store-1',
        displaytheme: 'light',
        backgroundcolor: '#f5f5f5',
        overlayopacity: 0.7,
        accentcolor: '#10b981',
        fontfamily: 'Nunito',
        headercolor: '#1e293b',
        bodytextcolor: '#334155',
        logosize: 96
    };

    console.log('Upserting store...');
    const { error: storeErr } = await supabase.from('stores').upsert(store);
    if (storeErr) { console.error('Store Seed Error:', storeErr); return; }

    // 2. DEFAULT_USERS
    const hashedAdminPass = await bcrypt.hash('admin123', 10);
    const users = [
        { id: 'admin1', username: 'globaladmin', role: 'Admin', password: hashedAdminPass, pin: null, firstname: 'Global', lastname: 'Admin', profilepictureurl: null, storeid: null, email: 'global.admin@amble.cafe', phonenumber: '+1111111111' },
        { id: 'storeadmin1', username: 'storeadmin', role: 'Store Admin', password: await bcrypt.hash('storeadmin123', 10), pin: null, firstname: 'Store', lastname: 'Admin', profilepictureurl: null, storeid: defaultStoreId, email: 'store.admin@amble.cafe', phonenumber: '+1222222222' },
        { id: 'cashier1', username: 'cashier', role: 'Cashier', password: await bcrypt.hash('cashier123', 10), pin: '1111', firstname: 'Default', lastname: 'Cashier', profilepictureurl: null, storeid: defaultStoreId, email: 'cashier@amble.cafe', phonenumber: '+1333333333' }
    ];

    console.log('Upserting users...');
    const { error: usersErr } = await supabase.from('users').upsert(users);
    if (usersErr) { console.error('Users Seed Error:', usersErr); return; }

    // 3. INITIAL_CATEGORIES
    const categories = [
        { id: 'cat1', name: 'Coffee', storeid: defaultStoreId },
        { id: 'cat2', name: 'Tea', storeid: defaultStoreId },
        { id: 'cat3', name: 'Pastries', storeid: defaultStoreId }
    ];

    console.log('Upserting categories...');
    const { error: catErr } = await supabase.from('categories').upsert(categories);
    if (catErr) { console.error('Categories Seed Error:', catErr); return; }

    // 4. INITIAL_PRODUCTS
    const products = [
        { id: 'prod1', name: 'Espresso', price: 2.50, category: 'Coffee', stock: 3, imageurl: 'https://picsum.photos/seed/espresso/200/200', description: 'Strong and bold', storeid: defaultStoreId },
        { id: 'prod2', name: 'Latte', price: 3.50, category: 'Coffee', stock: 80, imageurl: 'https://picsum.photos/seed/latte/200/200', description: 'Smooth espresso', storeid: defaultStoreId }
    ];
    console.log('Upserting products...');
    const { error: prodErr } = await supabase.from('products').upsert(products);
    if (prodErr) { console.error('Products Seed Error:', prodErr); return; }

    // 5. INITIAL_APP_SETTINGS
    console.log('Upserting app settings...');
    const { error: appErr } = await supabase.from('app_settings').upsert({
        id: 1,
        registrationenabled: true,
        updatedat: new Date().toISOString()
    });
    if (appErr) { console.error('App Settings Seed Error:', appErr); return; }

    console.log('Seeding completed successfully!');
}

seed();
