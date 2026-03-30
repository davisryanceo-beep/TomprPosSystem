-- Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    contactInfo TEXT,
    currencyCode TEXT,
    timezone TEXT,
    createdAt TEXT,
    licenseExpiryDate TEXT,
    logoUrl TEXT,
    backgroundImageUrl TEXT,
    welcomeMessage TEXT,
    qrCodeUrl TEXT,
    displayTheme TEXT,
    backgroundColor TEXT,
    overlayOpacity REAL,
    accentColor TEXT,
    fontFamily TEXT,
    headerColor TEXT,
    bodyTextColor TEXT,
    logoSize INTEGER,
    telegramBotToken TEXT,
    telegramChatId TEXT
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    password TEXT,
    pin TEXT,
    firstName TEXT,
    lastName TEXT,
    profilePictureUrl TEXT,
    storeId TEXT,
    email TEXT,
    phoneNumber TEXT,
    FOREIGN KEY (storeId) REFERENCES stores(id)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT,
    stock INTEGER,
    imageUrl TEXT,
    description TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id)
);

-- Orders Table
-- items will be stored as JSON string
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    items TEXT, 
    tableNumber TEXT,
    totalAmount REAL,
    taxAmount REAL,
    discountAmount REAL,
    finalAmount REAL,
    status TEXT,
    timestamp TEXT,
    cashierId TEXT,
    baristaId TEXT,
    isRushOrder INTEGER,
    paymentMethod TEXT,
    paymentCurrency TEXT,
    cashTendered REAL,
    changeGiven REAL,
    appliedPromotionId TEXT,
    storeId TEXT NOT NULL,
    qrPaymentState TEXT,
    FOREIGN KEY (storeId) REFERENCES stores(id)
);

-- Supply Items
CREATE TABLE IF NOT EXISTS supply_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    currentStock REAL,
    unit TEXT,
    lowStockThreshold REAL,
    notes TEXT,
    purchaseDate TEXT,
    expiryDate TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id)
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    productName TEXT,
    ingredients TEXT,
    instructions TEXT,
    notes TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id),
    FOREIGN KEY (productId) REFERENCES products(id)
);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts(
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT,
    role TEXT,
    date TEXT,
    startTime TEXT,
    endTime TEXT,
    notes TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id),
    FOREIGN KEY(userId) REFERENCES users(id)
);

-- Promotions Table
CREATE TABLE IF NOT EXISTS promotions(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    startDate TEXT,
    endDate TEXT,
    minOrderAmount REAL,
    isActive INTEGER DEFAULT 1,
    applicableProductIds TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id)
);

-- Wastage Logs Table
CREATE TABLE IF NOT EXISTS wastage_logs(
    id TEXT PRIMARY KEY,
    itemId TEXT NOT NULL,
    itemName TEXT NOT NULL,
    quantity REAL NOT NULL,
    reason TEXT,
    date TEXT,
    reportedBy TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id)
);

-- Time Logs Table
CREATE TABLE IF NOT EXISTS time_logs(
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT,
    role TEXT,
    clockInTime TEXT,
    clockOutTime TEXT,
    notes TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id),
    FOREIGN KEY(userId) REFERENCES users(id)
);

-- Cash Drawer Logs Table
CREATE TABLE IF NOT EXISTS cash_drawer_logs(
    id TEXT PRIMARY KEY,
    shiftDate TEXT,
    declaredAmount REAL NOT NULL,
    expectedAmount REAL,
    discrepancy REAL,
    notes TEXT,
    adminNotes TEXT,
    reportedBy TEXT,
    logTimestamp TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id)
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements(
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL,
    authorId TEXT NOT NULL,
    authorName TEXT,
    timestamp TEXT,
    isArchived INTEGER DEFAULT 0,
    targetRoles TEXT, 
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id)
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS feedback(
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT,
    userId TEXT,
    userName TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id)
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS app_settings(
    id INTEGER PRIMARY KEY CHECK (id = 1),
    registrationEnabled INTEGER DEFAULT 1,
    updatedAt TEXT
);

-- Current Orders Table (for in-progress orders at POS terminals)
CREATE TABLE IF NOT EXISTS current_orders(
    id TEXT PRIMARY KEY,
    storeId TEXT NOT NULL,
    terminalId TEXT,
    items TEXT,
    tableNumber TEXT,
    totalAmount REAL,
    taxAmount REAL,
    discountAmount REAL,
    finalAmount REAL,
    cashierId TEXT,
    isRushOrder INTEGER,
    appliedPromotionId TEXT,
    qrPaymentState TEXT,
    lastUpdated TEXT,
    FOREIGN KEY(storeId) REFERENCES stores(id)
);
