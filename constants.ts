import { Role, User, Product, ProductCategory, Order, OrderStatus, SupplyItem, SupplyCategory, Store } from './types';

export const ROLES = Role;

// Helper to get future date for licenses
const getFutureDate = (months: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const INITIAL_STORES: Store[] = [
  {
    id: 'store1-downtown',
    name: 'Amble Specialty Cafe - Downtown',
    address: '123 Main St, Anytown',
    contactInfo: '555-1234',
    currencyCode: 'USD',
    timezone: 'America/New_York',
    createdAt: new Date().toISOString(),
    licenseExpiryDate: getFutureDate(12), // Default to 1 year license

    // Customer Display UI Customization
    logoUrl: 'https://picsum.photos/seed/logo1/200',
    backgroundImageUrl: 'https://picsum.photos/seed/bg1/1920/1080',
    welcomeMessage: 'Welcome! Your order will appear here as items are added at the counter.',
    qrCodeUrl: '',

    // Advanced Display Customization
    displayTheme: 'light',
    backgroundColor: '#f5f5f5',
    overlayOpacity: 0.7,
    accentColor: '#10b981', // emerald
    fontFamily: 'Nunito',
    headerColor: '#1e293b',
    bodyTextColor: '#334155',
    logoSize: 96,

    // Integrations
    telegramBotToken: '',
    telegramChatId: '',
  },
];

const defaultStoreId = INITIAL_STORES[0].id;

export const DEFAULT_USERS: User[] = [
  { id: 'admin1', username: 'globaladmin', role: ROLES.ADMIN, password: 'admin123', storeId: undefined, firstName: 'Global', lastName: 'Admin', email: 'global.admin@amble.cafe', phoneNumber: '+1111111111' },
  { id: 'storeadmin1', username: 'storeadmin', role: ROLES.STORE_ADMIN, password: 'storeadmin123', storeId: defaultStoreId, firstName: 'Store', lastName: 'Admin', email: 'store.admin@amble.cafe', phoneNumber: '+1222222222' },
  { id: 'cashier1', username: 'cashier', role: ROLES.CASHIER, password: 'cashier123', pin: '1111', storeId: defaultStoreId, firstName: 'Default', lastName: 'Cashier', email: 'cashier@amble.cafe', phoneNumber: '+1333333333' },
  { id: 'barista1', username: 'barista', role: ROLES.BARISTA, password: 'barista123', pin: '2222', storeId: defaultStoreId, firstName: 'Default', lastName: 'Barista', email: 'barista@amble.cafe', phoneNumber: '+1444444444' },
  { id: 'stockmanager1', username: 'stockmanager', role: ROLES.STOCK_MANAGER, password: 'stockmanager123', pin: '3333', storeId: defaultStoreId, firstName: 'Default', lastName: 'Stocker', email: 'stocker@amble.cafe', phoneNumber: '+1555555555' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod1', name: 'Espresso', price: 2.50, category: ProductCategory.COFFEE, stock: 3, imageUrl: 'https://picsum.photos/seed/espresso/200/200', description: 'Strong and bold, the classic Italian pick-me-up.', storeId: defaultStoreId },
  { id: 'prod2', name: 'Latte', price: 3.50, category: ProductCategory.COFFEE, stock: 80, imageUrl: 'https://picsum.photos/seed/latte/200/200', description: 'Smooth espresso with steamed milk and a thin layer of foam.', storeId: defaultStoreId },
  { id: 'prod3', name: 'Cappuccino', price: 3.25, category: ProductCategory.COFFEE, stock: 0, imageUrl: 'https://picsum.photos/seed/cappuccino/200/200', description: 'A perfect balance of espresso, steamed milk, and rich foam.', storeId: defaultStoreId },
  { id: 'prod4', name: 'Green Tea', price: 2.75, category: ProductCategory.TEA, stock: 50, imageUrl: 'https://picsum.photos/seed/greentea/200/200', description: 'Refreshing and healthy, packed with antioxidants.', storeId: defaultStoreId },
  { id: 'prod5', name: 'Croissant', price: 2.00, category: ProductCategory.PASTRIES, stock: 8, imageUrl: 'https://picsum.photos/seed/croissant/200/200', description: 'Buttery and flaky, a Parisian delight.', storeId: defaultStoreId },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'order1',
    items: [{ productId: 'prod1', productName: 'Espresso', quantity: 2, unitPrice: 2.50 }],
    tableNumber: '5',
    totalAmount: 5.00,
    taxAmount: 0.50,
    finalAmount: 5.50,
    status: OrderStatus.PAID,
    timestamp: new Date(Date.now() - 3600000 * 2),
    isRushOrder: true,
    paymentMethod: 'QR',
    storeId: defaultStoreId,
  },
  {
    id: 'order2',
    items: [
      { productId: 'prod2', productName: 'Latte', quantity: 1, unitPrice: 3.50, customizations: { size: 'Medium', milk: 'Oat' } },
      { productId: 'prod5', productName: 'Croissant', quantity: 1, unitPrice: 2.00 }
    ],
    tableNumber: 'Patio 2',
    totalAmount: 5.50,
    taxAmount: 0.55,
    finalAmount: 6.05,
    status: OrderStatus.PAID,
    timestamp: new Date(Date.now() - 3600000 * 1),
    paymentMethod: 'Cash',
    cashTendered: 10,
    changeGiven: 3.95,
    paymentCurrency: 'USD',
    storeId: defaultStoreId,
  },
];

export const INITIAL_SUPPLY_ITEMS: SupplyItem[] = [
  { id: 'sup1', name: '12oz Coffee Cups', category: SupplyCategory.CONTAINERS, currentStock: 500, unit: 'pieces', lowStockThreshold: 100, notes: 'Standard paper cups for medium drinks.', storeId: defaultStoreId },
  { id: 'sup2', name: '12oz Coffee Cup Lids', category: SupplyCategory.CONTAINERS, currentStock: 450, unit: 'pieces', lowStockThreshold: 100, storeId: defaultStoreId },
  { id: 'sup3', name: 'Espresso Blend Coffee Beans', category: SupplyCategory.INGREDIENTS_RAW, currentStock: 15, unit: 'kg', lowStockThreshold: 5, notes: 'Dark roast blend.', storeId: defaultStoreId },
];

export const COFFEE_COLORS = {
  dark: '#1e293b', // charcoal-dark
  medium: '#64748b', // charcoal-light
  light: '#f5f5f5', // cream
  accent: '#10b981', // emerald
  bean: '#e57373', // terracotta
  cream: '#ffffff', // cream-light
};

export const TABLE_NUMBERS: string[] = [
  'Takeaway', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'Patio 1', 'Patio 2', 'Patio 3', 'Patio 4', 'Custom Name'
];

export const TAX_RATE = 0.00; // Original value
export const DEFAULT_CURRENCY = 'KHR';
export const SECONDARY_CURRENCY = 'USD';
export const USD_TO_KHR_RATE = 4100; // $1 = 4,100៛
export const EXCHANGE_RATE = USD_TO_KHR_RATE; // Alias for modal compatibility
export const MAX_VARIANCE_WARNING = 1000; // 1000៛ threshold for Manager PIN
export const LOW_STOCK_THRESHOLD = 10;
export const LOW_SUPPLY_THRESHOLD = 20;