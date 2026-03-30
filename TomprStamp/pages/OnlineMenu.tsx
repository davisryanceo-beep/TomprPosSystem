import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Category, Product, ModifierGroup, AddOn, OrderItem } from '../types';
import { FaPlus, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import Button from '../components/Shared/Button';
import { useCart } from '../contexts/CartContext';
import OnlineProductModal from '../components/Public/OnlineProductModal';

const OnlineMenu: React.FC = () => {
    // Extract storeId from hash: #/menu/:storeId
    const hash = window.location.hash;
    const parts = hash.split('/');
    const storeId = parts[2] || '';

    const { addToCart } = useCart();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [availableAddOns, setAvailableAddOns] = useState<AddOn[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Modal state
    const [customizationModalOpen, setCustomizationModalOpen] = useState(false);
    const [productToCustomize, setProductToCustomize] = useState<Product | null>(null);

    useEffect(() => {
        const fetchMenu = async () => {
            if (!storeId) {
                setError("Store ID Not Found");
                setLoading(false);
                return;
            }
            try {
                // Use the public API endpoint
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                const res = await axios.get(`${apiUrl}/public/menu/${storeId}`);
                setCategories(res.data.categories);
                setProducts(res.data.products);
                setModifierGroups(res.data.modifierGroups || []);
                setAvailableAddOns(res.data.addons || []);
                console.log("[OnlineMenu] Fetched Modifiers:", res.data.modifierGroups);
                console.log("[OnlineMenu] Fetched Products first item:", res.data.products[0]);
            } catch (err) {
                console.error("Failed to load menu", err);
                setError("Failed to load menu. Please try again later or contact the store.");
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, [storeId]);

    const filteredProducts = selectedCategory === 'All'
        ? products
        : products.filter(p => p.category === selectedCategory);

    const handleAddToCartClick = (product: Product) => {
        const hasModifiers = (product.modifierGroups && product.modifierGroups.length > 0) || product.allowAddOns;

        if (hasModifiers) {
            setProductToCustomize(product);
            setCustomizationModalOpen(true);
        } else {
            addToCart(product, 1);
        }
    };

    const handleConfirmCustomization = (customizations: Partial<OrderItem>) => {
        if (productToCustomize) {
            addToCart(
                productToCustomize,
                customizations.quantity || 1,
                {}, // Generic customizations object (unused for now)
                customizations.modifiers,
                customizations.addOns
            );
            setCustomizationModalOpen(false);
            setProductToCustomize(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="animate-spin text-4xl text-emerald"><FaSpinner /></span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                <div className="mx-auto text-4xl mb-4"><FaExclamationTriangle /></div>
                <h2 className="text-xl font-bold">{error}</h2>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Store Info / Banner */}
            <div className="bg-gradient-to-r from-emerald to-teal-600 rounded-2xl p-8 text-white shadow-lg">
                <h2 className="text-3xl font-bold mb-2">Welcome to Our Digital Menu</h2>
                <p className="opacity-90">Order your favorites online and we'll have them ready!</p>
            </div>

            {/* Category Filter */}
            <div className="flex overflow-x-auto pb-4 space-x-2 scrollbar-hide">
                <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-6 py-2 rounded-full whitespace-nowrap transition-colors ${selectedCategory === 'All'
                        ? 'bg-emerald text-white shadow-md'
                        : 'bg-white dark:bg-charcoal text-charcoal dark:text-cream border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                >
                    All Items
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`px-6 py-2 rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat.name
                            ? 'bg-emerald text-white shadow-md'
                            : 'bg-white dark:bg-charcoal text-charcoal dark:text-cream border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                    <div key={product.id} className="bg-white dark:bg-charcoal rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                        <div className="h-48 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                            {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No Image
                                </div>
                            )}
                            {product.stock <= 0 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white font-bold px-4 py-1 border-2 border-white rounded transform -rotate-12">SOLD OUT</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-charcoal-dark dark:text-cream-light">{product.name}</h3>
                                <span className="font-bold text-emerald">${product.price.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1 line-clamp-2">{product.description}</p>

                            <Button
                                fullWidth
                                variant={product.stock > 0 ? 'primary' : 'secondary'}
                                disabled={product.stock <= 0}
                                onClick={() => handleAddToCartClick(product)}
                                leftIcon={<FaPlus />}
                            >
                                {product.stock > 0 ? 'Add to Cart' : 'Unavailable'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p>No products found in this category.</p>
                </div>
            )}

            {productToCustomize && (
                <OnlineProductModal
                    isOpen={customizationModalOpen}
                    onClose={() => setCustomizationModalOpen(false)}
                    product={productToCustomize}
                    modifierGroups={modifierGroups}
                    availableAddOns={availableAddOns}
                    onConfirm={handleConfirmCustomization}
                />
            )}
        </div>
    );
};

export default OnlineMenu;
