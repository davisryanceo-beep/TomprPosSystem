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
          glass-panel rounded-2xl overflow-hidden flex flex-col p-2 h-fit
          transform transition-all duration-300 active:scale-95 animate-fade-in-up
          ${isOutOfStock ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:shadow-[0_15px_30px_rgba(16,185,129,0.15)] hover:-translate-y-1.5 hover:border-emerald/30 dark:hover:border-emerald/50'}
          ${product.isSeasonal ? 'ring-2 ring-orange-400/50' : ''}
        `}
      >
        <div className="relative aspect-square sm:aspect-auto sm:h-28 rounded-xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10 pointer-events-none transition-opacity group-hover:opacity-0" />
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-charcoal-900/70 flex items-center justify-center rounded-lg">
              <span className="text-cream-light font-bold text-xs tracking-widest -rotate-12 border-2 border-terracotta p-1 rounded">OUT OF STOCK</span>
            </div>
          )}
          {!isOutOfStock && product.stock > 0 && product.stock <= 5 && (
            <div className="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg animate-pulse">
              LOW {product.stock}
            </div>
          )}
          {product.isSeasonal && (
            <div className="absolute top-1 right-1 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow shadow-orange-950/20">
              {product.seasonalInfo?.badge || 'SEASON'}
            </div>
          )}
        </div>
        <div className="pt-2 flex flex-col">
          <div className="mb-1">
            <h3 className="text-[10px] sm:text-sm font-black text-charcoal-dark dark:text-cream-light leading-tight line-clamp-1" title={product.name}>{product.name}</h3>
            <p className="text-[10px] sm:text-xs text-charcoal-light dark:text-charcoal-light line-clamp-1 mt-0.5">{product.description || 'A delicious treat.'}</p>
          </div>
          <div className="flex justify-between items-center px-0.5">
            <p className="text-sm sm:text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400 leading-none drop-shadow-sm">${product.price.toFixed(2)}</p>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSelect(); }}
              disabled={isOutOfStock}
              size="sm"
              className={`!py-1 !px-3 font-bold text-xs border-none \${isOutOfStock ? '' : 'bg-gradient-to-r from-emerald to-emerald-dark hover:shadow-lg hover:shadow-emerald/40 text-white'}`}
              aria-label={`Add ${product.name}`}
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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 items-start h-full overflow-y-auto pr-1 pb-4 custom-scrollbar">
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