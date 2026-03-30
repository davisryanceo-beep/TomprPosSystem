import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { db } from '../../server/db.js';
import jwt from 'jsonwebtoken';

// Reuse enhanced mock for Supabase
vi.mock('../../server/db.js', () => {
    const mockQuery = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        then: vi.fn(function(onFulfilled) {
            return Promise.resolve({ data: null, error: null }).then(onFulfilled);
        })
    };
    return { db: { from: vi.fn(() => mockQuery) } };
});

describe('Authentication API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/login', () => {
        it('should login successfully for a valid user with PIN', async () => {
            const mockUser = {
                id: 'user-1',
                username: 'cashier1',
                role: 'Cashier',
                pin: '1234',
                storeId: 'store-1'
            };

            const fromMock = vi.mocked(db.from);
            fromMock.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: [mockUser], error: null }))
            } as any);

            const res = await request(app)
                .post('/api/login')
                .send({ username: 'cashier1', pin: '1234' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.username).toBe('cashier1');
        });

        it('should fail with incorrect PIN', async () => {
            const mockUser = {
                username: 'cashier1',
                pin: '1234'
            };

            const fromMock = vi.mocked(db.from);
            fromMock.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: [mockUser], error: null }))
            } as any);

            const res = await request(app)
                .post('/api/login')
                .send({ username: 'cashier1', pin: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });
        it('should return 401 when request uses an expired JWT token', async () => {
            const JWT_SECRET = "production-secret-key-fixed-2024";
            const expiredToken = jwt.sign(
                { id: 'u1', username: 'test', role: 'Cashier', storeId: 'store-1' },
                JWT_SECRET,
                { expiresIn: '-1s' } // immediately expired
            );

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Unauthorized');
        });
    });

});
