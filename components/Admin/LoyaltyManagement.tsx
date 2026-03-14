import React, { useState } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { lookupCustomer, updateCustomer } from '../../services/api';
import { Customer } from '../../types';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import { FaSearch, FaStamp, FaPlus, FaMinus, FaUser, FaCheckCircle, FaExclamationCircle, FaGift, FaArrowRight } from 'react-icons/fa';
import LoadingSpinner from '../Shared/LoadingSpinner';
import QRCode from "react-qr-code";

const LoyaltyManagement: React.FC = () => {
    const { currentStoreId, getStoreById } = useShop();
    const currentStore = currentStoreId ? getStoreById(currentStoreId) : null;
    const stampsToRedeem = currentStore?.stampsToRedeem || 10;
    const rewardDescription = currentStore?.loyaltyRewardDescription;
    const [searchPhone, setSearchPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [adjustment, setAdjustment] = useState(0);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchPhone || !currentStoreId) return;

        setLoading(true);
        setStatus(null);
        setCustomer(null);

        try {
            const res = await lookupCustomer(searchPhone, currentStoreId);
            if (res.data) {
                setCustomer(res.data);
            } else {
                setStatus({ type: 'error', message: 'Customer not found at this store.' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to search customer.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAdjust = async (amount: number) => {
        if (!customer) return;

        const newBalance = Math.max(0, customer.currentStamps + amount);
        const earnedDiff = amount > 0 ? amount : 0;
        const newTotalEarned = (customer.totalEarnedStamps || 0) + earnedDiff;

        setLoading(true);
        try {
            const res = await updateCustomer(customer.id, {
                currentStamps: newBalance,
                totalEarnedStamps: newTotalEarned
            });

            if (res.data.success) {
                setStatus({ type: 'success', message: `Adjusted balance by ${amount > 0 ? '+' : ''}${amount} stamps.` });
                // Update local state
                setCustomer({
                    ...customer,
                    currentStamps: newBalance,
                    totalEarnedStamps: newTotalEarned
                });
                setAdjustment(0);
            } else {
                setStatus({ type: 'error', message: 'Failed to update balance.' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Error updating balance.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-8 fade-in">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald/10 text-emerald rounded-2xl">
                        <FaStamp size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-charcoal-dark dark:text-cream-light">Manage Stamps</h2>
                        <p className="text-sm text-charcoal-light dark:text-charcoal-light">Search and adjust customer stamp balances manually.</p>
                    </div>
                </div>

                {/* Loyalty Link Quick Access */}
                <div className="flex items-center space-x-4 p-4 bg-emerald/5 dark:bg-emerald/10 rounded-2xl border border-emerald/10 min-w-[280px]">
                    {currentStoreId ? (
                        <>
                            <div className="hidden sm:block">
                                <QRCode
                                    value={`https://tompr-stamp.vercel.app/#/loyalty?storeId=${currentStoreId}`}
                                    size={40}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-emerald-700/60 dark:text-emerald-300/60 tracking-widest mb-1">Your Loyalty Link</p>
                                <div className="flex items-center space-x-2">
                                    <code className="text-[10px] font-mono bg-white dark:bg-charcoal-dark px-2 py-1 rounded border border-emerald/20 select-all">
                                        https://tompr-stamp.vercel.app/#/loyalty?storeId={currentStoreId}
                                    </code>
                                    <a
                                        href={`https://tompr-stamp.vercel.app/#/loyalty?storeId=${currentStoreId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors"
                                        title="Open Portal"
                                    >
                                        <FaArrowRight size={10} />
                                    </a>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center space-x-2 text-charcoal-light italic text-xs">
                            <FaExclamationCircle />
                            <span>Select a store to view its loyalty link</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Search Section */}
            <div className="bg-cream dark:bg-charcoal-dark/50 p-6 rounded-3xl shadow-inner">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow">
                        <Input
                            placeholder="Enter Customer Phone Number"
                            value={searchPhone}
                            onChange={e => setSearchPhone(e.target.value)}
                            Icon={FaSearch}
                            className="bg-white dark:bg-charcoal-dark border-none shadow-sm"
                        />
                    </div>
                    <Button
                        type="submit"
                        loading={loading}
                        className="px-8 whitespace-nowrap"
                    >
                        Search Member
                    </Button>
                </form>
            </div>

            {/* Result Section */}
            {customer ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Customer Info Card */}
                    <div className="bg-white dark:bg-charcoal-dark rounded-3xl p-8 shadow-xl border border-charcoal/5 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-emerald/5">
                            <FaStamp size={120} />
                        </div>

                        <div className="relative z-10 flex items-center space-x-6">
                            <div className="w-20 h-20 bg-coffee-dark text-white rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-lg">
                                {customer.name ? customer.name.charAt(0) : 'C'}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-charcoal-dark dark:text-cream-light">{customer.name || 'Coffee Lover'}</h3>
                                <p className="text-coffee-medium font-bold">{customer.phoneNumber}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <div className="bg-emerald/5 dark:bg-emerald/10 p-5 rounded-2xl border border-emerald/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/60 dark:text-emerald-300/60 mb-1">Current Balance</p>
                                <p className="text-4xl font-black text-emerald">{customer.currentStamps}</p>
                                <p className="text-xs font-bold text-emerald/70">Stamps</p>
                            </div>
                            <div className="bg-coffee-light/5 dark:bg-coffee-light/10 p-5 rounded-2xl border border-coffee-light/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-coffee-medium/60 mb-1">Lifetime Earned</p>
                                <p className="text-4xl font-black text-charcoal-dark dark:text-cream-light">{customer.totalEarnedStamps || 0}</p>
                                <p className="text-xs font-bold text-charcoal-light">Stamps</p>
                            </div>
                        </div>
                    </div>

                    {/* Reward Redemption Card */}
                    <div className="bg-white dark:bg-charcoal-dark rounded-3xl p-8 shadow-xl border border-charcoal/5 dark:border-white/5 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-black text-charcoal-dark dark:text-cream-light flex items-center">
                                Reward Status
                            </h4>
                            {currentStoreId && (
                                <div className="px-3 py-1 bg-emerald/10 text-emerald text-xs font-black rounded-full border border-emerald/20">
                                    GOAL: {stampsToRedeem} STAMPS
                                </div>
                            )}
                        </div>

                        {currentStoreId && rewardDescription && (
                            <div className="mb-8 p-4 bg-cream dark:bg-charcoal-900 rounded-2xl border border-charcoal/5">
                                <p className="text-xs font-bold text-charcoal-light uppercase tracking-widest mb-1">Reward Description</p>
                                <p className="text-xl font-black text-emerald italic">
                                    "{rewardDescription}"
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex-grow">
                                <div className="h-4 w-full bg-cream dark:bg-charcoal-900 rounded-full overflow-hidden border border-charcoal/5">
                                    <div
                                        className="h-full bg-emerald transition-all duration-1000"
                                        style={{
                                            width: `${Math.min(100, (customer.currentStamps / stampsToRedeem) * 100)}%`
                                        }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] font-black uppercase tracking-tighter text-charcoal-light">
                                    <span>Progress</span>
                                    <span>{customer.currentStamps} / {stampsToRedeem}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={() => {
                                    handleAdjust(-stampsToRedeem);
                                }}
                                disabled={customer.currentStamps < stampsToRedeem || loading}
                                className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${customer.currentStamps >= stampsToRedeem
                                    ? 'bg-emerald hover:bg-emerald-dark shadow-emerald/30 shadow-xl scale-105'
                                    : ''
                                    }`}
                                loading={loading}
                                leftIcon={<FaGift />}
                            >
                                Redeem Reward
                            </Button>
                            <p className="text-[10px] text-center text-charcoal-light font-bold">
                                {customer.currentStamps >= stampsToRedeem
                                    ? "Customer is eligible for a reward!"
                                    : `Need ${stampsToRedeem - customer.currentStamps} more stamps to redeem.`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Adjustment Controls */}
                    <div className="bg-white dark:bg-charcoal-dark rounded-3xl p-8 shadow-xl border border-charcoal/5 dark:border-white/5 flex flex-col justify-center">
                        <h4 className="text-lg font-black text-charcoal-dark dark:text-cream-light mb-6 flex items-center">
                            Manual Adjustment
                        </h4>

                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={() => setAdjustment(prev => prev - 1)}
                                className="w-16 h-16 bg-cream dark:bg-charcoal-900 rounded-2xl flex items-center justify-center text-terracotta hover:bg-terracotta/10 transition-colors active:scale-95"
                            >
                                <FaMinus size={24} />
                            </button>

                            <div className="text-center">
                                <p className="text-5xl font-black text-charcoal-dark dark:text-cream-light">
                                    {adjustment > 0 ? `+${adjustment}` : adjustment}
                                </p>
                                <p className="text-xs font-bold text-charcoal-light uppercase tracking-widest mt-2">Adjust Quantity</p>
                            </div>

                            <button
                                onClick={() => setAdjustment(prev => prev + 1)}
                                className="w-16 h-16 bg-cream dark:bg-charcoal-900 rounded-2xl flex items-center justify-center text-emerald hover:bg-emerald/10 transition-colors active:scale-95"
                            >
                                <FaPlus size={24} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={() => handleAdjust(adjustment)}
                                disabled={adjustment === 0 || loading}
                                className="w-full py-5 rounded-2xl font-black text-lg"
                                loading={loading}
                            >
                                Apply {adjustment !== 0 ? (adjustment > 0 ? `+${adjustment}` : adjustment) : ''} Adjustment
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setAdjustment(0)}
                                disabled={adjustment === 0}
                                className="w-full"
                            >
                                Reset Adjustment
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="bg-white dark:bg-charcoal-dark rounded-[2.5rem] p-16 text-center border-2 border-dashed border-charcoal/5 dark:border-white/5">
                        <div className="w-24 h-24 bg-cream dark:bg-charcoal-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-charcoal-light opacity-30">
                            <FaUser size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-charcoal-dark dark:text-cream-light opacity-50">No Member Selected</h3>
                        <p className="text-charcoal-light max-w-xs mx-auto mt-2">Enter a phone number above to find a member and manage their rewards.</p>
                    </div>
                )
            )}

            {/* Status Message */}
            {status && (
                <div className={`p-4 rounded-2xl border flex items-center shadow-lg animate-in slide-in-from-right-4 duration-300 ${status.type === 'success'
                    ? 'bg-emerald/10 border-emerald/20 text-emerald'
                    : 'bg-terracotta/10 border-terracotta/20 text-terracotta'
                    }`}>
                    {status.type === 'success' ? <span className="mr-3"><FaCheckCircle /></span> : <span className="mr-3"><FaExclamationCircle /></span>}
                    <p className="font-bold text-sm">{status.message}</p>
                </div>
            )}
        </div>
    );
};

export default LoyaltyManagement;
