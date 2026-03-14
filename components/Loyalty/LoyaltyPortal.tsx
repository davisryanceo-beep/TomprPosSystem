import React, { useState, useEffect } from 'react';
import { getPublicLoyalty, publicClaimStamps } from '../../services/api';
import { Customer, Store } from '../../types';
import LoadingSpinner from '../Shared/LoadingSpinner';
import { FaCoffee, FaTrophy, FaSync, FaCamera, FaFire, FaGift } from 'react-icons/fa';
import QRScannerModal from './QRScannerModal';
import PWAInstallButton from '../Shared/PWAInstallButton';

// Navy & White color palette
const NAVY = '#0A1628';
const NAVY_LIGHT = '#1E3A5F';
const AMBER = '#F59E0B';
const AMBER_LIGHT = '#FCD34D';

/** SVG Circular Progress Arc */
const CircularProgress: React.FC<{ current: number; total: number }> = ({ current, total }) => {
    const radius = 64;
    const stroke = 10;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const progress = Math.min(1, current / total);
    const strokeDashoffset = circumference - progress * circumference;
    const stampsLeft = Math.max(0, total - current);

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: radius * 2 + 16, height: radius * 2 + 16 }}>
                <svg
                    height={radius * 2 + 16}
                    width={radius * 2 + 16}
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    {/* Track */}
                    <circle
                        stroke="#E2E8F0"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius + 8}
                        cy={radius + 8}
                    />
                    {/* Filled arc */}
                    <circle
                        stroke={AMBER}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius + 8}
                        cy={radius + 8}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {progress >= 1 ? (
                        <>
                            <FaGift size={28} color={AMBER} />
                            <span className="text-xs font-black mt-1 uppercase tracking-widest" style={{ color: NAVY }}>Ready!</span>
                        </>
                    ) : (
                        <>
                            <span className="text-3xl font-black" style={{ color: NAVY }}>{current}</span>
                            <div className="w-10 h-0.5 bg-slate-200 my-0.5" />
                            <span className="text-sm font-bold text-slate-400">{total}</span>
                        </>
                    )}
                </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-400">
                {progress >= 1 ? 'Reward Earned!' : `${stampsLeft} more to go`}
            </p>
        </div>
    );
};

const LoyaltyPortal: React.FC = () => {
    const [storeId, setStoreId] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [store, setStore] = useState<Partial<Store> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [claimLoading, setClaimLoading] = useState(false);
    const [claimStatus, setClaimStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        const hash = window.location.hash;
        const parts = hash.split('/');
        if (parts.length >= 4) {
            setStoreId(parts[2]);
            setPhoneNumber(parts[3]);
            const authStr = localStorage.getItem('loyalty_customer');
            if (authStr) {
                const authInfo = JSON.parse(authStr);
                const urlPhone = decodeURIComponent(parts[3].split('?')[0]); // Handle query strings and encoding just in case
                if (authInfo.storeId !== parts[2] || authInfo.phoneNumber !== urlPhone) {
                    console.warn("Auth mismatch on load:", { authStoreId: authInfo.storeId, urlStoreId: parts[2], authPhone: authInfo.phoneNumber, urlPhone });
                    window.location.hash = '#/loyalty/login';
                }
            } else {
                console.warn("No loyalty_customer session found");
                window.location.hash = '#/loyalty/login';
            }
        } else {
            setLoading(false);
            setError('Invalid Loyalty Link.');
        }
    }, []);

    useEffect(() => {
        if (storeId && phoneNumber) fetchLoyaltyData();
    }, [storeId, phoneNumber]);

    const fetchLoyaltyData = async () => {
        try {
            setLoading(true);
            const res = await getPublicLoyalty(storeId!, phoneNumber!);
            if (res.data.success) {
                setCustomer(res.data.customer);
                setStore(res.data.store);
            } else {
                setError(res.data.message || 'Customer not found.');
            }
        } catch {
            setError('Failed to load loyalty data.');
        } finally {
            setLoading(false);
        }
    };

    const handleScanSuccess = async (decodedText: string) => {
        setIsScannerOpen(false);
        const match = decodedText.match(/#\/claim\/([^/?]+)/);
        const claimId = match ? match[1] : decodedText;
        setClaimLoading(true);
        setClaimStatus(null);
        try {
            const res = await publicClaimStamps({ claimId, phoneNumber: phoneNumber!, storeId: storeId! });
            if (res.data.success) {
                setClaimStatus({ type: 'success', message: res.data.message });
                fetchLoyaltyData();
            } else {
                setClaimStatus({ type: 'error', message: res.data.message || 'Failed to claim stamps' });
            }
        } catch (err: any) {
            setClaimStatus({ type: 'error', message: err.response?.data?.message || 'An error occurred' });
        } finally {
            setClaimLoading(false);
            setTimeout(() => setClaimStatus(null), 5000);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
            <LoadingSpinner />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center" style={{ background: '#F8FAFC' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: NAVY }}>{error}</h2>
            <p className="text-slate-500 mb-8 text-sm">Please ask the cashier to scan your QR code.</p>
            <button
                onClick={() => window.location.hash = '#/loyalty'}
                className="px-8 py-3 rounded-2xl font-bold text-white transition-all"
                style={{ background: NAVY }}
            >
                Go Back
            </button>
        </div>
    );

    if (!customer || !store) return null;

    const stampsToRedeem = store.stampsToRedeem || 10;
    const currentStamps = customer.currentStamps || 0;
    const totalEarned = customer.totalEarnedStamps || 0;
    const progress = Math.min(1, currentStamps / stampsToRedeem);
    const stampsLeft = Math.max(0, stampsToRedeem - currentStamps);
    const isRewardReady = currentStamps >= stampsToRedeem;

    const initials = customer.name
        ? customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'C';

    return (
        <div className="min-h-screen pb-32" style={{ background: '#F1F5F9' }}>

            {/* Toast Notifications */}
            {claimStatus && (
                <div
                    className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center`}
                    style={{ background: claimStatus.type === 'success' ? '#10b981' : '#ef4444' }}
                >
                    <FaCoffee size={20} color="white" className="mr-3 flex-shrink-0" />
                    <p className="font-bold text-white">{claimStatus.message}</p>
                </div>
            )}

            {claimLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(6px)' }}>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center">
                        <LoadingSpinner />
                        <p className="mt-4 font-bold" style={{ color: NAVY }}>Processing Claim...</p>
                    </div>
                </div>
            )}

            {/* ─── HEADER ─── */}
            <div
                className="relative overflow-hidden px-6 pt-12 pb-24 text-white"
                style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)` }}
            >
                {/* Background decorations */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: AMBER, filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: AMBER, filter: 'blur(30px)', transform: 'translate(-30%, 30%)' }} />

                {/* Store branding */}
                <div className="relative flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest opacity-60">Rewards Club</p>
                        <h1 className="text-2xl font-black tracking-tight mt-0.5">{store.name}</h1>
                    </div>
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)' }}
                    >
                        <FaTrophy size={20} color={AMBER} />
                    </div>
                </div>

                {/* Customer avatar + name */}
                <div className="relative flex items-center space-x-3">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black"
                        style={{ background: 'rgba(255,255,255,0.12)', color: AMBER_LIGHT }}
                    >
                        {initials}
                    </div>
                    <div>
                        <p className="font-bold text-base leading-tight">{customer.name || 'Coffee Lover'}</p>
                        <p className="text-xs opacity-50">{customer.phoneNumber}</p>
                    </div>
                </div>
            </div>

            {/* ─── STAMP CARD (floats over header) ─── */}
            <div className="px-5 -mt-14 relative z-10">
                <div className="bg-white rounded-[2rem] shadow-2xl p-7" style={{ boxShadow: '0 20px 60px rgba(10,22,40,0.15)' }}>

                    {/* Circular progress ring */}
                    <div className="flex justify-center mb-8">
                        <CircularProgress current={currentStamps} total={stampsToRedeem} />
                    </div>

                    {/* Stamp Grid */}
                    <div className="grid grid-cols-5 gap-3 mb-6">
                        {Array.from({ length: stampsToRedeem }).map((_, i) => {
                            const isFilled = i < currentStamps;
                            const isNext = i === currentStamps && !isRewardReady;
                            return (
                                <div
                                    key={i}
                                    className="aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 relative"
                                    style={{
                                        background: isFilled ? NAVY : 'transparent',
                                        border: isFilled
                                            ? `2px solid ${NAVY}`
                                            : isNext
                                                ? `2px dashed ${AMBER}`
                                                : '2px dashed #CBD5E1',
                                        boxShadow: isFilled ? `0 4px 14px rgba(10,22,40,0.25)` : isNext ? `0 0 12px rgba(245,158,11,0.3)` : 'none',
                                    }}
                                >
                                    {isFilled ? (
                                        <FaCoffee size={18} color="white" />
                                    ) : isNext ? (
                                        <span className="text-sm font-black" style={{ color: AMBER }}>{i + 1}</span>
                                    ) : (
                                        <span className="text-xs font-bold text-slate-300">{i + 1}</span>
                                    )}
                                    {isNext && (
                                        <span
                                            className="absolute inset-0 rounded-2xl animate-ping"
                                            style={{ background: 'rgba(245,158,11,0.15)' }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Urgency / Reward Banner */}
                    {isRewardReady ? (
                        <div
                            className="flex items-center space-x-3 p-4 rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                            <FaGift size={22} color="white" />
                            <div>
                                <p className="font-black text-white text-sm">🎉 Reward Ready!</p>
                                <p className="text-white/80 text-xs mt-0.5">{store.loyaltyRewardDescription || 'One free coffee of your choice!'}</p>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="flex items-center space-x-3 p-4 rounded-2xl"
                            style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})` }}
                        >
                            <FaFire size={20} color={AMBER} />
                            <div>
                                <p className="font-black text-white text-sm">
                                    {stampsLeft === 1
                                        ? '⚡ Only 1 more stamp to go!'
                                        : `🔥 ${stampsLeft} more stamps for your free reward!`}
                                </p>
                                <p className="text-white/60 text-xs mt-0.5 truncate">
                                    {store.loyaltyRewardDescription || 'One free coffee of your choice!'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── LIFETIME STATS ─── */}
            <div className="px-5 mt-5 grid grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl p-5 text-center shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Lifetime Stamps</p>
                    <p className="text-4xl font-black" style={{ color: NAVY }}>{totalEarned}</p>
                    <p className="text-[10px] text-slate-400 mt-1">☕ Total Earned</p>
                </div>
                <div className="bg-white rounded-3xl p-5 text-center shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Member Status</p>
                    <p
                        className="text-2xl font-black uppercase tracking-tight"
                        style={{ color: AMBER }}
                    >
                        {totalEarned >= 50 ? 'Gold' : totalEarned >= 20 ? 'Silver' : 'Member'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">🏆 Rewards Club</p>
                </div>
            </div>

            {/* PWA Install */}
            <div className="px-5 mt-4">
                <PWAInstallButton />
            </div>

            {/* Footer */}
            <div className="mt-10 px-6 text-center">
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center text-slate-400 text-xs font-bold space-x-2 hover:text-slate-600 transition-colors"
                >
                    <FaSync size={12} />
                    <span>Refresh Balance</span>
                </button>
                <p className="text-[10px] text-slate-300 mt-4 leading-relaxed">
                    Stamps are awarded for eligible purchases only.
                </p>
            </div>

            {/* ─── FLOATING SCAN BUTTON ─── */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
                <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center space-x-3 text-white px-8 py-5 rounded-full shadow-2xl transition-all active:scale-95"
                    style={{
                        background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
                        boxShadow: `0 8px 30px rgba(10,22,40,0.4)`,
                        border: `2px solid rgba(255,255,255,0.1)`,
                    }}
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(245,158,11,0.2)' }}
                    >
                        <FaCamera size={18} color={AMBER} />
                    </div>
                    <span className="font-black text-lg tracking-tight pr-2">Scan to Earn</span>
                </button>
            </div>

            <QRScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
            />
        </div>
    );
};

export default LoyaltyPortal;
