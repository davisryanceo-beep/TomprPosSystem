import React, { useEffect, useState } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { FaBell, FaCheck, FaTimes } from 'react-icons/fa';
import Button from '../Shared/Button';

const POSAlerts: React.FC = () => {
    const { newOnlineOrders, acknowledgeOrder } = useShop();
    const [isOpen, setIsOpen] = useState(false);

    // Play sound when new orders arrive
    useEffect(() => {
        if (newOnlineOrders.length > 0) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [newOnlineOrders]);

    if (newOnlineOrders.length === 0) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="bg-white dark:bg-charcoal border border-emerald rounded-lg shadow-2xl p-4 w-80">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center text-emerald">
                        <span className="p-2 bg-emerald/10 rounded-full mr-2">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald opacity-75"></span>
                            <FaBell />
                        </span>
                        <h3 className="font-bold">New Online Order!</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <FaTimes />
                    </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {newOnlineOrders.map(order => (
                        <div key={order.id} className="bg-gray-50 dark:bg-charcoal-dark p-3 rounded text-sm relative">
                            <div className="font-bold flex justify-between">
                                <span>#{order.id.slice(-6)}</span>
                                <span>${(order.finalAmount || 0).toFixed(2)}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">{order.deliveryDetails?.customerName}</p>
                            <p className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleTimeString()}</p>

                            <div className="mt-2 flex space-x-2">
                                <Button
                                    size="sm"
                                    fullWidth
                                    onClick={() => acknowledgeOrder(order.id)}
                                    leftIcon={<FaCheck />}
                                >
                                    Accept
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default POSAlerts;
