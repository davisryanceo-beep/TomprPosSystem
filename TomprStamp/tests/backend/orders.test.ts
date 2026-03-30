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

describe('Orders API Tests', () => {
    const mockStoreId = 'store-1';
    const mockOrderId = 'order-123';
    const authToken = `Bearer ${generateToken({ storeId: mockStoreId })}`;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/public/orders', () => {
        it('should create an order successfully', async () => {
            const mockOrder = {
                storeId: mockStoreId,
                totalAmount: 10.5,
                items: [{ id: 'p1', name: 'Coffee', price: 5, quantity: 2 }]
            };

            vi.mocked(db.from).mockReturnValueOnce({
                insert: vi.fn().mockResolvedValue({ error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/orders')
                .send(mockOrder);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.orderId).toBeDefined();
        });

        it('should fail if required fields are missing', async () => {
            const res = await request(app)
                .post('/api/public/orders')
                .send({ storeId: mockStoreId });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/orders', () => {
        it('should fetch orders for a store', async () => {
            const mockOrders = [
                { id: 'o1', storeId: mockStoreId, finalAmount: 10 },
                { id: 'o2', storeId: mockStoreId, finalAmount: 20 }
            ];

            vi.mocked(db.from).mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: mockOrders, error: null }))
            } as any);

            const res = await request(app)
                .get(`/api/orders?storeId=${mockStoreId}`)
                .set('Authorization', authToken);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
        });

        it('should fail with 401 if no token provided', async () => {
            const res = await request(app).get('/api/orders');
            expect(res.status).toBe(401);
        });
    });
});
