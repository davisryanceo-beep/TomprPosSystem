import React, { useState, useEffect } from 'react';
import { Product, OrderItem, SelectedModifier, SelectedAddOn, ModifierGroup, AddOn } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { FaPlus, FaCheck } from 'react-icons/fa';
import { useShop } from '../../contexts/ShopContext';

interface ProductCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onConfirm: (customizations: Partial<OrderItem>) => void;
}

const ProductCustomizationModal: React.FC<ProductCustomizationModalProps> = ({ isOpen, onClose, product, onConfirm }) => {
    const { currentStoreId } = useShop();
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [availableAddOns, setAvailableAddOns] = useState<AddOn[]>([]);
    const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
    const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);
    const [totalPrice, setTotalPrice] = useState(product.price);

    useEffect(() => {
        if (isOpen && currentStoreId) {
            fetchModifiers();
            fetchAddOns();
            // Reset selections
            setSelectedModifiers([]);
            setSelectedAddOns([]);
            setTotalPrice(product.price);
        }
    }, [isOpen, currentStoreId, product]);

    const fetchModifiers = async () => {
        try {
            const res = await fetch(`/api/modifiers?storeId=${currentStoreId}`);
            const data: ModifierGroup[] = await res.json();
            // Filter groups that belong to this product or are default for category
            const applicableGroups = data.filter(group =>
                product.modifierGroups?.includes(group.id)
            );
            setModifierGroups(applicableGroups);
        } catch (err) {
            console.error('Error fetching modifiers:', err);
        }
    };

    const fetchAddOns = async () => {
        try {
            const res = await fetch(`/api/addons?storeId=${currentStoreId}`);
            const data: AddOn[] = await res.json();
            // Filter add-ons applicable to this product's category
            const applicableAddOns = data.filter(addon =>
                addon.isActive &&
                (addon.applicableCategories.length === 0 || addon.applicableCategories.includes(product.category))
            );
            setAvailableAddOns(applicableAddOns);
        } catch (err) {
            console.error('Error fetching add-ons:', err);
        }
    };

    useEffect(() => {
        let price = product.price;
        selectedModifiers.forEach(m => price += m.priceAdjustment);
        selectedAddOns.forEach(a => price += a.price);
        setTotalPrice(price);
    }, [selectedModifiers, selectedAddOns, product.price]);

    const handleModifierToggle = (group: ModifierGroup, modifier: ModifierGroup['modifiers'][0]) => {
        if (group.type === 'single') {
            // Remove other modifiers from same group
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
            // Toggle logic for multiple
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
        const missingRequired = modifierGroups.filter(g =>
            g.required && !selectedModifiers.some(m => m.groupId === g.id)
        );

        if (missingRequired.length > 0) {
            alert(`Please select ${missingRequired.map(g => g.name).join(', ')}`);
            return;
        }

        onConfirm({
            modifiers: selectedModifiers,
            addOns: selectedAddOns,
            unitPrice: totalPrice
        });
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Customize ${product.name}`}
            size="lg"
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="text-2xl font-bold text-emerald">Total: ${totalPrice.toFixed(2)}</div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleConfirm} leftIcon={<FaCheck />}>Add to Order</Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Modifiers */}
                {modifierGroups.map(group => (
                    <div key={group.id} className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-lg">{group.name} {group.required && <span className="text-terracotta">*</span>}</h4>
                            <span className="text-xs text-gray-400 capitalize">{group.type === 'single' ? 'Choose one' : 'Choose multiple'}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {group.modifiers.map(mod => {
                                const isSelected = selectedModifiers.some(m => m.modifierId === mod.id);
                                return (
                                    <button
                                        key={mod.id}
                                        onClick={() => handleModifierToggle(group, mod)}
                                        disabled={!mod.available}
                                        className={`
                      p-3 rounded-xl border-2 transition-all flex flex-col justify-center items-center text-center gap-1
                      ${isSelected
                                                ? 'border-emerald bg-emerald/10 text-emerald-dark font-bold'
                                                : 'border-gray-200 dark:border-charcoal hover:border-emerald/50'}
                      ${!mod.available ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                    `}
                                    >
                                        <span className="text-sm">{mod.name}</span>
                                        <span className="text-xs opacity-75">
                                            {mod.priceAdjustment > 0 ? `+$${mod.priceAdjustment.toFixed(2)}` : mod.priceAdjustment < 0 ? `-$${Math.abs(mod.priceAdjustment).toFixed(2)}` : 'Free'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Add-ons */}
                {availableAddOns.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg">Add-ons & Extras</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {availableAddOns.map(addon => {
                                const isSelected = selectedAddOns.some(a => a.id === addon.id);
                                return (
                                    <button
                                        key={addon.id}
                                        onClick={() => handleAddOnToggle(addon)}
                                        className={`
                      p-3 rounded-xl border-2 transition-all flex flex-col justify-center items-center text-center gap-1
                      ${isSelected
                                                ? 'border-emerald bg-emerald/10 text-emerald-dark font-bold'
                                                : 'border-gray-200 dark:border-charcoal hover:border-emerald/50'}
                    `}
                                    >
                                        <span className="text-sm">{addon.name}</span>
                                        <span className="text-xs opacity-75">+${addon.price.toFixed(2)}</span>
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

export default ProductCustomizationModal;
