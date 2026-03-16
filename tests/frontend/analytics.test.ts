import { describe, it, expect } from 'vitest';
import { calculateHourlySales, calculateProductMargins, calculateComboPerformance } from '../../services/analytics';
import { Order, OrderStatus, Product, Recipe, SupplyCategory } from '../../types';

describe('Analytics Logic', () => {
    const mockOrders: Order[] = [
        {
            id: 'o1',
            items: [{ productId: 'p1', productName: 'Coffee', quantity: 2, unitPrice: 5, isCombo: false }],
            totalAmount: 10,
            taxAmount: 1,
            finalAmount: 11,
            status: OrderStatus.PAID,
            timestamp: new Date(2026, 2, 16, 10, 30), // March 16, 10:30 AM Local
            storeId: 's1'
        },
        {
            id: 'o2',
            items: [{ productId: 'p2', productName: 'Combo 1', quantity: 1, unitPrice: 15, isCombo: true }],
            totalAmount: 15,
            taxAmount: 1.5,
            finalAmount: 16.5,
            status: OrderStatus.PAID,
            timestamp: new Date(2026, 2, 16, 10, 45), // March 16, 10:45 AM Local
            storeId: 's1'
        },
        {
            id: 'o3',
            items: [{ productId: 'p1', productName: 'Coffee', quantity: 1, unitPrice: 5, isCombo: false }],
            totalAmount: 5,
            taxAmount: 0.5,
            finalAmount: 5.5,
            status: OrderStatus.PAID,
            timestamp: new Date(2026, 2, 16, 14, 20), // March 16, 2:20 PM Local
            storeId: 's1'
        }
    ];

    describe('calculateHourlySales', () => {
        it('should correctly bucket orders by hour', () => {
            const result = calculateHourlySales(mockOrders);
            const hour10 = result.find(h => h.hour === '10:00');
            const hour14 = result.find(h => h.hour === '14:00');
            const hour11 = result.find(h => h.hour === '11:00');

            expect(hour10?.count).toBe(2);
            expect(hour14?.count).toBe(1);
            expect(hour11?.count).toBe(0);
        });
    });

    describe('calculateProductMargins', () => {
        const mockProducts: Product[] = [
            { id: 'p1', name: 'Coffee', price: 5, category: 'Coffee', stock: 100, imageUrl: '', storeId: 's1' }
        ];
        const mockRecipes: Recipe[] = [
            {
                id: 'r1',
                productId: 'p1',
                productName: 'Coffee',
                ingredients: [
                    { id: 'i1', name: 'Beans', quantity: '0.02', unit: 'kg', supplyItemId: 's_beans' }
                ],
                instructions: [],
                storeId: 's1'
            }
        ];
        const mockSupplyItems = [
            { id: 's_beans', name: 'Beans', costPerUnit: 20, category: SupplyCategory.INGREDIENTS_RAW, currentStock: 10, unit: 'kg', lowStockThreshold: 1, storeId: 's1' }
        ];

        it('should correctly calculate margin percentage', () => {
            // Cost = 0.02 * 20 = 0.4
            // Price = 5
            // Margin = (5 - 0.4) / 5 = 0.92 = 92%
            const result = calculateProductMargins(mockProducts as any, mockRecipes as any, mockSupplyItems as any);
            expect(result[0].margin).toBeCloseTo(92);
            expect(result[0].cost).toBe(0.4);
        });

        it('should return 0 margin if no recipe exists', () => {
            const result = calculateProductMargins(mockProducts as any, [], []);
            expect(result[0].margin).toBe(0);
        });
    });

    describe('calculateComboPerformance', () => {
        it('should correctly separate combo and regular sales', () => {
            const result = calculateComboPerformance(mockOrders);
            const regular = result.find(r => r.name === 'Regular Items');
            const combo = result.find(r => r.name === 'Combos');

            // o1: 2 * 5 = 10 (Regular)
            // o2: 1 * 15 = 15 (Combo)
            // o3: 1 * 5 = 5 (Regular)
            // Totals: Regular = 15, Combo = 15
            expect(regular?.value).toBe(15);
            expect(combo?.value).toBe(15);
        });
    });
});
