import React from 'react';
import { Order, OrderItem } from '../../types';
import { USD_TO_KHR_RATE } from '../../constants';
import { useShop } from '../../contexts/ShopContext'; // Import useShop to get promotion details

interface PrintableReceiptProps {
  order: Order;
}

const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ order }) => {
  const { getPromotionById } = useShop(); // Get promotions for display

  const formatItemDetails = (item: OrderItem) => {
    const parts = [];

    // Combo items
    if (item.isCombo && item.comboItems) {
      parts.push("Combo:");
      item.comboItems.forEach(ci => parts.push(`• ${ci.productName}`));
    }

    // Modifiers
    if (item.modifiers) {
      item.modifiers.forEach(m => parts.push(`${m.modifierName}`));
    }

    // Add-ons
    if (item.addOns) {
      item.addOns.forEach(a => parts.push(`+ ${a.name}`));
    }

    // Legacy customizations
    if (item.customizations) {
      if (item.customizations.size && item.customizations.size !== 'Medium') parts.push(item.customizations.size);
      if (item.customizations.milk && item.customizations.milk !== 'None') parts.push(item.customizations.milk);
      if (item.customizations.sugar && item.customizations.sugar !== 'None') parts.push(item.customizations.sugar);
      if (item.customizations.ice && item.customizations.ice !== 'None') parts.push(item.customizations.ice);
    }

    return parts.length > 0 ? parts.join(', ') : '';
  };

  const totalAmountKHR = order.finalAmount * USD_TO_KHR_RATE;
  const appliedPromotion = order.appliedPromotionId ? getPromotionById(order.appliedPromotionId) : null;

  return (
    <div className="printable-receipt-content p-4 font-sans text-sm bg-white text-black">
      <style>{`
        /* Minimal styles for print, mostly handled by @media print in index.html */
        .printable-receipt-content h3 { font-size: 1.25rem; font-weight: bold; text-align: center; margin-bottom: 0.75rem; }
        .printable-receipt-content p { margin-bottom: 0.25rem; }
        .printable-receipt-content strong { font-weight: bold; }
        .printable-receipt-content ul { list-style: none; padding: 0; margin: 0; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; margin-top:0.5rem; margin-bottom:0.5rem; }
        .printable-receipt-content li { padding: 0.25rem 0; display: flex; justify-content: space-between; }
        .printable-receipt-content li span:first-child { max-width: 70%; word-break: break-word;}
        .printable-receipt-content .totals { border-top: 1px solid #333; padding-top: 0.5rem; margin-top: 0.5rem; }
        .printable-receipt-content .totals p { display: flex; justify-content: space-between; }
        .printable-receipt-content .totals .grand-total { font-size: 1.1rem; font-weight: bold; }
        .printable-receipt-content .totals .discount { color: #28a745; } /* Green for discount */
        .printable-receipt-content .payment-details { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed #ccc;}
        .printable-receipt-content .footer-note { text-align: center; margin-top: 1rem; font-size: 0.75rem; }
      `}</style>
      <h3>Amble Specialty Cafe</h3>
      <p><strong>Order #:</strong> {order.dailyOrderNumber ? order.dailyOrderNumber : order.id.slice(-8)}</p>
      <p><strong>Date:</strong> {new Date(order.timestamp).toLocaleString()}</p>
      <p><strong>Cashier:</strong> {order.cashierId ? order.cashierId.split('-')[0] : 'N/A'}</p>
      {order.tableNumber && <p><strong>For:</strong> {order.tableNumber}</p>}
      {order.isRushOrder && <p className="font-bold text-red-600">** RUSH ORDER **</p>}

      <ul>
        {order.items.map((item, index) => (
          <li key={item.productId + JSON.stringify(item.customizations) + index} className="flex-col !items-start">
            <div className="flex justify-between w-full">
              <span className="font-bold">{item.quantity}x {item.productName}</span>
              <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
            {formatItemDetails(item) && (
              <span className="text-[10px] text-gray-600 italic -mt-1">{formatItemDetails(item)}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="totals">
        <p>Subtotal: <span>${order.totalAmount.toFixed(2)}</span></p>
        {appliedPromotion && order.discountAmount && order.discountAmount > 0 && (
          <p className="discount">
            Discount ({appliedPromotion.name}):
            <span>-${order.discountAmount.toFixed(2)}</span>
          </p>
        )}
        <p>Tax: <span>${order.taxAmount.toFixed(2)}</span></p>
        <p className="grand-total">Total (USD): <span>${order.finalAmount.toFixed(2)}</span></p>
        {order.paymentCurrency === 'KHR' && (
          <p>Total (KHR): <span>៛{totalAmountKHR.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></p>
        )}
      </div>

      {order.paymentMethod && (
        <div className="payment-details">
          <p>Payment Method: <strong>{order.paymentMethod} {order.paymentMethod === 'Cash' && order.paymentCurrency ? `(${order.paymentCurrency})` : ''}</strong></p>
          {order.paymentMethod === 'Cash' && order.cashTendered !== undefined && order.changeGiven !== undefined && (
            <>
              {order.paymentCurrency === 'KHR' ? (
                <>
                  <p>Cash Tendered (KHR): <span>៛{order.cashTendered.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></p>
                  <p>Change Given (KHR): <span>៛{order.changeGiven.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></p>
                </>
              ) : (
                <>
                  <p>Cash Tendered (USD): <span>${order.cashTendered.toFixed(2)}</span></p>
                  <p>Change Given (USD): <span>${order.changeGiven.toFixed(2)}</span></p>
                </>
              )}
            </>
          )}
        </div>
      )}

      <p className="footer-note">Thank you for your purchase!</p>
    </div>
  );
};

export default PrintableReceipt;