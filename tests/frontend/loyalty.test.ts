import { describe, it, expect } from 'vitest';
import { getTierInfo, calculateNextTierProgress } from '../../services/loyalty';
import { LOYALTY_TIERS } from '../../types';

describe('Loyalty Logic', () => {
    describe('getTierInfo', () => {
        it('should return Bronze for 0 stamps', () => {
            const info = getTierInfo(0);
            expect(info.name).toBe(LOYALTY_TIERS.BRONZE.name);
            expect(info.next?.name).toBe(LOYALTY_TIERS.SILVER.name);
        });

        it('should return Silver for 50 stamps', () => {
            const info = getTierInfo(50);
            expect(info.name).toBe(LOYALTY_TIERS.SILVER.name);
            expect(info.next?.name).toBe(LOYALTY_TIERS.GOLD.name);
        });

        it('should return Gold for 150 stamps', () => {
            const info = getTierInfo(150);
            expect(info.name).toBe(LOYALTY_TIERS.GOLD.name);
            expect(info.next).toBeNull();
        });

        it('should return Silver for 149 stamps', () => {
            const info = getTierInfo(149);
            expect(info.name).toBe(LOYALTY_TIERS.SILVER.name);
        });
    });

    describe('calculateNextTierProgress', () => {
        it('should calculate 50% progress toward Silver (25/50)', () => {
            const progress = calculateNextTierProgress(25);
            expect(progress).toBe(50);
        });

        it('should return 100% when at max tier', () => {
            const progress = calculateNextTierProgress(200);
            expect(progress).toBe(100);
        });

        it('should calculate progress correctly for Silver to Gold', () => {
            // Threshold for Gold is 150. If we have 75 stamps, 
            // and we are currently Silver (threshold 50), 
            // progress is (75/150)*100 = 50%
            const progress = calculateNextTierProgress(75);
            expect(progress).toBe(50);
        });
    });
});
