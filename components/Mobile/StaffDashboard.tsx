
import React, { useState, useEffect } from 'react';
import MobileLayout from './MobileLayout';
import { apiGetStaffRewards, apiClockIn, apiClockOut, apiClaimReward, getProducts } from '../../services/api';
import { StaffReward, Product } from '../../types';
import { useShop } from '../../contexts/ShopContext';

import { FaQrcode, FaGift, FaSignOutAlt, FaHistory, FaCheckCircle, FaCoffee, FaBell } from 'react-icons/fa';
import QRScanner from './QRScanner';
import OnlineOrdersModal from '../Cashier/OnlineOrdersModal';
import { OrderStatus } from '../../types';

const StaffDashboard: React.FC = () => {
    // Parse userId from URL params
    const getUserId = () => {
        const hash = window.location.hash;
        const query = hash.split('?')[1];
        if (!query) return null;
        const params = new URLSearchParams(query);
        return params.get('userId');
    };

    const userId = getUserId();
    const [rewards, setRewards] = useState<StaffReward[]>([]);
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanMode, setScanMode] = useState<'in' | 'out'>('in');

    // Online Orders
    const { newOnlineOrders, orders } = useShop();
    const [showOnlineOrdersModal, setShowOnlineOrdersModal] = useState(false);

    const activeOnlineOrdersCount = orders.filter(o =>
        o.orderType === 'DELIVERY' &&
        (o.status === OrderStatus.CREATED || o.status === OrderStatus.RECEIVED || o.status === OrderStatus.PREPARING)
    ).length;

    // Alert for new online orders
    useEffect(() => {
        if (newOnlineOrders.length > 0) {
            setPopup({
                message: `New Online Order Received! (#${newOnlineOrders[0].id.slice(-6)})`,
                type: 'info'
            });
            // Optional: audio cue logic here if needed, but popup is good start
        }
    }, [newOnlineOrders]);

    // Popup Message State
    const [popup, setPopup] = useState<{ message: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    // const [storedPin, setStoredPin] = useState<string>(''); // No longer needed

    // Reward Selection
    const [showRewardMenu, setShowRewardMenu] = useState(false);
    const [rewardProducts, setRewardProducts] = useState<Product[]>([]);
    const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

    useEffect(() => {
        // const pin = sessionStorage.getItem('staffPin');
        if (userId) {
            // if (pin) setStoredPin(pin);
            loadRewards();
        } else {
            window.location.hash = '#/mobile/login';
        }
    }, [userId]);

    const loadRewards = async () => {
        if (!userId) return;
        try {
            const data = await apiGetStaffRewards(userId);
            setRewards(data);
        } catch (err) {
            console.error(err);
        }
    };

    const availableRewards = rewards.filter(r => r.status === 'Available');

    const openRewardMenu = async (rewardId: string) => {
        setSelectedRewardId(rewardId);
        // Fetch products that are eligible? For now all products or category filtered.
        // User wanted specific products or just "Free Drink".
        // Let's fetch all 'Coffee' or 'Tea' for simplicity or just all.
        try {
            const res = await getProducts(); // This gets all products
            // Filter locally if needed. Let's show all for now.
            setRewardProducts(res.data || []);
            setShowRewardMenu(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleClaimProduct = async (product: Product) => {
        if (!selectedRewardId) return; // Removed !userId check as per instruction
        setLoading(true);
        try {
            await apiClaimReward(selectedRewardId, product.id);
            setMessage({ type: 'success', text: `Claimed ${product.name}!` });
            setShowRewardMenu(false);
            loadRewards();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const startScan = (mode: 'in' | 'out') => {
        setScanMode(mode);
        setShowScanner(true);
    };

    const handleScan = async (data: string) => {
        setShowScanner(false);
        setLoading(true);
        setPopup(null); // Reset popup
        setMessage(null);

        let storeId = data;
        try {
            const parsed = JSON.parse(data);
            if (parsed.storeId) storeId = parsed.storeId;
        } catch (e) { }

        try {
            if (scanMode === 'in') {
                const res = await apiClockIn(storeId);
                // Handle Popup from Backend
                if (res.popupMessage) {
                    setPopup({ message: res.popupMessage, type: res.popupType || 'info' });
                } else {
                    setMessage({ type: 'success', text: res.message || 'Clock In Successful' });
                }
                loadRewards();
            } else {
                const res = await apiClockOut();
                setMessage({ type: 'success', text: 'Clock Out Successful' });
            }
        } catch (err: any) {
            // For errors, also maybe show popup? Or just banner?
            // User likes popups. Let's make error a popup too? 
            // Banner is fine for system errors. Popup for "Funny/Congratulatory" status.
            setMessage({ type: 'error', text: err.response?.data?.error || err.message });
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of methods)

    return (
        <MobileLayout title="Dashboard">
            {/* ... (Existing Layout) */}
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Hello!</h2>
                        <p className="text-xs text-gray-500">USER ID: {userId}</p>
                    </div>
                    <button onClick={() => window.location.hash = '#/mobile/login'} className="text-gray-400 hover:text-red-500">
                        <FaSignOutAlt />
                    </button>
                </div>

                {/* Message Banner (for non-popups) */}
                {message && (
                    <div className={`p-4 rounded-xl text-center font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* ... (Buttons & Rewards) */}
            </div>

            {/* Online Orders Button */}
            <button
                onClick={() => setShowOnlineOrdersModal(true)}
                className="w-full p-4 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-between px-6 active:scale-95 transition-transform relative overflow-hidden"
            >
                <div className="flex items-center gap-4">
                    <div className="text-3xl"><FaBell /></div>
                    <div className="text-left">
                        <span className="block font-bold text-lg">Online Orders</span>
                        <span className="text-blue-100 text-sm">{activeOnlineOrdersCount} Active</span>
                    </div>
                </div>
                {activeOnlineOrdersCount > 0 && (
                    <div className="absolute right-4 top-4 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                )}
                {activeOnlineOrdersCount > 0 && (
                    <div className="bg-white text-blue-600 font-bold px-3 py-1 rounded-full text-sm shadow">
                        {activeOnlineOrdersCount}
                    </div>
                )}
            </button>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => startScan('in')} className="p-6 bg-emerald-600 text-white rounded-2xl shadow-lg flex flex-col items-center gap-3 active:scale-95 transition-transform">
                    <div className="text-3xl"><FaQrcode /></div>
                    <span className="font-bold">Clock In</span>
                </button>
                <button onClick={() => startScan('out')} className="p-6 bg-orange-500 text-white rounded-2xl shadow-lg flex flex-col items-center gap-3 active:scale-95 transition-transform">
                    <div className="text-3xl"><FaHistory /></div>
                    <span className="font-bold">Clock Out</span>
                </button>
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="text-purple-500"><FaGift /></div> My Rewards
                </h3>
                {availableRewards.length === 0 ? (
                    <div className="p-6 bg-gray-100 rounded-xl text-center text-gray-400 text-sm">No active rewards. <br />Clock in early to earn!</div>
                ) : (
                    <div className="space-y-3">
                        {availableRewards.map(reward => (
                            <div key={reward.id} className="p-4 bg-purple-50 border border-purple-100 rounded-xl flex justify-between items-center">
                                <div><p className="font-bold text-purple-800">Early Bird Reward</p><p className="text-xs text-purple-600">{new Date(reward.timestamp).toLocaleDateString()}</p></div>
                                <button onClick={() => openRewardMenu(reward.id)} className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-purple-700">Claim</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {/* Scanner */}
            {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

            {/* Reward Menu */}
            {
                showRewardMenu && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
                        <div className="bg-white w-full max-w-md h-[80vh] sm:h-auto sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg">Pick Your Drink</h3><button onClick={() => setShowRewardMenu(false)} className="text-gray-500">Close</button></div>
                            <div className="flex-grow overflow-y-auto p-4 grid grid-cols-2 gap-3">
                                {rewardProducts.map(p => (
                                    <button key={p.id} onClick={() => handleClaimProduct(p)} className="p-3 border rounded-xl flex flex-col items-center gap-2 hover:border-emerald-500 hover:bg-emerald-50">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl text-gray-400">{p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover rounded-lg" /> : <FaCoffee />}</div>
                                        <span className="text-sm font-bold text-center line-clamp-2">{p.name}</span><span className="text-xs text-emerald-600 font-bold">FREE</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* POPUP MODAL */}
            {
                popup && (
                    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl transform transition-all scale-100 relative">
                            {/* Icon based on Type */}
                            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl shadow-inner
                            ${popup.type === 'success' ? 'bg-green-100 text-green-500' :
                                    popup.type === 'warning' ? 'bg-orange-100 text-orange-500' :
                                        'bg-blue-100 text-blue-500'}`}>
                                {popup.type === 'success' ? '🎉' : popup.type === 'warning' ? '⏰' : 'ℹ️'}
                            </div>

                            <h3 className={`text-2xl font-black mb-4 
                            ${popup.type === 'success' ? 'text-green-600' :
                                    popup.type === 'warning' ? 'text-orange-500' :
                                        'text-gray-800'}`}>
                                {popup.type === 'success' ? 'Awesome!' : popup.type === 'warning' ? 'Oh Snap!' : 'Info'}
                            </h3>

                            <p className="text-gray-600 text-lg font-medium leading-relaxed mb-8">
                                {popup.message}
                            </p>

                            <button
                                onClick={() => setPopup(null)}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all
                                ${popup.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30' :
                                        popup.type === 'warning' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' :
                                            'bg-gray-800 hover:bg-gray-900'}`}
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Online Orders Modal */}
            <OnlineOrdersModal
                isOpen={showOnlineOrdersModal}
                onClose={() => setShowOnlineOrdersModal(false)}
            />

        </MobileLayout >
    );
};

export default StaffDashboard;
