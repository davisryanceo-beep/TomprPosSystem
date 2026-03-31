import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Button from '../Shared/Button';
import Textarea from '../Shared/Textarea';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FaMoneyBillWave, FaCalculator, FaHistory, 
  FaExclamationTriangle, FaCheckCircle, FaSun, FaMoon, FaArrowLeft, FaLevelDownAlt, FaHandHoldingUsd, FaLock
} from 'react-icons/fa';
import { EXCHANGE_RATE, MAX_VARIANCE_WARNING } from '../../constants';
import { Role, CashDrawerLog } from '../../types';
import { printShiftReceipt } from '../../services/pdfService';

interface DeclareCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierId: string;
  cashierName: string;
  forcedType?: 'OPEN' | 'CLOSE' | 'DROP' | 'PAYOUT' | null;
}

const KHR_DENOMINATIONS = [
  { label: 'Bills', items: [
    { label: '100,000៛', value: 100000 },
    { label: '50,000៛', value: 50000 },
    { label: '10,000៛', value: 10000 },
    { label: '5,000៛', value: 5000 },
    { label: '1,000៛', value: 1000 },
    { label: '500៛', value: 500 },
    { label: '100៛', value: 100 },
  ]}
];

const USD_DENOMINATIONS = [
  { label: 'Bills', items: [
    { label: '$100', value: 100 },
    { label: '$50', value: 50 },
    { label: '$20', value: 20 },
    { label: '$10', value: 10 },
    { label: '$5', value: 5 },
    { label: '$1', value: 1 },
  ]}
];

const DeclareCashModal: React.FC<DeclareCashModalProps> = ({ isOpen, onClose, cashierId, cashierName, forcedType }) => {
  const { addCashDrawerLog, getExpectedCash, verifyManagerPin, openCashDrawer } = useShop();
  const { currentUser } = useAuth();
  
  const [declarationType, setDeclarationType] = useState<'OPEN' | 'CLOSE' | 'DROP' | 'PAYOUT' | null>(null);
  const [drawerPulse, setDrawerPulse] = useState(false);
  
  const [currencyTab, setCurrencyTab] = useState<'KHR' | 'USD'>('KHR');
  const [countsKHR, setCountsKHR] = useState<Record<string, string>>({});
  const [countsUSD, setCountsUSD] = useState<Record<string, string>>({});
  
  const [cashierNotes, setCashierNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Manager PIN State
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [managerPinError, setManagerPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeclarationType(forcedType || null);
    }
  }, [isOpen, forcedType]);

  // Trigger drawer open when type is selected
  useEffect(() => {
    if (declarationType) {
      openCashDrawer();
      setDrawerPulse(true);
      const timer = setTimeout(() => setDrawerPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [declarationType, openCashDrawer]);

  const expectedAmount = useMemo(() => {
    if (!declarationType) return 0;
    return getExpectedCash(cashierId, declarationType);
  }, [cashierId, isOpen, getExpectedCash, declarationType]);

  const totalDeclaredKHR = useMemo(() => {
    return Object.entries(countsKHR).reduce((sum, [valStr, countStr]) => {
      return sum + (parseFloat(valStr) * (parseInt(countStr) || 0));
    }, 0);
  }, [countsKHR]);

  const totalDeclaredUSDAsUSD = useMemo(() => {
    return Object.entries(countsUSD).reduce((sum, [valStr, countStr]) => {
      return sum + (parseFloat(valStr) * (parseInt(countStr) || 0));
    }, 0);
  }, [countsUSD]);

  const totalDeclaredUSDInKHR = totalDeclaredUSDAsUSD * EXCHANGE_RATE;
  const totalDeclaredCombined = totalDeclaredKHR + totalDeclaredUSDInKHR;

  const discrepancy = totalDeclaredCombined - expectedAmount;

  const handleCountChange = (val: number, count: string, currency: 'KHR' | 'USD') => {
    if (currency === 'KHR') {
      setCountsKHR(prev => ({ ...prev, [val.toString()]: count }));
    } else {
      setCountsUSD(prev => ({ ...prev, [val.toString()]: count }));
    }
  };

  const handleInitialSubmit = () => {
    if (!declarationType) return;
    if (totalDeclaredCombined < 0) {
      setError('Declared amount cannot be negative.');
      return;
    }
    setError(null);

    // Blind closeout verification
    if (declarationType === 'CLOSE') {
      if (Math.abs(discrepancy) > MAX_VARIANCE_WARNING) {
        setShowManagerPin(true);
        return;
      }
    }

    finalizeSubmission();
  };

  const finalizeSubmission = async () => {
    if (!declarationType) return;
    
    let adminNotesToSave = '';
    if (showManagerPin) {
      adminNotesToSave = `Manager Approved Variance. Expected: ${expectedAmount}៛, Declared: ${totalDeclaredCombined}៛, Discrepancy: ${discrepancy}៛`;
    }

    const logToSave: Omit<CashDrawerLog, 'id' | 'expectedAmount' | 'discrepancy' | 'logTimestamp' | 'storeId'> = {
      cashierId,
      cashierName,
      shiftDate: new Date().toLocaleDateString('en-CA'),
      declaredAmount: totalDeclaredCombined,
      declaredAmountUSD: totalDeclaredUSDAsUSD > 0 ? totalDeclaredUSDAsUSD : undefined,
      type: declarationType,
      cashierNotes: cashierNotes.trim() || undefined,
      adminNotes: adminNotesToSave || undefined,
    };

    const savedLog = await addCashDrawerLog(logToSave);
    
    // Automation: Print receipt after submission
    if (savedLog) {
      printShiftReceipt(savedLog);
    }

    handleModalClose();
  };

  const handleManagerPinSubmit = async () => {
    if (!managerPin) return;
    setIsVerifyingPin(true);
    setManagerPinError(null);

    // Verify if pin belongs to a manager
    const manager = await verifyManagerPin(managerPin);
    
    if (manager && (manager.role === Role.ADMIN || manager.role === Role.STORE_ADMIN)) {
      finalizeSubmission();
    } else {
      setManagerPinError('Invalid Manager PIN. Only Admins can approve large variances.');
    }
    setIsVerifyingPin(false);
  };

  const handleModalClose = () => {
    setCountsKHR({});
    setCountsUSD({});
    setCashierNotes('');
    setDeclarationType(null);
    setError(null);
    setShowManagerPin(false);
    setManagerPin('');
    onClose();
  };

  const formatCurrency = (val: number, currency: 'KHR' | 'USD' = 'KHR') => {
    return currency === 'KHR' ? val.toLocaleString() + '៛' : '$' + val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  };

  const renderTypeSelection = () => (
    <div className="py-10 flex flex-col items-center justify-center space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-charcoal-dark dark:text-cream-light">Choose Declaration Action</h2>
        <p className="text-charcoal-light font-bold">Select the type of cash log.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl px-4">
        <button
          onClick={() => setDeclarationType('OPEN')}
          className="group flex flex-col items-center justify-center p-6 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-900/30 rounded-2xl hover:border-amber-500 transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-amber-500/20 transition-colors">
            <FaSun className="text-2xl text-amber-500" />
          </div>
          <span className="text-lg font-black text-amber-600">Open Drawer</span>
          <span className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest mt-1">Starting Float</span>
        </button>

        <button
          onClick={() => setDeclarationType('CLOSE')}
          className="group flex flex-col items-center justify-center p-6 bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-200 dark:border-indigo-900/30 rounded-2xl hover:border-indigo-500 transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-indigo-500/20 transition-colors">
            <FaMoon className="text-2xl text-indigo-500" />
          </div>
          <span className="text-lg font-black text-indigo-600">Close Drawer</span>
          <span className="text-[10px] font-bold text-indigo-700/60 uppercase tracking-widest mt-1">End of Shift (Blind)</span>
        </button>

        <button
          onClick={() => setDeclarationType('DROP')}
          className="group flex flex-col items-center justify-center p-6 bg-emerald/5 dark:bg-emerald-900/10 border-2 border-emerald/20 dark:border-emerald-900/30 rounded-2xl hover:border-emerald transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-emerald/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-emerald/20 transition-colors">
            <FaLevelDownAlt className="text-2xl text-emerald" />
          </div>
          <span className="text-lg font-black text-emerald text-center">Cash Drop</span>
          <span className="text-[10px] font-bold text-emerald/60 uppercase tracking-widest mt-1 text-center">Deposit to Safe</span>
        </button>

        <button
          onClick={() => setDeclarationType('PAYOUT')}
          className="group flex flex-col items-center justify-center p-6 bg-terracotta/5 dark:bg-terracotta-900/10 border-2 border-terracotta/20 dark:border-terracotta-900/30 rounded-2xl hover:border-terracotta transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-terracotta/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-terracotta/20 transition-colors">
            <FaHandHoldingUsd className="text-2xl text-terracotta" />
          </div>
          <span className="text-lg font-black text-terracotta">Payout</span>
          <span className="text-[10px] font-bold text-terracotta/60 uppercase tracking-widest mt-1 text-center">Vendor/Expense payment</span>
        </button>
      </div>
    </div>
  );

  const getTitlePhrase = () => {
    switch(declarationType) {
      case 'OPEN': return 'Open Drawer (Starting Float)';
      case 'CLOSE': return 'Close Drawer (Blind Closeout)';
      case 'DROP': return 'Mid-Shift Cash Drop';
      case 'PAYOUT': return 'Register Payout';
      default: return 'Cash Drawer Management';
    }
  };

  if (showManagerPin) {
    return (
      <Modal isOpen={isOpen} onClose={handleModalClose} title="Manager Authorization Required" size="sm">
        <div className="p-4 space-y-4">
          <div className="bg-terracotta/10 p-3 rounded-lg border border-terracotta/20 text-terracotta font-bold text-center text-sm">
            <FaLock className="inline mr-2" />
            Large Variance Detected!
            <p className="mt-1 text-xs opacity-80">A manager must authorize this drawer closeout.</p>
          </div>
          
          <Input 
            label="Manager PIN" 
            type="password" 
            value={managerPin} 
            onChange={e => setManagerPin(e.target.value)} 
            placeholder="****"
            error={managerPinError || undefined}
            autoFocus
          />

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowManagerPin(false)} className="flex-1">Back</Button>
            <Button variant="primary" onClick={handleManagerPinSubmit} disabled={isVerifyingPin} className="flex-1 bg-terracotta hover:bg-terracotta/90 border-transparent">Authorize</Button>
          </div>
        </div>
      </Modal>
    );
  }

  const isBlind = declarationType === 'CLOSE' || declarationType === 'DROP';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        <div className="flex items-center gap-3">
          {declarationType && !forcedType && (
            <button 
              onClick={() => { setDeclarationType(null); setCountsKHR({}); setCountsUSD({}); }}
              className="p-1.5 hover:bg-charcoal/5 dark:hover:bg-cream/10 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-sm" />
            </button>
          )}
          <FaCalculator className="text-emerald" />
          <span>{getTitlePhrase()}</span>
        </div>
      }
      size={declarationType ? "xl" : "lg"}
      footer={declarationType ? (
        <div className="flex justify-between items-center w-full">
           <div className="text-left flex gap-4">
              <div>
                <p className="text-[10px] font-bold text-charcoal-light uppercase tracking-tighter">Counted</p>
                <p className="text-lg font-black text-charcoal-dark dark:text-cream-light leading-none">
                  <span className="text-emerald">{formatCurrency(totalDeclaredCombined)}</span>
                </p>
              </div>
           </div>
           <div className="flex space-x-2">
            <Button variant="ghost" onClick={handleModalClose}>Cancel</Button>
            <Button onClick={handleInitialSubmit} variant="primary" className="shadow-lg shadow-emerald/20">
              {isBlind ? 'Submit Blind Count' : 'Confirm & Submit'}
            </Button>
          </div>
        </div>
      ) : null}
    >
      {!declarationType ? renderTypeSelection() : (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative ${drawerPulse ? 'animate-shake' : ''}`}>
          
          {/* Visual Pulse for Drawer Opening */}
          {drawerPulse && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="bg-emerald text-white px-10 py-6 rounded-full font-black text-3xl shadow-[0_0_50px_rgba(16,185,129,0.5)] animate-bounce border-[6px] border-white flex items-center gap-4">
                <FaLock className="rotate-12" /> 
                <div className="flex flex-col items-start leading-none">
                  <span className="text-xs uppercase tracking-[0.2em] opacity-80 mb-1">Hardware Verified</span>
                  <span>DRAWER OPEN</span>
                </div>
              </div>
            </div>
          )}

          {/* Denomination Counting Section */}
          <div className="lg:col-span-2 space-y-4">
            
            <div className="flex gap-2 p-1 bg-charcoal/5 dark:bg-white/5 rounded-lg w-full">
              <button 
                className={`flex-1 py-2 font-black text-sm rounded-md transition-all ${currencyTab === 'KHR' ? 'bg-white dark:bg-charcoal shadow text-emerald' : 'text-charcoal-light hover:text-charcoal dark:hover:text-cream'}`}
                onClick={() => setCurrencyTab('KHR')}
              >
                KHR (៛)
              </button>
              <button 
                className={`flex-1 py-2 font-black text-sm rounded-md transition-all ${currencyTab === 'USD' ? 'bg-white dark:bg-charcoal shadow text-emerald' : 'text-charcoal-light hover:text-charcoal dark:hover:text-cream'}`}
                onClick={() => setCurrencyTab('USD')}
              >
                USD ($)
              </button>
            </div>

            {currencyTab === 'KHR' && KHR_DENOMINATIONS.map((group) => (
              <div key={group.label} className="bg-cream/50 dark:bg-charcoal-dark/30 p-4 rounded-xl border border-charcoal/5 dark:border-cream/5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {group.items.map((denom) => (
                    <div key={denom.label} className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-charcoal-light flex justify-between px-1">
                        <span>{denom.label}</span>
                        <span className="text-emerald/70">{formatCurrency(((parseFloat(countsKHR[denom.value.toString()] || '0') || 0) * denom.value))}</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-2 bg-white dark:bg-charcoal text-center font-black rounded-lg border border-charcoal/10 dark:border-cream/10 focus:ring-2 focus:ring-emerald outline-none transition-all"
                        value={countsKHR[denom.value.toString()] || ''}
                        onChange={(e) => handleCountChange(denom.value, e.target.value, 'KHR')}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {currencyTab === 'USD' && USD_DENOMINATIONS.map((group) => (
              <div key={group.label} className="bg-cream/50 dark:bg-charcoal-dark/30 p-4 rounded-xl border border-charcoal/5 dark:border-cream/5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {group.items.map((denom) => (
                    <div key={denom.label} className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-charcoal-light flex justify-between px-1">
                        <span>{denom.label}</span>
                        <span className="text-emerald/70">{formatCurrency(((parseFloat(countsUSD[denom.value.toString()] || '0') || 0) * denom.value), 'USD')}</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-2 bg-white dark:bg-charcoal text-center font-black rounded-lg border border-charcoal/10 dark:border-cream/10 focus:ring-2 focus:ring-emerald outline-none transition-all"
                        value={countsUSD[denom.value.toString()] || ''}
                        onChange={(e) => handleCountChange(denom.value, e.target.value, 'USD')}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-2">
               <Textarea
                id="cashierNotes"
                label="Notes & Reason"
                rows={2}
                value={cashierNotes}
                onChange={(e) => setCashierNotes(e.target.value)}
                placeholder={declarationType === 'PAYOUT' ? "Reason for payout (e.g. Ice delivery)..." : "Any observations or notes..."}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-charcoal border border-charcoal/5 dark:border-cream/5 rounded-xl p-5 shadow-inner">
              <h3 className="text-sm font-black text-charcoal-light uppercase mb-4 flex items-center gap-2">
                <FaHistory className="text-emerald" /> 
                {isBlind ? 'Blind Audit Active' : 'Operation Summary'}
              </h3>
              
              <div className="space-y-4">
                {isBlind ? (
                  <div className="bg-charcoal-dark text-white p-4 rounded-xl flex items-center gap-3">
                    <FaLock className="text-3xl text-emerald" />
                    <div>
                      <p className="text-sm font-black">Secure Closeout</p>
                      <p className="text-xs opacity-70">System totals are hidden to ensure unbiased cash auditing.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-cream/30 dark:bg-charcoal-dark/50 p-4 rounded-xl border border-emerald/10 space-y-3">
                    <div className="pt-2 border-t border-charcoal/10 dark:border-cream/10 flex justify-between items-center">
                      <span className="text-charcoal-dark dark:text-cream-light text-[10px] font-black uppercase">Operation Target:</span>
                      <span className="font-black text-lg text-charcoal-dark dark:text-cream-light">{formatCurrency(expectedAmount > 0 ? expectedAmount : 0)}</span>
                    </div>
                  </div>
                )}

                <div className="bg-charcoal/5 dark:bg-white/5 p-3 rounded-lg border border-charcoal/5 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-charcoal-light/70 uppercase">Combined Value:</span>
                    <span className="font-black text-emerald text-lg">{formatCurrency(totalDeclaredCombined)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-charcoal-light/70">KHR Count</span>
                    <span className="font-bold text-charcoal-dark/70 dark:text-cream-light/70">{formatCurrency(totalDeclaredKHR)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-charcoal-light/70">USD Equivalent ({formatCurrency(EXCHANGE_RATE)}/$)</span>
                    <span className="font-bold text-charcoal-dark/70 dark:text-cream-light/70">{formatCurrency(totalDeclaredUSDInKHR)}</span>
                  </div>
                </div>

                {!isBlind && (
                  <div className="pt-2">
                    <div className={`p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm border ${
                      Math.abs(discrepancy) < 1 ? 'bg-emerald/10 text-emerald border-emerald/20' : 
                      discrepancy > 0 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-terracotta/10 text-terracotta border-terracotta/20'
                    }`}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                        Current Variance
                      </p>
                      <div className="text-2xl font-black flex items-center gap-2">
                        {Math.abs(discrepancy) < 1 ? (
                          <><FaCheckCircle /> Balanced</>
                        ) : (
                          <>{formatCurrency(Math.abs(discrepancy))} {discrepancy > 0 ? 'Over' : 'Short'}</>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-terracotta/10 text-terracotta text-xs font-bold rounded-lg flex items-center gap-2 border border-terracotta/20">
                <FaExclamationTriangle /> {error}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DeclareCashModal;