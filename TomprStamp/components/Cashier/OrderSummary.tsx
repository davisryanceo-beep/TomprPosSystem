
import React, { useState } from 'react';
import { Order, OrderItem, PaymentMethod, QRPaymentState } from '../../types';
import Button from '../Shared/Button';
import { FaTrash, FaPlus, FaMinus, FaMoneyBillWave, FaQrcode, FaShippingFast, FaTags, FaTimesCircle, FaChair, FaDesktop, FaStar, FaPrint, FaSave } from 'react-icons/fa';
import ApplyPromotionModal from './ApplyPromotionModal';
import ItemDiscountModal from './ItemDiscountModal';
import { useShop } from '../../contexts/ShopContext';

interface OrderSummaryProps {
  order: Order | null;
  onUpdateQuantity: (item: OrderItem, change: number) => void;
  onClearOrder: () => void;
  onInitiatePayment: (method: PaymentMethod) => void;
  onSetRushOrder: (isRush: boolean) => void;
  onSelectTableClick: () => void;
  onCashierConfirmForCustomer: () => void;
  onConfirmQRPayment: () => void;
  onCancelQRPayment: () => void;
}

// Helper to check for customizations (old and new)
const hasCustomizations = (item: OrderItem): boolean => {
  const { customizations, modifiers, addOns, isCombo } = item;
  if (isCombo) return true;
  if (modifiers && modifiers.length > 0) return true;
  if (addOns && addOns.length > 0) return true;
  if (!customizations) return false;
  return (
    (customizations.size && customizations.size !== 'Medium') ||
    (customizations.milk && customizations.milk !== 'None') ||
    (customizations.sugar && customizations.sugar !== 'None') ||
    (customizations.ice && customizations.ice !== 'None' && customizations.ice !== 'Regular Ice')
  );
};

// Helper to format customizations for tooltip
const formatCustomizationsForTooltip = (item: OrderItem): string => {
  const parts: string[] = [];

  if (item.isCombo && item.comboItems) {
    parts.push("Combo Items:");
    item.comboItems.forEach(ci => parts.push(`• ${ci.productName}`));
  }

  if (item.modifiers) {
    item.modifiers.forEach(m => parts.push(`${m.groupName}: ${m.modifierName} (+$${m.priceAdjustment.toFixed(2)})`));
  }

  if (item.addOns) {
    item.addOns.forEach(a => parts.push(`+ ${a.name} (+$${a.price.toFixed(2)})`));
  }

  if (item.customizations) {
    const legacy = Object.entries(item.customizations)
      .filter(([, value]) => value && value !== 'None' && value !== 'Medium' && value !== 'Regular Ice')
      .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
    parts.push(...legacy);
  }

  return parts.length > 0 ? parts.join('\n') : 'Standard';
};

// Helper for compact sub-text
const formatCompactCustomizations = (item: OrderItem): string => {
  const parts: string[] = [];
  if (item.isCombo) return "Meal Combo";

  if (item.modifiers) parts.push(...item.modifiers.map(m => m.modifierName));
  if (item.addOns) parts.push(...item.addOns.map(a => a.name));

  if (item.customizations) {
    const legacy = Object.entries(item.customizations)
      .filter(([, value]) => value && value !== 'None' && value !== 'Medium' && value !== 'Regular Ice')
      .map(([, value]) => value);
    parts.push(...legacy);
  }

  return parts.length > 0 ? parts.join(', ') : 'Standard';
};

const OrderSummary: React.FC<OrderSummaryProps> = ({
  order, onUpdateQuantity, onClearOrder, onInitiatePayment,
  onSetRushOrder, onSelectTableClick, onCashierConfirmForCustomer,
  onConfirmQRPayment, onCancelQRPayment
}) => {
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [discountModalItem, setDiscountModalItem] = useState<OrderItem | null>(null);
  const { getPromotionById, removePromotionFromCurrentOrder, updateCurrentOrder, getStoreById, currentStoreId } = useShop();

  const store = currentStoreId ? getStoreById(currentStoreId) : null;
  const taxRatePercent = store?.taxRate ? Math.round(store.taxRate * 100) : 0;

  const handleApplyItemDiscount = (discount: { type: 'percentage' | 'fixed'; value: number; reason?: string }) => {
    if (!order || !discountModalItem) return;

    const updatedItems = order.items.map(item => {
      if (item === discountModalItem) {
        return {
          ...item,
          discount: discount
        };
      }
      return item;
    });

    updateCurrentOrder({ items: updatedItems });
    setDiscountModalItem(null);
  };

  const handleRemoveItemDiscount = () => {
    if (!order || !discountModalItem) return;

    const updatedItems = order.items.map(item => {
      if (item === discountModalItem) {
        const { discount, ...rest } = item;
        return rest;
      }
      return item;
    });

    updateCurrentOrder({ items: updatedItems });
    setDiscountModalItem(null);
  };

  if (!order || !order.items || order.items.length === 0) {
    return <p className="text-center text-charcoal-light dark:text-charcoal-light py-6 flex-grow flex items-center justify-center">No items in order.</p>;
  }

  // QR Payment Flow UI
  if (order.qrPaymentState && order.qrPaymentState !== QRPaymentState.NONE && order.qrPaymentState !== QRPaymentState.PAYMENT_SUCCESSFUL) {
    return (
      <div className="flex flex-col h-full justify-center items-center text-center p-4">
        {order.qrPaymentState === QRPaymentState.AWAITING_CUSTOMER_CONFIRMATION && (
          <>
            <div className="text-emerald mb-4 inline-block"><FaDesktop size={60} /></div>
            <h3 className="text-2xl font-bold">Confirm with Customer</h3>
            <p className="text-charcoal-light my-4">Ask customer to review their order on the display, then click confirm to show the QR code.</p>
            <Button onClick={onCashierConfirmForCustomer} className="w-full mt-2" size="lg">Customer Confirmed</Button>
          </>
        )}
        {order.qrPaymentState === QRPaymentState.AWAITING_PAYMENT && (
          <>
            <div className="text-emerald mb-4 animate-pulse inline-block"><FaQrcode size={60} /></div>
            <h3 className="text-2xl font-bold">Awaiting Payment</h3>
            <p className="text-charcoal-light">Customer is paying via QR code.</p>
            <Button onClick={onConfirmQRPayment} className="w-full mt-6" size="lg" leftIcon={<FaPrint />}>Confirm Payment & Print</Button>
          </>
        )}
        <Button onClick={onCancelQRPayment} variant="ghost" className="w-full mt-4">Cancel Payment</Button>
      </div>
    );
  }

  const appliedPromotion = order.appliedPromotionId ? getPromotionById(order.appliedPromotionId) : null;

  return (
    <>
      <div className="flex flex-col h-full justify-between">
        {/* Items list */}
        <div className="overflow-y-auto flex-grow min-h-0 pr-2 -mr-2">
          <div className="sticky top-0 bg-cream-light dark:bg-charcoal-dark pt-1 pb-3 z-10 space-y-2">
            <Button
              variant="ghost"
              className="w-full !justify-start text-lg !py-3"
              leftIcon={<FaChair />}
            >
              <span className="mr-2 font-bold text-emerald">{order.dailyOrderNumber ? `#${order.dailyOrderNumber}` : (order.items.length > 0 ? '#New' : '')}</span>
              {order.tableNumber ? `Table: ${order.tableNumber}` : 'Select Table'}
            </Button>
          </div>
          <table className="min-w-full">
            <tbody className="divide-y divide-charcoal/10 dark:divide-cream-light/10">
              {order.items.map((item, index) => {
                const isCustomized = hasCustomizations(item);
                return (
                  <tr key={item.productId + JSON.stringify(item.customizations) + index}>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg text-charcoal-dark dark:text-cream-light">
                          {item.productName}
                          {item.isCombo && <span className="ml-2 text-xs bg-emerald text-white px-1.5 py-0.5 rounded uppercase">Combo</span>}
                        </p>
                        {isCustomized && (
                          <div className="relative group flex items-center">
                            <span className="text-yellow-500"><FaStar /></span>
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs bg-charcoal-dark text-cream-light text-xs rounded-md shadow-lg py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-pre-wrap z-10">
                              {formatCustomizationsForTooltip(item)}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-light">{formatCompactCustomizations(item)}</p>
                      {item.discount && (
                        <p className="text-xs text-emerald font-semibold mt-1">
                          Discount: {item.discount.type === 'percentage' ? `${item.discount.value}%` : `$${item.discount.value.toFixed(2)}`}
                          {item.discount.reason && ` (${item.discount.reason})`}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="!p-2 rounded-full" onClick={() => onUpdateQuantity(item, -1)}><FaMinus /></Button>
                        <span className="w-8 text-center font-extrabold text-xl text-charcoal-dark dark:text-cream-light">{item.quantity}</span>
                        <Button size="sm" variant="ghost" className="!p-2 rounded-full" onClick={() => onUpdateQuantity(item, 1)}><FaPlus /></Button>
                      </div>
                    </td>
                    <td className="py-3 pl-2 text-right font-bold text-lg text-charcoal-dark dark:text-cream-light w-28">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                      {item.discount && (
                        <div className="text-xs text-emerald line-through opacity-75">
                          ${(Math.max(0, (item.unitPrice * item.quantity) - (item.discount.type === 'percentage' ? (item.unitPrice * item.quantity * (item.discount.value / 100)) : item.discount.value))).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pl-2">
                      <Button size="sm" variant="ghost" onClick={() => setDiscountModalItem(item)} className="!p-2 text-emerald rounded-full mr-1"><FaTags size={12} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => onUpdateQuantity(item, -item.quantity)} className="!p-2 text-terracotta rounded-full"><FaTrash /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals and Payment */}
        <div className="flex-shrink-0 pt-4">
          <div className="border-t-2 border-dashed border-charcoal/20 dark:border-cream-light/20 pt-4 space-y-2 text-lg">
            <p className="flex justify-between text-charcoal dark:text-cream-light">Subtotal: <span>${order.totalAmount.toFixed(2)}</span></p>
            {appliedPromotion && order.discountAmount && order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-dark dark:text-emerald">
                <span>Discount ({appliedPromotion.name}):</span>
                <span>-${order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <p className="flex justify-between text-charcoal dark:text-cream-light">
              Tax ({taxRatePercent}%):
              <span>${order.taxAmount.toFixed(2)}</span>
            </p>
            <div className="flex justify-between font-extrabold text-3xl text-charcoal-dark dark:text-cream-light pt-2 mt-2">
              <span>Total:</span>
              <span>${order.finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="rushOrder" className="flex items-center space-x-3 p-3 rounded-lg bg-cream dark:bg-charcoal-dark/50 cursor-pointer">
                <input
                  type="checkbox"
                  id="rushOrder"
                  className="h-6 w-6 text-terracotta border-charcoal/30 rounded focus:ring-terracotta"
                  checked={order.isRushOrder || false}
                  onChange={(e) => onSetRushOrder(e.target.checked)}
                />
                <span className="font-bold flex items-center gap-2"><span className="text-terracotta"><FaShippingFast /></span> Rush Order</span>
              </label>

              {appliedPromotion ? (
                <Button
                  onClick={removePromotionFromCurrentOrder}
                  variant="ghost"
                  className="w-full !py-3 text-terracotta"
                  leftIcon={<FaTimesCircle />}
                >
                  Remove Promo
                </Button>
              ) : (
                <Button
                  onClick={() => setIsPromotionModalOpen(true)}
                  variant="ghost"
                  className="w-full !py-3"
                  leftIcon={<FaTags />}
                >
                  Apply Promo
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => onInitiatePayment('Unpaid')} variant="outline" className="col-span-2 !py-3 text-lg border-2 border-emerald text-emerald hover:bg-emerald/10" leftIcon={<FaSave />}>Save Tab (Unpaid)</Button>
              <Button onClick={() => onInitiatePayment('Cash')} variant="secondary" className="w-full !py-4 text-lg" leftIcon={<FaMoneyBillWave />}>Pay Cash</Button>
              <Button onClick={() => onInitiatePayment('QR')} variant="primary" className="w-full !py-4 text-lg" leftIcon={<FaQrcode />}>Confirm Order (QR)</Button>
            </div>

            <Button onClick={onClearOrder} variant="danger" className="w-full !py-3">Clear Order</Button>
          </div>
        </div>
      </div>
      <ApplyPromotionModal
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        currentOrder={order}
      />
      <ItemDiscountModal
        isOpen={!!discountModalItem}
        onClose={() => setDiscountModalItem(null)}
        item={discountModalItem}
        onApplyDiscount={handleApplyItemDiscount}
        onRemoveDiscount={handleRemoveItemDiscount}
      />
    </>
  );
};

export default OrderSummary;
