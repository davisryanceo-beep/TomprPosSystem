import React from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Promotion, Order, PromotionType } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';

interface ApplyPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrder: Order | null;
}

const ApplyPromotionModal: React.FC<ApplyPromotionModalProps> = ({ isOpen, onClose, currentOrder }) => {
  const { getActiveAndApplicablePromotions, applyPromotionToCurrentOrder } = useShop();

  if (!isOpen || !currentOrder) return null;

  const applicablePromotions = getActiveAndApplicablePromotions(currentOrder);

  const handleApplyPromotion = (promotionId: string) => {
    applyPromotionToCurrentOrder(promotionId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Promotion"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {applicablePromotions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No promotions currently applicable to this order.</p>
        ) : (
          applicablePromotions.map(promo => (
            <div key={promo.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700">
              <div>
                <h4 className="font-semibold text-coffee-dark dark:text-coffee-light">{promo.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{promo.description}</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {promo.type === PromotionType.PERCENTAGE_OFF_ORDER || promo.type === PromotionType.PERCENTAGE_OFF_ITEM
                    ? `${promo.value}% off`
                    : `$${promo.value.toFixed(2)} off`}
                </p>
              </div>
              <Button size="sm" onClick={() => handleApplyPromotion(promo.id)}>Apply</Button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default ApplyPromotionModal;