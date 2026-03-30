import React, { useState, useEffect } from 'react';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Button from '../Shared/Button';
import { Order, PaymentCurrency } from '../../types';
import { USD_TO_KHR_RATE } from '../../constants';

interface CashPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onConfirmPayment: (cashTendered: number, changeGiven: number, paymentCurrency: PaymentCurrency) => void;
}

const CashPaymentModal: React.FC<CashPaymentModalProps> = ({ isOpen, onClose, order, onConfirmPayment }) => {
  const [cashTendered, setCashTendered] = useState<string>('');
  const [changeDue, setChangeDue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<PaymentCurrency>('USD');

  const totalAmountUSD = order?.finalAmount || 0;
  const totalAmountKHR = totalAmountUSD * USD_TO_KHR_RATE;

  const quickCashOptionsUSD = [20, 50, 100];
  const quickCashOptionsKHR = [100000, 200000, 400000];

  const roundKHR = (amount: number) => Math.round(amount / 100) * 100;

  useEffect(() => {
    if (!order) return;

    const tenderedNum = parseFloat(cashTendered);
    if (isNaN(tenderedNum)) {
      setChangeDue(null);
      setError(selectedCurrency === 'KHR' && cashTendered !== '' ? 'Please enter a valid KHR amount.' : null);
      return;
    }

    let change = 0;
    if (selectedCurrency === 'USD') {
      change = tenderedNum - totalAmountUSD;
    } else { // KHR
      change = roundKHR(tenderedNum - roundKHR(totalAmountKHR));
    }

    setChangeDue(change);

    if (change < 0) {
      setError(`Cash tendered is less than the total amount.`);
    } else {
      setError(null);
    }
  }, [cashTendered, order, selectedCurrency, totalAmountUSD, totalAmountKHR]);

  useEffect(() => {
    // Reset fields when modal opens/closes or order changes
    if (isOpen) {
      setCashTendered('');
      setChangeDue(null);
      setError(null);
      setSelectedCurrency('USD'); // Default to USD
    }
  }, [isOpen]);


  const handleConfirm = () => {
    if (order && !error && changeDue !== null && changeDue >= 0) {
      const tendered = parseFloat(cashTendered);
      let finalTendered = tendered;
      let finalChange = changeDue;

      if (selectedCurrency === 'KHR') {
        finalTendered = roundKHR(tendered);
        finalChange = roundKHR(changeDue);
      }

      onConfirmPayment(finalTendered, finalChange, selectedCurrency);
    } else {
      setError('Cannot confirm payment. Ensure cash tendered is sufficient.');
    }
  };

  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Payment"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose} size="lg">Cancel</Button>
          <Button onClick={handleConfirm} disabled={!!error || changeDue === null || changeDue < 0 || cashTendered === ''} size="lg">
            Confirm Payment
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-lg font-bold text-charcoal-dark dark:text-cream-light">
            Total Amount Due
          </p>
          <p className="text-4xl font-extrabold text-emerald">
            ${totalAmountUSD.toFixed(2)}
          </p>
          <p className="text-xl text-charcoal-light dark:text-charcoal-light">
            ៛{roundKHR(totalAmountKHR).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="flex space-x-2">
          {(['USD', 'KHR'] as PaymentCurrency[]).map(currency => (
            <Button
              key={currency}
              variant={selectedCurrency === currency ? 'primary' : 'ghost'}
              onClick={() => { setSelectedCurrency(currency); setCashTendered(''); }}
              size="md"
              className="w-full !py-3"
            >
              Pay with {currency}
            </Button>
          ))}
        </div>

        <Input
          label={`Cash Tendered (${selectedCurrency})`}
          id="cashTendered"
          type="number"
          value={cashTendered}
          onChange={(e) => setCashTendered(e.target.value)}
          placeholder={`Enter amount customer paid in ${selectedCurrency}`}
          autoFocus
          step={selectedCurrency === 'USD' ? "0.01" : "100"}
          className="text-center text-2xl !py-4"
        />

        <div className="flex flex-wrap gap-2 justify-center">
          {selectedCurrency === 'USD' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setCashTendered(totalAmountUSD.toFixed(2))}>Exact</Button>
              {quickCashOptionsUSD.map(amount => totalAmountUSD < amount && <Button key={amount} variant="ghost" size="sm" onClick={() => setCashTendered(String(amount))}>${amount}</Button>)}
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setCashTendered(String(roundKHR(totalAmountKHR)))}>Exact</Button>
              {quickCashOptionsKHR.map(amount => roundKHR(totalAmountKHR) < amount && <Button key={amount} variant="ghost" size="sm" onClick={() => setCashTendered(String(amount))}>៛{amount / 1000}k</Button>)}
            </>
          )}
        </div>

        {changeDue !== null && (
          <div className="text-center">
            <p className={`text-lg font-bold ${changeDue < 0 ? 'text-terracotta' : 'text-emerald'}`}>
              Change Due:
            </p>
            <p className={`text-3xl font-extrabold ${changeDue < 0 ? 'text-terracotta' : 'text-emerald'}`}>
              {selectedCurrency === 'USD' ? `$${changeDue.toFixed(2)}` : `៛${changeDue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-terracotta text-center">{error}</p>}
      </div>
    </Modal>
  );
};

export default CashPaymentModal;