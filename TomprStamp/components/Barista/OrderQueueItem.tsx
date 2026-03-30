import React from 'react';
import { Order, OrderItem, Recipe } from '../../types'; // Added Recipe
import Button from '../Shared/Button'; // Added Button import
import { FaBook } from 'react-icons/fa'; // Added icon for recipe

interface OrderQueueItemProps {
  order: Order;
  actionButton: React.ReactNode;
  recipe?: Recipe | null; // Optional recipe for the product
  onViewRecipe?: (recipe: Recipe) => void; // Callback to open recipe modal
}

const OrderQueueItem: React.FC<OrderQueueItemProps> = ({ order, actionButton, recipe, onViewRecipe }) => {
  const timeSinceOrder = (): string => {
    const diffMs = new Date().getTime() - new Date(order.timestamp).getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
  };

  const formatCustomizations = (customizations?: OrderItem['customizations']) => {
    if (!customizations) return '';
    const parts = [];
    if (customizations.size && customizations.size !== 'Medium') parts.push(customizations.size);
    if (customizations.milk && customizations.milk !== 'None') parts.push(customizations.milk);
    if (customizations.sugar && customizations.sugar !== 'None') parts.push(customizations.sugar); // Display percentage directly
    if (customizations.ice && customizations.ice !== 'None') parts.push(customizations.ice);
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  };

  const cardBorderColor = order.isRushOrder ? 'border-terracotta' : 'border-charcoal/10 dark:border-cream-light/10';
  const cardBgColor = order.isRushOrder ? 'bg-terracotta/10' : 'bg-cream dark:bg-charcoal-dark/50';

  const firstItemRecipe = order.items.length > 0 ? recipe : null;


  return (
    <div className={`p-4 rounded-lg border-2 ${cardBorderColor} ${cardBgColor} shadow-lg`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-extrabold text-lg text-charcoal-dark dark:text-cream-light">
            Order #{order.dailyOrderNumber ? order.dailyOrderNumber : order.id.slice(-6)}
            {order.tableNumber && (
              <span className="ml-2 font-semibold text-emerald bg-emerald/10 px-2 py-1 rounded-md">
                For: {order.tableNumber}
              </span>
            )}
          </span>
          {order.isRushOrder && <span className="ml-2 px-3 py-1 text-sm font-bold text-white bg-terracotta rounded-full">RUSH</span>}
        </div>
        <span className="text-sm text-charcoal-light dark:text-charcoal-light">{timeSinceOrder()}</span>
      </div>
      <ul className="text-base space-y-2 my-4">
        {order.items.map((item, index) => (
          <li key={index} className="text-charcoal-dark dark:text-cream-light">
            <span className="font-bold text-lg">{item.quantity}x</span> {item.productName} <span className="text-sm text-charcoal-light">{formatCustomizations(item.customizations)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center mt-4">
        <div>
          {firstItemRecipe && onViewRecipe && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewRecipe(firstItemRecipe)}
              leftIcon={<FaBook />}
            >
              View Recipe
            </Button>
          )}
        </div>
        <div className="text-right">
          {actionButton}
        </div>
      </div>
    </div>
  );
};

export default OrderQueueItem;