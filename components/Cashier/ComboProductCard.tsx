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
            className="bg-cream-light dark:bg-charcoal-dark rounded-xl shadow-lg overflow-hidden flex flex-col p-3 h-fit transform transition-all duration-200 active:scale-95 cursor-pointer hover:shadow-2xl hover:-translate-y-1 border-2 border-emerald/30"
        >
            <div className="relative aspect-square sm:aspect-auto sm:h-36">
                {combo.imageUrl ? (
                    <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                    <div className="w-full h-full bg-emerald/10 rounded-lg flex items-center justify-center text-emerald/40 text-2xl">
                        <FaBoxOpen />
                    </div>
                )}
                <div className="absolute top-1 right-1 bg-emerald text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg uppercase">COMBO</div>
                <div className="absolute bottom-1 right-1 bg-terracotta text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg">-${combo.savings.toFixed(2)}</div>
            </div>

            <div className="pt-2 flex flex-col">
                <div className="mb-2">
                    <h3 className="text-xs sm:text-base font-black text-charcoal-dark dark:text-cream-light leading-tight line-clamp-1">{combo.name}</h3>
                    <p className="text-[10px] sm:text-xs text-charcoal-light dark:text-charcoal-light line-clamp-1 mt-0.5">
                        {combo.comboItems.length} items bundled
                    </p>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-sm sm:text-lg font-black text-emerald leading-none">${combo.comboPrice.toFixed(2)}</p>
                    <Button size="sm" className="!py-1 !px-3"><FaPlus /></Button>
                </div>
            </div>
        </div>
    );
};

export default ComboProductCard;
