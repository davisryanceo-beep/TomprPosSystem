import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { db } from '../../server/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = "production-secret-key-fixed-2024";

// Helper to generate test token
const generateToken = (payload = {}) => {
    return jwt.sign({ 
        id: 'test-user-id',
        username: 'testuser',
        role: 'Admin',
        ...payload 
    }, JWT_SECRET);
};

vi.mock('../../server/db.js', () => {
    const mockQuery = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn(function(onFulfilled) {
            return Promise.resolve({ data: null, error: null }).then(onFulfilled);
        })
    };
    return { db: { from: vi.fn(() => mockQuery) } };
});

describe('Loyalty CRM API Tests', () => {
    const mockCustomerId = 'cust-123';
    const mockStoreId = 'store-1';
    const authToken = `Bearer ${generateToken({ storeId: mockStoreId })}`;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/customers/:id/recommendations', () => {
        it('should return top products based on order history', async () => {
            const mockOrders = [
                { items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] },
                { items: [{ productId: 'p1', quantity: 1 }] },
                { items: [{ productId: 'p3', quantity: 5 }] }
            ];

            vi.mocked(db.from).mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: mockOrders, error: null }))
            } as any);

            const res = await request(app)
                .get(`/api/customers/${mockCustomerId}/recommendations`)
                .set('Authorization', authToken);

            expect(res.status).toBe(200);
            // In our mock logic: 
            // p1 appears in 2 orders (count 2)
            // p2 appears in 1 order (count 1)
            // p3 appears in 1 order (count 1)
            // Expected top products sorted by frequency: p1 first
            expect(res.body).toContain('p1');
        });

        it('should return 401 if unauthorized', async () => {
            const res = await request(app)
                .get(`/api/customers/${mockCustomerId}/recommendations`);
            expect(res.status).toBe(401);
        });
    });
});
