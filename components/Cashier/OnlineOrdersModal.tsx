import React, { useState, useMemo } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { useShop } from '../../contexts/ShopContext';
import { Order, OrderStatus } from '../../types';
import {
    FaClipboardList, FaCheck, FaUtensils, FaBoxOpen, FaMotorcycle, FaTimes, FaPhone, FaMapMarkerAlt
} from 'react-icons/fa';

interface OnlineOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OnlineOrdersModal: React.FC<OnlineOrdersModalProps> = ({ isOpen, onClose }) => {
    // Use 'orders' instead of 'ordersState', and 'updateOrder' instead of 'apiUpdateOrder'
    const { orders, updateOrder } = useShop();
    const [activeTab, setActiveTab] = useState<'Active' | 'History'>('Active');

    // Filter for delivery orders
    const deliveryOrders = useMemo(() => {
        return orders
            .filter(o => o.orderType === 'DELIVERY')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [orders]);

    const activeOrders = deliveryOrders.filter(o =>
        o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED
    );

    const historyOrders = deliveryOrders.filter(o =>
        o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED
    );

    const displayedOrders = activeTab === 'Active' ? activeOrders : historyOrders;

    const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, kitchenStatus?: any) => {
        try {
            const updates: Partial<Order> = { status: newStatus };
            if (kitchenStatus) {
                updates.kitchenStatus = kitchenStatus;
            }

            await updateOrder(orderId, updates);
        } catch (error) {
            console.error("Failed to update order status", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const getNextAction = (order: Order) => {
        switch (order.status) {
            case OrderStatus.CREATED:
                return (
                    <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, OrderStatus.RECEIVED)}
                        leftIcon={<FaCheck />} // Using simple icons without className if causing issues, but basic props should work
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Accept
                    </Button>
                );
            case OrderStatus.RECEIVED:
                return (
                    <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, OrderStatus.PREPARING, 'preparing')}
                        leftIcon={<FaUtensils />}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        Start Preparing
                    </Button>
                );
            case OrderStatus.PREPARING:
                // Check kitchen status to determine if it's "Preparing" or "Ready"
                if (order.kitchenStatus === 'ready') {
                    return (
                        <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, OrderStatus.COMPLETED, 'completed')}
                            leftIcon={<FaMotorcycle />}
                            className="bg-emerald hover:bg-emerald-dark text-white"
                        >
                            Mark Delivered
                        </Button>
                    );
                } else {
                    return (
                        <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, OrderStatus.PREPARING, 'ready')}
                            leftIcon={<FaBoxOpen />}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Mark Ready
                        </Button>
                    );
                }
            default:
                return null;
        }
    };

    const getStatusColor = (status: OrderStatus, kitchenStatus?: string) => {
        if (status === OrderStatus.CREATED) return 'bg-red-100 text-red-800 border-red-200';
        if (status === OrderStatus.RECEIVED) return 'bg-blue-100 text-blue-800 border-blue-200';
        if (status === OrderStatus.PREPARING) {
            if (kitchenStatus === 'ready') return 'bg-purple-100 text-purple-800 border-purple-200';
            return 'bg-amber-100 text-amber-800 border-amber-200';
        }
        if (status === OrderStatus.COMPLETED) return 'bg-gray-100 text-gray-800 border-gray-200';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Online Orders Management"
            size="lg"
            footer={
                <Button onClick={onClose} fullWidth>Close</Button>
            }
        >
            <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                <button
                    className={`px-4 py-2 font-bold rounded-t-lg ${activeTab === 'Active' ? 'bg-emerald/10 text-emerald border-b-2 border-emerald' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('Active')}
                >
                    Active ({activeOrders.length})
                </button>
                <button
                    className={`px-4 py-2 font-bold rounded-t-lg ${activeTab === 'History' ? 'bg-emerald/10 text-emerald border-b-2 border-emerald' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('History')}
                >
                    History
                </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {displayedOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <FaClipboardList className="mx-auto text-4xl mb-3 opacity-30" />
                        <p>No {activeTab.toLowerCase()} online orders found.</p>
                    </div>
                ) : (
                    displayedOrders.map(order => (
                        <div key={order.id} className={`p-4 rounded-lg border ${getStatusColor(order.status, order.kitchenStatus)} relative`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">#{order.id.slice(-6)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(order.status, order.kitchenStatus)} bg-white/50`}>
                                            {order.status === OrderStatus.PREPARING && order.kitchenStatus === 'ready' ? 'READY' : order.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm opacity-75">{new Date(order.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-lg">${order.finalAmount.toFixed(2)}</span>
                                    <span className="text-xs uppercase">{order.paymentMethod}</span>
                                </div>
                            </div>

                            <div className="bg-white/60 dark:bg-black/20 p-3 rounded mb-3">
                                <p className="font-bold flex items-center gap-2">
                                    {order.deliveryDetails?.customerName}
                                </p>
                                <p className="text-sm flex items-center gap-2 mt-1">
                                    <span className="opacity-50"><FaPhone /></span>
                                    <a href={`tel:${order.deliveryDetails?.contactNumber}`} className="hover:underline">
                                        {order.deliveryDetails?.contactNumber}
                                    </a>
                                </p>
                                <p className="text-sm flex items-start gap-2 mt-1">
                                    <span className="opacity-50 mt-1"><FaMapMarkerAlt /></span>
                                    <span>{order.deliveryDetails?.address}</span>
                                </p>
                                {order.deliveryDetails?.notes && (
                                    <p className="text-sm mt-2 italic border-l-2 border-gray-400 pl-2">
                                        "{order.deliveryDetails?.notes}"
                                    </p>
                                )}
                            </div>

                            <div className="mb-4">
                                <h4 className="font-bold text-xs uppercase opacity-75 mb-1">Items</h4>
                                <ul className="text-sm space-y-1">
                                    {order.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between">
                                            <span>{item.quantity}x {item.productName}</span>
                                            <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-black/10 pt-3">
                                {activeTab === 'Active' && getNextAction(order)}

                                {activeTab === 'Active' && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (confirm('Cancel this order?')) handleUpdateStatus(order.id, OrderStatus.CANCELLED);
                                        }}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};

export default OnlineOrdersModal;
