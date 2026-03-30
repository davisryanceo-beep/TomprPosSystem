import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { db } from '../../server/db.js';

// Enhanced Mock for Supabase
vi.mock('../../server/db.js', () => {
    const mockQuery = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        // Mocking the thenable behavior of Supabase queries
        then: vi.fn(function(onFulfilled) {
            return Promise.resolve({ data: null, error: null }).then(onFulfilled);
        })
    };

    return {
        db: {
            from: vi.fn(() => mockQuery)
        }
    };
});

describe('Stamp System API Tests', () => {
    const mockStoreId = 'test-store-1';
    const mockPhoneNumber = '1234567890';
    const mockClaimId = 'test-claim-uuid';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/public/customers/register', () => {
        it('should register a new customer successfully', async () => {
            const mockStore = { loyaltyEnabled: true };
            
            const fromMock = vi.mocked(db.from);
            fromMock.mockReturnValueOnce({ // 1. Store check
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockStore, error: null })
            } as any)
            .mockReturnValueOnce({ // 2. Existing check
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: [], error: null }))
            } as any)
            .mockReturnValueOnce({ // 3. Insert
                insert: vi.fn().mockResolvedValue({ error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/customers/register')
                .send({
                    phoneNumber: mockPhoneNumber,
                    name: 'Test User',
                    storeId: mockStoreId,
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.customer.phoneNumber).toBe(mockPhoneNumber);
        });

        it('should award stamps to both parties when registered with a referral code', async () => {
            const mockReferrerId = 'referrer-123';
            const mockReferrer = { id: mockReferrerId, currentStamps: 10, totalEarnedStamps: 20 };
            
            const fromMock = vi.mocked(db.from);
            fromMock.mockReturnValueOnce({ // 1. Store
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { loyaltyEnabled: true }, error: null })
            } as any)
            .mockReturnValueOnce({ // 2. Existing check
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: [], error: null }))
            } as any)
            .mockReturnValueOnce({ // 3. Referral lookup
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: [mockReferrer], error: null }))
            } as any)
            .mockReturnValueOnce({ // 4. Insert referee
                insert: vi.fn().mockResolvedValue({ error: null })
            } as any)
            .mockReturnValueOnce({ // 5. Select referrer
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockReferrer, error: null })
            } as any)
            .mockReturnValueOnce({ // 6. Update referrer
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null })
            } as any)
            .mockReturnValueOnce({ // 7. Insert referral log
                insert: vi.fn().mockResolvedValue({ error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/customers/register')
                .send({
                    phoneNumber: '9998887777',
                    name: 'Referee',
                    storeId: mockStoreId,
                    referralCode: 'REF-CODE-123',
                    password: 'pass'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        }); 
    });

    describe('POST /api/public/stamps/claim', () => {
        it('should claim stamps successfully', async () => {
            const mockClaim = {
                id: mockClaimId,
                stamps: 2,
                claimed: false,
                expires_at: new Date(Date.now() + 3600000).toISOString(),
                store_id: mockStoreId
            };

            const mockCustomer = {
                id: 'cust-123',
                phoneNumber: mockPhoneNumber,
                currentStamps: 5,
                totalEarnedStamps: 10
            };

            const fromMock = vi.mocked(db.from);
            fromMock.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockClaim, error: null })
            } as any)
            .mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn(resolve => resolve({ data: [mockCustomer], error: null }))
            } as any)
            .mockReturnValueOnce({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null })
            } as any)
            .mockReturnValueOnce({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/stamps/claim')
                .send({
                    claimId: mockClaimId,
                    phoneNumber: mockPhoneNumber,
                    storeId: mockStoreId
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.currentStamps).toBe(7);
        });

        it('should fail if QR code is already used', async () => {
            const mockClaim = { claimed: true };
            
            vi.mocked(db.from).mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockClaim, error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/stamps/claim')
                .send({
                    claimId: mockClaimId,
                    phoneNumber: mockPhoneNumber,
                    storeId: mockStoreId
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('QR code already used');
        });

        it('should fail if QR code is expired', async () => {
            const mockClaim = {
                claimed: false,
                expires_at: new Date(Date.now() - 3600000).toISOString()
            };
            
            vi.mocked(db.from).mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockClaim, error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/stamps/claim')
                .send({
                    claimId: mockClaimId,
                    phoneNumber: mockPhoneNumber,
                    storeId: mockStoreId
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('QR code expired');
        });
    });

    describe('POST /api/public/customers/login', () => {
        it('should login successfully with correct credentials', async () => {
            const mockCustomer = {
                phoneNumber: mockPhoneNumber,
                storeId: mockStoreId,
                password: 'password123'
            };

            vi.mocked(db.from).mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/customers/login')
                .send({
                    phoneNumber: mockPhoneNumber,
                    storeId: mockStoreId,
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.customer.phoneNumber).toBe(mockPhoneNumber);
        });

        it('should fail with incorrect password', async () => {
            const mockCustomer = {
                phoneNumber: mockPhoneNumber,
                storeId: mockStoreId,
                password: 'password123'
            };

            vi.mocked(db.from).mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null })
            } as any);

            const res = await request(app)
                .post('/api/public/customers/login')
                .send({
                    phoneNumber: mockPhoneNumber,
                    storeId: mockStoreId,
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Incorrect password.');
        });
    });
});
