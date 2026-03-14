import React, { useState, useEffect } from 'react';
import { FaCoffee, FaCheckCircle, FaExclamationCircle, FaSpinner, FaQrcode, FaPhone, FaLock } from 'react-icons/fa';
import { publicClaimStamps, getPublicStores } from '../../services/api';
import { Store } from '../../types';
import PWAInstallButton from '../Shared/PWAInstallButton';

const ClaimStamps: React.FC = () => {
    // Custom routing: #/claim/id
    const claimId = window.location.hash.split('/').pop() || '';

    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [earnedStamps, setEarnedStamps] = useState(0);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const res = await getPublicStores();
                setStores(res.data);

                // Parse storeId from hash query string or search
                const hashParts = window.location.hash.split('?');
                const queryParams = new URLSearchParams(window.location.search || hashParts[1] || '');
                const urlStoreId = queryParams.get('storeId');

                if (urlStoreId) {
                    setSelectedStoreId(urlStoreId);
                    // Persist to session storage so we don't lose it if hash is stripped
                    localStorage.setItem('lockedStoreId', urlStoreId);
                } else {
                    const savedLockedId = localStorage.getItem('lockedStoreId');
                    if (savedLockedId) {
                        setSelectedStoreId(savedLockedId);
                    } else if (res.data.length > 0) {
                        setSelectedStoreId(res.data[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch stores", err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchStores();
    }, []);

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!claimId || !phoneNumber || !selectedStoreId) return;

        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const res = await publicClaimStamps({
                claimId,
                phoneNumber,
                storeId: selectedStoreId
            });

            if (res.data.success) {
                setStatus('success');
                setMessage(res.data.message);
                setEarnedStamps(res.data.currentStamps);
            } else {
                setStatus('error');
                setMessage(res.data.message || 'Failed to claim stamps');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const navigateToLoyalty = () => {
        const query = window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '';
        window.location.hash = `#/loyalty${query}`;
    };

    const navigateToRegister = () => {
        const query = window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '';
        window.location.hash = `#/loyalty/register${query}`;
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
                <span className="animate-spin text-coffee-medium">
                    <FaSpinner size={32} />
                </span>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-coffee-medium/10 p-8 text-center border border-coffee-light/20">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaCheckCircle size={48} color="#10B981" />
                    </div>
                    <h2 className="text-3xl font-bold text-coffee-dark mb-2">Stamps Claimed!</h2>
                    <p className="text-coffee-medium mb-8">{message}</p>

                    <div className="bg-coffee-light/10 rounded-2xl p-6 mb-8 border border-coffee-light/20">
                        <p className="text-sm uppercase tracking-wider text-coffee-medium font-semibold mb-1">Your New Total</p>
                        <p className="text-4xl font-black text-coffee-dark">{earnedStamps} Stamps</p>

                        {selectedStoreId && stores.find(s => s.id === selectedStoreId)?.loyaltyEnabled && (
                            <div className="mt-6 pt-6 border-t border-coffee-light/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-coffee-medium uppercase tracking-tight">Reward Goal</span>
                                    <span className="text-xs font-black text-coffee-dark">{stores.find(s => s.id === selectedStoreId)?.stampsToRedeem || 10} Stamps</span>
                                </div>
                                <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-coffee-light/10">
                                    <div
                                        className="h-full bg-coffee-dark transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (earnedStamps / (stores.find(s => s.id === selectedStoreId)?.stampsToRedeem || 10)) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs mt-3 text-coffee-medium italic font-medium">
                                    "Earn {stores.find(s => s.id === selectedStoreId)?.loyaltyRewardDescription || 'a free drink'}!"
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={navigateToLoyalty}
                        className="w-full py-4 bg-coffee-dark text-white rounded-xl font-bold shadow-lg shadow-coffee-dark/20 hover:bg-coffee-medium transition-all active:scale-[0.98]"
                    >
                        View My Rewards
                    </button>

                    <PWAInstallButton />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-coffee-medium/10 overflow-hidden border border-coffee-light/20">
                {/* Header */}
                <div className="bg-coffee-dark p-8 text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <span className="mb-4 block">
                            <FaCoffee size={40} />
                        </span>
                        <h1 className="text-3xl font-bold">Claim Stamps</h1>
                        <p className="text-coffee-light/80 mt-1">Enter your details to collect your rewards</p>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleClaim} className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="text-sm font-semibold text-coffee-dark uppercase tracking-tight">Select Store</label>
                                {(!!localStorage.getItem('lockedStoreId') || window.location.hash.includes('storeId=') || window.location.search.includes('storeId=')) && (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 bg-coffee-dark/5 dark:bg-white/5 rounded-full border border-coffee-dark/10 dark:border-white/10">
                                        <span style={{fontSize:"8px",color:"#6f4e37"}}><FaLock /></span>
                                        <span className="text-[8px] font-black text-coffee-medium uppercase tracking-tighter">Locked</span>
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-charcoal-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-coffee-medium outline-none font-medium text-charcoal-dark dark:text-cream-light disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    disabled={loading || window.location.hash.includes('storeId=')}
                                >
                                    {stores.map(store => (
                                        <option key={store.id} value={store.id}>{store.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-coffee-medium">
                                    <FaCoffee size={20} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-coffee-dark mb-2 ml-1">Phone Number</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="Enter your registered number"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-coffee-dark focus:border-coffee-medium focus:ring-0 transition-all outline-none"
                                    required
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-medium">
                                    <FaPhone size={20} />
                                </div>
                            </div>
                        </div>

                        {status === 'error' && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                                <span className="mr-3 flex-shrink-0 mt-0.5">
                                    <FaExclamationCircle size={20} />
                                </span>
                                <p className="text-sm font-medium">{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 bg-coffee-dark text-white rounded-xl font-bold shadow-lg shadow-coffee-dark/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:bg-coffee-medium'
                                }`}
                        >
                            {loading ? (
                                <span className="animate-spin">
                                    <FaSpinner size={24} />
                                </span>
                            ) : (
                                <>
                                    <FaQrcode size={20} />
                                    <span>Claim Stamps Now</span>
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-coffee-medium">
                        Not registered yet? <button onClick={navigateToRegister} className="text-coffee-dark font-bold hover:underline">Sign up here</button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ClaimStamps;

