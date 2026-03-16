import { Order, Product, Recipe, SupplyItem } from '../types';

export const calculateHourlySales = (orders: Order[]) => {
    const hourlyData: { [hour: string]: number } = {};
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
        const hourLabel = `${i}:00`;
        hourlyData[hourLabel] = 0;
    }

    orders.forEach(order => {
        const date = new Date(order.timestamp);
        const hourLabel = `${date.getHours()}:00`;
        if (hourlyData[hourLabel] !== undefined) {
            hourlyData[hourLabel]++;
        }
    });

    return Object.entries(hourlyData).map(([hour, count]) => ({
        hour,
        count
    }));
};

export const calculateProductMargins = (
    products: Product[],
    recipes: Recipe[],
    supplyItems: SupplyItem[]
) => {
    return products.map(product => {
        const recipe = recipes.find(r => r.productId === product.id);
        if (!recipe) return { name: product.name, margin: 0, cost: 0, price: product.price };

        const cost = recipe.ingredients.reduce((total, ing) => {
            const supplyItem = supplyItems.find(s => s.id === ing.supplyItemId);
            const quantity = parseFloat(ing.quantity) || 0;
            const unitCost = supplyItem?.costPerUnit || 0;
            return total + (unitCost * quantity);
        }, 0);

        const margin = product.price > 0 ? ((product.price - cost) / product.price) * 100 : 0;
        return {
            name: product.name,
            margin: Math.max(0, margin),
            cost,
            price: product.price
        };
    }).sort((a, b) => b.margin - a.margin);
};

export const calculateComboPerformance = (orders: Order[]) => {
    let comboTotal = 0;
    let regularTotal = 0;

    orders.forEach(order => {
        order.items.forEach(item => {
            if (item.isCombo) {
                comboTotal += (item.unitPrice * item.quantity);
            } else {
                regularTotal += (item.unitPrice * item.quantity);
            }
        });
    });

    return [
        { name: 'Regular Items', value: regularTotal },
        { name: 'Combos', value: comboTotal }
    ];
};
