import axios from 'axios';

const api = axios.create({
    baseURL: 'https://flowspos.com/api',
});

async function testOrder() {
    try {
        const order = {
            id: `test-order-${Date.now()}`,
            items: [{ productId: 'test', productName: 'test', quantity: 1, unitPrice: 1 }],
            totalAmount: 1,
            taxAmount: 0,
            finalAmount: 1,
            status: 'Paid',
            timestamp: new Date().toISOString(),
            storeId: 'store-1769421861055', // From the user's screenshot
            paymentMethod: 'Cash'
        };

        const res = await api.post('/orders', order);
        console.log("Success:", res.data);
    } catch (err) {
        console.error("Failed with status:", err.response?.status);
        console.error("Error data:", JSON.stringify(err.response?.data, null, 2));
    }
}

testOrder();
