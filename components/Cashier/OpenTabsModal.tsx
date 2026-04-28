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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                            {openTabs.map((tab) => (
                                <div
                                    key={tab.id}
                                    className="glass-panel border-emerald/10 dark:border-emerald/20 rounded-2xl p-5 bg-white/70 dark:bg-charcoal-dark/70 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group animate-fade-in"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-emerald/10 text-emerald text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        {tab.tableNumber ? 'Table' : 'Takeaway'}
                                                    </span>
                                                    <h3 className="font-black text-xl text-charcoal-dark dark:text-cream-light leading-none">
                                                        {tab.dailyOrderNumber ? `#${tab.dailyOrderNumber}` : `#${tab.id.slice(-4)}`}
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-charcoal-light dark:text-gray-400 flex items-center gap-1.5">
                                                    <FaClock className="text-emerald/60" /> {new Date(tab.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </p>
                                                {tab.tableNumber && (
                                                    <p className="text-sm font-bold text-emerald leading-none mt-2">
                                                        {tab.tableNumber}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-2xl text-emerald drop-shadow-sm">
                                                    ${tab.finalAmount.toFixed(2)}
                                                </p>
                                                <p className="text-[10px] font-bold text-charcoal-light dark:text-gray-500 uppercase tracking-tighter">
                                                    {tab.items.length} {tab.items.length === 1 ? 'item' : 'items'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mb-5 text-xs text-charcoal-dark/70 dark:text-gray-300 italic line-clamp-2 min-h-[2.5rem]">
                                            {tab.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-1 gap-2">
                                            <Button
                                                onClick={() => onLoadTab(tab)}
                                                variant="outline"
                                                className="flex-1 !py-2.5 !px-2 rounded-xl text-xs font-black uppercase tracking-widest border-emerald/20 hover:bg-emerald/5 transition-colors"
                                                leftIcon={<FaFolderOpen className="text-emerald" />}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                onClick={() => onSettleTab(tab)}
                                                variant="primary"
                                                className="flex-1 !py-2.5 !px-2 rounded-xl text-xs font-black uppercase tracking-widest bg-gradient-to-r from-emerald to-teal-500 hover:shadow-lg hover:shadow-emerald/20 transition-all active:scale-95"
                                                leftIcon={<FaMoneyBillWave />}
                                            >
                                                Pay
                                            </Button>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTab(tab.id)}
                                            className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-900/20"
                                            title="Delete Tab"
                                        >
                                            <FaTrash size={14} />
                                        </button>
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
