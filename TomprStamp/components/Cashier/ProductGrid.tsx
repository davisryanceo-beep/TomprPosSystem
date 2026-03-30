import React, { useState, useEffect } from 'react';
import { Product, ComboProduct, OrderItem } from '../../types';
import Button from '../Shared/Button';
import ProductCustomizationModal from './ProductCustomizationModal';
import ComboProductCard from './ComboProductCard';
import { useShop } from '../../contexts/ShopContext';

interface ProductGridProps {
  products: Product[];
  onAddItem: (item: OrderItem) => void;
}

const ProductCard: React.FC<{ product: Product; onSelect: (cust: Partial<OrderItem>) => void }> = ({ product, onSelect }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isOutOfStock = product.stock === 0;

  // Most products might have modifiers now
  const hasModifiers = (product.modifierGroups && product.modifierGroups.length > 0) || product.allowAddOns;

  const handleSelect = () => {
    if (isOutOfStock) return;
    if (hasModifiers) {
      setIsModalOpen(true);
    } else {
      onSelect({});
    }
  };

  return (
    <>
      <div
        onClick={handleSelect}
        className={`
          bg-cream-light dark:bg-charcoal-dark rounded-xl shadow-lg overflow-hidden flex flex-col justify-between h-full p-4
          transform transition-all duration-200 active:scale-95
          ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xl hover:-translate-y-1'}
          ${product.isSeasonal ? 'border-2 border-orange-400/30' : ''}
        `}
      >
        <div className="relative">
          <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover rounded-lg" />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-charcoal-900/70 flex items-center justify-center rounded-lg">
              <span className="text-cream-light font-bold text-lg tracking-widest -rotate-12 border-2 border-terracotta p-2 rounded">OUT OF STOCK</span>
            </div>
          )}
          {product.isSeasonal && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow shadow-orange-950/20">
              {product.seasonalInfo?.badge || 'SEASONAL'}
            </div>
          )}
        </div>
        <div className="pt-4 flex-grow flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-charcoal-dark dark:text-cream-light truncate" title={product.name}>{product.name}</h3>
            <p className="text-sm text-charcoal-light dark:text-charcoal-light h-10 overflow-hidden">{product.description || 'A delicious treat.'}</p>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-2xl font-bold text-emerald">${product.price.toFixed(2)}</p>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSelect(); }}
              disabled={isOutOfStock}
              size="md"
              className="!py-2 !px-4"
              aria-label={`Add ${product.name} to order`}
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      <ProductCustomizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        onConfirm={onSelect}
      />
    </>
  );
};

const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddItem }) => {
  const { currentStoreId } = useShop();
  const [combos, setCombos] = useState<ComboProduct[]>([]);

  useEffect(() => {
    if (currentStoreId) {
      fetch(`/api/combos?storeId=${currentStoreId}`)
        .then(res => res.json())
        .then(data => setCombos(data))
        .catch(err => console.error('Error fetching combos:', err));
    }
  }, [currentStoreId]);

  if ((!products || products.length === 0) && combos.length === 0) {
    return <p className="text-center text-charcoal-light dark:text-charcoal-light py-8">No items found in this category.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-y-auto pr-2 pb-4">
      {/* Show combos first if they are active */}
      {combos.filter(c => c.isActive).map(combo => (
        <ComboProductCard
          key={combo.id}
          combo={combo}
          products={products}
          onAddItem={onAddItem}
        />
      ))}

      {/* Then show individual products */}
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={(cust) => onAddItem({
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: cust.unitPrice || product.price,
            ...cust,
          })}
        />
      ))}
    </div>
  );
};

export default ProductGrid;