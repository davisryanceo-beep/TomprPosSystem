import React, { useState } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Customer } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { FaSearch, FaUserPlus, FaStamp, FaCheckCircle, FaTimes } from 'react-icons/fa';

interface LoyaltyLookupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoyaltyLookupModal: React.FC<LoyaltyLookupModalProps> = ({ isOpen, onClose }) => {
    const { lookupCustomer, registerCustomer, setSelectedCustomer, selectedCustomer, currentStoreId } = useShop();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [lookupResult, setLookupResult] = useState<Customer | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!phoneNumber) return;
        setIsSearching(true);
        setError(null);
        try {
            const customer = await lookupCustomer(phoneNumber);
            setLookupResult(customer);
            if (!customer) {
                setIsRegistering(true);
            }
        } catch (err) {
            setError('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRegister = async () => {
        if (!phoneNumber || !currentStoreId) return;
        setIsSearching(true);
        setError(null);
        try {
            const newCustomer = await registerCustomer({
                phoneNumber,
                name: customerName,
                referralCode: referralCode || undefined,
                storeId: currentStoreId
            });
            if (newCustomer) {
                setLookupResult(newCustomer);
                setIsRegistering(false);
            } else {
                setError('Registration failed.');
            }
        } catch (err) {
            setError('Registration error.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectCustomer = () => {
        if (lookupResult) {
            setSelectedCustomer(lookupResult);
            onClose();
        }
    };

    const handleClearSelected = () => {
        setSelectedCustomer(null);
        setLookupResult(null);
        setPhoneNumber('');
        setCustomerName('');
        setIsRegistering(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Customer Loyalty (Stamp Card)"
            size="md"
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    {lookupResult && !selectedCustomer && (
                        <Button onClick={handleSelectCustomer}>Attach to Order</Button>
                    )}
                    {selectedCustomer && (
                        <Button variant="danger" onClick={handleClearSelected}>Detach from Order</Button>
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {selectedCustomer ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                <FaCheckCircle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-green-800 dark:text-green-300">{selectedCustomer.name || 'Member'}</h4>
                                <p className="text-sm text-green-600 dark:text-green-400">{selectedCustomer.phoneNumber}</p>
                                <div className="flex items-center mt-1 space-x-2">
                                    <div className="flex items-center text-sm font-medium text-amber-600 dark:text-amber-400">
                                        <span className="mr-1"><FaStamp /></span> {selectedCustomer.currentStamps} Stamps
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                        selectedCustomer.loyaltyTier === 'Platinum' ? 'bg-purple-500 text-white' :
                                        selectedCustomer.loyaltyTier === 'Gold' ? 'bg-amber-400 text-charcoal' :
                                        'bg-charcoal/10 text-charcoal-light'
                                    }`}>
                                        {selectedCustomer.loyaltyTier || 'Silver'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={handleClearSelected}>
                            <FaTimes />
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {!isRegistering ? (
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <FaSearch />
                                    </span>
                                    <input
                                        type="tel"
                                        placeholder="Search by Phone Number..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-coffee-medium outline-none"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <Button onClick={handleSearch} disabled={isSearching || !phoneNumber}>
                                    {isSearching ? 'Searching...' : 'Search'}
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 border border-coffee-light/30 bg-coffee-light/5 dark:bg-coffee-dark/20 rounded-xl space-y-4">
                                <div className="flex items-center space-x-2 text-coffee-medium dark:text-coffee-light font-semibold">
                                    <FaUserPlus /> <span>New Member Enrollment</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone Number</label>
                                        <input
                                            type="tel"
                                            readOnly
                                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg opacity-70"
                                            value={phoneNumber}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer Name (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Enter customer name..."
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-coffee-medium outline-none"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Referral Code (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Who referred you?"
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-coffee-medium outline-none"
                                            value={referralCode}
                                            onChange={(e) => setReferralCode(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex space-x-2 pt-2">
                                    <Button className="flex-1" onClick={handleRegister} disabled={isSearching}>
                                        {isSearching ? 'Saving...' : 'Register Customer'}
                                    </Button>
                                    <Button variant="ghost" className="flex-1" onClick={() => setIsRegistering(false)}>Cancel</Button>
                                </div>
                            </div>
                        )}

                        {lookupResult && !isRegistering && (
                            <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200">{lookupResult.name || 'Member'}</h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                            lookupResult.loyaltyTier === 'Platinum' ? 'bg-purple-500 text-white' :
                                            lookupResult.loyaltyTier === 'Gold' ? 'bg-amber-400 text-charcoal' :
                                            'bg-charcoal/10 text-charcoal-light'
                                        }`}>
                                            {lookupResult.loyaltyTier || 'Silver'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{lookupResult.phoneNumber}</p>
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                                        <span className="mr-1"><FaStamp /></span> {lookupResult.currentStamps} Stamps Available
                                    </p>
                                </div>
                                <Button size="sm" onClick={handleSelectCustomer}>Add to Order</Button>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        )}
                    </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl">
                    <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">How it works:</h5>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc pl-4">
                        <li>Customers earn 1 stamp for every item purchased.</li>
                        <li>Stamps are automatically added when the order is PAID.</li>
                        <li>Collected stamps can be redeemed for free rewards.</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

export default LoyaltyLookupModal;
