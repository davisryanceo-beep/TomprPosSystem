import React, { useState } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import Button from '../components/Shared/Button';
import { FaTrash, FaArrowLeft, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const Checkout: React.FC = () => {
    const { cartItems, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();

    // Extract storeId from hash: #/menu/:storeId/checkout
    const hash = window.location.hash;
    const parts = hash.split('/');
    const storeId = parts[2] || '';

    const navigateToMenu = () => {
        window.location.hash = `#/menu/${storeId}`;
    };

    const [form, setForm] = useState({
        customerName: '',
        contactNumber: '',
        address: '',
        notes: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (cartItems.length === 0) {
            setError("Your cart is empty.");
            return;
        }

        if (!form.customerName || !form.contactNumber || !form.address) {
            setError("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        try {
            const orderData = {
                storeId,
                items: cartItems.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    // modifiers/addons would go here
                })),
                totalAmount: cartTotal,
                taxAmount: 0, // Should be calculated
                finalAmount: cartTotal, // + Tax
                orderType: 'DELIVERY',
                deliveryDetails: {
                    customerName: form.customerName,
                    contactNumber: form.contactNumber,
                    address: form.address,
                    notes: form.notes
                }
            };

            // Use relative path for production (Firebase Hosting rewrite handles /api)
            // Or use VITE_API_URL if set (e.g. for local dev with separate ports)
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            // If using relative '/api', do not append another '/api' if baseURL already has it.
            // But here we want to hit /api/public/orders.
            // If apiUrl is '/api', then result is '/api/public/orders'

            // If we are strictly using the same origin in production:
            const endpoint = import.meta.env.PROD ? '/api/public/orders' : `${apiUrl}/public/orders`;

            await axios.post(endpoint, orderData);

            setOrderComplete(true);
            clearCart();
        } catch (err) {
            console.error("Order failed", err);
            setError("Failed to place order. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (orderComplete) {
        return (
            <div className="text-center py-12">
                <div className="bg-emerald/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl text-emerald"><FaCheckCircle /></span>
                </div>
                <h2 className="text-3xl font-bold text-charcoal-dark dark:text-cream mb-4">Order Received!</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Thank you {form.customerName}. We have received your order and will start preparing it shortly.
                </p>
                <Button onClick={navigateToMenu}>Return to Menu</Button>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
                <Button onClick={navigateToMenu} leftIcon={<FaArrowLeft />}>Browse Menu</Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cart Summary */}
            <div className="bg-white dark:bg-charcoal rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Your Order</h2>
                    <span className="text-sm text-gray-500">{cartItems.length} items</span>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {cartItems.map(item => (
                        <div key={item.tempId} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div className="flex-1">
                                <h3 className="font-semibold">{item.productName}</h3>
                                <p className="text-sm text-gray-500">${item.unitPrice.toFixed(2)} x {item.quantity}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="font-bold">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                                <button
                                    onClick={() => removeFromCart(item.tempId)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Delivery Form */}
            <div className="bg-white dark:bg-charcoal rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-xl font-bold mb-6">Delivery Details</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-gray-50 dark:bg-charcoal-dark border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald/50"
                            value={form.customerName}
                            onChange={e => setForm({ ...form, customerName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                        <input
                            required
                            type="tel"
                            className="w-full bg-gray-50 dark:bg-charcoal-dark border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald/50"
                            value={form.contactNumber}
                            onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Address *</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-charcoal-dark border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald/50"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                        <textarea
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-charcoal-dark border border-gray-300 dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald/50"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    <Button
                        type="submit"
                        fullWidth
                        size="lg"
                        disabled={submitting}
                    >
                        {submitting ? <span className="animate-spin mr-2"><FaSpinner /></span> : null}
                        {submitting ? 'Placing Order...' : 'Place Order'}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        fullWidth
                        onClick={navigateToMenu}
                    >
                        Cancel
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Checkout;
