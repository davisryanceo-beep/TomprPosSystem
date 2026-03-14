import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, OrderItem, SelectedModifier, SelectedAddOn } from '../types';

interface CartItem extends OrderItem {
    tempId: string; // Unique ID for frontend cart management
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity: number, customizations?: any, modifiers?: SelectedModifier[], addOns?: SelectedAddOn[]) => void;
    removeFromCart: (tempId: string) => void;
    updateQuantity: (tempId: string, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('online_cart');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('online_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product: Product, quantity: number, customizations: any = {}, modifiers: SelectedModifier[] = [], addOns: SelectedAddOn[] = []) => {
        const newItem: CartItem = {
            tempId: `cart-item-${Date.now()}-${Math.random()}`,
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice: product.price, // Base price, need to add modifiers diff if we want accurate unit price display
            customizations,
            modifiers,
            addOns,
            isCombo: false,
        };

        // Calculate total unit price including modifiers
        let adjustedPrice = product.price;
        modifiers.forEach(m => adjustedPrice += m.priceAdjustment);
        addOns.forEach(a => adjustedPrice += a.price);
        newItem.unitPrice = adjustedPrice;

        setCartItems(prev => [...prev, newItem]);
    };

    const removeFromCart = (tempId: string) => {
        setCartItems(prev => prev.filter(item => item.tempId !== tempId));
    };

    const updateQuantity = (tempId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(tempId);
            return;
        }
        setCartItems(prev => prev.map(item => item.tempId === tempId ? { ...item, quantity } : item));
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('online_cart');
    };

    const cartTotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
