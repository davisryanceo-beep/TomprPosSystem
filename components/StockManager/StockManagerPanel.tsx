
import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import { SupplyItem, SupplyCategory } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea'; 
import { FaPlus, FaWarehouse, FaArchive, FaExclamationTriangle, FaPlusCircle, FaMinusCircle } from 'react-icons/fa';
import { LOW_SUPPLY_THRESHOLD } from '../../constants';

const StockManagerPanel: React.FC = () => {
  const { 
    supplyItems, addSupplyItem, adjustSupplyStock, 
  } = useShop();
  
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SupplyItem>>({
    name: '',
    category: SupplyCategory.OTHER,
    currentStock: 0,
    unit: 'pieces',
    lowStockThreshold: LOW_SUPPLY_THRESHOLD,
    notes: '',
    purchaseDate: new Date().toISOString().split('T')[0], 
    expiryDate: ''
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAdjustItem, setStockAdjustItem] = useState<SupplyItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);


  const supplyCategoryOptions = Object.values(SupplyCategory).map(sc => ({ value: sc, label: sc }));

  const openAddItemModal = () => {
    setNewItem({
      name: '',
      category: SupplyCategory.OTHER,
      currentStock: 0, 
      unit: 'pieces',
      lowStockThreshold: LOW_SUPPLY_THRESHOLD,
      notes: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: ''
    });
    setIsAddItemModalOpen(true);
  };

  const closeAddItemModal = () => {
    setIsAddItemModalOpen(false);
  };

  const handleSaveNewItem = () => {
    if (newItem.name && newItem.category && newItem.unit &&
        typeof newItem.currentStock === 'number' && newItem.currentStock >= 0 &&
        typeof newItem.lowStockThreshold === 'number' && newItem.lowStockThreshold >= 0) {
      addSupplyItem({ 
        ...newItem, 
        id: `supply-${Date.now()}`,
        currentStock: newItem.currentStock || 0 
      } as SupplyItem);
      closeAddItemModal();
    } else {
      alert("Please fill in all required fields (Name, Category, Unit, Initial Stock, Low Stock Threshold) with valid values.");
    }
  };
  
  const openStockAdjustModal = (item: SupplyItem) => {
    setStockAdjustItem(item);
    setStockAdjustment(0); 
    setIsStockModalOpen(true);
  };

  const handleStockAdjustment = () => {
    if (stockAdjustItem && typeof stockAdjustment === 'number') {
      adjustSupplyStock(stockAdjustItem.id, stockAdjustment);
      setIsStockModalOpen(false);
      setStockAdjustItem(null);
    } else {
      alert("Please enter a valid adjustment amount.")
    }
  };

  const lowStockSupplies = useMemo(() => {
    return supplyItems.filter(item => item.currentStock <= item.lowStockThreshold);
  }, [supplyItems]);

  const itemsNearingExpiry = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return supplyItems.filter(item => 
        item.expiryDate && 
        new Date(item.expiryDate) >= today && 
        new Date(item.expiryDate) <= nextWeek
    ).sort((a,b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
  }, [supplyItems]);

  return (
    <div className="space-y-6 fade-in">
      <header className="bg-cream-light dark:bg-charcoal-dark shadow-xl rounded-xl p-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-4xl font-extrabold text-charcoal-dark dark:text-cream-light flex items-center">
                    <FaArchive className="mr-3 text-emerald" />Stock Manager Panel
                </h1>
                <p className="text-base text-charcoal-light dark:text-charcoal-light">Manage operational supply inventory.</p>
            </div>
        </div>
      </header>

      <div className="flex justify-end items-center">
        <Button onClick={openAddItemModal} leftIcon={<FaPlus />}>Add New Supply Item</Button>
      </div>

      {(lowStockSupplies.length > 0 || itemsNearingExpiry.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockSupplies.length > 0 && (
                <div className="p-4 bg-terracotta/10 border-l-4 border-terracotta text-terracotta-dark dark:text-terracotta rounded-lg">
                <h3 className="font-bold flex items-center"><FaExclamationTriangle className="mr-2"/>Low Supply Alert!</h3>
                <ul className="list-disc list-inside text-sm mt-1 max-h-32 overflow-y-auto">
                    {lowStockSupplies.map(s => <li key={s.id}>{s.name} ({s.currentStock} {s.unit}, Threshold: {s.lowStockThreshold})</li>)}
                </ul>
                </div>
            )}
            {itemsNearingExpiry.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 rounded-lg">
                <h3 className="font-bold flex items-center"><FaExclamationTriangle className="mr-2"/>Nearing Expiry (Next 7 Days)!</h3>
                <ul className="list-disc list-inside text-sm mt-1 max-h-32 overflow-y-auto">
                    {itemsNearingExpiry.map(s => <li key={s.id}>{s.name} (Expires: {s.expiryDate}, Stock: {s.currentStock} {s.unit})</li>)}
                </ul>
                </div>
            )}
        </div>
      )}


      <div className="bg-cream-light dark:bg-charcoal-dark shadow-xl rounded-xl p-4 sm:p-6">
        <h2 className="text-2xl font-bold mb-4 text-charcoal-dark dark:text-cream-light">Current Supply Inventory</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
            <thead className="bg-cream dark:bg-charcoal-dark/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
              {supplyItems.map(item => (
                <tr key={item.id} className={item.currentStock <= item.lowStockThreshold ? 'bg-terracotta/10' : ''}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{item.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light dark:text-charcoal-light">{item.category}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light dark:text-charcoal-light font-bold">{item.currentStock}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light dark:text-charcoal-light">{item.unit}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light dark:text-charcoal-light">{item.expiryDate || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => openStockAdjustModal(item)} leftIcon={<FaWarehouse/>}>Adjust Stock</Button>
                  </td>
                </tr>
              ))}
              {supplyItems.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-charcoal-light">No supply items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddItemModalOpen} onClose={closeAddItemModal} title={'Add New Supply Item'} size="lg">
        <div className="space-y-4">
          <Input
            label="Item Name"
            value={newItem?.name || ''}
            onChange={e => setNewItem(prev => prev ? { ...prev, name: e.target.value } : null)}
            required
          />
          <Select
            label="Category"
            options={supplyCategoryOptions}
            value={newItem?.category || SupplyCategory.OTHER}
            onChange={e => setNewItem(prev => prev ? { ...prev, category: e.target.value as SupplyCategory } : null)}
            required
          />
          <Input
            label="Initial Stock Quantity"
            type="number"
            min="0"
            value={newItem?.currentStock === undefined ? '' : newItem.currentStock}
            onChange={e => setNewItem(prev => prev ? { ...prev, currentStock: parseInt(e.target.value) || 0 } : null)}
            required
          />
          <Input
            label="Unit of Measurement"
            value={newItem?.unit || ''}
            onChange={e => setNewItem(prev => prev ? { ...prev, unit: e.target.value } : null)}
            placeholder="e.g., pieces, kg, liters, rolls"
            required
          />
          <Input
            label="Low Stock Threshold"
            type="number"
            min="0"
            value={newItem?.lowStockThreshold === undefined ? '' : newItem.lowStockThreshold}
            onChange={e => setNewItem(prev => prev ? { ...prev, lowStockThreshold: parseInt(e.target.value) || 0 } : null)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Date (Optional)"
              type="date"
              value={newItem?.purchaseDate || ''}
              onChange={e => setNewItem(prev => prev ? { ...prev, purchaseDate: e.target.value } : null)}
            />
            <Input
              label="Expiry Date (Optional)"
              type="date"
              value={newItem?.expiryDate || ''}
              onChange={e => setNewItem(prev => prev ? { ...prev, expiryDate: e.target.value } : null)}
            />
          </div>
          <Textarea
            id="newNotes"
            label="Notes (Optional)"
            rows={2}
            value={newItem?.notes || ''}
            onChange={e => setNewItem(prev => prev ? { ...prev, notes: e.target.value } : null)}
            placeholder="Any additional details about the supply item."
          />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="ghost" onClick={closeAddItemModal}>Cancel</Button>
            <Button onClick={handleSaveNewItem}>Save New Item</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isStockModalOpen && !!stockAdjustItem} onClose={() => setIsStockModalOpen(false)} title={`Adjust Stock for ${stockAdjustItem?.name}`} size="md">
        <div className="space-y-4">
            <p>Current Stock: <strong>{stockAdjustItem?.currentStock} {stockAdjustItem?.unit}</strong></p>
            <Input
                label="Adjustment Amount"
                type="number"
                value={stockAdjustment}
                onChange={e => setStockAdjustment(parseInt(e.target.value) || 0)}
                placeholder="e.g., 50 (add) or -10 (deduct)"
            />
            <p className="text-xs text-charcoal-light">
                Enter a positive number to add stock (e.g., new delivery), or a negative number to deduct stock (e.g., used items, spoilage).
            </p>
             <div className="flex justify-end space-x-2 pt-4">
                <Button variant="ghost" onClick={() => setIsStockModalOpen(false)}>Cancel</Button>
                <Button 
                    onClick={handleStockAdjustment} 
                    leftIcon={stockAdjustment >= 0 ? <FaPlusCircle/> : <FaMinusCircle/>}
                >
                    {stockAdjustment >= 0 ? 'Add to Stock' : 'Deduct from Stock'}
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default StockManagerPanel;