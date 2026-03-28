import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderItem, Store, QRPaymentState, Customer } from '../../types';
import { useShop } from '../../contexts/ShopContext';
import { BakongKHQR, khqrData, IndividualInfo } from 'bakong-khqr';
import { QRCodeCanvas } from 'qrcode.react';
import { getStampClaimStatus } from '../../services/api';
import { FaCoffee, FaCheck, FaQrcode, FaCheckCircle, FaStar, FaGift } from 'react-icons/fa';
import { USD_TO_KHR_RATE, SECONDARY_CURRENCY } from '../../constants';

const DecorativeBlobs: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const blobColors = theme === 'dark' 
    ? ['bg-emerald-500/20', 'bg-indigo-500/20', 'bg-emerald-600/10'] 
    : ['bg-emerald-400/30', 'bg-amber-400/20', 'bg-emerald-500/10'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[100px] animate-blob ${blobColors[0]}`} />
      <div className={`absolute top-1/2 -right-40 w-80 h-80 rounded-full blur-[100px] animate-blob animation-delay-2000 ${blobColors[1]}`} />
      <div className={`absolute -bottom-40 left-1/2 w-96 h-96 rounded-full blur-[100px] animate-blob animation-delay-4000 ${blobColors[2]}`} />
    </div>
  );
};

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
    if (storeId) {
      const storeData = getStoreById(storeId);
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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (order && order.qrPaymentState === QRPaymentState.PAYMENT_SUCCESSFUL && order.pendingStampClaimId && !claimed) {
      interval = setInterval(async () => {
        try {
          const res = await getStampClaimStatus(order.pendingStampClaimId!);
          if (res.data.success && res.data.claimed) {
            setClaimed(true);
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

  useEffect(() => {
    setClaimed(false);
  }, [order?.id]);

  useEffect(() => {
    if (order && order.qrPaymentState === QRPaymentState.PAYMENT_SUCCESSFUL) {
      const timeoutMs = order.pendingStampClaimId ? 60000 : 5000;
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
    displayLayout = 'standard',
    slideshowImageUrls = []
  } = store || {};

  const backgroundStyle = backgroundImageUrl
    ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const overlayStyle = {
    backgroundColor: backgroundColor || (displayTheme === 'dark' ? '#0f172a' : '#f8fafc'),
  };

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  useEffect(() => {
    if (displayLayout === 'split-screen' && slideshowImageUrls.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % slideshowImageUrls.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [displayLayout, slideshowImageUrls]);

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

  const khqrString = useMemo(() => {
    if (!store?.khqrEnabled || !store?.khqrMerchantID || !order || (order.qrPaymentState !== QRPaymentState.AWAITING_PAYMENT)) return null;
    try {
      const optionalData = {
        currency: khqrData.currency.usd,
        amount: order.finalAmount,
        billNumber: order.dailyOrderNumber ? `#${order.dailyOrderNumber}` : undefined,
        startNumber: 154626,
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
  }, [store, order]);

  // --- 1. PAYMENT SUCCESSFUL VIEW ---
  if (order && order.qrPaymentState === QRPaymentState.PAYMENT_SUCCESSFUL) {
    return (
      <div
        className="min-h-screen p-8 flex flex-col items-center justify-center font-sans relative transition-colors duration-500 overflow-hidden cursor-pointer"
        style={{ ...overlayStyle, fontFamily: `'${fontFamily}', sans-serif` }}
        onClick={handleDismissSuccess}
      >
        <DecorativeBlobs theme={displayTheme} />
        <div className="relative z-10 flex flex-col flex-grow items-center justify-center text-center animate-slide-in-top">
          <div className="w-48 h-48 bg-emerald rounded-full flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(16,185,129,0.5)] animate-glow text-white">
            <FaCheck size={96} className="animate-bounce" />
          </div>
          <h1 className="text-6xl font-extrabold" style={{ color: headerColor }}>Payment Successful!</h1>
          <p className="text-3xl mt-4" style={{ color: bodyTextColor }}>Thank you for your purchase.</p>
          
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
                    <h2 className="text-3xl font-bold ml-3" style={{ color: headerColor }}>Claim Your {order.pendingStampCount || 0} Stamps!</h2>
                  </div>
                  <div className="p-6 bg-white rounded-3xl shadow-inner mb-6">
                    <QRCodeCanvas value={`https://tompr-stamp.vercel.app/#/claim/${order.pendingStampClaimId}`} size={240} level="H" includeMargin={true} />
                  </div>
                  <p className="text-xl max-w-md opacity-90" style={{ color: bodyTextColor }}>Scan this code with your mobile app to collect your digital stamps.</p>
                </>
              ) : (
                <div className="py-10 flex flex-col items-center animate-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-emerald text-white rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <FaCheckCircle size={56} />
                  </div>
                  <h2 className="text-4xl font-bold mb-2" style={{ color: headerColor }}>Stamps Claimed!</h2>
                  <p className="text-2xl mb-8" style={{ color: bodyTextColor }}>Successfully added to your account.</p>
                </div>
              )}
            </div>
          )}
          <div className="mt-8 opacity-60 text-sm animate-pulse" style={{ color: bodyTextColor }}>Tap anywhere to close</div>
        </div>
      </div>
    );
  }

  // --- 2. SPLIT SCREEN LAYOUT ---
  if (displayLayout === 'split-screen') {
    return (
      <div className="min-h-screen flex font-sans bg-black">
        <div className="w-1/2 relative overflow-hidden bg-charcoal-dark shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20">
          {slideshowImageUrls.length > 0 ? (
            <>
              {slideshowImageUrls.map((url, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${index === currentSlideIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
                  style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    animation: index === currentSlideIndex ? 'kenBurns 8s ease-out forwards' : 'none'
                  }}
                />
              ))}
              {logoUrl && (
                <div className="absolute top-10 left-10 z-30 p-6 glass-morphism rounded-3xl animate-tilt">
                  <img src={logoUrl} alt="Logo" className="h-20 w-auto object-contain drop-shadow-2xl" />
                </div>
              )}
              {activePromoIdx.length > 0 && (
                <div className="absolute bottom-16 right-10 left-10 z-30 animate-slide-in-top">
                  <div className="bg-emerald/90 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/30 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/20 rounded-2xl animate-pulse"><FaGift size={40} className="text-white" /></div>
                      <div>
                        <h3 className="text-white text-4xl font-black uppercase tracking-tighter">{activePromoIdx[currentPromoIndex].name}</h3>
                        <p className="text-white/80 text-xl font-medium italic">{activePromoIdx[currentPromoIndex].description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-cream-light/50">
              <div className="text-center">
                <div className="mx-auto mb-4 opacity-50 flex justify-center"><FaCoffee size={64} /></div>
                <p>No slideshow images uploaded.</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-1/2 p-8 flex flex-col relative overflow-hidden" style={{ ...overlayStyle, fontFamily: `'${fontFamily}', sans-serif` }}>
          <DecorativeBlobs theme={displayTheme} />
          <div className="relative z-10 flex flex-col h-full">
            {order && order.dailyOrderNumber && (
              <div className="mb-6 flex justify-center">
                <div className="relative inline-block">
                  <div className="text-6xl font-black px-8 py-4 rounded-2xl shadow-2xl animate-pulse-slow tabular-nums bg-emerald text-white">#{order.dailyOrderNumber}</div>
                </div>
              </div>
            )}
            <header className="text-center mb-8 animate-slide-in-top" style={{ color: headerColor }}>
              <h1 className="text-4xl font-black tracking-tight drop-shadow-sm">{store?.name || 'Cafe'}</h1>
              {customer && (
                <div className="mt-4 inline-flex items-center gap-3 px-6 py-2 glass-morphism rounded-full border-emerald/50 animate-tilt">
                  <FaStar className="text-amber-400 animate-pulse" /><span className="text-emerald font-black text-xl tracking-wide uppercase">Member: {customer.name}</span>
                </div>
              )}
            </header>

            <div className={`flex-grow rounded-3xl p-8 flex flex-col justify-between glass-morphism ${displayTheme === 'dark' ? 'text-cream-light border-white/10' : 'text-charcoal-dark border-black/5'}`}>
              {!order || !order.items || order.items.length === 0 ? (
                <div className="flex-grow flex items-center justify-center"><p className="text-2xl text-center opacity-70">{welcomeMessage}</p></div>
              ) : (
                <>
                  <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-5 rounded-2xl bg-white/5 dark:bg-black/20 border border-white/10 animate-slide-in-right" style={{ animationDelay: `${index * 150}ms` }}>
                        <div className="flex-grow">
                          <p className="font-black text-2xl tracking-tight"><span className="text-emerald tabular-nums">{item.quantity}x</span> {item.productName}</p>
                          {formatItemDetails(item) && <p className="text-lg opacity-50 font-medium italic">{formatItemDetails(item)}</p>}
                        </div>
                        <p className="font-black text-3xl ml-6 text-glow">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex-shrink-0 pt-8 mt-8 border-t-2 border-white/20">
                    <div className="space-y-6">
                      <div className="text-2xl space-y-2 font-bold opacity-80" style={{ color: bodyTextColor }}>
                        <p className="flex justify-between items-center"><span>Subtotal</span> <span>${order.totalAmount.toFixed(2)}</span></p>
                        {appliedPromotion && <p className="flex justify-between items-center text-emerald"><span>Promo Discount</span><span>-${order.discountAmount.toFixed(2)}</span></p>}
                      </div>
                      <div className="p-6 bg-emerald rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] animate-glow text-white">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col"><span className="text-xl font-bold opacity-80 uppercase tracking-widest">Total</span><span className="text-2xl font-black">KHR</span></div>
                          <div className="flex flex-col items-end"><span className="text-6xl font-black tracking-tighter">${order.finalAmount.toFixed(2)}</span><span className="text-3xl font-bold opacity-90">{khrAmount.toLocaleString()}៛</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. STANDARD FULL SCREEN LAYOUT ---
  return (
    <div
      className="min-h-screen p-8 flex flex-col font-sans relative transition-colors duration-500 overflow-hidden"
      style={{ ...overlayStyle, fontFamily: `'${fontFamily}', sans-serif` }}
    >
      <DecorativeBlobs theme={displayTheme} />
      <div className="relative z-10 flex flex-col flex-grow">
        <header className="text-center mb-10 animate-slide-in-top" style={{ color: headerColor }}>
          {logoUrl ? (
            <div className="inline-block p-4 glass-morphism rounded-[2rem] mb-6 shadow-2xl animate-tilt">
              <img src={logoUrl} alt="Logo" className="w-auto max-w-sm object-contain" style={{ height: `${logoSize * 1.2}px` }} />
            </div>
          ) : (
            <div className="mx-auto mb-6 flex justify-center text-emerald animate-pulse"><FaCoffee size={120} /></div>
          )}
          <h1 className="text-6xl font-black tracking-tighter drop-shadow-2xl">{store?.name || 'Amble Specialty Cafe'}</h1>
          {customer && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-4 px-8 py-3 glass-morphism rounded-full border-emerald/50 animate-glow shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <FaStar className="text-amber-400 text-3xl animate-pulse" /><span className="text-3xl font-black text-emerald uppercase tracking-widest">Member: {customer.name}</span>
                <div className="h-8 w-px bg-white/30 mx-2" /><div className="flex items-center gap-3 text-emerald"><FaGift className="text-2xl" /><span className="text-2xl font-black">{customer.currentStamps || 0} Stamps</span></div>
              </div>
            </div>
          )}
        </header>

        <main className={`flex-grow rounded-[3rem] p-10 flex flex-col justify-between glass-morphism shadow-[0_40px_100px_rgba(0,0,0,0.3)] ${displayTheme === 'dark' ? 'border-white/10' : 'border-black/5'}`}>
          {!order || !order.items || order.items.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-16">
              <p className="text-5xl text-center font-bold opacity-40 max-w-4xl leading-tight" style={{ color: bodyTextColor }}>{welcomeMessage}</p>
              {activePromoIdx.length > 0 && (
                <div className="w-full max-w-3xl p-10 bg-emerald text-white rounded-[3rem] shadow-[0_30px_60px_rgba(16,185,129,0.4)] animate-glow">
                  <div className="flex items-center gap-10">
                    <div className="p-6 bg-white/20 rounded-3xl animate-bounce"><FaGift size={64} /></div>
                    <div><h2 className="text-5xl font-black uppercase tracking-tighter">{activePromoIdx[currentPromoIndex].name}</h2><p className="text-3xl opacity-90 font-medium mt-2 italic">{activePromoIdx[currentPromoIndex].description}</p></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-grow overflow-y-auto pr-6 -mr-6 custom-scrollbar">
                <table className="w-full border-separate border-spacing-y-4">
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index} className="bg-white/5 dark:bg-black/20 rounded-3xl overflow-hidden animate-slide-in-right group" style={{ animationDelay: `${index * 150}ms` }}>
                        <td className="py-6 px-8 rounded-l-3xl border-l border-t border-b border-white/10 group-hover:border-emerald/50 transition-colors">
                          <p className="font-black text-4xl"><span className="text-emerald tabular-nums">{item.quantity}x</span> {item.productName}</p>
                          <p className="text-2xl opacity-50 mt-2 font-medium italic">{formatItemDetails(item)}</p>
                        </td>
                        <td className="py-6 px-8 text-right font-black text-4xl rounded-r-3xl border-r border-t border-b border-white/10 text-glow">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex-shrink-0 pt-10 mt-10 border-t-2 border-white/20">
                <div className="flex justify-between items-end gap-12">
                  <div className="flex-grow max-w-2xl">
                    <div className="text-3xl space-y-3 font-bold opacity-70 mb-8" style={{ color: bodyTextColor }}>
                      <p className="flex justify-between"><span>Subtotal</span> <span>${order.totalAmount.toFixed(2)}</span></p>
                      {appliedPromotion && <p className="flex justify-between text-emerald"><span>Offer Discount</span><span>-${order.discountAmount.toFixed(2)}</span></p>}
                    </div>
                    <div className="p-8 bg-emerald rounded-[2.5rem] shadow-[0_30px_70px_rgba(16,185,129,0.4)] animate-glow text-white">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col"><span className="text-2xl font-black uppercase tracking-widest opacity-80 text-white/70">Total Amount</span><span className="text-3xl font-black">សរុប (KHR)</span></div>
                        <div className="flex flex-col items-end"><span className="text-8xl font-black tracking-tighter drop-shadow-lg tabular-nums">${order.finalAmount.toFixed(2)}</span><span className="text-4xl font-black opacity-90 tracking-tight tabular-nums">{khrAmount.toLocaleString()}៛</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center flex-shrink-0 w-96 flex flex-col items-center justify-center animate-slide-in-right" style={{ animationDelay: '500ms' }}>
                    {order.qrPaymentState === QRPaymentState.AWAITING_CUSTOMER_CONFIRMATION ? (
                      <div className="p-8 glass-morphism rounded-[2.5rem] border-emerald/50 animate-pulse-slow">
                        <FaCheckCircle size={80} className="text-emerald mx-auto mb-6" />
                        <p className="font-black text-4xl" style={{ color: headerColor }}>Review Order</p>
                        <p className="text-2xl mt-4 font-medium opacity-70" style={{ color: bodyTextColor }}>Confirm with the cashier.</p>
                      </div>
                    ) : (order.qrPaymentState === QRPaymentState.AWAITING_PAYMENT && (khqrString || store?.qrCodeUrl)) ? (
                      <div className="p-6 glass-morphism rounded-[3rem] border-white/20 shadow-2xl">
                        <p className="font-black text-3xl mb-6 uppercase tracking-widest" style={{ color: headerColor }}>Scan to Pay</p>
                        <div className="bg-white p-4 rounded-[2rem] shadow-inner mb-6">
                          {khqrString ? (
                            <QRCodeCanvas value={khqrString} size={320} />
                          ) : (
                            <img src={store.qrCodeUrl} alt="QR" className="w-[320px] h-[320px] object-contain" />
                          )}
                        </div>
                        {khqrString && <div className="text-3xl font-black text-emerald tabular-nums">${order.finalAmount.toFixed(2)}</div>}
                      </div>
                    ) : (
                      <div className="opacity-10"><FaCoffee size={160} /></div>
                    )}
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