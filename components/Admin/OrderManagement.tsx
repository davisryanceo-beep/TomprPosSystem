import React, { useState, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Order, OrderStatus, PaymentMethod } from '../../types';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Modal from '../Shared/Modal';
import { FaTrash, FaEdit, FaEye, FaSearch, FaFilter, FaReceipt, FaPrint } from 'react-icons/fa';
import PrintableReceipt from '../Cashier/PrintableReceipt';
import ReactDOM from 'react-dom';
import { useEffect } from 'react';

const OrderManagement: React.FC = () => {
    const { orders, currentStoreId, deleteOrder, updateOrder } = useShop();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [dateFilter, setDateFilter] = useState('');

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Edit State
    const [editStatus, setEditStatus] = useState<OrderStatus>(OrderStatus.PAID);
    const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('Cash');
    const [printableAreaNode, setPrintableAreaNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const node = document.getElementById('printable-area');
        if (node) {
            setPrintableAreaNode(node);
        }
    }, []);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(o => o.storeId === currentStoreId)
            .filter(o => {
                if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
                if (dateFilter) {
                    const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
                    if (orderDate !== dateFilter) return false;
                }
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return (
                        o.id.toLowerCase().includes(term) ||
                        (typeof o.items === 'string' ? o.items : JSON.stringify(o.items)).toLowerCase().includes(term) ||
                        o.finalAmount.toString().includes(term)
                    );
                }
                return true;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [orders, currentStoreId, statusFilter, dateFilter, searchTerm]);

    const handleOpenView = (order: Order) => {
        setSelectedOrder(order);
        setIsViewModalOpen(true);
    };

    const handleOpenEdit = (order: Order) => {
        setSelectedOrder(order);
        setEditStatus(order.status);
        setEditPaymentMethod(order.paymentMethod);
        setIsEditModalOpen(true);
    };

    const handleOpenDelete = (order: Order) => {
        setSelectedOrder(order);
        setIsDeleteModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedOrder) return;
        try {
            await updateOrder(selectedOrder.id, {
                status: editStatus,
                paymentMethod: editPaymentMethod
            });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update order", error);
            alert("Failed to update order");
        }
    };

    const handleDelete = async () => {
        if (!selectedOrder) return;
        try {
            await deleteOrder(selectedOrder.id);
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Failed to delete order", error);
            alert("Failed to delete order");
        }
    };

    // Helper to print receipt from view modal
    const handlePrintReceipt = () => {
        if (selectedOrder) {
            // Portal will handle rendering into #printable-area
            // We just need to trigger print
            setTimeout(() => {
                window.print();
            }, 300);
        }
    };

    return (
        <div className="space-y-6 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light">Order Management</h2>
                <div className="flex gap-2">
                </div>
            </div>

            {/* Filters */}
            <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                    label="Search"
                    placeholder="Order ID, Amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<FaSearch />}
                />
                <Select
                    label="Status"
                    options={[
                        { value: 'ALL', label: 'All Statuses' },
                        { value: OrderStatus.PAID, label: 'Paid' },
                        { value: OrderStatus.CREATED, label: 'Pending' },
                        { value: OrderStatus.COMPLETED, label: 'Completed' },
                        { value: OrderStatus.CANCELLED, label: 'Cancelled' },
                    ]}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                />
                <Input
                    type="date"
                    label="Date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                />
                <div className="flex items-end">
                    <Button variant="ghost" className="w-full" onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('ALL');
                        setDateFilter('');
                    }}>Clear Filters</Button>
                </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
                    <thead className="bg-cream dark:bg-charcoal-dark/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase">Payment</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/10 dark:divide-cream-light/10">
                        {filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-cream dark:hover:bg-charcoal-dark/50">
                                <td className="px-4 py-3 text-sm font-mono">{order.id.slice(-6)}</td>
                                <td className="px-4 py-3 text-sm">{new Date(order.timestamp).toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm">{order.items.length} items</td>
                                <td className="px-4 py-3 text-sm font-bold">${order.finalAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'Paid' ? 'bg-emerald/20 text-emerald' :
                                        order.status === 'Cancelled' ? 'bg-red-500/20 text-red-500' :
                                            'bg-gray-500/20 text-gray-500'
                                        }`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm">{order.paymentMethod}</td>
                                <td className="px-4 py-3 text-sm flex space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenView(order)} title="View Receipt"><FaEye /></Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(order)} title="Edit Status"><FaEdit /></Button>
                                    <Button size="sm" variant="danger" onClick={() => handleOpenDelete(order)} title="Delete"><FaTrash /></Button>
                                </td>
                            </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-charcoal-light">No orders found matching filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* View Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Order Details"
                footer={<Button onClick={handlePrintReceipt} leftIcon={<FaReceipt />}>Print Receipt</Button>}
            >
                {selectedOrder && (
                    <div className="p-4 bg-white text-black font-mono text-sm border rounded">
                        {/* Simplified receipt view matching PrintableReceipt structure effectively */}
                        <div className="text-center font-bold mb-4">
                            <p className="text-xl">Store Order</p>
                            <p>ID: {selectedOrder.id}</p>
                            <p>{new Date(selectedOrder.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="border-b border-dashed border-black my-2"></div>
                        <div className="space-y-2">
                            {selectedOrder.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{item.quantity}x {item.productName}</span>
                                    <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-b border-dashed border-black my-2"></div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>TOTAL</span>
                            <span>${selectedOrder.finalAmount.toFixed(2)}</span>
                        </div>
                        <div className="mt-4 text-center">
                            <p>Payment: {selectedOrder.paymentMethod}</p>
                            <p>Status: {selectedOrder.status}</p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Order"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Select
                        label="Order Status"
                        options={[
                            { value: OrderStatus.PAID, label: 'Paid' },
                            { value: OrderStatus.CREATED, label: 'Pending' },
                            { value: OrderStatus.COMPLETED, label: 'Completed' },
                            { value: OrderStatus.CANCELLED, label: 'Cancelled / Void' },
                        ]}
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                    />
                    <Select
                        label="Payment Method"
                        options={[
                            { value: 'Cash', label: 'Cash' },
                            { value: 'QR', label: 'QR Code' },
                        ]}
                        value={editPaymentMethod}
                        onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                    />
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Delete"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete}>Delete Permanently</Button>
                    </div>
                }
            >
                <p>Are you sure you want to delete order <strong>{selectedOrder?.id}</strong>?</p>
                <p className="text-red-500 text-sm mt-2">This action cannot be undone.</p>
            </Modal>

            {printableAreaNode && selectedOrder && isViewModalOpen && ReactDOM.createPortal(
                <PrintableReceipt order={selectedOrder} />,
                printableAreaNode
            )}

        </div>
    );
};

export default OrderManagement;
