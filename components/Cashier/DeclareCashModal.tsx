import React, { useState } from 'react';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Button from '../Shared/Button';
import Textarea from '../Shared/Textarea';
import { useShop } from '../../contexts/ShopContext';

interface DeclareCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierId: string;
  cashierName: string;
}

const DeclareCashModal: React.FC<DeclareCashModalProps> = ({ isOpen, onClose, cashierId, cashierName }) => {
  const { addCashDrawerLog } = useShop();
  const [declaredAmount, setDeclaredAmount] = useState<string>('');
  const [cashierNotes, setCashierNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const amount = parseFloat(declaredAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    setError(null);

    const today = new Date();
    const shiftDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

    addCashDrawerLog({
      cashierId,
      cashierName,
      shiftDate,
      declaredAmount: amount,
      cashierNotes: cashierNotes.trim() || undefined,
    });

    setDeclaredAmount('');
    setCashierNotes('');
    onClose();
    alert('Cash declaration submitted successfully!');
  };

  const handleModalClose = () => {
    setDeclaredAmount('');
    setCashierNotes('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Declare Cash Drawer"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!declaredAmount}>
            Submit Declaration
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please count the total cash in your drawer and enter the amount below. This is for the operational day of <strong>{new Date().toLocaleDateString()}</strong>.
        </p>
        <Input
          label="Declared Cash Amount (USD)"
          id="declaredAmount"
          type="number"
          value={declaredAmount}
          onChange={(e) => setDeclaredAmount(e.target.value)}
          placeholder="e.g., 350.75"
          min="0"
          step="0.01"
          autoFocus
          required
        />
        <Textarea
          id="cashierNotes"
          label="Notes (Optional)"
          rows={3}
          value={cashierNotes}
          onChange={(e) => setCashierNotes(e.target.value)}
          placeholder="e.g., Float was $50, large bill received, etc."
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  );
};

export default DeclareCashModal;