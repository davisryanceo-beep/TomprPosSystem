export enum Role {
  ADMIN = 'Admin', // Global Administrator
  STORE_ADMIN = 'Store Admin', // Administrator for a specific store
  CASHIER = 'Cashier',
  BARISTA = 'Barista',
  STOCK_MANAGER = 'Stock Manager',
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  contactInfo?: string;
  currencyCode?: string; // e.g., USD, KHR
  timezone?: string;     // e.g., Asia/Phnom_Penh
  createdAt: string;    // ISO string
  licenseExpiryDate?: string; // ISO string, e.g., "2024-12-31"

  // Customer Display UI Customization
  logoUrl?: string;
  backgroundImageUrl?: string;
  welcomeMessage?: string;
  qrCodeUrl?: string; // URL for the payment QR code

  // Payment Integration
  khqrEnabled?: boolean;
  khqrMerchantID?: string;
  khqrMerchantName?: string;
  khqrCity?: string;

  // Advanced Display Customization
  displayTheme?: 'light' | 'dark'; // Theme for the content box
  backgroundColor?: string; // Fallback/overlay background color
  overlayOpacity?: number;  // Opacity for the background overlay (0 to 1)
  accentColor?: string; // For totals, highlights etc. e.g. '#10b981'
  fontFamily?: string; // e.g. 'Nunito', 'Lato'
  headerColor?: string; // For store name, welcome message
  bodyTextColor?: string; // For order items, regular text
  logoSize?: number; // Logo height in pixels

  // Integrations
  telegramBotToken?: string;
  telegramChatId?: string;
  taxRate?: number; // Store-specific tax rate
  displayLayout?: 'standard' | 'split-screen'; // Layout mode
  slideshowImageUrls?: string[]; // Array of image URLs for the slideshow

  // Staff Rewards
  rewardPolicy?: RewardPolicy;

  // Loyalty Settings
  loyaltyEnabled?: boolean;
  stampsPerItem?: number;
  stampsToRedeem?: number;
  loyaltyRewardDescription?: string;
  stampDisplayTimeout?: number;
  onlineMenuEnabled?: boolean;
}

export interface Customer {
  id: string;
  phoneNumber: string;
  password?: string;
  name?: string;
  currentStamps: number;
  totalEarnedStamps: number;
  loyaltyTier?: string;
  loyaltyPoints?: number;
  referralCode?: string;
  storeId: string;
  createdAt: Date;
}

export const LOYALTY_TIERS = {
    BRONZE: { name: 'Bronze', threshold: 0, perks: 'Member status' },
    SILVER: { name: 'Silver', threshold: 50, perks: 'Free Birthday Drink' },
    GOLD: { name: 'Gold', threshold: 150, perks: '20% off all Merch + Free Birthday Treat' }
};

export interface User {
  id: string;
  username: string;
  role: Role;
  password?: string;
  pin?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  storeId?: string;
  email?: string;
  phoneNumber?: string;
  salary?: number;       // Monthly base salary in USD
  hourlyRate?: number;   // Hourly rate for OT calculation
  monthlyDayOffAllowance?: number; // Allowed day-offs per month
}

export enum ProductCategory {
  COFFEE = 'Coffee',
  TEA = 'Tea',
  PASTRIES = 'Pastries',
  MERCHANDISE = 'Merchandise',
  UNCATEGORIZED = 'Uncategorized',
}

export interface Category {
  id: string;
  name: string;
  storeId: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  description?: string;
  storeId: string;
  // Modifiers & Customization
  modifierGroups?: string[]; // IDs of modifier groups
  allowAddOns?: boolean;
  // Seasonal
  isSeasonal?: boolean;
  seasonalInfo?: {
    startDate: Date;
    endDate: Date;
    badge: string;
  };
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  customizations?: {
    size?: 'Small' | 'Medium' | 'Large';
    milk?: 'None' | 'Dairy' | 'Oat' | 'Almond';
    sugar?: 'None' | '25%' | '50%' | '75%' | '100%';
    ice?: 'None' | 'Light Ice' | 'Regular Ice' | 'Extra Ice';
  };
  // Modifiers & Add-ons
  modifiers?: SelectedModifier[];
  addOns?: SelectedAddOn[];
  // Combo support
  isCombo?: boolean;
  comboId?: string;
  comboItems?: OrderItem[]; // nested items for combos
  // Item-level discount
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    reason?: string;
  };
}

export enum OrderStatus {
  CREATED = 'Created',
  RECEIVED = 'Received',
  PAID = 'Paid',
  PREPARING = 'Preparing',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export type PaymentMethod = 'Cash' | 'QR' | 'Unpaid';
export type PaymentCurrency = 'USD' | 'KHR';

export enum QRPaymentState {
  NONE = 'None',
  AWAITING_CUSTOMER_CONFIRMATION = 'AwaitingCustomerConfirmation',
  AWAITING_PAYMENT = 'AwaitingPayment',
  PAYMENT_SUCCESSFUL = 'PaymentSuccessful',
}


export interface Order {
  id: string;
  items: OrderItem[];
  tableNumber?: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount?: number;
  finalAmount: number;
  status: OrderStatus;
  timestamp: Date;
  cashierId?: string;
  baristaId?: string;
  isRushOrder?: boolean;
  paymentMethod?: PaymentMethod;
  paymentCurrency?: PaymentCurrency;
  cashTendered?: number;
  changeGiven?: number;
  appliedPromotionId?: string;
  storeId: string;
  qrPaymentState?: QRPaymentState;
  dailyOrderNumber?: number;
  customerId?: string;
  customerPhone?: string;
  // Kitchen Display fields
  kitchenStatus?: 'pending' | 'preparing' | 'ready' | 'completed';
  kitchenStartTime?: Date;
  kitchenReadyTime?: Date;

  // Delivery / Online Order Fields
  orderType?: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
  deliveryDetails?: {
    customerName: string;
    contactNumber: string;
    address: string;
    notes?: string;
  };
  pendingStampClaimId?: string;
  pendingStampCount?: number;
}

export enum SupplyCategory {
  CONTAINERS = 'Containers',
  INGREDIENTS_RAW = 'Raw Ingredients',
  CLEANING = 'Cleaning Supplies',
  STATIONERY = 'Stationery',
  OTHER = 'Other',
}

export interface SupplyItem {
  id: string;
  name: string;
  category: SupplyCategory;
  currentStock: number;
  unit: string;
  lowStockThreshold: number;
  notes?: string;
  purchaseDate?: string;
  expiryDate?: string;
  storeId: string;
  costPerUnit?: number;
}

export interface ChartDataPoint { name: string; value: number; }

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  supplyItemId: string;
  supplyItemName?: string;
  supplyItemUnit?: string;
}

export interface Recipe {
  id: string;
  productId: string;
  productName: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  notes?: string;
  storeId: string;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  storeId: string;
}

export enum PromotionType {
  PERCENTAGE_OFF_ORDER = 'Percentage off total order',
  FIXED_AMOUNT_OFF_ORDER = 'Fixed amount off total order',
  PERCENTAGE_OFF_ITEM = 'Percentage off specific item(s)',
}

export interface PromotionCondition {
  minOrderAmount?: number;
  applicableProductIds?: string[];
  applicableCategory?: ProductCategory; // Deprecated in favor of applicableCategoryIds
  applicableCategoryIds?: string[];
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  value: number;
  conditions: PromotionCondition;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  storeId: string;
}

export interface WastageLog {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'product' | 'supply';
  quantityWasted: number;
  reason?: string;
  dateLogged: string;
  loggedByUserId?: string;
  storeId: string;
}

export interface TimeLog {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  clockInTime: string;
  clockOutTime?: string;
  shiftId?: string;
  notes?: string;
  storeId: string;
}

export interface CashDrawerLog {
  id: string;
  cashierId: string;
  cashierName: string;
  shiftDate: string;
  declaredAmount: number;
  declaredAmountUSD?: number;
  expectedAmount: number;
  discrepancy: number;
  type: 'OPEN' | 'CLOSE' | 'DROP' | 'PAYOUT';
  cashierNotes?: string;
  adminNotes?: string;
  logTimestamp: string;
  storeId: string;
}

export enum AnnouncementPriority {
  NORMAL = 'Normal',
  IMPORTANT = 'Important',
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: string; // ISO string
  storeId?: string; // If undefined/null, it's a global announcement
  isArchived: boolean;
  priority: AnnouncementPriority;
}

export interface Feedback {
  id: string;
  timestamp: string; // ISO string
  orderId?: string;
  rating?: number; // 1-5
  comment?: string;
  givenByUserId: string; // Cashier who logged it
  storeId: string;
}

export interface AppSettings {
  registrationEnabled: boolean;
}

// Inventory Management Types
export interface InventoryItem {
  id: string;
  productId: string;
  currentStock: number;
  lowStockThreshold: number;
  unit: string;
  lastRestocked?: Date;
  supplier?: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  adjustmentAmount: number;
  reason: string;
  adjustedBy: string;
  timestamp: Date;
  previousStock: number;
  newStock: number;
}

// Analytics Types
export interface SalesAnalytics {
  date: string;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface PeakHourData {
  hour: number;
  orderCount: number;
  revenue: number;
}

// Product Modifiers & Combos Types

export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: number; // can be negative for discounts
  available: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple'; // single choice or multiple selections
  required: boolean;
  modifiers: Modifier[];
  storeId: string;
}

export interface ComboItem {
  productId: string;
  quantity: number;
  allowModifiers: boolean; // can customer customize this item?
}

export interface ComboProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  comboItems: ComboItem[];
  comboPrice: number;
  regularPrice: number; // sum of individual items
  savings: number; // calculated: regularPrice - comboPrice
  category: string;
  storeId: string;
  isActive: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  category: string; // "Toppings", "Extras", "Sides", etc.
  applicableCategories: string[]; // which product categories can use this
  storeId: string;
  isActive: boolean;
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  modifierId: string;
  modifierName: string;
  priceAdjustment: number;
}

export interface SelectedAddOn {
  id: string;
  name: string;
  price: number;
}

export interface RewardPolicy {
  earlyMinutes: number; // e.g. 15 minutes before shift start
  enabled: boolean;
  rewardName?: string; // e.g. "Free Morning Coffee"
  rewardProductId?: string; // Specific product to give, or generic credit? User said "select on the menu", so maybe ANY drink? Let's genericize or allow specific category.
  // For now: simple "Eligible" flag.
  allowedCategories?: string[]; // e.g. ['Coffee', 'Tea']
}

export interface StaffReward {
  id: string;
  userId: string;
  userName: string;
  storeId: string;
  date: string; // YYYY-MM-DD
  shiftId?: string;
  status: 'Available' | 'Claimed' | 'Expired';
  claimedOrderId?: string; // Linked 0.00 order
  claimedProductId?: string;
  claimedProductName?: string;
  timestamp: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  storeId: string;
  startDate: string; // ISO
  endDate: string; // ISO
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string; // ISO
  respondedAt?: string; // ISO
  responseNote?: string;
}

export interface OvertimeRequest {
  id: string;
  userId: string;
  userName: string;
  storeId: string;
  date: string;          // YYYY-MM-DD
  reason?: string;
  requestedHours: number;
  approvedHours?: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;   // ISO
  respondedAt?: string;  // ISO
  responseNote?: string;
}