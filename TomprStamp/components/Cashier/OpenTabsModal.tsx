import React from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { useShop } from '../../contexts/ShopContext';
import { OrderStatus, Order } from '../../types';
import { FaFolderOpen, FaClock, FaTrash } from 'react-icons/fa';

interface OpenTabsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadTab: (order: Order) => void;
}

const OpenTabsModal: React.FC<OpenTabsModalProps> = ({ isOpen, onClose, onLoadTab }) => {
    const { currentStoreId, orders, deleteOrder } = useShop();

    const handleDeleteTab = async (orderId: string) => {
        if (window.confirm('Are you sure you want to delete this unpaid order? This action cannot be undone.')) {
            try {
                await deleteOrder(orderId);
            } catch (err) {
                console.error('Failed to delete tab:', err);
                alert('Failed to delete the tab. Please try again.');
            }
        }
    };

    const openTabs = orders
        .filter(
            (o) =>
                o.storeId === currentStoreId &&
                o.status === OrderStatus.CREATED &&
                o.paymentMethod === 'Unpaid'
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Open Tabs / Unpaid Orders" size="lg">
            <div className="p-4 max-h-[60vh] overflow-y-auto">
                {openTabs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No open tabs found.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {openTabs.map((tab) => (
                            <div
                                key={tab.id}
                                className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-charcoal-dark shadow-sm flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg text-charcoal dark:text-cream-light flex items-center gap-2">
                                                {tab.dailyOrderNumber ? `#${tab.dailyOrderNumber}` : 'New Tab'}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                <FaClock /> {new Date(tab.timestamp).toLocaleTimeString()}
                                            </p>
                                            {tab.tableNumber && (
                                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                                    Table: {tab.tableNumber}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-extrabold text-xl text-emerald">
                                                ${tab.finalAmount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {tab.items.length} items
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                                        {tab.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <Button
                                        onClick={() => onLoadTab(tab)}
                                        variant="primary"
                                        className="flex-1"
                                        leftIcon={<FaFolderOpen />}
                                    >
                                        Load Tab
                                    </Button>
                                    <Button
                                        onClick={() => handleDeleteTab(tab.id)}
                                        variant="ghost"
                                        className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title="Delete Tab"
                                    >
                                        <FaTrash />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default OpenTabsModal;
