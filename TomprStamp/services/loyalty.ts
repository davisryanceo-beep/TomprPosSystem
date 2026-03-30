import { LOYALTY_TIERS } from '../types';

export const getTierInfo = (totalStamps: number) => {
    if (totalStamps >= LOYALTY_TIERS.GOLD.threshold) return { ...LOYALTY_TIERS.GOLD, next: null };
    if (totalStamps >= LOYALTY_TIERS.SILVER.threshold) return { ...LOYALTY_TIERS.SILVER, next: LOYALTY_TIERS.GOLD };
    return { ...LOYALTY_TIERS.BRONZE, icon: null, next: LOYALTY_TIERS.SILVER };
};

export const calculateNextTierProgress = (totalEarned: number) => {
    const info = getTierInfo(totalEarned);
    if (!info.next) return 100;
    return Math.min(100, (totalEarned / info.next.threshold) * 100);
};
