import React from 'react';
import { FaShoppingCart, FaStore } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    const { itemCount } = useCart();

    // Extract storeId from hash: #/menu/:storeId
    const hash = window.location.hash;
    const parts = hash.split('/');
    const storeId = parts[2] || '';

    return (
        <div className="min-h-screen bg-off-white dark:bg-charcoal text-charcoal dark:text-cream font-sans transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-charcoal-dark shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="bg-emerald/10 p-2 rounded-lg mr-3">
                            <span className="text-emerald text-xl"><FaStore /></span>
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald to-teal-600">
                            Cafe Online Order
                        </h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Cart Icon */}
                        <a href={`#/menu/${storeId}/checkout`} className="relative p-2 text-charcoal dark:text-cream hover:text-emerald transition-colors">
                            <span className="text-2xl"><FaShoppingCart /></span>
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce-short">
                                    {itemCount}
                                </span>
                            )}
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Simple Footer */}
            <footer className="bg-white dark:bg-charcoal-dark border-t border-gray-200 dark:border-gray-800 mt-auto">
                <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} Powered by PosCafeSystem
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
