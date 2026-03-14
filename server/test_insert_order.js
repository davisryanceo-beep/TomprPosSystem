import { db } from './db.js';

async function testCurrentOrder() {
    try {
        const orderData = {
            id: `test-order-${Date.now()}`,
            storeId: "0b157bd7-de29-4fb5-ba37-29bdc8c114ea",
            terminalId: "term-1",
            items: [{ id: "prod-1", name: "Latte", price: 4.50, quantity: 1, modifiers: [] }],
            tableNumber: "5",
            totalAmount: 4.50,
            taxAmount: 0.50,
            discountAmount: 0,
            finalAmount: 5.00,
            cashierId: "cashier-1",
            isRushOrder: false,
            // omitting appliedPromotionId and qrPaymentState to see if they cause not-null errors
            lastUpdated: new Date().toISOString()
        };

        const { error } = await db.from("current_orders").upsert(orderData);
        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Success! Cleaning up...");
            await db.from("current_orders").delete().eq("id", orderData.id);
        }
    } catch (err) {
        console.error("JS Error:", err.message);
    }
    process.exit(0);
}
testCurrentOrder();
