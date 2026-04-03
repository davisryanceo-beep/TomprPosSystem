import axios from 'axios';

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    
    // If on the stamp portal domain, point to the POS system's API
    if (window.location.hostname.includes('tompr-stamp')) {
        return 'https://flowspos.com/api';
    }
    
    return '/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isExpiredToken = 
            error.response?.status === 403 && 
            error.response?.data?.error?.toLowerCase().includes('token');

        if (error.response && (error.response.status === 401 || isExpiredToken)) {
            // Token is missing, invalid, or expired — clear session and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');

            // Redirect to login if not already there to prevent loops
            if (!window.location.pathname.includes('/login')) {
                const searchParam = isExpiredToken ? '?reason=session_expired' : '';
                window.location.href = `/login${searchParam}`;
            }
        }
        // 403 = Forbidden (wrong permissions) — do NOT clear token, just reject
        return Promise.reject(error);
    }
);

// Stores
export const getStores = () => api.get('/stores');
export const createStore = (store: any) => api.post('/stores', store);
export const deleteStore = (id: string) => api.delete(`/stores/${id}`);
export const updateStore = (id: string, data: any) => api.put(`/stores/${id}`, data);


// Users
export const getUsers = () => api.get('/users');
export const loginUser = (credentials: { username: string; password?: string; pin?: string }) => api.post('/login', credentials);
export const createUser = (user: any) => api.post('/users', user);
export const updateUser = (id: string, data: any) => api.put(`/users/${id}`, data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`);
export const verifyPin = (userId: string, pin: string) => api.post('/verify-pin', { userId, pin });

// Products
export const getProducts = (storeId?: string) => api.get('/products', { params: { storeId } });
export const createProduct = (product: any) => api.post('/products', product);
export const updateProduct = (id: string, data: any) => api.put(`/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);
export const updateProductStock = (id: string, stock: number) => api.put(`/products/${id}`, { stock });

// Orders
export const getOrders = (storeId?: string, params?: any) => api.get('/orders', { params: { storeId, ...params } });
export const createOrder = (order: any) => api.post('/orders', order);
export const updateOrder = (id: string, data: any) => api.put(`/orders/${id}`, data);
export const deleteOrder = (id: string) => api.delete(`/orders/${id}`);
export const deleteAllOrders = (storeId: string) => api.delete('/orders', { data: { storeId: undefined }, params: { storeId } }); // axios delete params logic

// Supply
export const getSupplyItems = (storeId?: string) => api.get('/supply-items', { params: { storeId } });
export const createSupplyItem = (item: any) => api.post('/supply-items', item);
export const updateSupplyItem = (id: string, data: any) => api.put(`/supply-items/${id}`, data);
export const deleteSupplyItem = (id: string) => api.delete(`/supply-items/${id}`);

// Categories
export const getCategories = (storeId?: string) => api.get('/categories', { params: { storeId } });
export const createCategory = (categoryData: any) => api.post('/categories', categoryData);
export const updateCategory = (id: string, updates: any) => api.put(`/categories/${id}`, updates);
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`);

// Recipes
export const getRecipes = (storeId?: string) => api.get('/recipes', { params: { storeId } });
export const createRecipe = (recipe: any) => api.post('/recipes', recipe);
export const updateRecipe = (id: string, data: any) => api.put(`/recipes/${id}`, data);
export const deleteRecipe = (id: string) => api.delete(`/recipes/${id}`);

// Shifts
export const getShifts = (storeId?: string) => api.get('/shifts', { params: { storeId } });
export const createShift = (shift: any) => api.post('/shifts', shift);
export const updateShift = (id: string, data: any) => api.put(`/shifts/${id}`, data);
export const deleteShift = (id: string) => api.delete(`/shifts/${id}`);

// Promotions
export const getPromotions = (storeId?: string) => api.get('/promotions', { params: { storeId } });
export const createPromotion = (promo: any) => api.post('/promotions', promo);
export const updatePromotion = (id: string, data: any) => api.put(`/promotions/${id}`, data);
export const deletePromotion = (id: string) => api.delete(`/promotions/${id}`);

// Wastage Logs
export const getWastageLogs = (storeId?: string) => api.get('/wastage-logs', { params: { storeId } });
export const createWastageLog = (log: any) => api.post('/wastage-logs', log);

// Time Logs
export const getTimeLogs = (storeId?: string) => api.get('/time-logs', { params: { storeId } });
export const createTimeLog = (log: any) => api.post('/time-logs', log);
export const updateTimeLog = (id: string, data: any) => api.put(`/time-logs/${id}`, data);
export const deleteTimeLog = (id: string) => api.delete(`/time-logs/${id}`);

// Cash Drawer Logs
export const getCashDrawerLogs = (storeId?: string) => api.get('/cash-drawer-logs', { params: { storeId } });
export const createCashDrawerLog = (log: any) => api.post('/cash-drawer-logs', log);
export const updateCashDrawerLog = (id: string, data: any) => api.put(`/cash-drawer-logs/${id}`, data);

// Announcements
export const getAnnouncements = (storeId?: string) => api.get('/announcements', { params: { storeId } });
export const createAnnouncement = (announcement: any) => api.post('/announcements', announcement);
export const updateAnnouncement = (id: string, data: any) => api.put(`/announcements/${id}`, data);
export const deleteAnnouncement = (id: string) => api.delete(`/announcements/${id}`);

// Feedback
export const getFeedback = (storeId?: string) => api.get('/feedback', { params: { storeId } });
export const createFeedback = (feedback: any) => api.post('/feedback', feedback);

// App Settings
export const getAppSettings = () => api.get('/app-settings');
export const updateAppSettings = (settings: any) => api.put('/app-settings', settings);

// Leave Requests
export const getLeaveRequests = (storeId?: string) => api.get('/leave-requests', { params: { storeId } });
export const updateLeaveRequest = (id: string, data: any) => api.put(`/leave-requests/${id}`, data);
export const createLeaveRequest = (data: any) => api.post('/leave-requests', data);

// Overtime Requests
export const getOvertimeRequests = (storeId?: string) => api.get('/overtime-requests', { params: { storeId } });
export const createOvertimeRequest = (data: any) => api.post('/overtime-requests', data);
export const updateOvertimeRequest = (id: string, data: any) => api.put(`/overtime-requests/${id}`, data);

// Current Orders
export const getCurrentOrder = (storeId: string, terminalId?: string) =>
    api.get('/current-orders', { params: { storeId, terminalId } });
export const saveCurrentOrder = (order: any) => api.post('/current-orders', order);
export const clearCurrentOrder = (id: string) => api.delete(`/current-orders/${id}`);


// Mobile / Staff App API
// Mobile / Staff App API
export const apiClockIn = async (storeId: string) => {
    // using axios api instance
    const response = await api.post('/mobile/clock-in', { storeId });
    return response.data;
};

export const apiClockOut = async () => {
    const response = await api.post('/mobile/clock-out', {});
    return response.data;
};

export const apiGetStaffRewards = async (userId: string) => {
    // Ideally this should also just be /mobile/rewards (me)
    // But backend route is /rewards/:userId.
    // If we trust token, we should change backend to /mobile/rewards/me or just check token id matches param.
    // Currently backend: router.get('/rewards/:userId', ...
    // Let's keep it as is for now, but frontend needs to pass it.
    const response = await api.get(`/mobile/rewards/${userId}`);
    return response.data;
};

export const apiClaimReward = async (rewardId: string, productId: string) => {
    const response = await api.post('/mobile/claim-reward', { rewardId, productId });
    return response.data;
};

// Customer Loyalty
export const lookupCustomer = (phoneNumber: string, storeId?: string) => api.get(`/customers/lookup/${phoneNumber}`, { params: { storeId } });
export const createCustomer = (customer: any) => api.post('/customers', customer);
export const updateCustomer = (id: string, updates: any) => api.put(`/customers/${id}`, updates);
export const getCustomerRecommendations = (id: string) => api.get(`/customers/${id}/recommendations`);
export const getPublicLoyalty = (storeId: string, phoneNumber: string) => api.get(`/public/loyalty/${storeId}/${phoneNumber}`);
export const publicRegisterCustomer = (data: { phoneNumber: string; name?: string; storeId: string; password?: string }) => api.post('/public/customers/register', data);
export const publicLoginCustomer = (data: { phoneNumber: string; storeId: string; password?: string }) => api.post('/public/customers/login', data);
export const getPublicStores = () => api.get('/public/stores');
export const createStampClaim = (data: { storeId: string; orderId: string; stamps: number }) => api.post('/stamps/create-claim', data);
export const getStampClaimStatus = (claimId: string) => api.get(`/stamps/claim-status/${claimId}?_cb=${Date.now()}`);
export const publicClaimStamps = (data: { claimId: string; phoneNumber: string; storeId: string }) => api.post('/public/stamps/claim', data);


export default api;
