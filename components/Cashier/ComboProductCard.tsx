import React, { useState } from 'react';
import { Product, ComboProduct, OrderItem } from '../../types';
import Button from '../Shared/Button';
import { FaPlus, FaBoxOpen } from 'react-icons/fa';

interface ComboProductCardProps {
    combo: ComboProduct;
    onAddItem: (item: OrderItem) => void;
    products: Product[];
}

const ComboProductCard: React.FC<ComboProductCardProps> = ({ combo, onAddItem, products }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Simplified: just add the combo to order with standard items
    // Real version would allow customizing each item in the combo
    const handleAdd = () => {
        onAddItem({
            productId: combo.id,
            productName: combo.name,
            quantity: 1,
            unitPrice: combo.comboPrice,
            isCombo: true,
            comboId: combo.id,
            comboItems: combo.comboItems.map(ci => {
                const prod = products.find(p => p.id === ci.productId);
                return {
                    productId: ci.productId,
                    productName: prod?.name || 'Unknown Item',
                    quantity: ci.quantity,
                    unitPrice: 0 // Price is bundled in comboPrice
                };
            })
        });
    };

    return (
        <div
            onClick={handleAdd}
            className="bg-cream-light dark:bg-charcoal-dark rounded-xl shadow-lg overflow-hidden flex flex-col justify-between h-full p-4 transform transition-all duration-200 active:scale-95 cursor-pointer hover:shadow-2xl hover:-translate-y-1 border-2 border-emerald/30"
        >
            <div className="relative">
                {combo.imageUrl ? (
                    <img src={combo.imageUrl} alt={combo.name} className="w-full h-40 object-cover rounded-lg" />
                ) : (
                    <div className="w-full h-40 bg-emerald/10 rounded-lg flex items-center justify-center text-emerald/40 text-4xl">
                        <FaBoxOpen />
                    </div>
                )}
                <div className="absolute top-2 right-2 bg-emerald text-white text-xs font-bold px-2 py-1 rounded shadow-lg">COMBO</div>
                <div className="absolute bottom-2 right-2 bg-terracotta text-white text-xs font-bold px-2 py-1 rounded shadow-lg">Save ${combo.savings.toFixed(2)}</div>
            </div>

            <div className="pt-4 flex-grow flex flex-col justify-between">
                <div>
                    <h3 className="text-xl font-extrabold text-charcoal-dark dark:text-cream-light truncate">{combo.name}</h3>
                    <p className="text-xs text-charcoal-light dark:text-charcoal-light mt-1">
                        {combo.comboItems.length} items bundled
                    </p>
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <p className="text-2xl font-bold text-emerald">${combo.comboPrice.toFixed(2)}</p>
                    <Button size="md" className="!py-2 !px-4"><FaPlus /></Button>
                </div>
            </div>
        </div>
    );
};

export default ComboProductCard;
