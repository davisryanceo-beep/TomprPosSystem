

import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderItem, Store, QRPaymentState, Customer } from '../../types';
import { useShop } from '../../contexts/ShopContext';
import { BakongKHQR, khqrData, IndividualInfo } from 'bakong-khqr';
import { QRCodeCanvas } from 'qrcode.react';
import { getStampClaimStatus } from '../../services/api';
import { FaCoffee, FaCheck, FaQrcode, FaCheckCircle, FaStar, FaGift } from 'react-icons/fa';
import { USD_TO_KHR_RATE, SECONDARY_CURRENCY } from '../../constants';

const CustomerDisplay: React.FC = () => {
  const { getPromotionById, getStoreById, promotions } = useShop();
  const [order, setOrder] = useState<Order | null>(() => {
    const savedOrder = localStorage.getItem('currentOrder');
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      return { ...parsed, timestamp: new Date(parsed.timestamp) };
    }
    return null;
  });
  const [store, setStore] = useState<Store | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('selectedCustomer');
    return saved ? JSON.parse(saved) : null;
  });

  const storeId = useMemo(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
    return params.get('storeId');
  }, []);

  useEffect(() => {
    console.log("CustomerDisplay: Checking for storeId...", storeId);
    if (storeId) {
      const storeData = getStoreById(storeId);
      console.log("CustomerDisplay: Found store data:", storeData);
      console.log("CustomerDisplay: Layout Mode:", storeData?.displayLayout);
      console.log("CustomerDisplay: Slideshow Images:", storeData?.slideshowImageUrls);
      if (storeData) {
        setStore(storeData);
      }
    }
  }, [storeId, getStoreById]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'currentOrder') {
        const newOrderData = event.newValue;
        if (newOrderData) {
          const parsed = JSON.parse(newOrderData);
          setOrder({ ...parsed, timestamp: new Date(parsed.timestamp) });
        } else {
          setOrder(null);
        }
      }
      if (event.key === 'selectedCustomer') {
        const newCustomerData = event.newValue;
        setCustomer(newCustomerData ? JSON.parse(newCustomerData) : null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // UseEffect for Polling Stamp Claim Status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (order && order.qrPaymentState === QRPaymentState.PAYMENT_SUCCESSFUL && order.pendingStampClaimId && !claimed) {
      interval = setInterval(async () => {
        try {
          const res = await getStampClaimStatus(order.pendingStampClaimId!);
          if (res.data.success && res.data.claimed) {
            setClaimed(true);
            // Auto-dismiss after showing success message
            setTimeout(() => {
              handleDismissSuccess();
            }, 3000);
          }
        } catch (e) {
          console.error("CustomerDisplay: Error polling stamp status", e);
        }
      }, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order, claimed]);

  // Reset claimed state if order changes
  useEffect(() => {
    setClaimed(false);
  }, [order?.id]);

  // Safeguard: If CustomerDisplay loads with a cached SUCCESSFUL payment from localStorage, 
  // clear it after a delay to prevent it from being permanently stuck on screen.
  // We give more time if there is a stamp QR code to scan.
  useEffect(() => {
    if (order && order.qrPaymentState === QRPaymentState.PAYMENT_SUCCESSFUL) {
      const timeoutMs = order.pendingStampClaimId ? 60000 : 5000; // 60s if QR, else 5s
      const timer = setTimeout(() => {
        const currentStored = localStorage.getItem('currentOrder');
        if (currentStored) {
          try {
            const parsed = JSON.parse(currentStored);
            if (parsed.id === order.id && parsed.qrPaymentState === QRPaymentState.PAYMENT_SUCCESSFUL) {
              localStorage.removeItem('currentOrder');
              setOrder(null);
            }
          } catch (e) { }
        }
      }, timeoutMs);
      return () => clearTimeout(timer);
    }
  }, [order]);

  const handleDismissSuccess = () => {
    localStorage.removeItem('currentOrder');
    setOrder(null);
  };

  const formatItemDetails = (item: OrderItem) => {
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
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  };

  const khrAmount = useMemo(() => {
    if (!order) return 0;
    return Math.round(order.finalAmount * USD_TO_KHR_RATE);
  }, [order?.finalAmount]);

  const appliedPromotion = order?.appliedPromotionId ? getPromotionById(order.appliedPromotionId) : null;

  // Destructure settings with defaults
  const {
    accentColor = '#10b981',
    welcomeMessage = 'Welcome! Your order will appear here.',
    backgroundImageUrl,
    backgroundColor = '#f5f5f5',
    overlayOpacity = 0.7,
    logoUrl,
    logoSize = 96,
    displayTheme = 'light',
    fontFamily = 'Nunito',
    headerColor = '#1e293b',
    bodyTextColor = '#334155',
  } = store || {};

  const backgroundStyle = backgroundImageUrl
    ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor };

  const overlayStyle = {
    backgroundColor: displayTheme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(245, 245, 245, 0.7)',
    opacity: backgroundImageUrl ? overlayOpacity : 1,
  };

  // Slideshow Logic
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { displayLayout = 'standard', slideshowImageUrls = [] } = store || {};



  const contentBoxClasses = displayTheme === 'dark'
    ? 'bg-charcoal-dark/80 text-cream-light'
    : 'bg-cream-light/80 text-charcoal-dark';

  useEffect(() => {
    if (displayLayout === 'split-screen') {
      const interval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % slideshowImageUrls.length);
      }, 5000); // 5 seconds per slide
      return () => clearInterval(interval);
    }
  }, [displayLayout, slideshowImageUrls]);

  // Active Promotions Logic
  const activePromoIdx = useMemo(() => {
    return promotions.filter(p => p.isActive);
  }, [promotions]);

  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  useEffect(() => {
    if (activePromoIdx.length > 1) {
      const interval = setInterval(() => {
        setCurrentPromoIndex(prev => (prev + 1) % activePromoIdx.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [activePromoIdx]);

  // KHQR Generator
  const khqrString = useMemo(() => {
    if (!store?.khqrEnabled || !store?.khqrMerchantID || !order || (order.qrPaymentState !== QRPaymentState.AWAITING_PAYMENT)) return null;

    try {
      const optionalData = {
        currency: khqrData.currency.usd,
        amount: order.finalAmount,
        billNumber: order.dailyOrderNumber ? `#${order.dailyOrderNumber}` : undefined,
        startNumber: 154626, // arbitrary fixed start
        mobileNumber: store.contactInfo || "85512345678",
        storeLabel: store.khqrMerchantName || store.name,
        terminalLabel: "POS-01",
      };

      const individualInfo = new IndividualInfo(
        store.khqrMerchantID,
        khqrData.currency.usd,
        store.khqrMerchantName || store.name,
        store.khqrCity || "Phnom Penh",
        optionalData
      );

      const khqr = new BakongKHQR();
      const response = khqr.generateIndividual(individualInfo);
      if (response.status.code === 0) {
        return response.data.qr;
      }
    } catch (e) {
      console.error("KHQR Generation failed", e);
    }
    return null;
  }, [store?.khqrEnabled, store?.khqrMerchantID, order?.finalAmount, order?.qrPaymentState]); // Dependency array


  // Payment Successful View (Fullscreen always)
  if (order && order.qrPaymentState === QRPaymentState.PAYMENT_SUCCESSFUL) {
    return (
      <div
        className="min-h-screen p-8 flex flex-col items-center justify-center font-sans relative transition-colors duration-300 cursor-pointer"
        style={{ ...backgroundStyle, fontFamily: `'${fontFamily}', sans-serif` }}
        onClick={handleDismissSuccess}
      >
        <div className="absolute inset-0" style={overlayStyle}></div>
        <div className="relative z-10 flex flex-col flex-grow items-center justify-center text-center">
          <div className="w-40 h-40 bg-emerald rounded-full flex items-center justify-center mb-8 shadow-2xl animate-pulse text-white">
            <FaCheck size={80} />
          </div>
          <h1 className="text-6xl font-extrabold" style={{ color: headerColor }}>Payment Successful!</h1>
          <p className="text-3xl mt-4" style={{ color: bodyTextColor }}>Thank you for your purchase.</p>

          {/* New Celebration Animation (Confetti placeholder via CSS) */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full animate-confetti"
                style={{
                  backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          {order.pendingStampClaimId && (
            <div className="mt-12 p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-500 overflow-hidden relative">
              {!claimed ? (
                <>
                  <div className="flex items-center mb-6">
                    <FaQrcode size={32} color={headerColor} />
                    <h2 className="text-3xl font-bold ml-3" style={{ color: headerColor }}>
                      Claim Your {order.pendingStampCount || 0} Stamps!
                    </h2>
                  </div>

                  <div className="p-6 bg-white rounded-3xl shadow-inner mb-6">
                    <QRCodeCanvas
                      value={`https://poscafesystem.vercel.app/#/claim/${order.pendingStampClaimId}`}
                      size={240}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <p className="text-xl max-w-md opacity-90" style={{ color: bodyTextColor }}>
                    Scan this code with your mobile app to collect your digital stamps.
                  </p>
                </>
              ) : <div className="py-10 flex flex-col items-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald text-white rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <FaCheckCircle size={56} />
                </div>
                <h2 className="text-4xl font-bold mb-2" style={{ color: headerColor }}>Stamps Claimed!</h2>
                <p className="text-2xl mb-8" style={{ color: bodyTextColor }}>Successfully added to your account.</p>

                {store?.loyaltyEnabled && (
                  <div className="w-full max-w-lg p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xl font-bold" style={{ color: headerColor }}>Reward Progress</span>
                      <span className="text-2xl font-black" style={{ color: headerColor }}>
                        {store.loyaltyRewardDescription}
                      </span>
                    </div>

                    <div className="h-6 w-full bg-black/20 rounded-full overflow-hidden p-1">
                      <div
                        className="h-full bg-emerald rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                        style={{ width: `${Math.min(100, (1 / (store.stampsToRedeem || 10)) * 100)}%` }} // We don't have the user's total balance here easily without a separate query, but we can show it as "Progress Updated"
                      ></div>
                    </div>
                    <p className="text-center mt-4 text-lg font-bold" style={{ color: bodyTextColor }}>
                      Check your mobile for your updated balance!
                    </p>
                  </div>
                )}
              </div>
              }
            </div>
          )}

          <div className="mt-8 opacity-60 text-sm animate-pulse" style={{ color: bodyTextColor }}>
            Tap anywhere to close
          </div>
        </div>
      </div>
    );
  }

  // --- SPLIT SCREEN LAYOUT ---
  if (displayLayout === 'split-screen') {
    return (
      <div className="min-h-screen flex font-sans bg-black">
        {/* LEFT SIDE: SLIDESHOW */}
        <div className="w-1/2 relative overflow-hidden bg-charcoal-dark">
          {slideshowImageUrls.length > 0 ? (
            <>
              {slideshowImageUrls.map((url, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlideIndex ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    animation: index === currentSlideIndex ? 'kenBurns 5s ease-out' : 'none'
                  }}
                />
              ))}
              {/* Slide Progress Indicators */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slideshowImageUrls.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${index === currentSlideIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                      }`}
                  />
                ))}
              </div>
              {/* Logo Overlay */}
              {logoUrl && (
                <div className="absolute top-8 left-8 z-20 bg-black/30 backdrop-blur-sm rounded-xl p-4">
                  <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                </div>
              )}

              {/* Promo Banner Overlay */}
              {activePromoIdx.length > 0 && (
                <div className="absolute bottom-16 right-8 left-8 z-20 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="bg-emerald/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between">
                    <div>
                      <h3 className="text-white text-3xl font-black uppercase tracking-wider">{activePromoIdx[currentPromoIndex].name}</h3>
                      <p className="text-white/90 text-xl font-medium">{activePromoIdx[currentPromoIndex].description}</p>
                    </div>
                    <div className="bg-white/20 px-6 py-2 rounded-full border border-white/30">
                      <span className="text-white text-2xl font-black">SAVE NOW</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Fallback if split screen on but no images
            <div className="flex items-center justify-center h-full text-cream-light/50">
              <div className="text-center">
                <div className="mx-auto mb-4 opacity-50 flex justify-center">
                  <FaCoffee size={64} />
                </div>
                <p>No slideshow images uploaded.</p>
              </div>
            </div>
          )}
        </div>
        {/* RIGHT SIDE: ORDER DISPLAY */}
        <div className="w-1/2 p-8 flex flex-col" style={{ fontFamily: `'${fontFamily}', sans-serif`, backgroundColor: displayTheme === 'dark' ? '#1e293b' : '#f5f5f5' }}>
          {/* Order Number Badge */}
          {order && order.dailyOrderNumber && (
            <div className="mb-6 flex justify-center">
              <div className="relative inline-block">
                <div
                  className="text-6xl font-black px-8 py-4 rounded-2xl shadow-2xl animate-pulse-slow"
                  style={{
                    backgroundColor: accentColor,
                    color: 'white',
                    boxShadow: `0 10px 40px ${accentColor}40`
                  }}
                >
                  #{order.dailyOrderNumber}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald animate-ping" />
              </div>
            </div>
          )}

          <header className="text-center mb-4" style={{ color: headerColor }}>
            <h1 className="text-3xl font-extrabold">{store?.name || 'Cafe'}</h1>
            {customer ? (
              <div className="mt-2 flex items-center justify-center gap-2 animate-in slide-in-from-top-4 duration-500">
                <div className="px-3 py-1 bg-emerald/20 rounded-full border border-emerald/30 flex items-center">
                  <span className="text-emerald font-bold text-sm">Welcome back, {customer.name || customer.phoneNumber}!</span>
                </div>
              </div>
            ) : (
              <p className="text-lg opacity-70 mt-2">
                {new Date().getHours() < 12 ? 'Good Morning!' : new Date().getHours() < 18 ? 'Good Afternoon!' : 'Good Evening!'}
              </p>
            )}
          </header>

          <main className={`flex-grow rounded-xl p-6 flex flex-col justify-between ${displayTheme === 'dark' ? 'bg-charcoal-dark/80 text-cream-light' : 'bg-cream-light/80 text-charcoal-dark'}`}>
            {!order || !order.items || order.items.length === 0 ? (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-2xl text-center opacity-70">{welcomeMessage}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 flex-grow overflow-y-auto">
                  {order.items && order.items.map((item, index) => (
                    <div
                      key={item.productId + JSON.stringify(item.customizations) + index}
                      className="flex justify-between items-center p-4 rounded-lg bg-white/50 dark:bg-black/20 animate-slide-in"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animationFillMode: 'backwards'
                      }}
                    >
                      <div className="flex-grow">
                        <p className="font-bold text-2xl">
                          <span style={{ color: accentColor }}>{item.quantity}x</span> {item.productName}
                          {item.isCombo && <span className="ml-2 text-sm bg-emerald text-white px-2 py-0.5 rounded uppercase align-middle">Combo</span>}
                        </p>
                        {formatItemDetails(item) && (
                          <p className="text-sm opacity-70">{formatItemDetails(item)}</p>
                        )}
                      </div>
                      <p className="font-bold text-2xl ml-4">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex-shrink-0 pt-6 mt-6 border-t-2 border-dashed" style={{ borderColor: 'rgba(128,128,128,0.3)' }}>
                  <div className="space-y-4">
                    {/* Totals Section */}
                    <div className="text-2xl space-y-1" style={{ color: bodyTextColor }}>
                      <p className="flex justify-between"><span>Subtotal:</span> <span>${order.totalAmount.toFixed(2)}</span></p>
                      {appliedPromotion && order.discountAmount && order.discountAmount > 0 && (
                        <p className="flex justify-between" style={{ color: accentColor }}>
                          <span>Discount:</span><span>-${order.discountAmount.toFixed(2)}</span>
                        </p>
                      )}
                      <p className="flex justify-between"><span>Tax ({store?.taxRate ? Math.round(store.taxRate * 100) : 0}%):</span> <span>${order.taxAmount.toFixed(2)}</span></p>
                    </div>
                    <div className="flex justify-between font-extrabold text-5xl pt-4 border-t-2" style={{ color: accentColor, borderColor: 'rgba(128,128,128,0.5)' }}>
                      <div className="flex flex-col">
                        <span>Total:</span>
                        <span className="text-xl font-bold opacity-60 mt-[-4px]">សរុប (KHR):</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span>${order.finalAmount.toFixed(2)}</span>
                        <span className="text-2xl font-bold opacity-70">{khrAmount.toLocaleString()}៛</span>
                      </div>
                    </div>

                    {/* QR Code / Status */}
                    {order.qrPaymentState === QRPaymentState.AWAITING_PAYMENT && (
                      <div className="flex flex-col items-center justify-center gap-2 mt-2 bg-white/10 p-4 rounded-lg">
                        {khqrString ? (
                          <div className="bg-white p-2 rounded-lg shadow-lg">
                            <QRCodeCanvas value={khqrString} size={256} />
                          </div>
                        ) : store?.qrCodeUrl && (
                          <img src={store.qrCodeUrl} alt="Payment QR" className="w-64 h-64 object-contain bg-white rounded-md shadow-lg" />
                        )}
                        <div className="text-center">
                          <p className="font-bold text-2xl" style={{ color: headerColor }}>Scan to Pay</p>
                          <p className="text-lg" style={{ color: bodyTextColor }}>
                            {khqrString ? `Amount: $${order.finalAmount.toFixed(2)}` : 'Open your banking app'}
                          </p>
                        </div>
                      </div>
                    )}
                    {order.qrPaymentState === QRPaymentState.AWAITING_CUSTOMER_CONFIRMATION && (
                      <div className="text-center p-2 border-2 border-dashed rounded-lg" style={{ borderColor: accentColor }}>
                        <p className="font-bold text-xl" style={{ color: headerColor }}>Confirm Order</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  // --- STANDARD FULL SCREEN LAYOUT ---
  return (
    <div
      className="min-h-screen text-charcoal dark:text-cream-light p-8 flex flex-col font-sans relative transition-colors duration-300"
      style={{ ...backgroundStyle, fontFamily: `'${fontFamily}', sans-serif` }}
    >
      <div className="absolute inset-0" style={overlayStyle}></div>

      <div className="relative z-10 flex flex-col flex-grow">
        <header className="text-center mb-8" style={{ color: headerColor }}>
          {logoUrl ? (
            <img src={logoUrl} alt={`${store?.name || 'Logo'}`} className="mx-auto w-auto max-w-sm object-contain mb-4" style={{ height: `${logoSize}px` }} />
          ) : (
            <div className="mx-auto mb-4 flex justify-center" style={{ color: accentColor }}>
              <FaCoffee size={96} />
            </div>
          )}
          <h1 className="text-5xl font-extrabold tracking-tight">
            {store?.name || 'Amble Specialty Cafe'}
          </h1>
          {customer && (
            <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-700">
              <div className="flex items-center gap-3 px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <FaStar className="text-yellow-400" />
                <span className="text-2xl font-bold" style={{ color: headerColor }}>Welcome back, {customer.name || 'Friend'}!</span>
                <div className="h-6 w-px bg-white/30" />
                <div className="flex items-center gap-2 text-emerald">
                  <FaGift />
                  <span className="text-xl font-black">{customer.currentStamps || 0} Stamps</span>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className={`flex-grow shadow-2xl rounded-2xl p-8 flex flex-col justify-between ${contentBoxClasses}`}>
          {!order || !order.items || order.items.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-12">
              <p className="text-4xl text-center" style={{ color: bodyTextColor, opacity: 0.7 }}>{welcomeMessage}</p>
              
              {activePromoIdx.length > 0 && (
                <div className="w-full max-w-2xl p-8 bg-emerald text-white rounded-3xl shadow-2xl animate-pulse-slow">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-2xl">
                      <FaGift size={48} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black uppercase tracking-tight">{activePromoIdx[currentPromoIndex].name}</h2>
                      <p className="text-2xl opacity-90 font-medium mt-1">{activePromoIdx[currentPromoIndex].description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-grow overflow-y-auto pr-4 -mr-4 text-2xl" style={{ color: bodyTextColor }}>
                <table className="w-full">
                  <tbody>
                    {order.items && order.items.map((item, index) => (
                      <tr key={item.productId + JSON.stringify(item.customizations) + index} className="border-b" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                        <td className="py-4">
                          <p className="font-bold text-3xl">
                            <span style={{ color: accentColor }}>{item.quantity}x</span> {item.productName}
                            {item.isCombo && <span className="ml-3 text-lg bg-emerald text-white px-3 py-1 rounded uppercase align-middle">Combo</span>}
                          </p>
                          <p className="text-xl opacity-70">{formatItemDetails(item)}</p>
                        </td>
                        <td className="py-4 text-right font-semibold text-3xl">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex-shrink-0 pt-8 mt-8 border-t-2 border-dashed" style={{ borderColor: 'rgba(128,128,128,0.3)' }}>
                <div className="flex justify-between items-start gap-8">
                  {/* Totals on the left */}
                  <div className="flex-grow">
                    <div className="text-3xl space-y-2" style={{ color: bodyTextColor }}>
                      <p className="flex justify-between"><span>Subtotal:</span> <span>${order.totalAmount.toFixed(2)}</span></p>
                      {appliedPromotion && order.discountAmount && order.discountAmount > 0 && (
                        <p className="flex justify-between" style={{ color: accentColor }}>
                          <span>Discount ({appliedPromotion.name}):</span>
                          <span>-${order.discountAmount.toFixed(2)}</span>
                        </p>
                      )}
                      <p className="flex justify-between"><span>Tax ({store?.taxRate ? Math.round(store.taxRate * 100) : 0}%):</span> <span>${order.taxAmount.toFixed(2)}</span></p>
                    </div>
                    <div className="flex justify-between font-extrabold text-6xl mt-6 pt-6 border-t-2" style={{ color: accentColor, borderColor: 'rgba(128,128,128,0.5)' }}>
                      <div className="flex flex-col">
                        <span>Total:</span>
                        <span className="text-2xl font-bold opacity-60 mt-[-4px]">សរុប (KHR):</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span>${order.finalAmount.toFixed(2)}</span>
                        <span className="text-4xl font-bold opacity-70 tracking-tight">{khrAmount.toLocaleString()}៛</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code or Confirmation on the right */}
                  <div className="text-center flex-shrink-0 w-80 flex flex-col items-center justify-center">
                    {order.qrPaymentState === QRPaymentState.AWAITING_CUSTOMER_CONFIRMATION ? (
                      <div className="p-4 border-2 border-dashed rounded-lg" style={{ borderColor: accentColor }}>
                        <p className="font-bold text-2xl" style={{ color: headerColor }}>Review Your Order</p>
                        <p className="text-lg mt-2" style={{ color: bodyTextColor }}>Please confirm the items and total with the cashier.</p>
                      </div>
                    ) : order.qrPaymentState === QRPaymentState.AWAITING_PAYMENT && (khqrString || store?.qrCodeUrl) ? (
                      <>
                        <p className="font-bold text-3xl mb-4" style={{ color: headerColor }}>Scan to Pay</p>
                        <div className="animate-pulse bg-white p-3 rounded-xl shadow-2xl">
                          {khqrString ? (
                            <QRCodeCanvas value={khqrString} size={384} />
                          ) : (
                            <img src={store.qrCodeUrl} alt="Payment QR Code" className="w-96 h-96 object-contain" />
                          )}
                        </div>
                        {khqrString && (
                          <p className="text-xl mt-4 font-bold" style={{ color: accentColor }}>${order.finalAmount.toFixed(2)}</p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

    </div>
  );
};

export default CustomerDisplay;