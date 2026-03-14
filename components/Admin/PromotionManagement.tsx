import React, { useState, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Promotion, PromotionType, PromotionCondition, ProductCategory, Product } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { FaPlus, FaEdit, FaTrash, FaTags, FaPercentage, FaDollarSign, FaCalendarDay } from 'react-icons/fa';

const PromotionManagement: React.FC = () => {
  const { promotions, addPromotion, updatePromotion, deletePromotion, products, knownCategories } = useShop();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState<Partial<Promotion> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const promotionTypeOptions = Object.values(PromotionType).map(pt => ({ value: pt, label: pt }));
  const categoryOptions = useMemo(() => [{ value: '', label: 'Any Category' }, ...knownCategories.map(cat => ({ value: cat, label: cat }))], [knownCategories]);
  const productOptions = useMemo(() => [{ value: '', label: 'Any Product' }, ...products.map(p => ({ value: p.id, label: p.name }))], [products]);


  const openModalForCreate = () => {
    setCurrentPromotion({
      name: '',
      description: '',
      type: PromotionType.PERCENTAGE_OFF_ORDER,
      value: 10,
      conditions: { minOrderAmount: 0 },
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (promotion: Promotion) => {
    setCurrentPromotion(promotion);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentPromotion(null);
  };

  const handleSavePromotion = () => {
    if (
      currentPromotion &&
      currentPromotion.name &&
      currentPromotion.type &&
      typeof currentPromotion.value === 'number' && currentPromotion.value >= 0
    ) {
      const promotionToSave: Promotion = {
        ...currentPromotion,
        conditions: { // Ensure conditions exist
          minOrderAmount: currentPromotion.conditions?.minOrderAmount || 0,
          applicableCategory: currentPromotion.conditions?.applicableCategory || undefined,
          applicableCategoryIds: currentPromotion.conditions?.applicableCategoryIds || [],
          applicableProductIds: currentPromotion.conditions?.applicableProductIds || [],
          startTime: currentPromotion.conditions?.startTime || undefined,
          endTime: currentPromotion.conditions?.endTime || undefined,
        }
      } as Promotion;

      if (isEditing && currentPromotion.id) {
        updatePromotion(promotionToSave);
      } else {
        const { id, storeId, ...promotionDataWithoutIdAndStoreId } = promotionToSave;
        addPromotion(promotionDataWithoutIdAndStoreId as Omit<Promotion, 'id' | 'storeId'>);
      }
      closeModal();
    } else {
      alert("Please fill in all required fields: Name, Type, and Value (must be >= 0).");
    }
  };

  const handleDeletePromotion = (promotionId: string) => {
    if (window.confirm('Are you sure you want to delete this promotion?')) {
      deletePromotion(promotionId);
    }
  };

  const handleConditionChange = (field: keyof PromotionCondition, value: any) => {
    setCurrentPromotion(prev => {
      if (!prev) return prev;
      const updatedConditions = { ...(prev.conditions || {}), [field]: value };
      if (field === 'applicableProductIds' && !Array.isArray(value)) { // Ensure it's an array for multi-select
        updatedConditions[field] = value ? [value] : [];
      }
      return { ...prev, conditions: updatedConditions };
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <FaTags className="mr-2 text-emerald" />Promotions & Discounts
        </h2>
        <Button onClick={openModalForCreate} leftIcon={<FaPlus />}>Add Promotion</Button>
      </div>

      <div className="overflow-x-auto bg-cream dark:bg-charcoal-dark/50 p-3 rounded-lg">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream-light dark:bg-charcoal-dark/30">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Dates/Times</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {promotions.map(promo => (
              <tr key={promo.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{promo.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light">{promo.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light">
                  {promo.type.includes('Percentage') ? `${promo.value}%` : `$${promo.value.toFixed(2)}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${promo.isActive ? 'bg-emerald/10 text-emerald-dark' : 'bg-terracotta/10 text-terracotta-dark'
                    }`}>
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light">
                  <div>{promo.startDate || 'Any'} - {promo.endDate || 'Any'}</div>
                  {(promo.conditions?.startTime || promo.conditions?.endTime) && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      {promo.conditions?.startTime || '00:00'} - {promo.conditions?.endTime || '23:59'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openModalForEdit(promo)} leftIcon={<FaEdit />}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeletePromotion(promo.id)} leftIcon={<FaTrash />}>Delete</Button>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr><td colSpan={6} className="text-center py-4 text-charcoal-light">No promotions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Promotion' : 'Add Promotion'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSavePromotion}>Save Promotion</Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <Input
            label="Promotion Name"
            value={currentPromotion?.name || ''}
            onChange={e => setCurrentPromotion(prev => ({ ...prev, name: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={2}
            value={currentPromotion?.description || ''}
            onChange={e => setCurrentPromotion(prev => ({ ...prev, description: e.target.value }))}
          />
          <Select
            label="Type"
            options={promotionTypeOptions}
            value={currentPromotion?.type || PromotionType.PERCENTAGE_OFF_ORDER}
            onChange={e => setCurrentPromotion(prev => ({ ...prev, type: e.target.value as PromotionType }))}
          />
          <Input
            label={currentPromotion?.type?.includes('Percentage') ? "Percentage Value (e.g., 10 for 10%)" : "Fixed Amount (e.g., 5 for $5.00)"}
            type="number"
            step={currentPromotion?.type?.includes('Percentage') ? "1" : "0.01"}
            min="0"
            value={currentPromotion?.value === undefined ? '' : currentPromotion.value}
            onChange={e => setCurrentPromotion(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date (Optional)"
              type="date"
              value={currentPromotion?.startDate || ''}
              onChange={e => setCurrentPromotion(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={currentPromotion?.endDate || ''}
              onChange={e => setCurrentPromotion(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-emerald rounded border-charcoal/20 dark:border-charcoal-light/20 bg-cream dark:bg-charcoal focus:ring-emerald"
              checked={currentPromotion?.isActive || false}
              onChange={e => setCurrentPromotion(prev => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="text-sm text-charcoal dark:text-cream-light">Active</span>
          </label>

          <fieldset className="border border-charcoal/20 dark:border-charcoal-light/20 p-3 rounded-md mt-2">
            <legend className="text-sm font-bold px-1 text-charcoal dark:text-cream-light">Conditions (Optional)</legend>
            <Input
              label="Minimum Order Amount (USD)"
              type="number"
              step="0.01"
              min="0"
              value={currentPromotion?.conditions?.minOrderAmount === undefined ? '' : currentPromotion.conditions?.minOrderAmount}
              onChange={e => handleConditionChange('minOrderAmount', parseFloat(e.target.value) || 0)}
              placeholder="e.g., 20 for $20.00"
            />

            {/* Time of Day */}
            <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
              <Input
                label="Start Time (Daily)"
                type="time"
                value={currentPromotion?.conditions?.startTime || ''}
                onChange={e => handleConditionChange('startTime', e.target.value)}
              />
              <Input
                label="End Time (Daily)"
                type="time"
                value={currentPromotion?.conditions?.endTime || ''}
                onChange={e => handleConditionChange('endTime', e.target.value)}
              />
            </div>

            {/* Applicable Categories Multi-Select */}
            <div className="mt-2">
              <label className="block text-sm font-bold text-charcoal dark:text-cream-light mb-1">Applicable Categories (Select multiple)</label>
              <div className="border border-charcoal/20 dark:border-charcoal-light/20 rounded-md p-2 bg-cream dark:bg-charcoal max-h-32 overflow-y-auto grid grid-cols-2 gap-2">
                {knownCategories.map(cat => (
                  <label key={cat} className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-emerald rounded border-charcoal/20 dark:border-charcoal-light/20 bg-cream dark:bg-charcoal focus:ring-emerald"
                      checked={currentPromotion?.conditions?.applicableCategoryIds?.includes(cat) || false}
                      onChange={(e) => {
                        const currentIds = currentPromotion?.conditions?.applicableCategoryIds || [];
                        let newIds;
                        if (e.target.checked) {
                          newIds = [...currentIds, cat];
                        } else {
                          newIds = currentIds.filter(c => c !== cat);
                        }
                        handleConditionChange('applicableCategoryIds', newIds);
                      }}
                    />
                    <span className="text-sm text-charcoal dark:text-cream-light">{cat}</span>
                  </label>
                ))}
                {knownCategories.length === 0 && <span className="text-xs text-gray-500 italic">No categories found.</span>}
              </div>
            </div>
          </fieldset>
        </div>
      </Modal>
    </div>
  );
};

export default PromotionManagement;