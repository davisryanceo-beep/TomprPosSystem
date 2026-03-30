import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { SupplyItem, SupplyCategory } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { FaPlus, FaEdit, FaTrash, FaArchive, FaWarehouse, FaExclamationTriangle, FaPlusCircle, FaMinusCircle, FaBrain, FaSync, FaFilePdf } from 'react-icons/fa';
import { LOW_SUPPLY_THRESHOLD } from '../../constants';
import { generateSupplyStockReportPDF } from '../../services/pdfService'; // Import PDF service
import LoadingSpinner from '../Shared/LoadingSpinner';

const SupplyManagement: React.FC = () => {
  const { supplyItems, addSupplyItem, updateSupplyItem, deleteSupplyItem, adjustSupplyStock } = useShop();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<SupplyItem> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);


  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAdjustItem, setStockAdjustItem] = useState<SupplyItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);

  const supplyCategoryOptions = Object.values(SupplyCategory).map(sc => ({ value: sc, label: sc }));

  const openModalForCreate = () => {
    setCurrentItem({
      name: '',
      category: SupplyCategory.OTHER,
      currentStock: 0,
      unit: 'pieces',
      lowStockThreshold: LOW_SUPPLY_THRESHOLD,
      notes: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (item: SupplyItem) => {
    setCurrentItem(item);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
  };

  const handleSaveItem = () => {
    if (currentItem && currentItem.name && currentItem.category && currentItem.unit &&
      typeof currentItem.currentStock === 'number' && currentItem.currentStock >= 0 &&
      typeof currentItem.lowStockThreshold === 'number' && currentItem.lowStockThreshold >= 0) {
      if (isEditing && currentItem.id) {
        updateSupplyItem(currentItem as SupplyItem);
      } else {
        addSupplyItem({ ...currentItem, id: `supply-${Date.now()}` } as SupplyItem);
      }
      closeModal();
    } else {
      alert("Please fill in all required fields with valid values.");
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this supply item? This action cannot be undone.')) {
      deleteSupplyItem(itemId);
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

  const handleDownloadSupplyReport = async () => {
    setIsGeneratingPDF(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      generateSupplyStockReportPDF(supplyItems);
    } catch (error) {
      console.error("Error generating supply PDF:", error);
      alert("Failed to generate PDF report. See console for details.");
    }
    setIsGeneratingPDF(false);
  };


  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <FaArchive className="mr-2 text-emerald" />Supply Stock Management
        </h2>
        <div className="flex space-x-2">
          <Button onClick={handleDownloadSupplyReport} disabled={isGeneratingPDF || supplyItems.length === 0} leftIcon={<FaFilePdf />} variant="secondary">
            {isGeneratingPDF ? 'Generating...' : "PDF Report"}
          </Button>
          <Button onClick={openModalForCreate} leftIcon={<FaPlus />}>Add Supply Item</Button>
        </div>
      </div>

      {lowStockSupplies.length > 0 && (
        <div className="p-4 bg-terracotta/10 border-l-4 border-terracotta text-terracotta-dark dark:text-terracotta rounded-lg">
          <h3 className="font-bold flex items-center"><FaExclamationTriangle className="mr-2" />Low Supply Alert!</h3>
          <ul className="list-disc list-inside text-sm mt-1">
            {lowStockSupplies.map(s => <li key={s.id}>{s.name} ({s.currentStock} {s.unit}, Threshold: {s.lowStockThreshold})</li>)}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream dark:bg-charcoal-dark/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Current Stock</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Cost/Unit</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Low Stock At</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {supplyItems.map(item => (
              <tr key={item.id} className={`${item.currentStock <= item.lowStockThreshold ? 'bg-terracotta/10' : ''} hover:bg-cream dark:hover:bg-charcoal-dark/50`}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{item.name}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light">{item.category}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light font-bold">{item.currentStock}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light">{item.unit}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light">{item.costPerUnit ? `$${item.costPerUnit.toFixed(2)}` : '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light">{item.lowStockThreshold}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openStockAdjustModal(item)} leftIcon={<FaWarehouse />}>Adj. Stock</Button>
                  <Button variant="ghost" size="sm" onClick={() => openModalForEdit(item)} leftIcon={<FaEdit />}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteItem(item.id)} leftIcon={<FaTrash />}>Delete</Button>
                </td>
              </tr>
            ))}
            {supplyItems.length === 0 && (
              <tr><td colSpan={7} className="text-center py-4 text-charcoal-light">No supply items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Supply Item' : 'Add Supply Item'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save Item</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Item Name" value={currentItem?.name || ''} onChange={e => setCurrentItem(prev => prev ? { ...prev, name: e.target.value } : null)} required />
          <Select label="Category" options={supplyCategoryOptions} value={currentItem?.category || SupplyCategory.OTHER} onChange={e => setCurrentItem(prev => prev ? { ...prev, category: e.target.value as SupplyCategory } : null)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Current Stock" type="number" min="0" value={currentItem?.currentStock === undefined ? '' : currentItem.currentStock} onChange={e => setCurrentItem(prev => prev ? { ...prev, currentStock: parseInt(e.target.value) || 0 } : null)} required disabled={isEditing} />
            <Input label="Cost Per Unit ($)" type="number" step="0.01" min="0" value={currentItem?.costPerUnit === undefined ? '' : currentItem.costPerUnit} onChange={e => setCurrentItem(prev => prev ? { ...prev, costPerUnit: parseFloat(e.target.value) || 0 } : null)} placeholder="e.g. 0.50" />
          </div>
          <Input label="Unit of Measurement" value={currentItem?.unit || ''} onChange={e => setCurrentItem(prev => prev ? { ...prev, unit: e.target.value } : null)} placeholder="e.g., pieces, kg, liters, rolls" required />
          <Input label="Low Stock Threshold" type="number" min="0" value={currentItem?.lowStockThreshold === undefined ? '' : currentItem.lowStockThreshold} onChange={e => setCurrentItem(prev => prev ? { ...prev, lowStockThreshold: parseInt(e.target.value) || 0 } : null)} required />
          <Textarea id="notes" label="Notes (Optional)" rows={2} value={currentItem?.notes || ''} onChange={e => setCurrentItem(prev => prev ? { ...prev, notes: e.target.value } : null)} placeholder="Any additional details about the supply item." />
        </div>
      </Modal>

      <Modal
        isOpen={isStockModalOpen && !!stockAdjustItem}
        onClose={() => setIsStockModalOpen(false)}
        title={`Adjust Stock for ${stockAdjustItem?.name}`}
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsStockModalOpen(false)}>Cancel</Button>
            <Button onClick={handleStockAdjustment} leftIcon={stockAdjustment >= 0 ? <FaPlusCircle /> : <FaMinusCircle />}>
              {stockAdjustment >= 0 ? 'Add to Stock' : 'Deduct from Stock'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p>Current Stock: <strong>{stockAdjustItem?.currentStock} {stockAdjustItem?.unit}</strong></p>
          <Input label="Adjustment Amount" type="number" value={stockAdjustment} onChange={e => setStockAdjustment(parseInt(e.target.value) || 0)} placeholder="e.g., 50 (add) or -10 (deduct)" />
          <p className="text-xs text-charcoal-light">Enter a positive number to add stock, or a negative number to deduct stock.</p>
        </div>
      </Modal>
    </div>
  );
};

export default SupplyManagement;