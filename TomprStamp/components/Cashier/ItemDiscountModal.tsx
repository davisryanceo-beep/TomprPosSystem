import React, { useState, useEffect } from 'react';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { OrderItem } from '../../types';

interface ItemDiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: OrderItem | null;
    onApplyDiscount: (discount: { type: 'percentage' | 'fixed'; value: number; reason?: string }) => void;
    onRemoveDiscount: () => void;
}

const ItemDiscountModal: React.FC<ItemDiscountModalProps> = ({ isOpen, onClose, item, onApplyDiscount, onRemoveDiscount }) => {
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');
    const [reason, setReason] = useState<string>('');

    useEffect(() => {
        if (isOpen && item) {
            if (item.discount) {
                setDiscountType(item.discount.type);
                setDiscountValue(item.discount.value.toString());
                setReason(item.discount.reason || '');
            } else {
                setDiscountType('percentage');
                setDiscountValue('');
                setReason('');
            }
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(discountValue);
        if (isNaN(value) || value < 0) {
            alert("Please enter a valid positive number.");
            return;
        }

        if (discountType === 'percentage' && value > 100) {
            alert("Percentage cannot be greater than 100.");
            return;
        }

        onApplyDiscount({
            type: discountType,
            value: value,
            reason: reason
        });
        onClose();
    };

    const handleRemove = () => {
        onRemoveDiscount();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Discount for ${item.productName}`}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Type</label>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => setDiscountType('percentage')}
                            className={`flex-1 py-2 rounded-md border ${discountType === 'percentage' ? 'bg-emerald text-white border-emerald' : 'bg-white text-gray-700 border-gray-300 dark:bg-charcoal-dark dark:text-gray-300 dark:border-gray-600'}`}
                        >
                            Percentage (%)
                        </button>
                        <button
                            type="button"
                            onClick={() => setDiscountType('fixed')}
                            className={`flex-1 py-2 rounded-md border ${discountType === 'fixed' ? 'bg-emerald text-white border-emerald' : 'bg-white text-gray-700 border-gray-300 dark:bg-charcoal-dark dark:text-gray-300 dark:border-gray-600'}`}
                        >
                            Fixed Amount ($)
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {discountType === 'percentage' ? 'Percentage Value (%)' : 'Amount Value ($)'}
                    </label>
                    <input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-charcoal-light text-gray-900 dark:text-white"
                        placeholder={discountType === 'percentage' ? "e.g., 10" : "e.g., 5.00"}
                        step={discountType === 'percentage' ? "1" : "0.01"}
                        min="0"
                        required
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (Optional)</label>
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-charcoal-light text-gray-900 dark:text-white"
                        placeholder="e.g., Damaged item, Employee meal"
                    />
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    {item.discount ? (
                        <Button type="button" variant="danger" onClick={handleRemove}>Remove Discount</Button>
                    ) : <div></div>}

                    <div className="flex space-x-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary">Apply Discount</Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default ItemDiscountModal;
