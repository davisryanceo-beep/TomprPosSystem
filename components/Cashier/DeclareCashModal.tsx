import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Button from '../Shared/Button';
import Textarea from '../Shared/Textarea';
import { useShop } from '../../contexts/ShopContext';
import { 
  FaMoneyBillWave, FaCoins, FaCalculator, FaHistory, 
  FaExclamationTriangle, FaCheckCircle, FaSun, FaMoon, FaArrowLeft, FaStore
} from 'react-icons/fa';

interface DeclareCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierId: string;
  cashierName: string;
}

const KHR_DENOMINATIONS = [
  { label: 'Bills', items: [
    { label: '50,000៛', value: 50000 },
    { label: '10,000៛', value: 10000 },
    { label: '5,000៛', value: 5000 },
    { label: '1,000៛', value: 1000 },
    { label: '500៛', value: 500 },
    { label: '100៛', value: 100 },
  ]}
];

const DeclareCashModal: React.FC<DeclareCashModalProps> = ({ isOpen, onClose, cashierId, cashierName }) => {
  const { addCashDrawerLog, getExpectedCash, cashDrawerLogs, orders, currentStoreId } = useShop();
  const [declarationType, setDeclarationType] = useState<'OPEN' | 'CLOSE' | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [cashierNotes, setCashierNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Use local date string (YYYY-MM-DD) for consistency with ShopContext fix
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Find the opening log for today if it exists
  const openingLog = useMemo(() => {
    return [...cashDrawerLogs]
      .reverse()
      .find(l => l.cashierId === cashierId && l.type === 'OPEN' && l.shiftDate === todayStr);
  }, [cashDrawerLogs, cashierId, todayStr]);

  // Store-wide cash sales for the day (all cashiers)
  const storeTotalCashSales = useMemo(() => {
    return orders
      .filter(o => 
        o.storeId === currentStoreId && 
        (o.status === 'Paid' || o.status === 'Completed') && 
        o.paymentMethod === 'Cash' &&
        new Date(o.timestamp).toLocaleDateString('en-CA') === todayStr
      )
      .reduce((sum, order) => sum + (order.finalAmount || 0), 0);
  }, [orders, currentStoreId, todayStr]);

  const expectedAmount = useMemo(() => {
    if (!declarationType) return 0;
    return getExpectedCash(cashierId, declarationType);
  }, [cashierId, isOpen, getExpectedCash, declarationType]);

  const totalDeclared = useMemo(() => {
    return Object.entries(counts).reduce((sum, [valStr, countStr]) => {
      const val = parseFloat(valStr);
      const count = parseInt(countStr) || 0;
      return sum + (val * count);
    }, 0);
  }, [counts]);

  const discrepancy = totalDeclared - expectedAmount;

  const handleCountChange = (val: number, count: string) => {
    setCounts(prev => ({
      ...prev,
      [val.toString()]: count
    }));
  };

  const handleSubmit = () => {
    if (!declarationType) return;
    if (totalDeclared < 0) {
      setError('Declared amount cannot be negative.');
      return;
    }
    setError(null);

    addCashDrawerLog({
      cashierId,
      cashierName,
      shiftDate: todayStr,
      declaredAmount: totalDeclared,
      type: declarationType,
      cashierNotes: cashierNotes.trim() || undefined,
    });

    handleModalClose();
  };

  const handleModalClose = () => {
    setCounts({});
    setCashierNotes('');
    setDeclarationType(null);
    setError(null);
    onClose();
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString() + '៛';
  };

  const renderTypeSelection = () => (
    <div className="py-10 flex flex-col items-center justify-center space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-charcoal-dark dark:text-cream-light">Choose Declaration Phase</h2>
        <p className="text-charcoal-light font-bold">Are you starting your shift or closing for the day?</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg px-4">
        <button
          onClick={() => setDeclarationType('OPEN')}
          className="group flex flex-col items-center justify-center p-8 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-900/30 rounded-2xl hover:border-amber-500 transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl"
        >
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
            <FaSun className="text-3xl text-amber-500" />
          </div>
          <span className="text-xl font-black text-amber-600">Open Drawer</span>
          <span className="text-xs font-bold text-amber-700/60 mt-2 uppercase tracking-widest leading-tight">Start of Shift</span>
        </button>

        <button
          onClick={() => setDeclarationType('CLOSE')}
          className="group flex flex-col items-center justify-center p-8 bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-200 dark:border-indigo-900/30 rounded-2xl hover:border-indigo-500 transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl"
        >
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
            <FaMoon className="text-3xl text-indigo-500" />
          </div>
          <span className="text-xl font-black text-indigo-600">Close Drawer</span>
          <span className="text-xs font-bold text-indigo-700/60 mt-2 uppercase tracking-widest leading-tight">End of Day</span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        <div className="flex items-center gap-3">
          {declarationType && (
            <button 
              onClick={() => { setDeclarationType(null); setCounts({}); }}
              className="p-1.5 hover:bg-charcoal/5 dark:hover:bg-cream/10 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-sm" />
            </button>
          )}
          <FaCalculator className="text-emerald" />
          <span>
            {declarationType ? `${declarationType === 'OPEN' ? 'Morning' : 'Evening'} Declaration` : 'Cash Drawer Management'}
          </span>
        </div>
      }
      size={declarationType ? "xl" : "lg"}
      footer={declarationType ? (
        <div className="flex justify-between items-center w-full">
           <div className="text-left">
              <p className="text-xs font-bold text-charcoal-light uppercase tracking-tighter">Shift Summary</p>
              <p className="text-lg font-black text-charcoal-dark dark:text-cream-light leading-none">
                Counted: <span className="text-emerald">{formatCurrency(totalDeclared)}</span>
              </p>
           </div>
           <div className="flex space-x-2">
            <Button variant="ghost" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="primary" className="shadow-lg shadow-emerald/20">
              Confirm & Submit
            </Button>
          </div>
        </div>
      ) : null}
    >
      {!declarationType ? renderTypeSelection() : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Denomination Counting Section */}
          <div className="lg:col-span-2 space-y-4">
            {KHR_DENOMINATIONS.map((group) => (
              <div key={group.label} className="bg-cream/50 dark:bg-charcoal-dark/30 p-4 rounded-xl border border-charcoal/5 dark:border-cream/5">
                <h3 className="text-sm font-black text-charcoal-light uppercase mb-3 flex items-center gap-2">
                  <FaMoneyBillWave className="text-emerald" />
                  Count {group.label}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {group.items.map((denom) => (
                    <div key={denom.label} className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-charcoal-light flex justify-between px-1">
                        <span>{denom.label}</span>
                        <span className="text-emerald/70">{formatCurrency(((parseFloat(counts[denom.value.toString()] || '0') || 0) * denom.value))}</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-2 bg-white dark:bg-charcoal text-center font-black rounded-lg border border-charcoal/10 dark:border-cream/10 focus:ring-2 focus:ring-emerald outline-none transition-all"
                        value={counts[denom.value.toString()] || ''}
                        onChange={(e) => handleCountChange(denom.value, e.target.value)}
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
                label="Declaration Notes"
                rows={2}
                value={cashierNotes}
                onChange={(e) => setCashierNotes(e.target.value)}
                placeholder="Explain any large discrepancies or adjustments..."
              />
            </div>
          </div>

          {/* Business Logic Summary Section */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-charcoal border border-charcoal/5 dark:border-cream/5 rounded-xl p-5 shadow-inner">
              <h3 className="text-sm font-black text-charcoal-light uppercase mb-4 flex items-center gap-2">
                <FaHistory className="text-emerald" /> 
                {declarationType === 'CLOSE' ? 'Shift Recapitulation' : 'Opening Summary'}
              </h3>
              
              <div className="space-y-4">
                {declarationType === 'CLOSE' ? (
                  <div className="bg-cream/30 dark:bg-charcoal-dark/50 p-4 rounded-xl border border-emerald/10 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 text-charcoal-light font-bold">
                        <FaSun className="text-amber-500" /> Opening Balance:
                      </span>
                      <span className="font-black text-charcoal-dark dark:text-cream-light">{formatCurrency(openingLog?.declaredAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 text-charcoal-light font-bold">
                        <FaMoneyBillWave className="text-emerald" /> Your Cash Sales:
                      </span>
                      <span className="font-black text-charcoal-dark dark:text-cream-light">{formatCurrency(expectedAmount - (openingLog?.declaredAmount || 0))}</span>
                    </div>
                    <div className="pt-2 border-t border-charcoal/10 dark:border-cream/10 flex justify-between items-center">
                      <span className="text-charcoal-dark dark:text-cream-light text-xs font-black uppercase">🛒 Total Expected:</span>
                      <span className="font-black text-lg text-charcoal-dark dark:text-cream-light">{formatCurrency(expectedAmount)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-charcoal-light font-bold">Opening Target:</span>
                    <span className="font-black text-charcoal-dark dark:text-cream-light">{formatCurrency(0)}</span>
                  </div>
                )}

                {/* Additional context for Store-wide sales - help user verify */}
                <div className="bg-charcoal/5 dark:bg-white/5 p-3 rounded-lg border border-charcoal/5 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="flex items-center gap-1 text-charcoal-light/70 font-bold">
                      <FaStore className="text-charcoal-light/50" /> STORE TOTAL CASH TODAY:
                    </span>
                    <span className="font-black text-charcoal-dark/60 dark:text-cream-light/60">{formatCurrency(storeTotalCashSales)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-charcoal-light font-bold">Total Counted:</span>
                  <span className="font-black text-emerald text-lg">{formatCurrency(totalDeclared)}</span>
                </div>
                
                <div className="pt-2">
                  <div className={`p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm border ${
                    Math.abs(discrepancy) < 1 ? 'bg-emerald/10 text-emerald border-emerald/20' : 
                    discrepancy > 0 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-terracotta/10 text-terracotta border-terracotta/20'
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                      {declarationType === 'OPEN' ? 'Initial Deviation' : 'Final Variance'}
                    </p>
                    <div className="text-2xl font-black flex items-center gap-2">
                      {Math.abs(discrepancy) < 1 ? (
                        <><FaCheckCircle /> Balanced</>
                      ) : (
                        <>{formatCurrency(Math.abs(discrepancy))} {discrepancy > 0 ? 'Over' : 'Short'}</>
                      )}
                    </div>
                    {Math.abs(discrepancy) >= 1 && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                        <FaExclamationTriangle /> 
                        {declarationType === 'OPEN' ? 'Starting amount differs' : (discrepancy > 0 ? 'Surplus cash detected' : 'Missing cash from drawer')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-charcoal-light/60 mt-4 leading-relaxed italic">
                  {declarationType === 'CLOSE' 
                    ? `* Calculation: Opening Cash (${formatCurrency(openingLog?.declaredAmount || 0)}) + Your recorded sales.`
                    : "* Establish your starting balance to begin shift tracking."}
                </div>
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