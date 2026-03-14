import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import ProductGrid from './ProductGrid';
import OrderSummary from './OrderSummary';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { OrderItem, Order, ProductCategory, PaymentMethod, PaymentCurrency, QRPaymentState, OrderStatus } from '../../types';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import OnlineMenuModal from './OnlineMenuModal';
import OnlineOrdersModal from './OnlineOrdersModal';
import { FaReceipt, FaShoppingCart, FaCoffee, FaLeaf, FaCookieBite, FaShoppingBag, FaQuestionCircle, FaDesktop, FaStore, FaBell, FaFolderOpen, FaUserTag } from 'react-icons/fa';
import PrintableReceipt from './PrintableReceipt';
import CashPaymentModal from './CashPaymentModal';
import TableSelectionModal from './TableSelectionModal';
import ShortcutsHelp from '../Shared/ShortcutsHelp';
import OpenTabsModal from './OpenTabsModal';
import LoyaltyLookupModal from './LoyaltyLookupModal';

const CashierInterface: React.FC = () => {
  const {
    products, currentOrder, createOrUpdateCurrentOrder, clearCurrentOrder,
    finalizeCurrentOrder, setRushOrder, getProductById, currentStoreId,
    setTableNumberForCurrentOrder, updateCurrentOrder, knownCategories,
    saveOrderAsTab, loadOrderAsCurrent, selectedCustomer
  } = useShop();
  const { currentUser } = useAuth();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [printableAreaNode, setPrintableAreaNode] = useState<HTMLElement | null>(null);
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [customerWindow, setCustomerWindow] = useState<Window | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showOnlineMenuModal, setShowOnlineMenuModal] = useState(false);
  const [showOnlineOrdersModal, setShowOnlineOrdersModal] = useState(false);
  const [showOpenTabsModal, setShowOpenTabsModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);


  // Calculate active online orders count for badge
  const activeOnlineOrdersCount = useShop().orders.filter(o =>
    o.orderType === 'DELIVERY' &&
    o.status !== 'Completed' &&
    o.status !== 'Cancelled' &&
    new Date(o.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length;

  useEffect(() => {
    const node = document.getElementById('printable-area');
    if (node) {
      setPrintableAreaNode(node);
    }
  }, []);

  // Helper for customer display window
  const [activeCategory, setActiveCategory] = useState<string>(ProductCategory.COFFEE);

  // Debugging logs
  const openCustomerDisplay = () => {
    if (!currentStoreId) {
      alert("Cannot open customer display: no store is currently active.");
      return;
    }
    const customerDisplayUrl = `/#/customer-display?storeId=${currentStoreId}`;

    if (customerWindow && !customerWindow.closed) {
      try {
        const currentHash = customerWindow.location.hash.substring(1);
        const targetHash = customerDisplayUrl.substring(2);
        if (currentHash !== targetHash) {
          customerWindow.location.href = customerDisplayUrl;
        }
      } catch (e) {
        console.error("Could not access customer display window location:", e);
      }
      customerWindow.focus();
    } else {
      const newWindow = window.open(customerDisplayUrl, 'CustomerDisplay', 'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no');
      setCustomerWindow(newWindow);
    }
  };

  const handleAddItemToOrder = (item: OrderItem) => {
    // For combos, we check stock of first item as a proxy or just allow it
    // For regular products, we check stock normally
    let canAdd = true;
    let productName = item.productName;

    if (!item.isCombo) {
      const product = getProductById(item.productId);
      if (product) {
        productName = product.name;
        if (product.stock <= 0) {
          alert(`${productName} is out of stock.`);
          return;
        }

        const itemInOrder = currentOrder?.items?.find(i =>
          i.productId === item.productId &&
          JSON.stringify(i.customizations) === JSON.stringify(item.customizations) &&
          JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers) &&
          JSON.stringify(i.addOns) === JSON.stringify(item.addOns)
        );
        const currentQuantityInOrder = itemInOrder?.quantity || 0;
        if (product.stock <= currentQuantityInOrder) {
          alert(`Cannot add more ${productName}. Only ${product.stock} unit(s) available.`);
          canAdd = false;
        }
      }
    }

    if (canAdd) {
      createOrUpdateCurrentOrder(item, 1);
    }
  };


  const handleUpdateItemQuantity = (item: OrderItem, change: number) => {
    if (change > 0) {
      const product = getProductById(item.productId);
      if (product && product.stock < (item.quantity + change)) {
        alert(`Cannot increase quantity for ${product.name}. Only ${product.stock} unit(s) available.`);
        return;
      }
    }
    createOrUpdateCurrentOrder(item, change);
  };

  const handleInitiatePayment = (method: PaymentMethod) => {
    if (!currentOrder || !currentUser || !currentOrder.items || currentOrder.items.length === 0) {
      alert("Cannot process payment for an empty or invalid order.");
      return;
    }
    for (const item of currentOrder.items) {
      const product = getProductById(item.productId);
      if (!product || product.stock < item.quantity) {
        alert(`Error: ${product ? product.name : 'An item'} is out of stock or quantity exceeds available stock. Please review the order.`);
        return;
      }
    }

    if (method === 'Cash') {
      setShowCashPaymentModal(true);
    } else if (method === 'QR') {
      updateCurrentOrder({ qrPaymentState: QRPaymentState.AWAITING_PAYMENT });
    } else if (method === 'Unpaid') {
      saveOrderAsTab(currentUser.id);
    }
  };

  const handleLoadTab = (order: Order) => {
    loadOrderAsCurrent(order);
    setShowOpenTabsModal(false);
  };

  const handleCashierConfirmForCustomer = () => {
    updateCurrentOrder({ qrPaymentState: QRPaymentState.AWAITING_PAYMENT });
  };

  const handleConfirmQRPayment = async () => {
    if (!currentUser || !currentOrder) return;

    // Finalize the order, which will clear the cashier's screen immediately
    const completedOrder = await finalizeCurrentOrder(currentUser.id, 'QR');

    if (completedOrder) {
      // Continue with the normal cashier flow (receipt, etc.)
      setLastCompletedOrder(completedOrder);
      setShowReceiptModal(true);
    } else {
      alert("Failed to finalize QR payment.");
    }
  };

  const handleCancelQRPayment = () => {
    updateCurrentOrder({ qrPaymentState: QRPaymentState.NONE });
  };

  const handleConfirmCashPayment = async (cashTendered: number, changeGiven: number, paymentCurrency: PaymentCurrency) => {
    if (currentUser && currentOrder) {
      const completedOrder = await finalizeCurrentOrder(currentUser.id, 'Cash', {
        cashTendered,
        changeGiven,
        paymentCurrency
      });
      setShowCashPaymentModal(false);

      if (completedOrder) {
        setLastCompletedOrder(completedOrder);
        setShowReceiptModal(true);
        console.log(`Payment processed by ${completedOrder.paymentMethod} (${completedOrder.paymentCurrency || 'USD'}) for order ${completedOrder.id}`);
      } else {
        alert("Failed to finalize order. Please try again.");
      }
    }
  };

  const categoryIcons: Record<string, React.ReactElement> = {
    [ProductCategory.COFFEE]: <FaCoffee />,
    [ProductCategory.TEA]: <FaLeaf />,
    [ProductCategory.PASTRIES]: <FaCookieBite />,
    [ProductCategory.MERCHANDISE]: <FaShoppingBag />,
    [ProductCategory.UNCATEGORIZED]: <FaQuestionCircle />,
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setLastCompletedOrder(null);
  };

  const isQRPaymentInProgress = currentOrder?.qrPaymentState && currentOrder.qrPaymentState !== QRPaymentState.NONE;

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'F2',
      description: 'Focus product search',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    },
    {
      key: 'F12',
      description: 'Quick cash payment',
      action: () => {
        if (currentOrder && currentOrder.items && currentOrder.items.length > 0) {
          handleInitiatePayment('Cash');
        }
      }
    },
    {
      key: 'Escape',
      description: 'Clear order',
      action: () => {
        if (currentOrder && currentOrder.items && currentOrder.items.length > 0) {
          if (confirm('Clear current order?')) {
            clearCurrentOrder();
          }
        }
      }
    },
    {
      key: 'd',
      ctrl: true,
      description: 'Apply discount',
      action: () => {
        // This would open promotion modal - for now just alert
        if (currentOrder && currentOrder.items && currentOrder.items.length > 0) {
          alert('Discount feature - press Apply Promo button');
        }
      }
    },
    {
      key: 't',
      ctrl: true,
      description: 'Select table',
      action: () => {
        setIsTableModalOpen(true);
      }
    },
    {
      key: 'r',
      ctrl: true,
      description: 'Toggle rush order',
      action: () => {
        if (currentOrder) {
          setRushOrder(!currentOrder.isRushOrder);
        }
      }
    },
    {
      key: '?',
      shift: true,
      description: 'Show shortcuts help',
      action: () => {
        setShowShortcutsHelp(true);
      }
    }
  ], !isQRPaymentInProgress);

  return (
    <div className="fade-in grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-3 gap-4 h-[calc(100vh-80px)] p-4">
      {/* Product Panel */}
      <div className={`lg:col-span-3 xl:col-span-2 bg-cream dark:bg-charcoal-dark/50 p-4 rounded-xl shadow-lg flex flex-col transition-opacity duration-300 ${isQRPaymentInProgress ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-extrabold text-charcoal-dark dark:text-cream-light">Menu</h1>
            <div className="flex gap-2">
              <Button onClick={() => setShowOnlineOrdersModal(true)} variant="ghost" className="relative" title="Online Orders">
                <span className={activeOnlineOrdersCount > 0 ? "text-emerald animate-pulse" : ""}>
                  <FaBell />
                </span>
                {activeOnlineOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {activeOnlineOrdersCount}
                  </span>
                )}
              </Button>
              <Button onClick={() => setShowShortcutsHelp(true)} variant="ghost" size="sm" title="Keyboard Shortcuts (?)">
                <span className="text-lg">⌨️</span>
              </Button>
              <Button onClick={() => setShowOnlineMenuModal(true)} variant="ghost" leftIcon={<FaStore />}>
                Online Menu
              </Button>
              <Button onClick={() => setShowOpenTabsModal(true)} variant="ghost" leftIcon={<FaFolderOpen />}>
                Open Tabs
              </Button>
              <Button onClick={openCustomerDisplay} variant="ghost" leftIcon={<FaDesktop />}>
                Customer Screen
              </Button>
              <Button
                onClick={() => setShowLoyaltyModal(true)}
                variant={selectedCustomer ? "outline" : "ghost"}
                leftIcon={<FaUserTag />}
                className={selectedCustomer ? "border-emerald text-emerald" : ""}
              >
                Loyalty {selectedCustomer ? `(${selectedCustomer.name || selectedCustomer.phoneNumber.slice(-4)})` : ''}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {knownCategories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex-grow sm:flex-grow-0 flex items-center gap-3 px-4 py-3 text-base font-bold rounded-lg transition-all transform active:scale-95 shadow-md ${activeCategory === category
                  ? 'bg-emerald text-white'
                  : 'bg-cream-light dark:bg-charcoal-dark text-charcoal-light dark:text-cream-light hover:bg-cream dark:hover:bg-charcoal'
                  }`}
              >
                {categoryIcons[category] || <FaQuestionCircle />}
                <span>{category}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-grow min-h-0">
          <ProductGrid
            products={products ? products.filter(p => p.category === activeCategory) : []}
            onAddItem={handleAddItemToOrder}
          />
        </div>
      </div>

      {/* Order Summary Panel */}
      <div className="lg:col-span-2 xl:col-span-1 bg-cream-light dark:bg-charcoal-dark p-4 rounded-xl shadow-lg flex flex-col">
        <h2 className="text-3xl font-extrabold text-charcoal-dark dark:text-cream-light mb-4 flex items-center flex-shrink-0">
          <span className="mr-3 text-emerald"><FaShoppingCart /></span>Current Order
        </h2>
        <OrderSummary
          order={currentOrder}
          onUpdateQuantity={handleUpdateItemQuantity}
          onClearOrder={clearCurrentOrder}
          onInitiatePayment={handleInitiatePayment}
          onSetRushOrder={setRushOrder}
          onSelectTableClick={() => setIsTableModalOpen(true)}
          onCashierConfirmForCustomer={handleCashierConfirmForCustomer}
          onConfirmQRPayment={handleConfirmQRPayment}
          onCancelQRPayment={handleCancelQRPayment}
        />
      </div>

      <TableSelectionModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onSelectTable={(tableNumber) => {
          setTableNumberForCurrentOrder(tableNumber);
          setIsTableModalOpen(false);
        }}
        currentTable={currentOrder?.tableNumber}
      />

      {currentOrder && (
        <CashPaymentModal
          isOpen={showCashPaymentModal}
          onClose={() => setShowCashPaymentModal(false)}
          order={currentOrder}
          onConfirmPayment={handleConfirmCashPayment}
        />
      )}

      {lastCompletedOrder && (
        <Modal
          isOpen={showReceiptModal}
          onClose={handleCloseReceiptModal}
          title="Order Confirmation"
          size="md"
          footer={
            <Button onClick={handleCloseReceiptModal} className="w-full" leftIcon={<FaReceipt />}>
              Close
            </Button>
          }
        >
          <PrintableReceipt order={lastCompletedOrder} />
        </Modal>
      )}

      {printableAreaNode && lastCompletedOrder && ReactDOM.createPortal(
        <PrintableReceipt order={lastCompletedOrder} />,
        printableAreaNode
      )}

      <ShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />

      <OnlineMenuModal isOpen={showOnlineMenuModal} onClose={() => setShowOnlineMenuModal(false)} />
      <OnlineOrdersModal isOpen={showOnlineOrdersModal} onClose={() => setShowOnlineOrdersModal(false)} />
      <OpenTabsModal isOpen={showOpenTabsModal} onClose={() => setShowOpenTabsModal(false)} onLoadTab={handleLoadTab} />

      <LoyaltyLookupModal
        isOpen={showLoyaltyModal}
        onClose={() => setShowLoyaltyModal(false)}
      />
    </div>
  );
};

export default CashierInterface;
