import React, { useState } from 'react';
import Button from '../Shared/Button';
import { FaPhoneAlt, FaLock, FaArrowLeft } from 'react-icons/fa';
import { publicLoginCustomer, getPublicStores } from '../../services/api';
import { Store } from '../../types';

const LoyaltyLogin: React.FC = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingStores, setIsLoadingStores] = useState(true);

    React.useEffect(() => {
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
                console.error("Failed to load stores", err);
            } finally {
                setIsLoadingStores(false);
            }
        };
        fetchStores();
    }, []);

    const handleLogin = async () => {
        if (!phoneNumber || !selectedStoreId || !password) {
            setError('Please fill in your phone number and password.');
            return;
        }

        setIsLoggingIn(true);
        setError(null);

        try {
            const res = await publicLoginCustomer({
                phoneNumber,
                password,
                storeId: selectedStoreId
            });

            if (res.data.success) {
                // Save customer auth state into sessionStorage or localStorage to indicate they are logged in.
                localStorage.setItem('loyalty_customer', JSON.stringify(res.data.customer));
                window.location.hash = `#/loyalty/${selectedStoreId}/${phoneNumber}`;
            } else {
                setError(res.data.message || 'Login failed.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials or error occurred.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-light dark:bg-charcoal-900 flex flex-col items-center justify-center p-6 pb-20">
            <div className="w-full max-w-md bg-white dark:bg-charcoal-dark shadow-2xl rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="p-8 pb-4">
                    <a href={`#/loyalty${(window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')}`} className="inline-flex items-center text-xs font-black text-gray-400 uppercase tracking-widest hover:text-coffee-medium transition-colors">
                        <span className="mr-2"><FaArrowLeft /></span> Back
                    </a>
                </div>

                <div className="px-10 pb-6 text-center">
                    <h1 className="text-3xl font-black text-coffee-dark dark:text-cream-light tracking-tight">Welcome Back!</h1>
                    <p className="text-gray-500 text-sm mt-2">Sign in to view your stamp card.</p>
                </div>

                <div className="p-10 pt-0 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Store</label>
                                {(!!localStorage.getItem('lockedStoreId') || window.location.hash.includes('storeId=') || window.location.search.includes('storeId=')) && (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 bg-coffee-dark/5 dark:bg-white/5 rounded-full border border-coffee-dark/10 dark:border-white/10">
                                        <span style={{ fontSize: "8px", color: "#6f4e37" }}><FaLock /></span>
                                        <span className="text-[8px] font-black text-coffee-medium uppercase tracking-tighter">Locked</span>
                                    </span>
                                )}
                            </div>
                            <select
                                className="w-full px-4 py-4 bg-gray-50 dark:bg-charcoal-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-coffee-medium outline-none font-medium text-charcoal-dark dark:text-cream-light disabled:opacity-70 disabled:cursor-not-allowed"
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                                disabled={isLoggingIn || !!localStorage.getItem('lockedStoreId') || window.location.hash.includes('storeId=') || window.location.search.includes('storeId=')}
                            >
                                {isLoadingStores ? (
                                    <option value="" disabled>Loading stores...</option>
                                ) : (
                                    stores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block ml-1">Phone Number</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-medium opacity-40">
                                    <FaPhoneAlt />
                                </span>
                                <input
                                    type="tel"
                                    placeholder="Enter your mobile number"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-charcoal-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-coffee-medium outline-none font-bold text-lg tracking-wider text-charcoal-dark dark:text-cream-light"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    disabled={isLoggingIn}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block ml-1">Password</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-medium opacity-40">
                                    <FaLock />
                                </span>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-charcoal-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-coffee-medium outline-none font-bold text-lg text-charcoal-dark dark:text-cream-light"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoggingIn}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        size="lg"
                        className="w-full py-6 rounded-2xl text-lg font-black shadow-lg shadow-coffee-dark/10"
                        onClick={handleLogin}
                        disabled={!phoneNumber || !password || isLoggingIn}
                    >
                        {isLoggingIn ? 'Signing In...' : 'Sign In'}
                    </Button>
                    <div className="text-center mt-4">
                        <a href={`#/loyalty/register${(window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')}`} className="text-xs text-coffee-medium font-bold hover:underline">Don't have an account? Sign up</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoyaltyLogin;

