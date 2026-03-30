import React, { useState, useEffect } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import { TABLE_NUMBERS } from '../../constants';
import { FaChair, FaShoppingBag, FaEdit, FaCheck } from 'react-icons/fa';
import TableMap from './TableMap';

interface TableSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableNumber: string) => void;
  currentTable?: string;
}

const TableSelectionModal: React.FC<TableSelectionModalProps> = ({ isOpen, onClose, onSelectTable, currentTable }) => {
  const [customName, setCustomName] = useState('');
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // If current table is a custom one, pre-fill the input
        const isCustom = currentTable && !TABLE_NUMBERS.includes(currentTable) && !currentTable.startsWith('T') && !currentTable.startsWith('P');
        if (isCustom) {
            setCustomName(currentTable);
            setIsCustomInputVisible(true);
        } else {
            setCustomName('');
            setIsCustomInputVisible(false);
        }
    }
  }, [isOpen, currentTable]);

  const handleCustomNameSubmit = () => {
    if (customName.trim()) {
      onSelectTable(customName.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Table or Order Name" size="xl">
      <div className="space-y-6">
        <div className="flex gap-4">
          <button
            onClick={() => onSelectTable('Takeaway')}
            className={`
              flex-1 flex items-center justify-center gap-2 p-6 rounded-xl shadow-lg border-2 transition-all
              ${currentTable === 'Takeaway' 
                ? 'bg-emerald text-white border-emerald' 
                : 'bg-cream-light dark:bg-charcoal-dark border-cream-dark/20 dark:border-charcoal/20 text-charcoal'
              }
            `}
          >
            <FaShoppingBag size={24} />
            <span className="font-bold text-xl">Takeaway</span>
          </button>
          
          <button
            onClick={() => setIsCustomInputVisible(!isCustomInputVisible)}
            className={`
              flex-1 flex items-center justify-center gap-2 p-6 rounded-xl shadow-lg border-2 transition-all
              ${isCustomInputVisible 
                ? 'bg-blue-500 text-white border-blue-600' 
                : 'bg-cream-light dark:bg-charcoal-dark border-cream-dark/20 dark:border-charcoal/20 text-charcoal'
              }
            `}
          >
            <FaEdit size={24} />
            <span className="font-bold text-xl">Custom Name</span>
          </button>
        </div>

        <TableMap 
          onSelectTable={onSelectTable}
          selectedTable={currentTable}
        />

        {isCustomInputVisible && (
          <div className="flex items-center gap-2 pt-4 border-t border-charcoal/10 dark:border-cream-light/10">
            <Input
              id="customTableName"
              placeholder="Enter custom name..."
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="flex-grow"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomNameSubmit(); }}
            />
            <Button onClick={handleCustomNameSubmit} disabled={!customName.trim()} leftIcon={<FaCheck />}>
              Set
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TableSelectionModal;
