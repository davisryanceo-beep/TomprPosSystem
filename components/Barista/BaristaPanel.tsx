import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Order, OrderStatus, Recipe } from '../../types'; 
import Button from '../Shared/Button';
import OrderQueueItem from './OrderQueueItem';
import RecipeDisplayModal from '../Shared/RecipeDisplayModal'; 
import { FaCoffee, FaConciergeBell, FaLightbulb, FaClipboardList } from 'react-icons/fa';
import LoadingSpinner from '../Shared/LoadingSpinner';

const BaristaPanel: React.FC = () => {
  const { 
    getPaidOrders, updateOrderStatus, getOrdersByStatus, getRecipeByProductId,
  } = useShop(); 
  const { currentUser } = useAuth();
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false); 
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const paidOrders = getPaidOrders();
  const preparingOrders = getOrdersByStatus(OrderStatus.PREPARING).filter(o => o.baristaId === currentUser?.id);

  const handleStartPreparing = (orderId: string) => {
    if (currentUser) {
      updateOrderStatus(orderId, OrderStatus.PREPARING, currentUser.id);
    }
  };

  const handleCompleteOrder = (orderId: string) => {
    updateOrderStatus(orderId, OrderStatus.COMPLETED);
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsRecipeModalOpen(true);
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="bg-cream-light dark:bg-charcoal-dark shadow-xl rounded-xl p-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-4xl font-extrabold text-charcoal-dark dark:text-cream-light flex items-center">
                    <FaCoffee className="mr-3 text-emerald" />Barista Station
                </h1>
                {currentUser && <p className="text-base text-charcoal-light dark:text-charcoal-light">Welcome, {currentUser.username}!</p>}
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Paid Orders Queue */}
        <div className="bg-cream-light dark:bg-charcoal-dark shadow-xl rounded-xl p-4">
          <h2 className="text-2xl font-bold mb-3 text-charcoal-dark dark:text-cream-light flex items-center">
            <FaClipboardList className="mr-2 text-emerald" />Incoming Orders ({paidOrders.length})
          </h2>
          {paidOrders.length === 0 ? (
            <p className="text-center text-charcoal-light dark:text-charcoal-light py-10">No new orders. Time for a coffee break?</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {paidOrders.map(order => {
                const firstItemRecipe = order.items.length > 0 ? getRecipeByProductId(order.items[0].productId) : null;
                return (
                  <OrderQueueItem 
                    key={order.id} 
                    order={order} 
                    actionButton={
                      <Button onClick={() => handleStartPreparing(order.id)} size="md" variant="primary">
                        Start Preparing
                      </Button>
                    }
                    recipe={firstItemRecipe || undefined} 
                    onViewRecipe={handleViewRecipe}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Orders Being Prepared by Current Barista */}
        <div className="bg-cream-light dark:bg-charcoal-dark shadow-xl rounded-xl p-4">
          <h2 className="text-2xl font-bold mb-3 text-charcoal-dark dark:text-cream-light flex items-center">
             <FaConciergeBell className="mr-2 text-blue-500" />My Current Preparations ({preparingOrders.length})
          </h2>
          {preparingOrders.length === 0 ? (
            <p className="text-center text-charcoal-light dark:text-charcoal-light py-10">You're not currently preparing any orders.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {preparingOrders.map(order => {
                const firstItemRecipe = order.items.length > 0 ? getRecipeByProductId(order.items[0].productId) : null;
                return (
                  <OrderQueueItem 
                    key={order.id} 
                    order={order} 
                    actionButton={
                      <Button onClick={() => handleCompleteOrder(order.id)} size="md" variant="secondary">
                        Mark Completed
                      </Button>
                    }
                    recipe={firstItemRecipe || undefined} 
                    onViewRecipe={handleViewRecipe}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RecipeDisplayModal 
        isOpen={isRecipeModalOpen}
        onClose={() => {
          setIsRecipeModalOpen(false);
          setSelectedRecipe(null);
        }}
        recipe={selectedRecipe}
      />
    </div>
  );
};

export default BaristaPanel;