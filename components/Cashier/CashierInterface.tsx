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
import { FaReceipt, FaShoppingCart, FaCoffee, FaLeaf, FaCookieBite, FaShoppingBag, FaQuestionCircle, FaDesktop, FaStore, FaBell, FaFolderOpen, FaUserTag, FaWifi, FaCloudUploadAlt, FaCalculator, FaMoneyBillWave, FaLock, FaPrint } from 'react-icons/fa';
import PrintableReceipt from './PrintableReceipt';
import CashPaymentModal from './CashPaymentModal';
import TableSelectionModal from './TableSelectionModal';
import ShortcutsHelp from '../Shared/ShortcutsHelp';
import OpenTabsModal from './OpenTabsModal';
import LoyaltyLookupModal from './LoyaltyLookupModal';

const CashierInterface: React.FC = () => {
  const {
    products, currentOrder, createOrUpdateCurrentOrder, clearCurrentOrder,
    finalizeCurrentOrder, setRushOrder, getProductById, getStoreById, currentStoreId,
    setTableNumberForCurrentOrder, updateCurrentOrder, knownCategories,
    saveOrderAsTab, loadOrderAsCurrent, selectedCustomer, isOnline, pendingOrders,
    orders
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
  const [isSavingTab, setIsSavingTab] = useState(false);




  // Calculate active online orders count for badge
  const activeOnlineOrdersCount = orders.filter(o =>
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
      if (isSavingTab) return;
      setIsSavingTab(true);
      saveOrderAsTab(currentUser.id).finally(() => {
        setIsSavingTab(false);
      });
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

  const handlePrint = () => {
    window.print();
  };

  // Auto-print when receipt modal is shown
  useEffect(() => {
    if (showReceiptModal && lastCompletedOrder) {
      // Small delay to ensure Portal content is rendered and styles applied
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showReceiptModal, lastCompletedOrder]);

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
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-cream via-cream-light to-emerald-50 dark:from-charcoal-dark dark:via-charcoal dark:to-emerald-900/10 transition-colors duration-500">
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between animate-pulse-slow z-50">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FaWifi className="animate-bounce" />
            <span className="hidden sm:inline">OFFLINE MODE - Orders will be queued and synced automatically when back online.</span>
            <span className="sm:hidden">OFFLINE MODE</span>
          </div>
          {pendingOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <FaCloudUploadAlt />
              <span className="text-sm font-black bg-white/20 px-2 py-0.5 rounded-full">{pendingOrders.length} Pending Orders</span>
            </div>
          )}
        </div>
      )}
      
      <div className="fade-in grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 flex-grow p-1 sm:p-2">


        {/* Product Panel */}
      <div className={`lg:col-span-2 glass-panel p-2 sm:p-3 rounded-2xl flex flex-col transition-all duration-300 animate-fade-in-up ${isQRPaymentInProgress ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center mb-2 gap-2">
            <h1 className="text-lg sm:text-xl font-black text-charcoal-dark dark:text-cream-light tracking-tighter">Menu</h1>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
              {/* Online indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-emerald/10 text-emerald' : 'bg-amber-500 text-white'}`}>
                <FaWifi className={isOnline ? '' : 'animate-pulse'} />
                <span className="hidden sm:inline">{isOnline ? 'Online' : `Offline (${pendingOrders.length})`}</span>
              </div>
              {/* Online Orders bell */}
              <Button onClick={() => setShowOnlineOrdersModal(true)} variant="ghost" className="relative" title="Online Orders">
                <span className={activeOnlineOrdersCount > 0 ? "text-emerald animate-pulse" : ""}><FaBell /></span>
                {activeOnlineOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{activeOnlineOrdersCount}</span>
                )}
              </Button>
              {/* Desktop buttons */}
              <div className="hidden md:flex items-center gap-1">
                <Button onClick={() => setShowShortcutsHelp(true)} variant="ghost" size="sm" title="Keyboard Shortcuts (?)"><span className="text-base">⌨️</span></Button>
                <Button onClick={() => setShowOnlineMenuModal(true)} variant="ghost" leftIcon={<FaStore />}><span className="hidden xl:inline">Online Menu</span></Button>
                <Button onClick={() => setShowOpenTabsModal(true)} variant="ghost" leftIcon={<FaFolderOpen />}><span className="hidden xl:inline">Open Tabs</span></Button>
                <Button onClick={openCustomerDisplay} variant="ghost" leftIcon={<FaDesktop />}><span className="hidden xl:inline">Screen</span></Button>
                <Button onClick={() => setShowLoyaltyModal(true)} variant={selectedCustomer ? 'secondary' : 'ghost'} leftIcon={<FaUserTag />} className={selectedCustomer ? 'border-emerald text-emerald' : ''}>
                  <span className="hidden xl:inline">Loyalty {selectedCustomer ? `(${selectedCustomer.name || selectedCustomer.phoneNumber.slice(-4)})` : ''}</span>
                </Button>
              </div>
              {/* Mobile icon-only buttons */}
              <div className="flex md:hidden items-center gap-1">
                <Button onClick={() => setShowOnlineMenuModal(true)} variant="ghost" size="sm" title="Online Menu"><FaStore /></Button>
                <Button onClick={() => setShowOpenTabsModal(true)} variant="ghost" size="sm" title="Open Tabs"><FaFolderOpen /></Button>
                <Button onClick={openCustomerDisplay} variant="ghost" size="sm" title="Customer Screen"><FaDesktop /></Button>
                <Button onClick={() => setShowLoyaltyModal(true)} variant={selectedCustomer ? 'secondary' : 'ghost'} size="sm" title="Loyalty" className={selectedCustomer ? 'border-emerald text-emerald' : ''}><FaUserTag /></Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {knownCategories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex-grow sm:flex-grow-0 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all transform active:scale-95 border ${activeCategory === category
                  ? 'bg-gradient-to-r from-emerald to-emerald-dark text-white border-transparent shadow-[0_4px_15px_rgba(16,185,129,0.3)]'
                  : 'bg-white/50 dark:bg-charcoal-dark/50 text-charcoal-light dark:text-cream-light border-white/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-charcoal/80 shadow-sm backdrop-blur-md'
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
      <div className="lg:col-span-1 lg:self-start glass-panel p-1.5 sm:p-2 rounded-2xl flex flex-col h-[50vh] lg:h-[calc(100vh-80px)] lg:sticky lg:top-[70px] transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xs font-black text-charcoal/40 uppercase tracking-widest mb-1 flex items-center px-1">
          <span className="mr-1 text-emerald/60"><FaShoppingCart size={12} /></span>Current Order
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
            <div className="flex gap-2 w-full">
              <Button onClick={handlePrint} variant="primary" className="flex-1" leftIcon={<FaPrint />}>
                Print Receipt
              </Button>
              <Button onClick={handleCloseReceiptModal} variant="ghost" className="flex-1">
                Close
              </Button>
            </div>
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
    </div>
  );
};

export default CashierInterface;
