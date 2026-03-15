import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useMemo } from 'react';
import {
  Product, Order, User, OrderStatus, OrderItem, Role, ProductCategory, SupplyItem,
  SupplyCategory, PaymentMethod, PaymentCurrency, Recipe, Shift, Promotion,
  PromotionType, WastageLog, TimeLog, CashDrawerLog, Store,
  Announcement, AnnouncementPriority, QRPaymentState, Feedback, Category, AppSettings, LeaveRequest, Customer
} from '../types';
import {
  INITIAL_PRODUCTS, INITIAL_ORDERS, DEFAULT_USERS, TAX_RATE,
  INITIAL_SUPPLY_ITEMS, INITIAL_STORES, ROLES, TABLE_NUMBERS
} from '../constants';
import {
  getStores, getUsers, getProducts, getOrders, getSupplyItems,
  createStore, deleteStore as apiDeleteStore, createProduct, updateProduct as apiUpdateProduct, deleteProduct as apiDeleteProduct, updateProductStock,

  createOrder, updateOrder as apiUpdateOrder, deleteOrder as apiDeleteOrder, createSupplyItem, updateSupplyItem as apiUpdateSupplyItem, deleteSupplyItem as apiDeleteSupplyItem,
  createUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser, updateStore as apiUpdateStore,
  getPromotions, createPromotion, updatePromotion as apiUpdatePromotion, deletePromotion as apiDeletePromotion,
  getCategories, createCategory, updateCategory as apiUpdateCategory, deleteCategory as apiDeleteCategory,
  getRecipes, createRecipe, updateRecipe as apiUpdateRecipe, deleteRecipe as apiDeleteRecipe,
  getShifts, createShift, updateShift as apiUpdateShift, deleteShift as apiDeleteShift,
  getWastageLogs, createWastageLog,
  getTimeLogs, createTimeLog, updateTimeLog as apiUpdateTimeLog, deleteTimeLog as apiDeleteTimeLog,
  getCashDrawerLogs, createCashDrawerLog, updateCashDrawerLog as apiUpdateCashDrawerLog,
  getAnnouncements, createAnnouncement, updateAnnouncement as apiUpdateAnnouncement, deleteAnnouncement as apiDeleteAnnouncement,
  getFeedback, createFeedback,
  getAppSettings, updateAppSettings as apiUpdateAppSettings,
  getLeaveRequests, updateLeaveRequest as apiUpdateLeaveRequest,
  getCurrentOrder, saveCurrentOrder, clearCurrentOrder,
  createStampClaim,
  deleteAllOrders,
  lookupCustomer as apiLookupCustomer, createCustomer as apiCreateCustomer, updateCustomer as apiUpdateCustomer
} from '../services/api';

// Helper to get future date string (YYYY-MM-DD)
const getFutureDateString = (months: number, fromDate?: Date): string => {
  const date = fromDate ? new Date(fromDate) : new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

const sendTelegramNotification = async (order: Order, store: Store) => {
  if (!store.telegramBotToken || !store.telegramChatId) {
    return;
  }

  const formatItemDetails = (item: OrderItem) => {
    const parts = [];
    if (item.isCombo) parts.push("COMBO");
    if (item.modifiers) parts.push(...item.modifiers.map(m => m.modifierName));
    if (item.addOns) parts.push(...item.addOns.map(a => a.name));
    if (item.customizations) {
      const legacy = Object.entries(item.customizations)
        .filter(([, value]) => value && value !== 'None' && value !== 'Medium' && value !== 'Regular Ice')
        .map(([, value]) => value);
      parts.push(...legacy);
    }
    return parts.length > 0 ? ` <i>(${parts.join(', ')})</i>` : '';
  };

  const itemsList = order.items.map(item =>
    `- ${item.quantity}x ${item.productName}${formatItemDetails(item)}`
  ).join('\n');

  const message = `
<b>🚀 New Order Received!</b>

<b>Store:</b> ${store.name}
<b>Order ID:</b> <code>#${order.id.slice(-6)}</code>
<b>Total:</b> <code>$${order.finalAmount.toFixed(2)}</code> (${order.paymentMethod})

<b>Items:</b>
<pre>
${itemsList}
</pre>
    `.trim();

  const url = `https://api.telegram.org/bot${store.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: store.telegramChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API Error:', errorData.description);
    }
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
};

interface ShopContextType {
  loading: boolean;
  stores: Store[];
  currentStoreId: string | null;
  setCurrentStoreId: (storeId: string | null) => void;
  addStore: (storeData: Omit<Store, 'id' | 'createdAt' | 'licenseExpiryDate'>) => void;
  updateStore: (updatedStore: Store) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;

  // Global App Settings
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => void;

  // Store-scoped data (some are now globally managed but filtered)
  products: Product[];
  orders: Order[];
  allUsers: User[]; // This will be the full, password-less list
  knownCategories: string[];
  supplyItems: SupplyItem[];
  recipes: Recipe[];
  shifts: Shift[];
  promotions: Promotion[];
  wastageLogs: WastageLog[];
  timeLogs: TimeLog[];
  cashDrawerLogs: CashDrawerLog[];
  announcements: Announcement[];
  feedbackList: Feedback[];

  // Store-scoped CRUD operations
  addProduct: (productData: Omit<Product, 'id' | 'storeId'>) => void;
  updateProduct: (updatedProduct: Product) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductsByCategory: (category: string) => Product[];

  addCategory: (categoryName: string) => Promise<boolean>;
  updateCategoryName: (oldName: string, newName: string) => Promise<boolean>;
  deleteCategory: (categoryName: string) => Promise<boolean>;

  addOrder: (orderData: Omit<Order, 'id' | 'storeId' | 'timestamp' | 'status' | 'totalAmount' | 'taxAmount' | 'finalAmount'>, items: OrderItem[]) => Promise<void>;

  updateOrderStatus: (orderId: string, status: OrderStatus, baristaId?: string) => void;
  updateOrder: (orderId: string, data: Partial<Order>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getPaidOrders: () => Order[];
  getShiftOrders: (cashierId: string, since: Date) => Order[];

  addUser: (userData: Omit<User, 'id'>, actingUser: User) => Promise<boolean>;
  updateUser: (updatedUser: User, actingUser: User) => Promise<boolean>;
  deleteUser: (userId: string, actingUser: User) => Promise<boolean>;
  registerUser: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; message: string; user?: User }>;
  getUserForAuth: (username: string) => User | undefined;
  verifyPinForAuth: (userId: string, pin: string) => User | undefined;
  verifyCurrentUserPassword: (userId: string, passwordToCheck: string) => boolean;

  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  lookupCustomer: (phoneNumber: string) => Promise<Customer | null>;
  registerCustomer: (customerData: Omit<Customer, 'id' | 'currentStamps' | 'totalEarnedStamps' | 'createdAt'>) => Promise<Customer | null>;
  awardStamps: (customerId: string, stamps: number) => Promise<boolean>;


  currentOrder: Order | null;
  createOrUpdateCurrentOrder: (item: OrderItem, quantityChange: number) => void;
  loadOrderAsCurrent: (order: Order) => void;
  clearCurrentOrder: () => void;
  saveOrderAsTab: (cashierId: string) => Promise<Order | null>;
  finalizeCurrentOrder: (
    cashierId: string,
    paymentMethod: PaymentMethod,
    paymentDetails?: {
      cashTendered?: number;
      changeGiven?: number;
      paymentCurrency?: PaymentCurrency;
    }
  ) => Promise<Order | null>;
  updateCurrentOrder: (updates: Partial<Order>) => void;
  setRushOrder: (isRush: boolean) => void;
  setTableNumberForCurrentOrder: (tableNumber: string) => void;
  applyPromotionToCurrentOrder: (promotionId: string) => void;
  removePromotionFromCurrentOrder: () => void;
  getActiveAndApplicablePromotions: (order: Order) => Promotion[];

  addSupplyItem: (itemData: Omit<SupplyItem, 'id' | 'storeId'>) => void;
  updateSupplyItem: (updatedItem: SupplyItem) => void;
  deleteSupplyItem: (itemId: string) => void;
  adjustSupplyStock: (itemId: string, amountChange: number) => void;
  getSupplyItemById: (itemId: string) => SupplyItem | undefined;

  addRecipe: (recipeData: Omit<Recipe, 'id' | 'storeId'>) => void;
  updateRecipe: (updatedRecipe: Recipe) => void;
  deleteRecipe: (recipeId: string) => void;
  getRecipeByProductId: (productId: string) => Recipe | undefined;

  addShift: (shiftData: Omit<Shift, 'id' | 'storeId'>) => void;
  updateShift: (updatedShift: Shift) => void;
  deleteShift: (shiftId: string) => void;

  addPromotion: (promotionData: Omit<Promotion, 'id' | 'storeId'>) => void;
  updatePromotion: (updatedPromotion: Promotion) => void;
  deletePromotion: (promotionId: string) => void;
  getPromotionById: (promotionId: string) => Promotion | undefined;

  addWastageLog: (logData: Omit<WastageLog, 'id' | 'storeId'>) => void;

  clockIn: (userId: string, userName: string, role: Role) => Promise<boolean>;
  clockOut: (userId: string, notes?: string) => Promise<boolean>;
  getActiveTimeLogForUser: (userId: string) => TimeLog | undefined;
  addManualTimeLog: (timeLogData: Omit<TimeLog, 'id' | 'storeId'>) => void;
  updateTimeLog: (updatedTimeLog: TimeLog) => void;
  deleteTimeLog: (timeLogId: string) => void;

  addCashDrawerLog: (logData: Omit<CashDrawerLog, 'id' | 'expectedAmount' | 'discrepancy' | 'logTimestamp' | 'adminNotes' | 'storeId'>) => void;
  updateCashDrawerLogAdminNotes: (logId: string, adminNotes: string) => void;

  // Announcement CRUD
  addAnnouncement: (announcementData: Omit<Announcement, 'id' | 'timestamp' | 'authorId' | 'authorName'>, author: User) => void;
  updateAnnouncement: (updatedAnnouncement: Announcement, author: User) => Promise<boolean>;
  archiveAnnouncement: (announcementId: string, archive: boolean, author: User) => Promise<boolean>;
  deleteAnnouncement: (announcementId: string, author: User) => Promise<boolean>;

  // Feedback CRUD
  addFeedback: (feedbackData: Omit<Feedback, 'id' | 'timestamp' | 'storeId'>) => void;
  reloadData: () => Promise<void>;

  leaveRequests: LeaveRequest[];
  updateLeaveRequest: (requestId: string, status: 'Approved' | 'Rejected', managerNotes?: string) => Promise<boolean>;
  
  // Offline & Sync
  isOnline: boolean;
  pendingOrdersCount: number;
  syncPendingOrders: () => Promise<void>;
  clearAllOrders: () => Promise<boolean>;

  // Alerts
  newOnlineOrders: Order[];
  acknowledgeOrder: (orderId: string) => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // --- GLOBAL STATE ---
  const [loading, setLoading] = useState<boolean>(true);
  const [storesState, setStoresState] = useState<Store[]>([]);
  const [productsState, setProductsState] = useState<Product[]>([]);
  const [ordersState, setOrdersState] = useState<Order[]>([]);
  const [supplyItemsState, setSupplyItemsState] = useState<SupplyItem[]>([]);
  const [recipesState, setRecipesState] = useState<Recipe[]>([]);
  const [shiftsState, setShiftsState] = useState<Shift[]>([]);
  const [promotionsState, setPromotionsState] = useState<Promotion[]>([]);
  const [wastageLogsState, setWastageLogsState] = useState<WastageLog[]>([]);
  const [timeLogsState, setTimeLogsState] = useState<TimeLog[]>([]);
  const [cashDrawerLogsState, setCashDrawerLogsState] = useState<CashDrawerLog[]>([]);
  const [announcementsState, setAnnouncementsState] = useState<Announcement[]>([]);
  const [feedbackListState, setFeedbackListState] = useState<Feedback[]>([]);
  const [leaveRequestsState, setLeaveRequestsState] = useState<LeaveRequest[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Sync online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load pending orders from localStorage
    const saved = localStorage.getItem('pending_orders');
    if (saved) {
      try {
        setPendingOrders(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse pending orders", e);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Persist pending orders
    localStorage.setItem('pending_orders', JSON.stringify(pendingOrders));
  }, [pendingOrders]);

  const syncPendingOrders = useCallback(async () => {
    if (!isOnline || pendingOrders.length === 0) return;

    console.log(`Attempting to sync ${pendingOrders.length} pending orders...`);
    const successIds: string[] = [];
    
    for (const order of pendingOrders) {
      try {
        await createOrder(order);
        const store = storesState.find(s => s.id === order.storeId);
        if (store) sendTelegramNotification(order, store);
        successIds.push(order.id);
      } catch (e) {
        console.error(`Failed to sync order ${order.id}`, e);
        // Stop syncing if we hit a network error again
        if (!navigator.onLine) break;
      }
    }

    if (successIds.length > 0) {
      setPendingOrders(prev => prev.filter(o => !successIds.includes(o.id)));
    }
  }, [isOnline, pendingOrders, storesState]);

  useEffect(() => {
    if (isOnline) {
      syncPendingOrders();
    }
  }, [isOnline, syncPendingOrders]);

  // --- USER MANAGEMENT REFACTOR ---
  const [usersDB, setUsersDB] = useState<User[]>([]);

  // Detect STAMP_ONLY mode
  const isStampOnly = useMemo(() => {
    return import.meta.env.VITE_STAMP_ONLY === 'true' || window.location.hostname.includes('tompr-stamp');
  }, []);

  // --- RELOAD DATA (Exposed) ---
  const reloadData = useCallback(async () => {
    // --- PHASE 1: CRITICAL DATA (Blocking) ---
    // Fetch settings, stores, and users first so the app can initialize routing and auth checks.
    try {
      const settingsRes = await getAppSettings();
      setAppSettings(settingsRes.data);
    } catch (e) {
      console.error("Failed to fetch app settings", e);
    }

    const token = localStorage.getItem('token');
    
    // In STAMP_ONLY mode, we only need public stores if not logged in
    if (isStampOnly && !token) {
        try {
            const storesRes = await getStores();
            setStoresState(storesRes.data);
        } catch (err) {
            console.error("Failed to fetch stores for loyalty", err);
        }
        setLoading(false);
        return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Critical: Stores (for assignment check) and Users (for role/auth)
      const [storesRes, usersRes] = await Promise.all([
        getStores(),
        getUsers()
      ]);
      setStoresState(storesRes.data);
      setUsersDB(usersRes.data);
    } catch (err) {
      console.error("Failed to fetch critical data", err);
    } finally {
      // Unblock the UI as soon as critical data is ready
      setLoading(false);
    }

    // --- PHASE 2: SECONDARY DATA (Background) ---
    // Skip POS-specific data if in loyalty mode and not explicitly an admin
    if (isStampOnly) {
        // Just fetch promotions and announcements for loyalty
        try {
            const [promotionsRes, announcementsRes] = await Promise.all([
                getPromotions(),
                getAnnouncements()
            ]);
            setPromotionsState(promotionsRes.data || []);
            setAnnouncementsState(announcementsRes.data || []);
        } catch (e) {
            console.error("Failed to fetch loyalty secondary data", e);
        }
        return;
    }

    // Fetch remaining data to populate dashboards. Errors here won't block the UI load.
    try {
      const [productsRes, ordersRes, supplyRes, promotionsRes, categoriesRes, recipesRes, shiftsRes, wastageRes, timeLogsRes, cashLogsRes, announcementsRes, feedbackRes, leaveRes] = await Promise.all([
        getProducts(),
        getOrders(),
        getSupplyItems(),
        getPromotions(),
        getCategories(),
        getRecipes(),
        getShifts(),
        getWastageLogs(),
        getTimeLogs(),
        getCashDrawerLogs(),
        getAnnouncements(),
        getFeedback(),
        getLeaveRequests()
      ]);

      setProductsState(productsRes.data || []);
      setOrdersState((ordersRes.data || []).map((o: any) => ({ ...o, timestamp: new Date(o.timestamp) })));
      setSupplyItemsState(supplyRes.data || []);
      setCategoriesState(categoriesRes.data || []);
      setPromotionsState(promotionsRes.data || []);
      setRecipesState(recipesRes.data || []);
      setShiftsState(shiftsRes.data || []);
      setWastageLogsState(wastageRes.data || []);
      setTimeLogsState(timeLogsRes.data || []);
      setCashDrawerLogsState(cashLogsRes.data || []);
      setAnnouncementsState(announcementsRes.data || []);
      setFeedbackListState(feedbackRes.data || []);
      setLeaveRequestsState(leaveRes.data || []);

    } catch (err) {
      console.error("Failed to fetch secondary data", err);
    }
  }, []);

  // --- DATA FETCHING & LIVE UPDATES ---
  useEffect(() => {
    reloadData();

    // Auto-refresh every 30 seconds for "Live Update" experience
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log("Auto-refreshing data...");
        reloadData();
      }
    }, 30000); // 30 seconds

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'lastDataUpdate') {
        console.log("Data update detected from another tab, reloading...");
        reloadData();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadData(); // Refresh immediately when coming back to the tab
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reloadData]);

  // A derived, password-less version of users for displaying in the UI.
  const usersState = useMemo(() => usersDB.map(u => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, pin, ...userToDisplay } = u;
    return userToDisplay;
  }), [usersDB]);

  // --- CATEGORY & APP SETTINGS ---
  const [categoriesState, setCategoriesState] = useState<Category[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ registrationEnabled: false });

  // --- CURRENT ORDER & STORE CONTEXT ---
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);


  // --- LOCALSTORAGE PERSISTENCE EFFECTS ---
  // API Managed Entities: Stores, Products, Orders, SupplyItems, Users - Removed localStorage sync
  // useEffect(() => { localStorage.setItem('shopStores', JSON.stringify(storesState)); }, [storesState]);
  // useEffect(() => { localStorage.setItem('shopProducts', JSON.stringify(productsState)); }, [productsState]);
  // useEffect(() => { localStorage.setItem('shopOrders', JSON.stringify(ordersState)); }, [ordersState]);
  // useEffect(() => { localStorage.setItem('shopSupplyItems', JSON.stringify(supplyItemsState)); }, [supplyItemsState]);

  // useEffect(() => { localStorage.setItem('shopAllKnownCategories', JSON.stringify(allKnownCategoriesState)); }, [allKnownCategoriesState]);
  // useEffect(() => { localStorage.setItem('shopRecipes', JSON.stringify(recipesState)); }, [recipesState]);
  // useEffect(() => { localStorage.setItem('shopShifts', JSON.stringify(shiftsState)); }, [shiftsState]);
  // useEffect(() => { localStorage.setItem('shopPromotions', JSON.stringify(promotionsState)); }, [promotionsState]);
  // useEffect(() => { localStorage.setItem('shopWastageLogs', JSON.stringify(wastageLogsState)); }, [wastageLogsState]);
  // useEffect(() => { localStorage.setItem('shopTimeLogs', JSON.stringify(timeLogsState)); }, [timeLogsState]);
  // useEffect(() => { localStorage.setItem('shopCashDrawerLogs', JSON.stringify(cashDrawerLogsState)); }, [cashDrawerLogsState]);
  // useEffect(() => { localStorage.setItem('shopAnnouncements', JSON.stringify(announcementsState)); }, [announcementsState]);
  // useEffect(() => { localStorage.setItem('shopFeedback', JSON.stringify(feedbackListState)); }, [feedbackListState]);
  // useEffect(() => { localStorage.setItem('shopAppSettings', JSON.stringify(appSettings)); }, [appSettings]);
  useEffect(() => {
    if (currentOrder) {
      // Prevent race conditions where ShopContext overwrites CashierInterface's
      // manually injected PAYMENT_SUCCESSFUL states with stale AWAITING_PAYMENT states
      const storedOrderRaw = localStorage.getItem('currentOrder');
      if (storedOrderRaw) {
        try {
          const storedOrder = JSON.parse(storedOrderRaw);
          if (storedOrder.qrPaymentState === 'PaymentSuccessful' && currentOrder.qrPaymentState !== 'PaymentSuccessful') {
            // If local storage is already showing SUCCESS, let it be!
            return;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      localStorage.setItem('currentOrder', JSON.stringify(currentOrder));
    } else {
      const storedOrderRaw = localStorage.getItem('currentOrder');
      if (storedOrderRaw) {
        try {
          const storedOrder = JSON.parse(storedOrderRaw);
          if (storedOrder.qrPaymentState === 'PaymentSuccessful') {
            return; // Keep the success screen visible on Customer Display!
          }
        } catch (e) { }
      }
      localStorage.removeItem('currentOrder');
    }
  }, [currentOrder]);

  const setCurrentStoreId = useCallback((storeId: string | null) => {
    setCurrentStoreIdState(storeId);
    setCurrentOrder(null);
    console.log("Current store ID set to:", storeId);
  }, []);

  // Fetch current order when store changes
  useEffect(() => {
    const loadCurrentOrder = async () => {
      if (currentStoreId) {
        try {
          const response = await getCurrentOrder(currentStoreId);
          if (response.data) {
            let loadedOrder = { ...response.data, timestamp: new Date(response.data.timestamp || new Date()) };
            // Auto-reset hanging QR states to avoid stuck "Awaiting Payment" screens across login sessions
            if (loadedOrder.qrPaymentState === QRPaymentState.AWAITING_PAYMENT || loadedOrder.qrPaymentState === QRPaymentState.AWAITING_CUSTOMER_CONFIRMATION) {
              loadedOrder.qrPaymentState = QRPaymentState.NONE;
            }
            setCurrentOrder(loadedOrder);
          }
        } catch (err) {
          console.error("Failed to load current order", err);
        }
      }
    };
    loadCurrentOrder();
  }, [currentStoreId]);

  const updateAppSettings = useCallback(async (settings: Partial<AppSettings>) => {
    const newSettings = { ...appSettings, ...settings };
    setAppSettings(newSettings);
    try {
      await apiUpdateAppSettings(newSettings);
    } catch (err) {
      console.error("Failed to update app settings", err);
    }
  }, [appSettings]);

  const addStore = useCallback(async (storeData: Omit<Store, 'id' | 'createdAt' | 'licenseExpiryDate'>) => {
    const trimmedNewStoreName = storeData.name.trim().toLowerCase();
    const existingStore = storesState.find(s => s.name.trim().toLowerCase() === trimmedNewStoreName);
    if (existingStore) {
      alert(`A store with the name "${storeData.name.trim()}" already exists. Please choose a different name.`);
      return;
    }

    const creationDate = new Date();
    const newStore: Store = {
      ...storeData,
      id: `store-${Date.now()}`,
      createdAt: creationDate.toISOString(),
      licenseExpiryDate: getFutureDateString(1, creationDate) // Default 1 month license
    };

    try {
      await createStore(newStore);
      setStoresState(prev => [...prev, newStore]);
      // setAllKnownCategoriesState(prev => ({ ...prev, [newStore.id]: [...Object.values(ProductCategory)] })); // Removed in favor of global category management

      alert(`Store "${newStore.name}" created with a 1-month license. Please remember to assign a Store Administrator via the User Accounts panel.`);
    } catch (e) {
      console.error("Failed to create store", e);
    }
  }, [storesState]);

  const updateStore = useCallback(async (updatedStore: Store) => {
    const trimmedUpdatedStoreName = updatedStore.name.trim().toLowerCase();
    const existingStore = storesState.find(s => s.id !== updatedStore.id && s.name.trim().toLowerCase() === trimmedUpdatedStoreName);
    if (existingStore) {
      alert(`Another store with the name "${updatedStore.name.trim()}" already exists. Please choose a different name.`);
      return;
    }

    try {
      await apiUpdateStore(updatedStore.id, updatedStore);
      setStoresState(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
      localStorage.setItem('lastDataUpdate', Date.now().toString());
    } catch (e) {
      console.error("Failed to update store", e);
    }
  }, [storesState]);

  const deleteStore = useCallback(async (storeId: string) => {
    // Confirmation is now handled in the UI component (StoreManagement.tsx)
    try {
      await apiDeleteStore(storeId);
      setStoresState(prev => prev.filter(s => s.id !== storeId));
      setProductsState(prev => prev.filter(p => p.storeId !== storeId));
      setOrdersState(prev => prev.filter(o => o.storeId !== storeId));
      setSupplyItemsState(prev => prev.filter(si => si.storeId !== storeId));
      setRecipesState(prev => prev.filter(r => r.storeId !== storeId));
      setShiftsState(prev => prev.filter(s => s.storeId !== storeId));
      setPromotionsState(prev => prev.filter(p => p.storeId !== storeId));
      setWastageLogsState(prev => prev.filter(w => w.storeId !== storeId));
      setTimeLogsState(prev => prev.filter(t => t.storeId !== storeId));
      setCashDrawerLogsState(prev => prev.filter(c => c.storeId !== storeId));
      setAnnouncementsState(prev => prev.filter(a => a.storeId !== storeId));
      setUsersDB(prev => prev.filter(u => u.storeId !== storeId || (u.role === ROLES.ADMIN && !u.storeId)));
      setCategoriesState(prev => prev.filter(c => c.storeId !== storeId));

      if (currentStoreId === storeId) setCurrentStoreId(null);

    } catch (e) {
      console.error("Failed to delete store", e);
      alert("Failed to delete store. Please try again.");
    }
  }, [currentStoreId, setCurrentStoreId, setStoresState, setProductsState, setOrdersState, setSupplyItemsState, setRecipesState, setShiftsState, setPromotionsState, setWastageLogsState, setTimeLogsState, setCashDrawerLogsState, setAnnouncementsState, setUsersDB, setCategoriesState]);

  const getStoreById = useCallback((storeId: string) => storesState.find(s => s.id === storeId), [storesState]);

  // --- FILTERED DATA (DERIVED STATE) ---
  const products = useMemo(() => currentStoreId ? productsState.filter(p => p.storeId === currentStoreId) : [], [productsState, currentStoreId]);
  const orders = useMemo(() => currentStoreId ? ordersState.filter(o => o.storeId === currentStoreId) : [], [ordersState, currentStoreId]);
  const supplyItems = useMemo(() => currentStoreId ? supplyItemsState.filter(s => s.storeId === currentStoreId) : [], [supplyItemsState, currentStoreId]);
  const recipes = useMemo(() => currentStoreId ? recipesState.filter(r => r.storeId === currentStoreId) : [], [recipesState, currentStoreId]);
  const shifts = useMemo(() => currentStoreId ? shiftsState.filter(s => s.storeId === currentStoreId) : [], [shiftsState, currentStoreId]);
  const promotions = useMemo(() => currentStoreId ? promotionsState.filter(p => p.storeId === currentStoreId) : [], [promotionsState, currentStoreId]);
  const wastageLogs = useMemo(() => currentStoreId ? wastageLogsState.filter(w => w.storeId === currentStoreId) : [], [wastageLogsState, currentStoreId]);
  const timeLogs = useMemo(() => currentStoreId ? timeLogsState.filter(t => t.storeId === currentStoreId) : [], [timeLogsState, currentStoreId]);
  const cashDrawerLogs = useMemo(() => currentStoreId ? cashDrawerLogsState.filter(c => c.storeId === currentStoreId) : [], [cashDrawerLogsState, currentStoreId]);
  const feedbackList = useMemo(() => currentStoreId ? feedbackListState.filter(f => f.storeId === currentStoreId) : [], [feedbackListState, currentStoreId]);

  const announcements = useMemo(() => {
    return announcementsState.filter(a => !a.storeId || a.storeId === currentStoreId);
  }, [announcementsState, currentStoreId]);

  const knownCategories = useMemo(() => {
    return currentStoreId ? categoriesState.filter(c => c.storeId === currentStoreId).map(c => c.name).sort() : [];
  }, [categoriesState, currentStoreId]);

  // --- AUTHENTICATION HELPERS FOR AuthContext ---
  const getUserForAuth = useCallback((username: string): User | undefined => {
    return usersDB.find(u => u.username.toLowerCase() === username.toLowerCase());
  }, [usersDB]);

  const verifyPinForAuth = useCallback((userId: string, pin: string): User | undefined => {
    return usersDB.find(u => u.id === userId && u.pin === pin);
  }, [usersDB]);

  const verifyCurrentUserPassword = useCallback((userId: string, passwordToCheck: string): boolean => {
    const user = usersDB.find(u => u.id === userId);
    return !!user && user.password === passwordToCheck;
  }, [usersDB]);

  // --- CRUD OPERATIONS ---
  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'storeId'>) => {
    if (!currentStoreId) { alert("Please select a store first."); return; }
    const newProduct: Product = { ...productData, id: `prod-${Date.now()}`, storeId: currentStoreId };

    try {
      await createProduct(newProduct);
      setProductsState((prev) => [...prev, newProduct]);
    } catch (e) { console.error(e); }
  }, [currentStoreId]);

  const updateProduct = useCallback(async (updatedProduct: Product) => {
    if (!currentStoreId || updatedProduct.storeId !== currentStoreId) {
      alert("Store context mismatch or product does not belong to the current store.");
      return;
    }
    try {
      await apiUpdateProduct(updatedProduct.id, updatedProduct);
      setProductsState((prev) => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch (e) {
      console.error("Failed to update product", e);
      alert("Failed to update product.");
    }
  }, [currentStoreId]);

  const deleteProduct = useCallback(async (productId: string) => {
    try {
      await apiDeleteProduct(productId);
      setProductsState((prev) => prev.filter(p => p.id !== productId || p.storeId !== currentStoreId));
    } catch (e) {
      console.error("Failed to delete product", e);
      alert("Failed to delete product.");
    }
  }, [currentStoreId]);

  const getProductById = useCallback((productId: string) => products.find(p => p.id === productId), [products]);
  const getProductsByCategory = useCallback((category: string) => products.filter(p => p.category === category), [products]);

  const getShiftOrders = useCallback((cashierId: string, since: Date) => {
    return orders.filter(
      (o) =>
        o.cashierId === cashierId &&
        new Date(o.timestamp) >= since &&
        (o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED)
    );
  }, [orders]);

  const addCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    if (!currentStoreId) { alert("Please select a store first."); return false; }
    const trimmedName = categoryName.trim();
    if (!trimmedName) { alert("Category name cannot be empty."); return false; }

    const exists = categoriesState.some(c => c.storeId === currentStoreId && c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) { alert(`Category "${trimmedName}" already exists in this store.`); return false; }

    const newCategory = { id: `cat-${Date.now()}`, name: trimmedName, storeId: currentStoreId };
    try {
      await createCategory(newCategory);
      setCategoriesState((prev) => [...prev, newCategory]);
      return true;
    } catch (e) {
      console.error("Failed to add category", e);
      return false;
    }
  }, [currentStoreId, categoriesState]);

  const updateCategoryName = useCallback(async (oldName: string, newName: string): Promise<boolean> => {
    if (!currentStoreId) { alert("Please select a store first."); return false; }
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName) return false;

    const exists = categoriesState.some(c => c.storeId === currentStoreId && c.name.toLowerCase() === trimmedNewName.toLowerCase() && c.name !== oldName);
    if (exists) {
      alert(`Category "${trimmedNewName}" already exists in this store.`); return false;
    }

    const categoryToUpdate = categoriesState.find(c => c.storeId === currentStoreId && c.name === oldName);
    if (!categoryToUpdate) return false;

    try {
      await apiUpdateCategory(categoryToUpdate.id, { name: trimmedNewName });
      setCategoriesState(prev => prev.map(c => c.id === categoryToUpdate.id ? { ...c, name: trimmedNewName } : c));

      // Update products with this category
      const productsToUpdate = productsState.filter(p => p.storeId === currentStoreId && p.category === oldName);

      setProductsState(prev => prev.map(p => (p.category === oldName && p.storeId === currentStoreId) ? { ...p, category: trimmedNewName } : p));

      await Promise.all(productsToUpdate.map(p => updateProduct({ ...p, category: trimmedNewName })));
      return true;
    } catch (e) {
      console.error("Failed to update category name", e);
      return false;
    }
  }, [currentStoreId, categoriesState, productsState]);

  const deleteCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    if (!currentStoreId) { alert("Please select a store first."); return false; }
    const isCategoryInUse = productsState.some(p => p.category === categoryName && p.storeId === currentStoreId);
    if (isCategoryInUse) {
      alert(`Category "${categoryName}" is in use by products in this store and cannot be deleted.`); return false;
    }

    const categoryToDelete = categoriesState.find(c => c.storeId === currentStoreId && c.name === categoryName);
    if (!categoryToDelete) return false;

    try {
      await apiDeleteCategory(categoryToDelete.id);
      setCategoriesState(prev => prev.filter(c => c.id !== categoryToDelete.id));
      return true;
    } catch (e) {
      console.error("Failed to delete category", e);
      return false;
    }
  }, [currentStoreId, productsState, categoriesState]);

  const addUser = useCallback(async (userData: Omit<User, 'id'>, actingUser: User): Promise<boolean> => {
    if (!actingUser) { alert("Authentication error."); return false; }
    let storeToAssign = userData.storeId;
    const isActingUserGlobalAdmin = actingUser.role === ROLES.ADMIN && !actingUser.storeId;
    const isActingUserStoreAdmin = actingUser.role === ROLES.STORE_ADMIN && !!actingUser.storeId;

    if (isActingUserGlobalAdmin) {
      if (userData.role === ROLES.ADMIN) {
        storeToAssign = undefined;
      } else if (userData.role === ROLES.STORE_ADMIN) {
        if (!storeToAssign) { alert("Store Admins must be assigned to a specific store."); return false; }
      } else {
        if (!storeToAssign && currentStoreId) {
          storeToAssign = currentStoreId;
        } else if (!storeToAssign) {
          alert("Non-admin users must be assigned to a store. Please select a store."); return false;
        }
      }
    } else if (isActingUserStoreAdmin) {
      storeToAssign = actingUser.storeId;
    } else {
      alert("Permission denied or invalid configuration for adding user."); return false;
    }

    const newUserWithId: User = {
      ...userData,
      id: `user-${Date.now()}`,
      storeId: storeToAssign,
      password: userData.password || 'password123'
    };

    try {
      await createUser(newUserWithId);
      setUsersDB(prev => [...prev, newUserWithId]);
      return true;
    } catch (e) {
      console.error("Failed to create user", e);
      alert("Failed to create user.");
      return false;
    }
  }, [currentStoreId, setUsersDB]);

  const updateUser = useCallback(async (updatedUser: User, actingUser: User): Promise<boolean> => {
    if (!actingUser) { alert("Authentication error."); return false; }

    const originalUserInDB = usersDB.find(u => u.id === updatedUser.id);
    if (!originalUserInDB) { alert("User not found."); return false; }

    const isActingUserGlobalAdmin = actingUser.role === ROLES.ADMIN && !actingUser.storeId;
    const isActingUserStoreAdmin = actingUser.role === ROLES.STORE_ADMIN && !!actingUser.storeId;

    let finalUser = { ...updatedUser };

    if (isActingUserGlobalAdmin) {
      if (finalUser.role === ROLES.ADMIN) {
        finalUser.storeId = undefined;
      } else if (finalUser.role === ROLES.STORE_ADMIN) {
        if (!finalUser.storeId) { alert("Store Admins must be assigned to a store."); return false; }
      } else {
        if (!finalUser.storeId) {
          finalUser.storeId = currentStoreId || originalUserInDB.storeId;
          if (!finalUser.storeId) {
            alert("This user role must be assigned to a store."); return false;
          }
        }
      }
    } else if (isActingUserStoreAdmin) {
      if (originalUserInDB.storeId !== actingUser.storeId) { alert("Store Admins can only edit users within their own store."); return false; }
      if (finalUser.role === ROLES.STORE_ADMIN && finalUser.id !== actingUser.id) {
        alert("Store Admins cannot change another user's role to an Admin or Store Admin role.");
        return false;
      }
      if (originalUserInDB.role === ROLES.STORE_ADMIN && originalUserInDB.id !== actingUser.id) {
        alert("Store Admins cannot edit other Store Admins.");
        return false;
      }
      if (finalUser.storeId !== actingUser.storeId) { alert("Store Admins cannot change a user's store assignment."); return false; }
    } else {
      if (actingUser.id !== finalUser.id) { alert("Permission denied."); return false; }
      finalUser.role = originalUserInDB.role;
      finalUser.storeId = originalUserInDB.storeId;
    }

    // Preserve password/pin if not provided in update
    const newPassword = finalUser.password ? finalUser.password : originalUserInDB.password;
    const newPin = finalUser.pin ? finalUser.pin : originalUserInDB.pin;
    finalUser = { ...finalUser, password: newPassword, pin: newPin };

    try {
      await apiUpdateUser(finalUser.id, finalUser);
      setUsersDB(prev => prev.map(u => u.id === finalUser.id ? finalUser : u));
      return true;
    } catch (e) {
      console.error("Failed to update user", e);
      alert("Failed to update user.");
      return false;
    }
  }, [usersDB, currentStoreId, setUsersDB]);

  const deleteUser = useCallback(async (userId: string, actingUser: User): Promise<boolean> => {
    if (!actingUser) { alert("Authentication error."); return false; }
    const userToDelete = usersDB.find(u => u.id === userId);
    if (!userToDelete) { alert("User not found."); return false; }

    const isActingUserGlobalAdmin = actingUser.role === ROLES.ADMIN && !actingUser.storeId;
    const isActingUserStoreAdmin = actingUser.role === ROLES.STORE_ADMIN && !!actingUser.storeId;

    if (userToDelete.id === actingUser.id) { alert("You cannot delete your own account."); return false; }

    if (isActingUserGlobalAdmin) {
      // GA can delete anyone
    } else if (isActingUserStoreAdmin) {
      if (userToDelete.storeId !== actingUser.storeId) { alert("Store Admins can only delete users within their own store."); return false; }
    } else {
      alert("Permission denied."); return false;
    }

    if (window.confirm(`Are you sure you want to delete user: ${userToDelete.username}? This is irreversible.`)) {
      try {
        await apiDeleteUser(userId);
        setUsersDB(prev => prev.filter(u => u.id !== userId));
        return true;
      } catch (e) {
        console.error("Failed to delete user", e);
        return false;
      }
    }
    return false;
  }, [usersDB, setUsersDB]);

  const registerUser = useCallback(async (userData: Omit<User, 'id'>): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      // The API endpoint handles creating the user, finding duplicates, and hashing passwords
      // We'll use the existing POST /api/users endpoint. Since there's no auth yet, 
      // we need a public registration flow if it is the first user, OR we adapt it
      // For now we'll do a direct fetch because `createUser` from api.ts sends the token

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, message: result.error || 'Registration failed.' };
      }

      const newUser = result.user;
      setUsersDB(prev => [...prev, newUser]);
      return { success: true, message: 'Registration successful!', user: newUser };

    } catch (err: any) {
      console.error("Registration failed", err);
      return { success: false, message: err.message || 'An error occurred during registration.' };
    }
  }, [setUsersDB]);

  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'storeId' | 'timestamp' | 'status' | 'totalAmount' | 'taxAmount' | 'finalAmount'>, items: OrderItem[]) => {
    if (!currentStoreId) return;

    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const currentStore = getStoreById(currentStoreId);
    const taxRate = typeof currentStore?.taxRate === 'number' ? currentStore.taxRate : 0;
    const taxAmount = totalAmount * taxRate;
    const finalAmount = totalAmount + taxAmount;

    const newOrder: Order = {
      ...orderData,
      id: `order-${Date.now()}`,
      items: items,
      totalAmount,
      taxAmount,
      finalAmount,
      timestamp: new Date(),
      status: OrderStatus.CREATED,
      storeId: currentStoreId,
    };

    // Calculate Daily Order Number
    const todayStr = new Date().toDateString();
    const todaysOrders = ordersState.filter(o =>
      o.storeId === currentStoreId &&
      new Date(o.timestamp).toDateString() === todayStr
    );
    const maxOrderNum = todaysOrders.reduce((max, o) => Math.max(max, o.dailyOrderNumber || 0), 0);
    newOrder.dailyOrderNumber = maxOrderNum + 1;

    try {
      if (isOnline) {
        await createOrder(newOrder);
        setOrdersState(prev => [...prev, newOrder]);
      } else {
        // Queue for later
        setPendingOrders(prev => [...prev, newOrder]);
        alert("You are offline. Order saved locally and will sync when online.");
      }
    } catch (error) {
      console.error('Failed to save order to server, queuing offline', error);
      setPendingOrders(prev => [...prev, newOrder]);
      alert("Failed to save order to server. Order saved locally and will sync when online.");
    }
  }, [currentStoreId, isOnline, ordersState, getStoreById]);

  const updateOrder = useCallback(async (orderId: string, data: Partial<Order>) => {
    try {
      await apiUpdateOrder(orderId, data);
      setOrdersState(prev => prev.map(o => o.id === orderId ? { ...o, ...data } : o));
    } catch (e) {
      console.error("Failed to update order", e);
      throw e;
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      await apiDeleteOrder(orderId);
      setOrdersState(prev => prev.filter(o => o.id !== orderId));
    } catch (e) {
      console.error("Failed to delete order", e);
      throw e;
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, baristaId?: string) => {
    try {
      await apiUpdateOrder(orderId, { status, baristaId });
      setOrdersState(prev => prev.map(o => {
        if (o.id === orderId) {
          const updatedOrder = { ...o, status };
          if (status === OrderStatus.PREPARING && baristaId) {
            updatedOrder.baristaId = baristaId;
          }
          if (status === OrderStatus.COMPLETED) {
            // Deduct stock logic
            setProductsState(currentProducts => {
              const newProducts = [...currentProducts];
              o.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                  newProducts[productIndex].stock -= item.quantity;
                  updateProductStock(item.productId, newProducts[productIndex].stock);
                }
              });
              return newProducts;
            });
          }
          return updatedOrder;
        }
        return o;
      }));
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }, []);

  const getOrdersByStatus = useCallback((status: OrderStatus) => {
    return orders.filter(o => o.status === status).sort((a, b) => (b.isRushOrder ? 1 : -1) - (a.isRushOrder ? 1 : -1) || a.timestamp.getTime() - b.timestamp.getTime());
  }, [orders]);

  const getPaidOrders = useCallback(() => {
    return orders.filter(o => o.status === OrderStatus.PAID).sort((a, b) => (b.isRushOrder ? 1 : -1) - (a.isRushOrder ? 1 : -1) || a.timestamp.getTime() - b.timestamp.getTime());
  }, [orders]);

  // --- CURRENT ORDER LOGIC ---
  const currentStore = useMemo(() => {
    if (!currentStoreId) return null;
    return storesState.find(s => s.id === currentStoreId) || null;
  }, [currentStoreId, storesState]);

  const calculateOrderTotals = (order: Order | null): { total: number, tax: number, final: number, discount: number } => {
    if (!order) return { total: 0, tax: 0, final: 0, discount: 0 };

    let total = 0;
    let itemLevelDiscountTotal = 0;

    // Calculate subtotal and item-level discounts
    order.items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      total += itemTotal;

      if (item.discount) {
        let d = 0;
        if (item.discount.type === 'percentage') {
          d = itemTotal * (item.discount.value / 100);
        } else {
          d = item.discount.value;
        }
        itemLevelDiscountTotal += Math.min(d, itemTotal);
      }
    });

    let discount = itemLevelDiscountTotal;

    if (order.appliedPromotionId) {
      const promotion = promotions.find(p => p.id === order.appliedPromotionId);
      if (promotion) {
        // --- VALIDITY CHECK START ---
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeVal = currentHours * 60 + currentMinutes;

        let isValid = true;
        if (!promotion.isActive) isValid = false;
        if (promotion.startDate && new Date(promotion.startDate) > now) isValid = false;
        if (promotion.endDate && new Date(promotion.endDate) < now) isValid = false;

        if (isValid && promotion.conditions.startTime) {
          const [startH, startM] = promotion.conditions.startTime.split(':').map(Number);
          const startTimeVal = startH * 60 + startM;
          if (currentTimeVal < startTimeVal) isValid = false;
        }

        if (isValid && promotion.conditions.endTime) {
          const [endH, endM] = promotion.conditions.endTime.split(':').map(Number);
          const endTimeVal = endH * 60 + endM;
          if (currentTimeVal > endTimeVal) isValid = false;
        }

        if (isValid) {
          // --- VALIDITY CHECK END ---
          // Calculate eligible amount for global promo (after item discounts)
          // We will apply global promo on the REMAINING amount to avoid double dipping?
          // Or should we apply on gross?
          // Providing stackable discounts is risky. Let's apply on the net amount after item discounts.

          let eligibleAmount = Math.max(0, total - itemLevelDiscountTotal);

          const hasCategoryRestrictions = (promotion.conditions.applicableCategoryIds && promotion.conditions.applicableCategoryIds.length > 0) || promotion.conditions.applicableCategory;

          if (hasCategoryRestrictions) {
            // Filter items that match the categories AND subtract their specific item discounts
            const eligibleItems = order.items.filter(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return false;

              // Check new array based categories
              if (promotion.conditions.applicableCategoryIds && promotion.conditions.applicableCategoryIds.length > 0) {
                return promotion.conditions.applicableCategoryIds.includes(product.category);
              }

              // Fallback to legacy single category
              if (promotion.conditions.applicableCategory) {
                return product.category === promotion.conditions.applicableCategory;
              }
              return false;
            });

            // Calculate eligible total for these specific items, MINUS their specific discounts
            eligibleAmount = eligibleItems.reduce((sum, item) => {
              const itemTotal = item.unitPrice * item.quantity;
              let itemDiscount = 0;
              if (item.discount) {
                if (item.discount.type === 'percentage') {
                  itemDiscount = itemTotal * (item.discount.value / 100);
                } else {
                  itemDiscount = item.discount.value;
                }
              }
              return sum + Math.max(0, itemTotal - itemDiscount);
            }, 0);
          }

          let globalPromoDiscount = 0;
          switch (promotion.type) {
            case PromotionType.PERCENTAGE_OFF_ORDER:
              globalPromoDiscount = eligibleAmount * (promotion.value / 100);
              break;
            case PromotionType.FIXED_AMOUNT_OFF_ORDER:
              // Cap fixed amount at eligible total
              globalPromoDiscount = Math.min(promotion.value, eligibleAmount);
              break;
            case PromotionType.PERCENTAGE_OFF_ITEM:
              // Usually handled per item, but if legacy type exists:
              globalPromoDiscount = eligibleAmount * (promotion.value / 100);
              break;
          }

          discount += globalPromoDiscount;
        }
      }
    }

    const finalAfterDiscount = Math.max(0, total - discount);
    
    // Tiered Discount (Silver: 0%, Gold: 5%, Platinum: 10%)
    let tierDiscount = 0;
    if (selectedCustomer) {
      if (selectedCustomer.loyaltyTier === 'Gold') {
        tierDiscount = finalAfterDiscount * 0.05;
      } else if (selectedCustomer.loyaltyTier === 'Platinum') {
        tierDiscount = finalAfterDiscount * 0.10;
      }
    }
    
    const finalAfterTierDiscount = finalAfterDiscount - tierDiscount;
    const storeTaxRate = currentStore?.taxRate ?? 0;
    const tax = finalAfterTierDiscount * storeTaxRate;
    const final = finalAfterTierDiscount + tax;

    return { total, tax, final, discount: discount + tierDiscount };
  };


  const updateCurrentOrder = useCallback(async (updates: Partial<Order>) => {
    setCurrentOrder(prev => {
      const updated = prev ? { ...prev, ...updates } : null;
      if (updated) {
        saveCurrentOrder(updated).catch(err => console.error("Failed to save current order", err));
      }
      return updated;
    });
  }, []);

  const loadOrderAsCurrent = useCallback((order: Order) => {
    setCurrentOrder(order);
    saveCurrentOrder(order).catch(err => console.error("Failed to locally save loaded order", err));
  }, []);

  const createOrUpdateCurrentOrder = useCallback((item: OrderItem, quantityChange: number) => {
    setCurrentOrder(prevOrder => {
      const newOrder = prevOrder ? { ...prevOrder, items: [...prevOrder.items] } : {
        id: `temp-${Date.now()}`, items: [], totalAmount: 0, taxAmount: 0, finalAmount: 0,
        status: OrderStatus.CREATED, timestamp: new Date(), storeId: currentStoreId || '',
      };

      const itemKey = item.productId + JSON.stringify(item.customizations);
      const existingItemIndex = newOrder.items.findIndex(i => i.productId + JSON.stringify(i.customizations) === itemKey);

      if (existingItemIndex > -1) {
        const updatedItem = { ...newOrder.items[existingItemIndex] };
        updatedItem.quantity += quantityChange;

        if (updatedItem.quantity <= 0) {
          newOrder.items = newOrder.items.filter((_, index) => index !== existingItemIndex);
        } else {
          newOrder.items = [
            ...newOrder.items.slice(0, existingItemIndex),
            updatedItem,
            ...newOrder.items.slice(existingItemIndex + 1)
          ];
        }
      } else if (quantityChange > 0) {
        newOrder.items = [...newOrder.items, { ...item, quantity: quantityChange }];
      }

      const { total, tax, final, discount } = calculateOrderTotals(newOrder);
      newOrder.totalAmount = total;
      newOrder.taxAmount = tax;
      newOrder.finalAmount = final;
      newOrder.discountAmount = discount;

      if (newOrder) delete newOrder.qrPaymentState;
      if (newOrder.items.length === 0) {
        // Clear from database if no items
        if (prevOrder?.id) {
          clearCurrentOrder(prevOrder.id).catch(err => console.error("Failed to clear current order", err));
        }
        return null;
      }
      // Save to database
      saveCurrentOrder(newOrder).catch(err => console.error("Failed to save current order", err));
      return newOrder;
    });
  }, [currentStoreId, promotions]);

  const clearCurrentOrderLocal = useCallback(async () => {
    if (currentOrder?.id) {
      try {
        await clearCurrentOrder(currentOrder.id);
      } catch (err) {
        console.error("Failed to clear current order from database", err);
      }
    }
    setCurrentOrder(null);
  }, [currentOrder]);

  const lookupCustomer = useCallback(async (phoneNumber: string) => {
    try {
      const res = await apiLookupCustomer(phoneNumber, currentStoreId || undefined);
      return res.data;
    } catch (err) {
      console.error("Failed to lookup customer", err);
      return null;
    }
  }, [currentStoreId]);

  const registerCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'currentStamps' | 'totalEarnedStamps' | 'createdAt'>) => {
    try {
      const newCustomer: Customer = {
        ...customerData,
        id: `cust-${Date.now()}`,
        currentStamps: 0,
        totalEarnedStamps: 0,
        createdAt: new Date(),
        storeId: currentStoreId || customerData.storeId
      };
      const res = await apiCreateCustomer(newCustomer);
      if (res.data.success) {
        return newCustomer;
      }
      return null;
    } catch (err) {
      console.error("Failed to register customer", err);
      return null;
    }
  }, [currentStoreId]);

  const awardStamps = useCallback(async (customerId: string, stamps: number) => {
    try {
      if (!selectedCustomer) return false;
      const updatedStamps = (selectedCustomer.currentStamps || 0) + stamps;
      const totalEarned = (selectedCustomer.totalEarnedStamps || 0) + stamps;

      const res = await apiUpdateCustomer(customerId, {
        currentStamps: updatedStamps,
        totalEarnedStamps: totalEarned
      });

      if (res.data.success) {
        // Update local state if it's the current customer
        if (selectedCustomer.id === customerId) {
          setSelectedCustomer({
            ...selectedCustomer,
            currentStamps: updatedStamps,
            totalEarnedStamps: totalEarned
          });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to award stamps", err);
      return false;
    }
  }, [selectedCustomer]);

  const finalizeCurrentOrder = useCallback(async (cashierId: string, paymentMethod: PaymentMethod, paymentDetails?: { cashTendered?: number; changeGiven?: number, paymentCurrency?: PaymentCurrency }) => {

    if (!currentOrder || !currentStoreId) return null;

    const isExistingTab = currentOrder.id && currentOrder.id.startsWith('order-');
    const orderId = isExistingTab ? currentOrder.id : `order-${Date.now()}`;

    const finalizedOrder: Order = {
      ...currentOrder,
      id: orderId,
      status: OrderStatus.PAID,
      timestamp: new Date(),
      cashierId: cashierId,
      paymentMethod,
      customerId: selectedCustomer?.id,
      customerPhone: selectedCustomer?.phoneNumber,
      ...paymentDetails
    };

    // Calculate Daily Order Number only if not already set (e.g. from a tab)
    if (!finalizedOrder.dailyOrderNumber) {
      const todayStr = new Date().toDateString();
      const todaysOrders = ordersState.filter(o =>
        o.storeId === currentStoreId &&
        new Date(o.timestamp).toDateString() === todayStr
      );
      const maxOrderNum = todaysOrders.reduce((max, o) => Math.max(max, o.dailyOrderNumber || 0), 0);
      finalizedOrder.dailyOrderNumber = maxOrderNum + 1;
    }

    try {
      let globalSavedOrder: Order;
      if (isOnline) {
        if (isExistingTab) {
          await apiUpdateOrder(orderId, finalizedOrder);
          globalSavedOrder = finalizedOrder;
          setOrdersState(prev => prev.map(o => o.id === orderId ? finalizedOrder : o));
        } else {
          const res = await createOrder(finalizedOrder);
          globalSavedOrder = { ...res.data.order };
          setOrdersState(prev => [...prev, globalSavedOrder]);
        }
        const store = storesState.find(s => s.id === currentStoreId);
        if (store) sendTelegramNotification(globalSavedOrder, store);
      } else {
        // Offline: Queue for later
        globalSavedOrder = finalizedOrder; // Use the finalized order as the "saved" one for local state
        setPendingOrders(prev => [...prev, finalizedOrder]);
        setOrdersState(prev => [...prev, finalizedOrder]); // Add to ordersState for immediate display
        alert("You are offline. Order saved locally and will sync when online.");
      }

      setProductsState(prevProducts => {
        const updatedProducts = [...prevProducts];
        finalizedOrder.items.forEach(item => {
          const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
          if (productIndex > -1) {
            const newStock = Math.max(0, updatedProducts[productIndex].stock - item.quantity);
            updatedProducts[productIndex] = { ...updatedProducts[productIndex], stock: newStock };
            updateProductStock(item.productId, newStock);
          }
        });
        return updatedProducts;
      });

      const store = storesState.find(s => s.id === currentStoreId);

      // Award stamps or generate a public claim QR
      if (store?.loyaltyEnabled) {
        const stampsPerItem = store.stampsPerItem || 1;
        const totalStamps = finalizedOrder.items.reduce((sum, item) => sum + item.quantity, 0) * stampsPerItem;

        if (totalStamps > 0) {
          if (selectedCustomer) {
            await awardStamps(selectedCustomer.id, totalStamps);
            
            // Auto-upgrade tier
            const newTotalStamps = (selectedCustomer.totalEarnedStamps || 0) + totalStamps;
            let newTier = selectedCustomer.loyaltyTier || 'Silver';
            if (newTotalStamps >= 150) newTier = 'Platinum';
            else if (newTotalStamps >= 50) newTier = 'Gold';
            
            if (newTier !== selectedCustomer.loyaltyTier) {
              await apiUpdateCustomer(selectedCustomer.id, { 
                loyaltyTier: newTier,
                loyaltyPoints: (selectedCustomer.loyaltyPoints || 0) + Math.floor(finalizedOrder.finalAmount)
              });
              setSelectedCustomer({ ...selectedCustomer, loyaltyTier: newTier, currentStamps: selectedCustomer.currentStamps + totalStamps, totalEarnedStamps: newTotalStamps });
            } else {
              await apiUpdateCustomer(selectedCustomer.id, {
                loyaltyPoints: (selectedCustomer.loyaltyPoints || 0) + Math.floor(finalizedOrder.finalAmount)
              });
            }
          } else {
            try {
              const claimRes = await createStampClaim({
                storeId: currentStoreId,
                orderId: globalSavedOrder.id,
                stamps: totalStamps
              });
              if (claimRes.data.success) {
                globalSavedOrder.pendingStampClaimId = claimRes.data.claimId;
                globalSavedOrder.pendingStampCount = totalStamps;
                // Update local currentOrder state so CustomerDisplay can see it
                setCurrentOrder({ ...globalSavedOrder });
                saveCurrentOrder(globalSavedOrder).catch(err => console.error("Failed to save order with claim", err));
              }
            } catch (e) {
              console.error("Failed to create stamp claim", e);
            }
          }
        }
      }

      // Explicitly broadcast success to Customer Display via localStorage
      // before clearing the local cashier cart state.
      const successDisplayOrder = {
        ...globalSavedOrder,
        qrPaymentState: QRPaymentState.PAYMENT_SUCCESSFUL
      };
      localStorage.setItem('currentOrder', JSON.stringify(successDisplayOrder));

      clearCurrentOrderLocal();
      return globalSavedOrder;
    } catch (err) {
      console.error("Failed to finalize order", err);
      if (!isOnline) {
        // If already offline, it's already queued. If it failed while online, queue it.
        setPendingOrders(prev => [...prev, finalizedOrder]);
        alert("Failed to finalize order to server. Order saved locally and will sync when online.");
      }
      return null;
    }
  }, [currentOrder, currentStoreId, clearCurrentOrderLocal, storesState, selectedCustomer, awardStamps, isOnline, ordersState]);

  const saveOrderAsTab = useCallback(async (cashierId: string) => {

    if (!currentOrder || !currentStoreId) return null;

    const tabOrder: Order = {
      ...currentOrder, id: `order-${Date.now()}`, status: OrderStatus.CREATED,
      timestamp: new Date(), cashierId: cashierId, paymentMethod: 'Unpaid'
    };

    // Calculate Daily Order Number
    const todayStr = new Date().toDateString();
    const todaysOrders = ordersState.filter(o =>
      o.storeId === currentStoreId &&
      new Date(o.timestamp).toDateString() === todayStr
    );
    const maxOrderNum = todaysOrders.reduce((max, o) => Math.max(max, o.dailyOrderNumber || 0), 0);
    tabOrder.dailyOrderNumber = maxOrderNum + 1;

    try {
      const res = await createOrder(tabOrder);
      const savedOrder = res.data.order;
      setOrdersState(prev => [...prev, savedOrder]);
      // Note: We intentionally do NOT deduct stock upon saving a tab, 
      // stock will be deducted when the order is loaded and completely PAID.
      clearCurrentOrderLocal();
      return savedOrder;
    } catch (err) {
      console.error("Failed to save order as tab", err);
      return null;
    }
  }, [currentOrder, currentStoreId, clearCurrentOrderLocal, ordersState]);

  const setRushOrder = useCallback((isRush: boolean) => {
    setCurrentOrder(prev => {
      const updated = prev ? { ...prev, isRushOrder: isRush, qrPaymentState: undefined } : null;
      if (updated) {
        saveCurrentOrder(updated).catch(err => console.error("Failed to save current order", err));
      }
      return updated;
    });
  }, []);

  const setTableNumberForCurrentOrder = useCallback((tableNumber: string) => {
    setCurrentOrder(prev => {
      const updated = prev ? { ...prev, tableNumber, qrPaymentState: undefined } : null;
      if (updated) {
        saveCurrentOrder(updated).catch(err => console.error("Failed to save current order", err));
      }
      return updated;
    });
  }, []);

  // --- AUTO-UPDATE CURRENT ORDER WHEN PROMOTIONS CHANGE ---
  React.useEffect(() => {
    if (currentOrder && currentOrder.appliedPromotionId) {
      setCurrentOrder(prevOrder => {
        if (!prevOrder) return null;
        // Re-calculate totals using the updated promotions list (from closure)
        // Note: 'promotions' in the dependency array ensures this runs when they update.
        const { total, tax, final, discount } = calculateOrderTotals(prevOrder);

        // Only update if values actually changed to avoid loop (though useEffect dep handles it mostly)
        if (prevOrder.discountAmount !== discount || prevOrder.finalAmount !== final) {
          const newOrder = { ...prevOrder, totalAmount: total, taxAmount: tax, finalAmount: final, discountAmount: discount };
          return newOrder;
        }
        return prevOrder;
      });
    }
  }, [promotions]);

  const getActiveAndApplicablePromotions = useCallback((order: Order): Promotion[] => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeVal = currentHours * 60 + currentMinutes;

    return promotions.filter(promo => {
      if (!promo.isActive) return false;
      if (promo.startDate && new Date(promo.startDate) > now) return false;
      if (promo.endDate && new Date(promo.endDate) < now) return false;

      // Time of Day Check
      if (promo.conditions.startTime) {
        const [startH, startM] = promo.conditions.startTime.split(':').map(Number);
        const startTimeVal = startH * 60 + startM;
        if (currentTimeVal < startTimeVal) return false;
      }
      if (promo.conditions.endTime) {
        const [endH, endM] = promo.conditions.endTime.split(':').map(Number);
        const endTimeVal = endH * 60 + endM;
        if (currentTimeVal > endTimeVal) return false;
      }

      const total = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      if (promo.conditions.minOrderAmount && total < promo.conditions.minOrderAmount) return false;
      return true;
    });
  }, [promotions]);

  const applyPromotionToCurrentOrder = useCallback((promotionId: string) => {
    setCurrentOrder(prevOrder => {
      if (!prevOrder) return null;
      const newOrder = { ...prevOrder, appliedPromotionId: promotionId, qrPaymentState: undefined };
      const { total, tax, final, discount } = calculateOrderTotals(newOrder);
      newOrder.totalAmount = total; newOrder.taxAmount = tax; newOrder.finalAmount = final; newOrder.discountAmount = discount;
      saveCurrentOrder(newOrder).catch(err => console.error("Failed to save current order", err));
      return newOrder;
    });
  }, [promotions]);

  const removePromotionFromCurrentOrder = useCallback(() => {
    setCurrentOrder(prevOrder => {
      if (!prevOrder) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { appliedPromotionId, qrPaymentState, ...rest } = prevOrder;
      const newOrder = { ...rest };
      const { total, tax, final, discount } = calculateOrderTotals(newOrder);
      newOrder.totalAmount = total; newOrder.taxAmount = tax; newOrder.finalAmount = final; newOrder.discountAmount = discount;
      saveCurrentOrder(newOrder).catch(err => console.error("Failed to save current order", err));
      return newOrder;
    });
  }, [promotions]);

  // --- OTHER CRUD ---
  const addSupplyItem = useCallback(async (itemData: Omit<SupplyItem, 'id' | 'storeId'>) => {
    if (!currentStoreId) return;
    const newItem: SupplyItem = { ...itemData, id: `sup-${Date.now()}`, storeId: currentStoreId };
    try {
      await createSupplyItem(newItem);
      setSupplyItemsState(prev => [...prev, newItem]);
    } catch (e) {
      console.error("Failed to create supply item", e);
    }
  }, [currentStoreId]);
  const updateSupplyItem = useCallback(async (updatedItem: SupplyItem) => {
    try {
      await apiUpdateSupplyItem(updatedItem.id, updatedItem);
      setSupplyItemsState(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    } catch (e) {
      console.error("Failed to update supply item", e);
    }
  }, []);
  const deleteSupplyItem = useCallback(async (itemId: string) => {
    try {
      await apiDeleteSupplyItem(itemId);
      setSupplyItemsState(prev => prev.filter(item => item.id !== itemId));
    } catch (e) {
      console.error("Failed to delete supply item", e);
    }
  }, []);
  const adjustSupplyStock = useCallback(async (itemId: string, amountChange: number) => {
    // Find the item first to get current stock and calculate new stock
    const item = supplyItems.find(i => i.id === itemId);
    if (!item) return;
    const newStock = Math.max(0, item.currentStock + amountChange);
    const updatedItem = { ...item, currentStock: newStock };

    try {
      await apiUpdateSupplyItem(itemId, updatedItem);
      setSupplyItemsState(prev => prev.map(i => i.id === itemId ? updatedItem : i));
    } catch (e) {
      console.error("Failed to adjust supply stock", e);
    }
  }, [supplyItems]);
  const getSupplyItemById = useCallback((itemId: string) => supplyItems.find(item => item.id === itemId), [supplyItems]);
  const addRecipe = useCallback(async (recipeData: Omit<Recipe, 'id' | 'storeId'>) => {
    if (!currentStoreId) return;
    const newRecipe: Recipe = { ...recipeData, id: `rec-${Date.now()}`, storeId: currentStoreId };
    try {
      await createRecipe(newRecipe);
      setRecipesState(prev => [...prev, newRecipe]);
    } catch (e) {
      console.error("Failed to add recipe", e);
    }
  }, [currentStoreId]);
  const updateRecipe = useCallback(async (updatedRecipe: Recipe) => {
    try {
      await apiUpdateRecipe(updatedRecipe.id, updatedRecipe);
      setRecipesState(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
    } catch (e) {
      console.error("Failed to update recipe", e);
    }
  }, []);
  const deleteRecipe = useCallback(async (recipeId: string) => {
    try {
      await apiDeleteRecipe(recipeId);
      setRecipesState(prev => prev.filter(r => r.id !== recipeId));
    } catch (e) {
      console.error("Failed to delete recipe", e);
    }
  }, []);
  const getRecipeByProductId = useCallback((productId: string) => recipes.find(r => r.productId === productId), [recipes]);
  const addShift = useCallback(async (shiftData: Omit<Shift, 'id' | 'storeId'>) => {
    if (!currentStoreId) return;
    const newShift: Shift = { ...shiftData, id: `shift-${Date.now()}`, storeId: currentStoreId };
    try {
      await createShift(newShift);
      setShiftsState(prev => [...prev, newShift]);
    } catch (e) {
      console.error("Failed to add shift", e);
    }
  }, [currentStoreId]);
  const updateShift = useCallback(async (updatedShift: Shift) => {
    try {
      await apiUpdateShift(updatedShift.id, updatedShift);
      setShiftsState(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
    } catch (e) {
      console.error("Failed to update shift", e);
    }
  }, []);
  const deleteShift = useCallback(async (shiftId: string) => {
    try {
      await apiDeleteShift(shiftId);
      setShiftsState(prev => prev.filter(s => s.id !== shiftId));
    } catch (e) {
      console.error("Failed to delete shift", e);
    }
  }, []);
  const addPromotion = useCallback(async (promotionData: Omit<Promotion, 'id' | 'storeId'>) => {
    if (!currentStoreId) return;
    const newPromotion: Promotion = { ...promotionData, id: `promo-${Date.now()}`, storeId: currentStoreId };
    try {
      await createPromotion(newPromotion);
      setPromotionsState(prev => [...prev, newPromotion]);
    } catch (e) {
      console.error("Failed to create promotion", e);
    }
  }, [currentStoreId]);
  const updatePromotion = useCallback(async (updatedPromotion: Promotion) => {
    try {
      await apiUpdatePromotion(updatedPromotion.id, updatedPromotion);
      setPromotionsState(prev => prev.map(p => p.id === updatedPromotion.id ? updatedPromotion : p));
    } catch (e) {
      console.error("Failed to update promotion", e);
    }
  }, []);
  const deletePromotion = useCallback(async (promotionId: string) => {
    try {
      await apiDeletePromotion(promotionId);
      setPromotionsState(prev => prev.filter(p => p.id !== promotionId));
    } catch (e) {
      console.error("Failed to delete promotion", e);
    }
  }, []);
  const getPromotionById = useCallback((promotionId: string) => promotionsState.find(p => p.id === promotionId), [promotionsState]);
  const addWastageLog = useCallback(async (logData: Omit<WastageLog, 'id' | 'storeId'>) => {
    if (!currentStoreId) return;
    const newLog: WastageLog = { ...logData, id: `waste-${Date.now()}`, storeId: currentStoreId };
    try {
      await createWastageLog(newLog);
      setWastageLogsState(prev => [...prev, newLog]);
    } catch (e) { console.error("Failed to add wastage log", e); }
  }, [currentStoreId]);
  const clockIn = useCallback(async (userId: string, userName: string, role: Role): Promise<boolean> => {
    if (!currentStoreId) return false;
    const activeLog = timeLogsState.find(log => log.userId === userId && !log.clockOutTime);
    if (activeLog) {
      alert(`${userName} is already clocked in.`); return false;
    }
    const newLog: TimeLog = { id: `time-${Date.now()}`, userId, userName, role, clockInTime: new Date().toISOString(), storeId: currentStoreId };
    try {
      await createTimeLog(newLog);
      setTimeLogsState((prevLogs) => {
        return [...prevLogs, newLog];
      });
      return true;
    } catch (e) {
      console.error("Failed to clock in", e);
      return false;
    }
  }, [timeLogsState, currentStoreId]);
  const clockOut = useCallback(async (userId: string, notes?: string): Promise<boolean> => {
    const activeLog = timeLogsState.find(log => log.userId === userId && !log.clockOutTime);
    if (!activeLog) {
      alert("No active clock-in found for this user."); return false;
    }
    const updatedLog: TimeLog = { ...activeLog, clockOutTime: new Date().toISOString(), notes: notes || activeLog.notes };
    try {
      await apiUpdateTimeLog(activeLog.id, updatedLog);
      setTimeLogsState((prevLogs) => prevLogs.map(log => log.id === activeLog.id ? updatedLog : log));
      return true;
    } catch (e) {
      console.error("Failed to clock out", e);
      return false;
    }
  }, [timeLogsState]);
  const getActiveTimeLogForUser = useCallback((userId: string) => timeLogsState.find(log => log.userId === userId && !log.clockOutTime), [timeLogsState]);
  const addManualTimeLog = useCallback(async (timeLogData: Omit<TimeLog, 'id' | 'storeId'>) => {
    if (!currentStoreId) return;
    const newLog: TimeLog = { ...timeLogData, id: `time-${Date.now()}`, storeId: currentStoreId };
    try {
      await createTimeLog(newLog);
      setTimeLogsState(prev => [...prev, newLog]);
    } catch (e) { console.error("Failed to add time log", e); }
  }, [currentStoreId]);
  const updateTimeLog = useCallback(async (updatedTimeLog: TimeLog) => {
    try {
      await apiUpdateTimeLog(updatedTimeLog.id, updatedTimeLog);
      setTimeLogsState(prev => prev.map(log => log.id === updatedTimeLog.id ? updatedTimeLog : log));
    } catch (e) { console.error("Failed to update time log", e); }
  }, []);
  const deleteTimeLog = useCallback(async (timeLogId: string) => {
    try {
      await apiDeleteTimeLog(timeLogId);
      setTimeLogsState(prev => prev.filter(log => log.id !== timeLogId));
    } catch (e) { console.error("Failed to delete time log", e); }
  }, []);
  const addCashDrawerLog = useCallback(async (logData: Omit<CashDrawerLog, 'id' | 'expectedAmount' | 'discrepancy' | 'logTimestamp' | 'adminNotes' | 'storeId'>) => {
    if (!currentStoreId) return;
    const activeTimeLog = getActiveTimeLogForUser(logData.cashierId);
    let expectedAmount = 0;

    if (activeTimeLog) {
      const shiftStartTime = new Date(activeTimeLog.clockInTime);
      const shiftOrders = getShiftOrders(logData.cashierId, shiftStartTime);
      expectedAmount = shiftOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    } else {
      const todaysPaidOrders = ordersState.filter(o => o.storeId === currentStoreId && o.cashierId === logData.cashierId && (o.status === 'Paid' || o.status === 'Completed') && new Date(o.timestamp).toISOString().split('T')[0] === logData.shiftDate);
      expectedAmount = todaysPaidOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    }

    const discrepancy = logData.declaredAmount - expectedAmount;
    const newLog: CashDrawerLog = { ...logData, id: `cdl-${Date.now()}`, expectedAmount, discrepancy, logTimestamp: new Date().toISOString(), storeId: currentStoreId };
    try {
      await createCashDrawerLog(newLog);
      setCashDrawerLogsState(prev => [...prev, newLog]);
    } catch (e) { console.error("Failed to add cash drawer log", e); }
  }, [currentStoreId, ordersState, getActiveTimeLogForUser, getShiftOrders]);
  const updateCashDrawerLogAdminNotes = useCallback(async (logId: string, adminNotes: string) => {
    const log = cashDrawerLogsState.find(l => l.id === logId);
    if (!log) return;
    const updatedLog = { ...log, adminNotes };
    try {
      await apiUpdateCashDrawerLog(logId, updatedLog);
      setCashDrawerLogsState(prev => prev.map(log => log.id === logId ? updatedLog : log));
    } catch (e) { console.error("Failed to update admin notes", e); }
  }, [cashDrawerLogsState]);
  const addAnnouncement = useCallback(async (announcementData: Omit<Announcement, 'id' | 'timestamp' | 'authorId' | 'authorName'>, author: User) => {
    const newAnnouncement: Announcement = { ...announcementData, id: `an-${Date.now()}`, timestamp: new Date().toISOString(), authorId: author.id, authorName: author.firstName || author.username };
    try {
      await createAnnouncement(newAnnouncement);
      setAnnouncementsState(prev => [newAnnouncement, ...prev]);
    } catch (e) { console.error("Failed to add announcement", e); }
  }, []);
  const updateAnnouncement = useCallback(async (updatedAnnouncement: Announcement, author: User): Promise<boolean> => {
    if (author.role !== ROLES.ADMIN && updatedAnnouncement.authorId !== author.id) {
      alert("You can only edit your own announcements."); return false;
    }
    const finalAnnouncement = { ...updatedAnnouncement, timestamp: new Date().toISOString() };
    try {
      await apiUpdateAnnouncement(finalAnnouncement.id, finalAnnouncement);
      setAnnouncementsState(prev => prev.map(a => a.id === updatedAnnouncement.id ? finalAnnouncement : a));
      return true;
    } catch (e) { console.error("Failed to update announcement", e); return false; }
  }, []);
  const archiveAnnouncement = useCallback(async (announcementId: string, archive: boolean, author: User): Promise<boolean> => {
    const announcement = announcementsState.find(a => a.id === announcementId);
    if (!announcement) return false;
    if (author.role !== ROLES.ADMIN && announcement.authorId !== author.id) {
      alert("You can only archive your own announcements."); return false;
    }
    const updatedAnnouncement = { ...announcement, isArchived: archive };
    try {
      await apiUpdateAnnouncement(announcementId, updatedAnnouncement);
      setAnnouncementsState(prev => prev.map(a => a.id === announcementId ? updatedAnnouncement : a));
      return true;
    } catch (e) { console.error("Failed to archive announcement", e); return false; }
  }, [announcementsState]);
  const deleteAnnouncement = useCallback(async (announcementId: string, author: User): Promise<boolean> => {
    const announcement = announcementsState.find(a => a.id === announcementId);
    if (!announcement) return false;
    if (author.role !== ROLES.ADMIN) {
      alert("Only Global Admins can delete announcements."); return false;
    }
    if (window.confirm("Are you sure you want to permanently delete this announcement?")) {
      try {
        await apiDeleteAnnouncement(announcementId);
        setAnnouncementsState(prev => prev.filter(a => a.id !== announcementId));
        return true;
      } catch (e) { console.error("Failed to delete announcement", e); return false; }
    }
    return false;
  }, [announcementsState]);
  const addFeedback = useCallback(async (feedbackData: Omit<Feedback, 'id' | 'timestamp' | 'storeId'>) => {
    if (!currentStoreId) return;
    const newFeedback: Feedback = { ...feedbackData, id: `fb-${Date.now()}`, timestamp: new Date().toISOString(), storeId: currentStoreId };
    try {
      await createFeedback(newFeedback);
      setFeedbackListState(prev => [newFeedback, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e) { console.error("Failed to add feedback", e); }
  }, [currentStoreId]);

  const clearAllOrders = useCallback(async (): Promise<boolean> => {
    if (!currentStoreId) {
      alert("No store selected.");
      return false;
    }

    try {
      await deleteAllOrders(currentStoreId);
      // Update local state
      setOrdersState(prev => prev.filter(o => o.storeId !== currentStoreId));
      return true;
    } catch (e) {
      console.error("Failed to clear all orders", e);
      alert("Failed to clear orders.");
      return false;
    }
  }, [currentStoreId]);

  const updateLeaveRequest = useCallback(async (requestId: string, status: 'Approved' | 'Rejected', managerNotes?: string): Promise<boolean> => {
    try {
      await apiUpdateLeaveRequest(requestId, { status, managerNotes });
      setLeaveRequestsState(prev => prev.map(req => req.id === requestId ? { ...req, status, managerNotes } : req));
      return true;
    } catch (e) {
      console.error("Failed to update leave request", e);
      return false;
    }
  }, []);

  // --- ALERTS FOR ONLINE ORDERS ---
  const [newOnlineOrders, setNewOnlineOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Check for NEW 'Created' delivery orders that we haven't acknowledged
    if (ordersState.length > 0) {
      const potentialNewOrders = ordersState.filter(o =>
        o.orderType === 'DELIVERY' &&
        o.status === 'Created' &&
        // Only alert for orders from today/recent (last 24h)
        new Date(o.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      );

      // Avoid constant state updates
      if (potentialNewOrders.length !== newOnlineOrders.length) {
        setNewOnlineOrders(potentialNewOrders);
      } else {
        const currentIds = newOnlineOrders.map(o => o.id).sort().join(',');
        const newIds = potentialNewOrders.map(o => o.id).sort().join(',');
        if (currentIds !== newIds) {
          setNewOnlineOrders(potentialNewOrders);
        }
      }
    }
  }, [ordersState]);

  const acknowledgeOrder = async (orderId: string) => {
    try {
      // Update status to 'Received' to stop it showing up
      await apiUpdateOrder(orderId, { status: OrderStatus.RECEIVED });
      // Optimistic update
      setOrdersState(prev => prev.map(o => o.id === orderId ? { ...o, status: OrderStatus.RECEIVED } : o));
      setNewOnlineOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (e) {
      console.error("Failed to acknowledge order", e);
    }
  };

  const contextValue: ShopContextType = {
    loading,
    stores: storesState, currentStoreId, setCurrentStoreId, addStore, updateStore, deleteStore, getStoreById, appSettings, updateAppSettings,
    products, orders, allUsers: usersState, knownCategories, supplyItems, recipes, shifts, promotions, wastageLogs, timeLogs, cashDrawerLogs, announcements, feedbackList,
    leaveRequests: leaveRequestsState,
    addProduct, updateProduct, deleteProduct, getProductById, getProductsByCategory, addCategory, updateCategoryName, deleteCategory,
    addOrder, updateOrderStatus, updateOrder, deleteOrder, getOrdersByStatus, getPaidOrders, getShiftOrders,
    addUser, updateUser, deleteUser, registerUser, getUserForAuth, verifyPinForAuth, verifyCurrentUserPassword,
    currentOrder, createOrUpdateCurrentOrder, loadOrderAsCurrent, clearCurrentOrder: clearCurrentOrderLocal, saveOrderAsTab, finalizeCurrentOrder, updateCurrentOrder, setRushOrder, setTableNumberForCurrentOrder,
    selectedCustomer, setSelectedCustomer, lookupCustomer, registerCustomer, awardStamps,
    applyPromotionToCurrentOrder, removePromotionFromCurrentOrder, getActiveAndApplicablePromotions,

    addSupplyItem, updateSupplyItem, deleteSupplyItem, adjustSupplyStock, getSupplyItemById,
    addRecipe, updateRecipe, deleteRecipe, getRecipeByProductId,
    addShift, updateShift, deleteShift,
    addPromotion, updatePromotion, deletePromotion, getPromotionById,
    addWastageLog,
    clockIn, clockOut, getActiveTimeLogForUser, addManualTimeLog, updateTimeLog, deleteTimeLog,
    addCashDrawerLog, updateCashDrawerLogAdminNotes,
    addAnnouncement, updateAnnouncement, archiveAnnouncement, deleteAnnouncement,
    addFeedback,
    updateLeaveRequest,
    reloadData,
    clearAllOrders,
    newOnlineOrders,
    acknowledgeOrder,
    isOnline, pendingOrdersCount: pendingOrders.length, syncPendingOrders
  };

  return <ShopContext.Provider value={contextValue}>{children}</ShopContext.Provider>;
};

export const useShop = (): ShopContextType => {
  const context = useContext(ShopContext);
  if (context === undefined) { throw new Error('useShop must be used within a ShopProvider'); }
  return context;
};
