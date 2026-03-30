import React, { useState, useEffect } from 'react';
import { Product, OrderItem, SelectedModifier, SelectedAddOn, ModifierGroup, AddOn } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { FaCheck, FaTimes } from 'react-icons/fa';

interface OnlineProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    modifierGroups: ModifierGroup[];
    availableAddOns: AddOn[];
    onConfirm: (customizations: Partial<OrderItem>) => void;
}

const OnlineProductModal: React.FC<OnlineProductModalProps> = ({
    isOpen, onClose, product, modifierGroups, availableAddOns, onConfirm
}) => {
    const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
    const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);
    const [totalPrice, setTotalPrice] = useState(product.price);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            // Reset selections
            setSelectedModifiers([]);
            setSelectedAddOns([]);
            setTotalPrice(product.price);
            setQuantity(1);
        }
    }, [isOpen, product]);

    useEffect(() => {
        let price = product.price;
        selectedModifiers.forEach(m => price += m.priceAdjustment);
        selectedAddOns.forEach(a => price += a.price);
        setTotalPrice(price * quantity);
    }, [selectedModifiers, selectedAddOns, product.price, quantity]);

    const handleModifierToggle = (group: ModifierGroup, modifier: ModifierGroup['modifiers'][0]) => {
        if (group.type === 'single') {
            const filtered = selectedModifiers.filter(m => m.groupId !== group.id);
            setSelectedModifiers([
                ...filtered,
                {
                    groupId: group.id,
                    groupName: group.name,
                    modifierId: modifier.id,
                    modifierName: modifier.name,
                    priceAdjustment: modifier.priceAdjustment
                }
            ]);
        } else {
            const isSelected = selectedModifiers.some(m => m.modifierId === modifier.id);
            if (isSelected) {
                setSelectedModifiers(selectedModifiers.filter(m => m.modifierId !== modifier.id));
            } else {
                setSelectedModifiers([
                    ...selectedModifiers,
                    {
                        groupId: group.id,
                        groupName: group.name,
                        modifierId: modifier.id,
                        modifierName: modifier.name,
                        priceAdjustment: modifier.priceAdjustment
                    }
                ]);
            }
        }
    };

    const handleAddOnToggle = (addon: AddOn) => {
        const isSelected = selectedAddOns.some(a => a.id === addon.id);
        if (isSelected) {
            setSelectedAddOns(selectedAddOns.filter(a => a.id !== addon.id));
        } else {
            setSelectedAddOns([...selectedAddOns, { id: addon.id, name: addon.name, price: addon.price }]);
        }
    };

    const handleConfirm = () => {
        // Check required modifiers
        const applicableGroups = modifierGroups.filter(g => product.modifierGroups?.includes(g.id));
        const missingRequired = applicableGroups.filter(g =>
            g.required && !selectedModifiers.some(m => m.groupId === g.id)
        );

        if (missingRequired.length > 0) {
            alert(`Please select ${missingRequired.map(g => g.name).join(', ')}`);
            return;
        }

        onConfirm({
            modifiers: selectedModifiers,
            addOns: selectedAddOns,
            unitPrice: totalPrice / quantity, // Store base unit price (with mods)
            quantity: quantity
        });
        onClose();
    };

    const applicableGroups = modifierGroups.filter(group => {
        // console.log(`[Modal] Checking group ${group.id} against product modifiers:`, product.modifierGroups);
        return (product.modifierGroups || []).includes(group.id);
    });

    const applicableAddOnsList = availableAddOns.filter(addon =>
        addon.isActive &&
        (addon.applicableCategories.length === 0 || addon.applicableCategories.includes(product.category))
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={product.name}
            size="lg"
            footer={
                <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
                    <div className="flex items-center gap-4 bg-gray-100 dark:bg-charcoal px-4 py-2 rounded-lg">
                        <button
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-charcoal-light rounded-full shadow hover:bg-gray-50"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                            -
                        </button>
                        <span className="font-bold text-lg w-4 text-center">{quantity}</span>
                        <button
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-charcoal-light rounded-full shadow hover:bg-gray-50"
                            onClick={() => setQuantity(quantity + 1)}
                        >
                            +
                        </button>
                    </div>
                    <Button onClick={handleConfirm} leftIcon={<FaCheck />} fullWidth className="sm:w-auto">
                        Add to Order - ${totalPrice.toFixed(2)}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-4">
                <p className="text-gray-500 italic">{product.description}</p>

                {/* Modifiers */}
                {applicableGroups.map(group => (
                    <div key={group.id} className="space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                            <h4 className="font-bold text-lg">{group.name} {group.required && <span className="text-terracotta text-sm align-top">*</span>}</h4>
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-charcoal px-2 py-1 rounded-full uppercase tracking-wider">
                                {group.type === 'single' ? 'Select 1' : 'Select Multiple'}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.modifiers.map(mod => {
                                const isSelected = selectedModifiers.some(m => m.modifierId === mod.id);
                                return (
                                    <button
                                        key={mod.id}
                                        onClick={() => handleModifierToggle(group, mod)}
                                        disabled={!mod.available}
                                        className={`
                                            p-3 rounded-xl border transition-all flex justify-between items-center group text-left
                                            ${isSelected
                                                ? 'border-emerald bg-emerald/5 text-emerald-dark ring-1 ring-emerald'
                                                : 'border-gray-200 dark:border-charcoal-light hover:border-emerald/50 hover:bg-gray-50 dark:hover:bg-charcoal'}
                                            ${!mod.available ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                        `}
                                    >
                                        <span className="font-medium">{mod.name}</span>
                                        <span className={`text-xs px-2 py-1 rounded-md ${isSelected ? 'bg-emerald text-white' : 'bg-gray-100 dark:bg-charcoal-dark text-gray-500'}`}>
                                            {mod.priceAdjustment > 0 ? `+$${mod.priceAdjustment.toFixed(2)}` : mod.priceAdjustment < 0 ? `-$${Math.abs(mod.priceAdjustment).toFixed(2)}` : 'Free'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Add-ons */}
                {applicableAddOnsList.length > 0 && (
                    <div className="space-y-3 pt-4">
                        <h4 className="font-bold text-lg border-b border-gray-100 dark:border-gray-800 pb-2">Extras</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {applicableAddOnsList.map(addon => {
                                const isSelected = selectedAddOns.some(a => a.id === addon.id);
                                return (
                                    <button
                                        key={addon.id}
                                        onClick={() => handleAddOnToggle(addon)}
                                        className={`
                                            p-3 rounded-xl border transition-all flex justify-between items-center text-left
                                            ${isSelected
                                                ? 'border-emerald bg-emerald/5 text-emerald-dark ring-1 ring-emerald'
                                                : 'border-gray-200 dark:border-charcoal-light hover:border-emerald/50 hover:bg-gray-50 dark:hover:bg-charcoal'}
                                        `}
                                    >
                                        <span className="font-medium">{addon.name}</span>
                                        <span className={`text-xs px-2 py-1 rounded-md ${isSelected ? 'bg-emerald text-white' : 'bg-gray-100 dark:bg-charcoal-dark text-gray-500'}`}>
                                            +${addon.price.toFixed(2)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default OnlineProductModal;
