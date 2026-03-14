import React, { useState, useEffect } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import { TABLE_NUMBERS } from '../../constants';
import { FaChair, FaShoppingBag, FaEdit, FaCheck } from 'react-icons/fa';

interface TableSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableNumber: string) => void;
  currentTable?: string;
}

const TableButton: React.FC<{
  table: string;
  onClick: () => void;
  isActive: boolean;
  icon: React.ReactNode;
}> = ({ table, onClick, isActive, icon }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center p-4 rounded-xl shadow-lg h-24
      transform transition-all duration-200 active:scale-95
      ${isActive
        ? 'bg-emerald text-white ring-4 ring-emerald-dark ring-offset-2 ring-offset-cream-light dark:ring-offset-charcoal-dark'
        : 'bg-cream-light dark:bg-charcoal-dark text-charcoal dark:text-cream-light hover:bg-cream dark:hover:bg-charcoal hover:-translate-y-1'
      }
    `}
  >
    {icon}
    <span className="mt-2 font-bold text-lg">{table}</span>
  </button>
);

const TableSelectionModal: React.FC<TableSelectionModalProps> = ({ isOpen, onClose, onSelectTable, currentTable }) => {
  const [customName, setCustomName] = useState('');
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // If current table is a custom one, pre-fill the input
        const isCustom = currentTable && !TABLE_NUMBERS.includes(currentTable);
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

  const getIconForTable = (table: string) => {
    if (table === 'Takeaway') return <FaShoppingBag size={28} />;
    if (table === 'Custom Name') return <FaEdit size={28} />;
    return <FaChair size={28} />;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Table or Order Name" size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {TABLE_NUMBERS.map(table => (
            <TableButton
              key={table}
              table={table}
              onClick={() => {
                if (table === 'Custom Name') {
                  setIsCustomInputVisible(true);
                } else {
                  onSelectTable(table);
                }
              }}
              isActive={currentTable === table}
              icon={getIconForTable(table)}
            />
          ))}
        </div>
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
