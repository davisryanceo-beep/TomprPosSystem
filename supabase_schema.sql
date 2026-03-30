-- Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    contactInfo TEXT,
    currencyCode TEXT,
    timezone TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    licenseExpiryDate TIMESTAMPTZ,
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
    "hourlyRate" REAL DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'Silver',
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Modifier Groups Table
CREATE TABLE IF NOT EXISTS modifierGroups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    selectionType TEXT,
    minSelections INTEGER,
    maxSelections INTEGER,
    options JSONB,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Addons Table
CREATE TABLE IF NOT EXISTS addons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Combos Table
CREATE TABLE IF NOT EXISTS combos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    imageUrl TEXT,
    items JSONB,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
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
    modifierGroups JSONB,
    allowAddOns BOOLEAN DEFAULT true,
    isSeasonal BOOLEAN DEFAULT false,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Orders Table
-- items will be stored as JSONB string
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    items JSONB, 
    tableNumber TEXT,
    totalAmount REAL,
    taxAmount REAL,
    discountAmount REAL,
    finalAmount REAL,
    status TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    cashierId TEXT,
    baristaId TEXT,
    isRushOrder BOOLEAN DEFAULT false,
    paymentMethod TEXT,
    paymentCurrency TEXT,
    cashTendered REAL,
    changeGiven REAL,
    appliedPromotionId TEXT,
    customerId TEXT,
    customerPhone TEXT,
    storeId TEXT NOT NULL,
    orderType TEXT DEFAULT 'POS',
    qrPaymentState TEXT,
    dailyOrderNumber INTEGER,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    phoneNumber TEXT NOT NULL,
    password TEXT,
    name TEXT,
    currentStamps INTEGER DEFAULT 0,
    totalEarnedStamps INTEGER DEFAULT 0,
    loyaltyPoints INTEGER DEFAULT 0,
    loyaltyTier TEXT DEFAULT 'Silver',
    referralCode TEXT UNIQUE,
    referredById TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (referredById) REFERENCES customers(id) ON DELETE SET NULL,
    UNIQUE(phoneNumber, storeId)
);

-- Stamp Claims Table (for QR Based Claims)
CREATE TABLE IF NOT EXISTS stamp_claims (
    id TEXT PRIMARY KEY DEFAULT 'claim-' || floor(random() * 1000000)::text,
    order_id TEXT NOT NULL,
    stamps INTEGER NOT NULL,
    is_claimed BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    store_id TEXT NOT NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Referral Logs Table
CREATE TABLE IF NOT EXISTS referral_logs (
    id TEXT PRIMARY KEY,
    referrerId TEXT NOT NULL,
    refereeId TEXT NOT NULL,
    stampsAwarded INTEGER DEFAULT 1,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (referrerId) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (refereeId) REFERENCES customers(id) ON DELETE CASCADE
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
    purchaseDate TIMESTAMPTZ,
    expiryDate TIMESTAMPTZ,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    productName TEXT,
    ingredients JSONB,
    instructions TEXT,
    notes TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts(
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT,
    role TEXT,
    date DATE,
    startTime TIMESTAMPTZ,
    endTime TIMESTAMPTZ,
    notes TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Promotions Table
CREATE TABLE IF NOT EXISTS promotions(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    startDate TIMESTAMPTZ,
    endDate TIMESTAMPTZ,
    minOrderAmount REAL,
    isActive BOOLEAN DEFAULT true,
    applicableProductIds JSONB,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Wastage Logs Table
CREATE TABLE IF NOT EXISTS wastage_logs(
    id TEXT PRIMARY KEY,
    itemId TEXT NOT NULL,
    itemName TEXT NOT NULL,
    quantity REAL NOT NULL,
    reason TEXT,
    date TIMESTAMPTZ,
    reportedBy TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Time Logs Table
CREATE TABLE IF NOT EXISTS time_logs(
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT,
    role TEXT,
    clockInTime TIMESTAMPTZ,
    clockOutTime TIMESTAMPTZ,
    notes TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Cash Drawer Logs Table
CREATE TABLE IF NOT EXISTS cash_drawer_logs(
    id TEXT PRIMARY KEY,
    shiftDate DATE,
    declaredAmount REAL NOT NULL,
    expectedAmount REAL,
    discrepancy REAL,
    notes TEXT,
    adminNotes TEXT,
    reportedBy TEXT,
    logTimestamp TIMESTAMPTZ DEFAULT NOW(),
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements(
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL,
    authorId TEXT NOT NULL,
    authorName TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    isArchived BOOLEAN DEFAULT false,
    targetRoles JSONB, 
    storeId TEXT,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Staff Rewards Table
CREATE TABLE IF NOT EXISTS staff_rewards (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT,
    storeId TEXT NOT NULL,
    date DATE,
    shiftId TEXT,
    status TEXT DEFAULT 'Available',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    claimedOrderId TEXT,
    claimedProductId TEXT,
    claimedProductName TEXT,
    claimedAt TIMESTAMPTZ,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Store Tasks Table
CREATE TABLE IF NOT EXISTS store_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT,
    status TEXT DEFAULT 'Pending',
    storeId TEXT NOT NULL,
    assignedTo TEXT,
    createdBy TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    completedBy TEXT,
    completedAt TIMESTAMPTZ,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS feedback(
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    userId TEXT,
    userName TEXT,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS app_settings(
    id INTEGER PRIMARY KEY CHECK (id = 1),
    registrationEnabled BOOLEAN DEFAULT true,
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Current Orders Table (for in-progress orders at POS terminals)
CREATE TABLE IF NOT EXISTS current_orders(
    id TEXT PRIMARY KEY,
    storeId TEXT NOT NULL,
    terminalId TEXT,
    items JSONB,
    tableNumber TEXT,
    totalAmount REAL,
    taxAmount REAL,
    discountAmount REAL,
    finalAmount REAL,
    cashierId TEXT,
    isRushOrder BOOLEAN DEFAULT false,
    appliedPromotionId TEXT,
    qrPaymentState TEXT,
    lastUpdated TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests(
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT,
    startDate TIMESTAMPTZ NOT NULL,
    endDate TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    respondedAt TIMESTAMPTZ,
    storeId TEXT NOT NULL,
    FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actorId TEXT,
    actorName TEXT,
    action TEXT NOT NULL,
    details TEXT,
    storeId TEXT,
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE SET NULL
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    reportedBy TEXT,
    reportedByName TEXT,
    storeId TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);
