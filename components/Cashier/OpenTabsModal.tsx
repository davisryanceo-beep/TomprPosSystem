import React from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { useShop } from '../../contexts/ShopContext';
import { OrderStatus, Order } from '../../types';
import { FaFolderOpen, FaClock, FaTrash, FaMoneyBillWave, FaSearch } from 'react-icons/fa';

interface OpenTabsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadTab: (order: Order) => void;
    onSettleTab: (order: Order) => void;
}

const OpenTabsModal: React.FC<OpenTabsModalProps> = ({ isOpen, onClose, onLoadTab, onSettleTab }) => {
    const { currentStoreId, orders, deleteOrder } = useShop();
    const [searchTerm, setSearchTerm] = React.useState('');

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
                o.paymentMethod === 'Unpaid' &&
                (searchTerm === '' || 
                 (o.tableNumber && o.tableNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                 (o.dailyOrderNumber && o.dailyOrderNumber.toString().includes(searchTerm)))
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Open Tabs / Unpaid Orders" size="lg">
            <div className="p-4 flex flex-col h-full max-h-[85vh]">
                <div className="relative mb-4">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tabs by name or table..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-charcoal border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-grow overflow-y-auto">
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
                                            variant="outline"
                                            className="flex-1 !py-2"
                                            leftIcon={<FaFolderOpen />}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            onClick={() => onSettleTab(tab)}
                                            variant="primary"
                                            className="flex-1 !py-2 shadow-sm bg-emerald hover:bg-emerald-dark"
                                            leftIcon={<FaMoneyBillWave />}
                                        >
                                            Pay
                                        </Button>
                                        <Button
                                            onClick={() => handleDeleteTab(tab.id)}
                                            variant="ghost"
                                            className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 px-3"
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
            </div>
        </Modal>
    );
};

export default OpenTabsModal;
