import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Button from '../Shared/Button';
import Textarea from '../Shared/Textarea';
import { useShop } from '../../contexts/ShopContext';
import { FaMoneyBillWave, FaCoins, FaCalculator, FaHistory, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

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
  const { addCashDrawerLog, getExpectedCash } = useShop();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [cashierNotes, setCashierNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const expectedAmount = useMemo(() => getExpectedCash(cashierId), [cashierId, isOpen, getExpectedCash]);

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
    if (totalDeclared < 0) {
      setError('Declared amount cannot be negative.');
      return;
    }
    setError(null);

    const today = new Date();
    const shiftDate = today.toISOString().split('T')[0];

    addCashDrawerLog({
      cashierId,
      cashierName,
      shiftDate,
      declaredAmount: totalDeclared,
      cashierNotes: cashierNotes.trim() || undefined,
    });

    handleModalClose();
  };

  const handleModalClose = () => {
    setCounts({});
    setCashierNotes('');
    setError(null);
    onClose();
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString() + '៛';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        <div className="flex items-center gap-2">
          <FaCalculator className="text-emerald" />
          <span>Cash Drawer Declaration (KHR)</span>
        </div>
      }
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
           <div className="text-left">
              <p className="text-xs font-bold text-charcoal-light uppercase tracking-tighter">Shift Summary</p>
              <p className="text-lg font-black text-charcoal-dark dark:text-cream-light leading-none">
                Total: <span className="text-emerald">{formatCurrency(totalDeclared)}</span>
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
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Denomination Counting Section */}
        <div className="lg:col-span-2 space-y-4">
          {KHR_DENOMINATIONS.map((group) => (
            <div key={group.label} className="bg-cream/50 dark:bg-charcoal-dark/30 p-4 rounded-xl border border-charcoal/5 dark:border-cream/5">
              <h3 className="text-sm font-black text-charcoal-light uppercase mb-3 flex items-center gap-2">
                <FaMoneyBillWave className="text-emerald" />
                KHR {group.label}
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
              <FaHistory className="text-emerald" /> Business Summary
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-charcoal-light font-bold">Expected Cash Sales:</span>
                <span className="font-black text-charcoal-dark dark:text-cream-light">{formatCurrency(expectedAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-charcoal-light font-bold">Total Counted:</span>
                <span className="font-black text-emerald">{formatCurrency(totalDeclared)}</span>
              </div>
              
              <div className="border-t border-charcoal/5 dark:border-cream/5 pt-4">
                <div className={`p-4 rounded-xl flex flex-col items-center justify-center text-center ${
                  Math.abs(discrepancy) < 1 ? 'bg-emerald/10 text-emerald' : 
                  discrepancy > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-terracotta/10 text-terracotta'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">Drawer Variance</p>
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
                      {discrepancy > 0 ? 'More cash than sales' : 'Missing cash from drawer'}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-charcoal-light/60 mt-4 leading-relaxed italic">
                * Expected cash is based on recorded Cash sales during your current active shift.
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
    </Modal>
  );
};

export default DeclareCashModal;