import axios from 'axios';
import { db } from './db.js';

async function testCurrentOrder() {
    try {
        console.log("Generating dummy token...");
        const tokenUser = {
            id: "user-1",
            storeId: "0b157bd7-de29-4fb5-ba37-29bdc8c114ea",
            role: "cashier"
        };
        // Just bypass auth by doing a direct DB insert exactly like the backend does to see the actual error
        const orderData = {
            id: `test-order-${Date.now()}`,
            storeId: "0b157bd7-de29-4fb5-ba37-29bdc8c114ea",
            terminalId: "term-1",
            items: JSON.parse(JSON.stringify([{ id: "prod-1", name: "Latte", price: 4.50, quantity: 1, modifiers: [] }])),
            tableNumber: "5",
            totalAmount: 4.50,
            taxAmount: 0.50,
            discountAmount: 0,
            finalAmount: 5.00,
            cashierId: "cashier-1",
            isRushOrder: false,
            lastUpdated: new Date().toISOString()
        };

        console.log("Upserting:", JSON.stringify(orderData, null, 2));
        const { error } = await db.from("current_orders").upsert(orderData);
        if (error) {
            console.error("Supabase Error Details:", JSON.stringify(error, null, 2));
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
