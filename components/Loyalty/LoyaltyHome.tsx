import React, { useState, useEffect } from 'react';
import Button from '../Shared/Button';
import { FaPhoneAlt, FaArrowRight, FaCoffee, FaLock } from 'react-icons/fa';
import PWAInstallButton from '../Shared/PWAInstallButton';
import { getPublicStores, publicLoginCustomer } from '../../services/api';
import { Store } from '../../types';

const LoyaltyHome: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                console.error("Failed to load stores", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStores();
    }, []);

    const handleContinue = async () => {
        if (!phoneNumber || !selectedStoreId || !password) return;
        setError(null);
        setIsLoggingIn(true);
        try {
            const res = await publicLoginCustomer({ phoneNumber, storeId: selectedStoreId, password });
            if (res.data.success) {
                window.location.hash = `#/loyalty/${selectedStoreId}/${phoneNumber}`;
            } else {
                setError(res.data.message || 'Login failed.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials or server error.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 pb-20" style={{ background: '#F1F5F9' }}>
            <div className="w-full max-w-md bg-white shadow-2xl rounded-[2.5rem] overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(10,22,40,0.12)' }}>
                <div className="p-10 text-center text-white relative" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)' }}>
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ background: '#F59E0B', filter: 'blur(20px)', transform: 'translate(30%,-30%)' }}></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full opacity-10" style={{ background: '#F59E0B', filter: 'blur(16px)', transform: 'translate(-30%, 30%)' }}></div>

                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <span style={{ color: '#F59E0B' }}><FaCoffee size={40} /></span>
                    </div>

                    <h1 className="text-3xl font-black tracking-tight">Rewards Club</h1>
                    <p className="text-sm mt-2 font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Earn · Sip · Repeat</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-coffee-dark dark:text-cream-light">Welcome Back!</h2>
                        <p className="text-gray-500 text-sm mt-1">Enter your phone number to see your stamps.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Your Store</label>
                                {(!!localStorage.getItem('lockedStoreId') || window.location.hash.includes('storeId=') || window.location.search.includes('storeId=')) && (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 bg-coffee-dark/5 dark:bg-white/5 rounded-full border border-coffee-dark/10 dark:border-white/10">
                                        <span style={{fontSize:"8px",color:"#6f4e37"}}><FaLock /></span>
                                        <span className="text-[8px] font-black text-coffee-medium uppercase tracking-tighter">Locked</span>
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-charcoal-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-coffee-medium outline-none font-medium transition-all text-charcoal-dark dark:text-cream-light disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    disabled={isLoading || !!localStorage.getItem('lockedStoreId') || window.location.hash.includes('storeId=') || window.location.search.includes('storeId=')}
                                >
                                    {stores.length === 0 ? (
                                        <option value="" disabled>Loading stores...</option>
                                    ) : (
                                        stores.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block ml-1">Phone Number</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-medium opacity-40">
                                    <FaPhoneAlt />
                                </span>
                                <input
                                    type="tel"
                                    placeholder="e.g. 012345678"
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
                                    onKeyPress={(e) => e.key === 'Enter' && handleContinue()}
                                    disabled={isLoggingIn}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        size="lg"
                        className="w-full py-6 rounded-2xl text-lg font-black shadow-lg shadow-coffee-dark/10"
                        onClick={handleContinue}
                        disabled={!phoneNumber || !selectedStoreId || !password || isLoggingIn}
                        rightIcon={!isLoggingIn ? <FaArrowRight /> : undefined}
                    >
                        {isLoggingIn ? 'Verifying...' : 'View My Stamps'}
                    </Button>

                    <div className="text-center pt-2">
                        <p className="text-xs text-gray-400">
                            Don't have a card yet? <br />
                            <a href={`#/loyalty/register${(window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')}`} className="text-coffee-medium font-bold hover:underline">Sign up here in seconds!</a>
                        </p>
                    </div>

                    <PWAInstallButton />
                </div>
            </div>

            <div className="mt-10 text-center">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-100">
                    <span className="w-1 h-1 bg-emerald rounded-full"></span>
                    <span>Secure Loyalty Portal</span>
                </div>
            </div>
        </div>
    );
};

export default LoyaltyHome;

