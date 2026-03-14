import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Store } from '../../types';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import Textarea from '../Shared/Textarea';
import { FaStore, FaSave, FaBell, FaExclamationTriangle, FaGift } from 'react-icons/fa';
import QRCode from "react-qr-code";

const StoreSettings: React.FC = () => {
    const { currentUser } = useAuth();
    const { currentStoreId, getStoreById, updateStore, clearAllOrders, knownCategories } = useShop();

    const [settings, setSettings] = useState<Partial<Store>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (currentStoreId) {
            const storeData = getStoreById(currentStoreId);
            if (storeData) {
                setSettings(storeData);
            }
        }
    }, [currentStoreId, getStoreById]);

    const handleSettingChange = (field: keyof Store, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveSettings = () => {
        if (settings && settings.id && settings.name) {
            updateStore(settings as Store);
            setSuccessMessage("Store settings saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } else {
            alert("Store name is required.");
        }
    };

    if (!currentStoreId || !currentUser || (currentUser.role !== 'Store Admin' && currentUser.role !== 'Admin')) {
        return <p className="p-6 text-center">Please select a store and ensure you have administrative privileges.</p>;
    }

    return (
        <div className="space-y-6 fade-in p-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
                    <span className="mr-2 text-emerald"><FaStore /></span>Manage Store Settings
                </h2>
                <Button onClick={handleSaveSettings} leftIcon={<FaSave />}>Save Changes</Button>
            </div>

            {successMessage && <p className="text-sm text-emerald p-2 bg-emerald/10 rounded-md">{successMessage}</p>}

            <div className="space-y-4 bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-charcoal-dark dark:text-cream-light">Basic Information</h3>
                <Input label="Store Name" value={settings.name || ''} onChange={e => handleSettingChange('name', e.target.value)} required />
                <Textarea label="Address (Optional)" rows={2} value={settings.address || ''} onChange={e => handleSettingChange('address', e.target.value)} />
                <Input label="Contact Info (Optional)" value={settings.contactInfo || ''} onChange={e => handleSettingChange('contactInfo', e.target.value)} placeholder="e.g., Phone number or email" />
                <Input label="Default Currency Code" value={settings.currencyCode || 'USD'} onChange={e => handleSettingChange('currencyCode', e.target.value)} placeholder="e.g., USD, KHR" />
                <Input label="Timezone" value={settings.timezone || ''} onChange={e => handleSettingChange('timezone', e.target.value)} placeholder="e.g., America/New_York" />

                <div>
                    <label className="block text-sm font-semibold text-charcoal-dark dark:text-cream-light mb-1">
                        Tax Rate (%)
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={settings.taxRate !== undefined ? (Math.round(settings.taxRate * 10000) / 100).toString() : '0'}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleSettingChange('taxRate', isNaN(val) ? 0 : val / 100);
                            }}
                            className="w-24 p-2 rounded border border-charcoal-light/20 bg-cream-light dark:bg-charcoal-dark text-charcoal-dark dark:text-cream-light text-right font-bold"
                        />
                        <span className="text-charcoal-dark dark:text-cream-light font-bold">%</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-charcoal-dark dark:text-cream-light flex items-center">
                    <span className="mr-2"><FaBell /></span>Telegram Order Notifications
                </h3>
                <div className="p-3 bg-terracotta/10 border-l-4 border-terracotta text-terracotta-dark dark:text-terracotta rounded-lg text-sm flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0"><FaExclamationTriangle /></span>
                    <div>
                        <span className="font-bold">Security Warning:</span> Storing your bot token in the browser is not secure for production environments. This feature is for demonstration purposes. Use with caution.
                    </div>
                </div>
                <Input
                    label="Telegram Bot Token"
                    type="password"
                    value={settings.telegramBotToken || ''}
                    onChange={e => handleSettingChange('telegramBotToken', e.target.value)}
                    placeholder="Enter token from BotFather"
                />
                <Input
                    label="Telegram Chat ID"
                    value={settings.telegramChatId || ''}
                    onChange={e => handleSettingChange('telegramChatId', e.target.value)}
                    placeholder="Enter your user or group chat ID"
                />
                <p className="text-xs text-charcoal-light">Get your Chat ID by messaging <code>@userinfobot</code> on Telegram.</p>
            </div>

            <div className="space-y-4 bg-terracotta/5 border border-terracotta/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-terracotta-dark dark:text-terracotta flex items-center">
                    <span className="mr-2"><FaExclamationTriangle /></span>Data Management
                </h3>
                <p className="text-sm text-charcoal-dark dark:text-cream-light mb-4">
                    Danger Zone: These actions are irreversible.
                </p>

                <div className="flex items-center justify-between bg-white dark:bg-charcoal-dark p-3 rounded border border-terracotta/30">
                    <div>
                        <h4 className="font-bold text-terracotta-dark dark:text-terracotta">Clear All Orders</h4>
                        <p className="text-xs text-charcoal-light">Permanently delete all order history for this store.</p>
                    </div>
                    <Button
                        onClick={() => {
                            if (window.confirm("ARE YOU SURE? This will permanently delete ALL order history for this store. This cannot be undone.")) {
                                if (window.confirm("Please confirm again: DELETE ALL ORDERS?")) {
                                    clearAllOrders().then(success => {
                                        if (success) alert("All orders have been cleared.");
                                    });
                                }
                            }
                        }}
                        className="bg-terracotta hover:bg-terracotta-dark text-white"
                        leftIcon={<FaExclamationTriangle />}
                    >
                        Delete All Orders
                    </Button>
                </div>
            </div>

            {/* Customer Loyalty Configuration Section */}
            <div className="space-y-4 bg-emerald/5 border border-emerald/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-emerald-dark dark:text-emerald flex items-center">
                    <span className="mr-2"><FaGift /></span>Customer Loyalty & Rewards
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-charcoal-dark rounded-lg border border-charcoal-light/10 shadow-sm">
                        <span className="font-medium text-charcoal-dark dark:text-cream-light">Enable Customer Loyalty Program</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.loyaltyEnabled || false}
                                onChange={e => handleSettingChange('loyaltyEnabled', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {settings.loyaltyEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <Input
                                label="Stamps Per Item"
                                type="number"
                                min="1"
                                value={settings.stampsPerItem || 1}
                                onChange={e => handleSettingChange('stampsPerItem', parseInt(e.target.value) || 1)}
                                helperText="How many stamps a customer gets for each item purchased."
                            />
                            <Input
                                label="Stamps to Redeem Reward"
                                type="number"
                                min="1"
                                value={settings.stampsToRedeem || 10}
                                onChange={e => handleSettingChange('stampsToRedeem', parseInt(e.target.value) || 10)}
                                helperText="Goal: Total stamps needed to earn a reward."
                            />
                            <div className="md:col-span-2">
                                <Input
                                    label="Reward Description"
                                    placeholder="e.g., Free Any Coffee or 10% Discount"
                                    value={settings.loyaltyRewardDescription || ''}
                                    onChange={e => handleSettingChange('loyaltyRewardDescription', e.target.value)}
                                    helperText="This describes what the customer gets when they reach the goal."
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Staff Rewards Section */}
            <div className="space-y-4 bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-charcoal-dark dark:text-cream-light flex items-center">
                    <span className="mr-2"><FaGift /></span>Staff Rewards & QR
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Staff QR Code */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-charcoal-dark rounded-2xl shadow-sm border border-charcoal-light/10">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl mb-4">
                            <FaStore size={24} />
                        </div>
                        <h4 className="font-bold text-charcoal-dark dark:text-cream-light mb-2 text-sm uppercase tracking-widest">Staff Clock-In QR</h4>
                        {settings.id && (
                            <div className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 mb-4">
                                <QRCode
                                    value={JSON.stringify({ storeId: settings.id })}
                                    size={140}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                        )}
                        <p className="text-[10px] text-charcoal-light font-bold text-center px-4 leading-relaxed">
                            Staff scan this to Clock-In or <br /> Claim Staff Rewards correctly.
                        </p>
                    </div>

                    {/* Loyalty Portal QR Code */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-charcoal-dark rounded-2xl shadow-sm border border-emerald/20">
                        <div className="p-3 bg-emerald/10 text-emerald rounded-xl mb-4">
                            <FaGift size={24} />
                        </div>
                        <h4 className="font-bold text-charcoal-dark dark:text-cream-light mb-2 text-sm uppercase tracking-widest">Loyalty Portal QR</h4>
                        {settings.id && (
                            <div className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 mb-4">
                                <QRCode
                                    value={`https://tompr-stamp.vercel.app/#/loyalty?storeId=${settings.id}`}
                                    size={140}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                        )}
                        <p className="text-[10px] text-emerald font-black text-center px-4 leading-relaxed uppercase tracking-tighter">
                            Customer scan this to sign up/login <br /> to this store automatically.
                        </p>
                        <div className="mt-4 w-full">
                            <code className="block p-2 bg-gray-50 dark:bg-charcoal-900 rounded text-[10px] text-charcoal-light break-all select-all font-mono">
                                https://tompr-stamp.vercel.app/#/loyalty?storeId={settings.id}
                            </code>
                        </div>
                    </div>
                </div>
                {/* Policy Settings and Loyalty Portal Link */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-charcoal-dark rounded-lg border border-charcoal-light/10">
                        <span className="font-medium text-charcoal-dark dark:text-cream-light">Enable Rewards</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.rewardPolicy?.enabled || false}
                                onChange={e => handleSettingChange('rewardPolicy', { ...settings.rewardPolicy, enabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    <Input
                        label='Reward Name'
                        placeholder="e.g. Free Morning Coffee"
                        value={settings.rewardPolicy?.rewardName || ''}
                        onChange={e => handleSettingChange('rewardPolicy', { ...settings.rewardPolicy, rewardName: e.target.value })}
                    />

                    <Input
                        type="number"
                        label='Early Bird Threshold (Minutes)'
                        helperText="Minutes BEFORE shift start to qualify."
                        value={settings.rewardPolicy?.earlyMinutes || 15}
                        onChange={e => handleSettingChange('rewardPolicy', { ...settings.rewardPolicy, earlyMinutes: parseInt(e.target.value) || 0 })}
                    />

                    {settings.rewardPolicy?.enabled && (
                        <div className="space-y-2 mt-4">
                            <label className="block text-sm font-semibold text-charcoal-dark dark:text-cream-light">
                                Eligible Reward Categories
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {knownCategories.map(cat => (
                                    <label
                                        key={cat}
                                        className={`px-3 py-1 rounded-full text-xs cursor-pointer border transition-colors ${settings.rewardPolicy?.allowedCategories?.includes(cat)
                                            ? 'bg-emerald text-white border-emerald'
                                            : 'bg-white dark:bg-charcoal-dark text-charcoal-dark dark:text-cream-light border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.rewardPolicy?.allowedCategories?.includes(cat) || false}
                                            onChange={e => {
                                                const policy = settings.rewardPolicy || { enabled: true, earlyMinutes: 15 };
                                                const current = policy.allowedCategories || [];
                                                const next = e.target.checked
                                                    ? [...current, cat]
                                                    : current.filter(c => c !== cat);
                                                handleSettingChange('rewardPolicy', { ...policy, allowedCategories: next });
                                            }}
                                        />
                                        {cat}
                                    </label>
                                ))}
                            </div>
                            <p className="text-[10px] text-charcoal-light italic">Only products from these categories will be claimable as rewards.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreSettings;
