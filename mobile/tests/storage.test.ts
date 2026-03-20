import { describe, it, expect, beforeEach, vi } from 'vitest';
import storage from '../utils/storage';

describe('Storage Utility', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should save and retrieve items from localStorage in web mode', async () => {
        const key = 'test-key';
        const value = 'test-value';
        
        await storage.setItem(key, value);
        const retrieved = await storage.getItem(key);
        
        expect(retrieved).toBe(value);
        expect(localStorage.getItem(key)).toBe(value);
    });

    it('should delete items from localStorage', async () => {
        const key = 'delete-me';
        await storage.setItem(key, 'data');
        await storage.deleteItem(key);
        
        const retrieved = await storage.getItem(key);
        expect(retrieved).toBeNull();
    });
});
