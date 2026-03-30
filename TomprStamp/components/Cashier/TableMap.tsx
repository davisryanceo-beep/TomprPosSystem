import React from 'react';
import { useShop } from '../../contexts/ShopContext';
import { FaUserFriends } from 'react-icons/fa';

interface TableMapProps {
  onSelectTable: (tableNumber: string) => void;
  selectedTable?: string;
}

const TableMap: React.FC<TableMapProps> = ({ onSelectTable, selectedTable }) => {
  const { orders, currentStoreId } = useShop();

  // Define tables (could be fetched from store settings in the future)
  const tables = [
    { id: '1', name: 'T1' }, { id: '2', name: 'T2' }, { id: '3', name: 'T3' }, { id: '4', name: 'T4' },
    { id: '5', name: 'T5' }, { id: '6', name: 'T6' }, { id: '7', name: 'T7' }, { id: '8', name: 'T8' },
    { id: 'P1', name: 'Patio 1' }, { id: 'P2', name: 'Patio 2' }, { id: 'P3', name: 'Patio 3' }, { id: 'P4', name: 'Patio 4' }
  ];

  // Logic to determine if a table is occupied
  // A table is occupied if there's an active order (status is not Completed or Cancelled)
  const getTableStatus = (tableId: string) => {
    const activeOrder = orders.find(o => 
      o.tableNumber === tableId && 
      o.status !== 'Completed' && 
      o.status !== 'Cancelled'
    );
    return activeOrder ? 'occupied' : 'available';
  };

  return (
    <div className="bg-cream-light dark:bg-charcoal-dark p-4 rounded-xl shadow-inner border border-charcoal/5 dark:border-cream-light/5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-charcoal-dark dark:text-cream-light">Visual Table Map</h3>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald rounded-sm"></div> Available</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-terracotta rounded-sm"></div> Occupied</div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        {tables.map(table => {
          const status = getTableStatus(table.id);
          const isSelected = selectedTable === table.id;
          
          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table.id)}
              className={`
                relative h-16 flex flex-col items-center justify-center rounded-lg transition-all transform active:scale-95 shadow-sm border-2
                ${status === 'occupied' 
                  ? 'bg-terracotta/10 border-terracotta text-terracotta' 
                  : 'bg-emerald/10 border-emerald/30 text-emerald'
                }
                ${isSelected ? 'ring-4 ring-emerald ring-offset-2 dark:ring-offset-charcoal-dark scale-105' : ''}
              `}
            >
              <span className="font-extrabold text-sm">{table.name}</span>
              {status === 'occupied' && <FaUserFriends size={12} className="absolute top-1 right-1" />}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 p-2 bg-charcoal/5 dark:bg-cream-light/5 rounded text-center text-xs text-charcoal-light">
        Select a table to assign it to the current order.
      </div>
    </div>
  );
};

export default TableMap;
