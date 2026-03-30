import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { FaBackspace } from 'react-icons/fa';

interface PinEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  title: string;
  isVerifying: boolean;
  error: string | null;
}

const PinPadButton: React.FC<{ value: string; onClick: (value: string) => void; isIcon?: boolean }> = ({ value, onClick, isIcon = false }) => (
  <button
    onClick={() => onClick(value)}
    className="h-16 w-16 text-2xl font-bold bg-cream-light dark:bg-charcoal-dark text-charcoal-dark dark:text-cream-light shadow-md rounded-full border-b-4 border-charcoal/20 dark:border-charcoal-900 active:scale-95 active:border-b-2 flex items-center justify-center"
  >
    {isIcon ? <FaBackspace /> : value}
  </button>
);

const PinEntryModal: React.FC<PinEntryModalProps> = ({ isOpen, onClose, onConfirm, title, isVerifying, error }) => {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin(''); // Reset PIN when modal opens
    }
  }, [isOpen]);

  const handlePinClick = (value: string) => {
    if (isVerifying) return;
    if (value === 'bksp') {
      setPin(p => p.slice(0, -1));
    } else if (pin.length < 4) {
      setPin(p => p + value);
    }
  };

  const handleSubmit = () => {
    if (pin.length === 4 && !isVerifying) {
      onConfirm(pin);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-4 h-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-charcoal/30 dark:border-cream-light/30 flex items-center justify-center">
              {pin.length > i && <div className="w-6 h-6 rounded-full bg-emerald"></div>}
            </div>
          ))}
        </div>

        {isVerifying && <LoadingSpinner message="Verifying..." />}
        {error && !isVerifying && <p className="text-sm text-terracotta h-5">{error}</p>}
        {!error && !isVerifying && <div className="h-5"></div>}
        
        <div className="grid grid-cols-3 gap-4">
          <PinPadButton value="1" onClick={handlePinClick} />
          <PinPadButton value="2" onClick={handlePinClick} />
          <PinPadButton value="3" onClick={handlePinClick} />
          <PinPadButton value="4" onClick={handlePinClick} />
          <PinPadButton value="5" onClick={handlePinClick} />
          <PinPadButton value="6" onClick={handlePinClick} />
          <PinPadButton value="7" onClick={handlePinClick} />
          <PinPadButton value="8" onClick={handlePinClick} />
          <PinPadButton value="9" onClick={handlePinClick} />
          <div /> 
          <PinPadButton value="0" onClick={handlePinClick} />
          <PinPadButton value="bksp" onClick={handlePinClick} isIcon />
        </div>
        
        <div className="w-full pt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={pin.length !== 4 || isVerifying}
            size="lg"
            className="w-full"
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PinEntryModal;
