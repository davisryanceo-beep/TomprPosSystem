import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api, { 
    loginUser, 
    apiClockIn, 
    apiClockOut, 
    apiGetStaffRewards, 
    apiClaimReward,
    apiGetHistory,
    apiGetAnnouncements,
    apiGetUpcomingShifts,
    apiGetStoreTasks,
    apiCompleteTask,
    apiGetPendingOnlineOrders
} from '../services/api';

const mock = new MockAdapter(api);

describe('Staff App API Services', () => {
    beforeEach(() => {
        mock.reset();
    });

    describe('Auth Services', () => {
        it('loginUser should send correct payload and return data', async () => {
            const credentials = { username: 'testuser', password: 'password123' };
            const responseData = { token: 'fake-token', user: { id: '1', username: 'testuser' } };
            
            mock.onPost('/login').reply(200, responseData);

            const result = await loginUser(credentials);
            expect(result.data).toEqual(responseData);
        });
    });

    describe('Attendance Services', () => {
        it('apiClockIn should include storeId and timezoneOffset', async () => {
            const storeId = 'store-123';
            const responseData = { success: true, timestamp: '2026-03-16T14:50:00Z' };
            
            mock.onPost('/mobile/clock-in').reply(200, responseData);

            const result = await apiClockIn(storeId);
            expect(result).toEqual(responseData);
            
            // Verify request payload
            const lastRequest = mock.history.post.find(r => r.url === '/mobile/clock-in');
            const payload = JSON.parse(lastRequest?.data);
            expect(payload.storeId).toBe(storeId);
            expect(payload.timezoneOffset).toBeDefined();
        });

        it('apiClockOut should return success data', async () => {
            const responseData = { success: true };
            mock.onPost('/mobile/clock-out').reply(200, responseData);

            const result = await apiClockOut();
            expect(result).toEqual(responseData);
        });
    });

    describe('Reward Services', () => {
        it('apiGetStaffRewards should fetch rewards for a user', async () => {
            const userId = 'user-456';
            const rewards = [{ id: 'rev-1', name: 'Free Coffee' }];
            
            mock.onGet(`/mobile/rewards/${userId}`).reply(200, rewards);

            const result = await apiGetStaffRewards(userId);
            expect(result).toEqual(rewards);
        });

        it('apiClaimReward should send rewardId and productId', async () => {
            const rewardId = 'rev-1';
            const productId = 'prod-789';
            mock.onPost('/mobile/claim-reward').reply(200, { success: true });

            const result = await apiClaimReward(rewardId, productId);
            expect(result.success).toBe(true);

            const lastRequest = mock.history.post.find(r => r.url === '/mobile/claim-reward');
            const payload = JSON.parse(lastRequest?.data);
            expect(payload.rewardId).toBe(rewardId);
            expect(payload.productId).toBe(productId);
        });
    });

    describe('History Services', () => {
        it('apiGetHistory should return historical data for a user', async () => {
            const userId = 'user-789';
            const history = [{ date: '2026-03-15', action: 'clock-in' }];
            
            mock.onGet(`/mobile/history/${userId}`).reply(200, history);

            const result = await apiGetHistory(userId);
            expect(result).toEqual(history);
        });
    });

    describe('Additional Management Services', () => {
        it('apiGetAnnouncements should fetch announcements for a store', async () => {
            const storeId = 'store-1';
            const data = [{ id: '1', title: 'Welcome' }];
            mock.onGet(`/mobile/announcements/${storeId}`).reply(200, data);
            const result = await apiGetAnnouncements(storeId);
            expect(result).toEqual(data);
        });

        it('apiGetUpcomingShifts should fetch shifts', async () => {
            const userId = 'user-1';
            const data = [{ id: 's-1', start: '2026-03-17' }];
            mock.onGet(`/mobile/shifts/upcoming/${userId}`).reply(200, data);
            const result = await apiGetUpcomingShifts(userId);
            expect(result).toEqual(data);
        });

        it('apiGetStoreTasks should fetch tasks', async () => {
            const storeId = 'store-1';
            const data = [{ id: 't-1', title: 'Clean floor' }];
            mock.onGet(`/mobile/tasks/${storeId}`).reply(200, data);
            const result = await apiGetStoreTasks(storeId);
            expect(result).toEqual(data);
        });

        it('apiCompleteTask should send correct id', async () => {
            const taskId = 't-1';
            mock.onPost(`/mobile/tasks/${taskId}/complete`).reply(200, { success: true });
            const result = await apiCompleteTask(taskId);
            expect(result.success).toBe(true);
        });

        it('apiGetPendingOnlineOrders should fetch orders', async () => {
            const storeId = 'store-1';
            const data = [{ id: 'o-1', status: 'pending' }];
            mock.onGet(`/mobile/orders/pending/${storeId}`).reply(200, data);
            const result = await apiGetPendingOnlineOrders(storeId);
            expect(result).toEqual(data);
        });
    });
});
