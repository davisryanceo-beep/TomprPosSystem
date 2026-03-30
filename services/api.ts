import axios from 'axios';
import { storage } from '../utils/storage';

import Constants from 'expo-constants';

// 🚀 AUTOMATIC CONNECTION GUIDE:
// 1. __DEV__ (Development Mode): Automatically connects to your computer's IP (via Expo).
// 2. Production (Release Mode): Automatically connects to the Firebase Live URL.
// 3. Manual Override: Uncomment logic below if auto-detection fails.

const PROD_API_URL = 'https://poscafesystem.vercel.app/api';

const getBaseUrl = () => {
    // 1. Force Production if needed (Uncomment to test prod in dev)
    // return PROD_API_URL;

    if (__DEV__) {
        // Try to get computer's IP from Expo (works for LAN/Tunnel)
        const debuggerHost = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost || (Constants as any).manifest?.debuggerHost;

        if (debuggerHost) {
            // debuggerHost is "IP:PORT" (e.g. 192.168.1.5:8081). We want just the IP.
            const ip = debuggerHost.split(':')[0];
            return `http://${ip}:3001/api`;
        }

        // Fallback for Simulators (iOS uses localhost, Android uses 10.0.2.2)
        // However, the above 'debuggerHost' usually catches emulators too.
        // If we are here, maybe we are running in web or detached?
        return 'http://localhost:3001/api';
    }

    // 2. Production Environment
    return PROD_API_URL;
};

const API_URL = getBaseUrl();

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
    const token = await storage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (__DEV__) {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        if (__DEV__) {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        return response;
    },
    (error) => {
        if (__DEV__) {
            console.log(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Data:`, error.response.data);
            } else if (error.request) {
                console.log(`No response received from server. Check URL and Network.`);
            } else {
                console.log(`Error Message: ${error.message}`);
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const loginUser = (credentials: { username: string; password?: string }) => api.post('/login', credentials);

// Mobile
export const apiClockIn = async (storeId: string) => {
    const timezoneOffset = new Date().getTimezoneOffset();
    const response = await api.post('/mobile/clock-in', { storeId, timezoneOffset });
    return response.data;
};

export const apiClockOut = async () => {
    const response = await api.post('/mobile/clock-out', {});
    return response.data;
};

export const apiGetStaffRewards = async (userId: string) => {
    const response = await api.get(`/mobile/rewards/${userId}`);
    return response.data;
};

export const apiClaimReward = async (rewardId: string, productId: string) => {
    const response = await api.post('/mobile/claim-reward', { rewardId, productId });
    return response.data;
};

export const apiGetHistory = async (userId: string) => {
    const response = await api.get(`/mobile/history/${userId}`);
    return response.data;
};

export const apiSubmitLeaveRequest = async (data: { startDate: string, endDate: string, reason: string }) => {
    const response = await api.post('/mobile/leave-request', data);
    return response.data;
};

export const apiSubmitOvertimeRequest = async (data: { date: string, requestedHours: number, reason: string }) => {
    const response = await api.post('/mobile/overtime-request', data);
    return response.data;
};

export const apiGetAnnouncements = async (storeId: string) => {
    const response = await api.get(`/mobile/announcements/${storeId}`);
    return response.data;
};

export const apiGetUser = async (userId: string) => {
    const response = await api.get(`/mobile/users/${userId}`);
    return response.data;
};

export const apiGetUpcomingShifts = async (userId: string) => {
    const response = await api.get(`/mobile/shifts/upcoming/${userId}`);
    return response.data;
};

export const apiUpdateProfile = async (data: any) => {
    const response = await api.put('/mobile/profile', data);
    return response.data;
};

export const apiGetStoreTasks = async (storeId: string) => {
    const response = await api.get(`/mobile/tasks/${storeId}`);
    return response.data;
};

export const apiCompleteTask = async (taskId: string) => {
    const response = await api.post(`/mobile/tasks/${taskId}/complete`, {});
    return response.data;
};

export const getProducts = () => api.get('/products');

export const apiGetPendingOnlineOrders = async (storeId: string) => {
    const response = await api.get(`/mobile/orders/pending/${storeId}`);
    return response.data;
};

export const apiUpdateOrder = async (orderId: string, updates: any) => {
    const response = await api.put(`/orders/${orderId}`, updates);
    return response.data;
};

export default api;
