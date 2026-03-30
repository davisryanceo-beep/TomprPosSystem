import React, { useState } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import Textarea from '../Shared/Textarea';
import { useShop } from '../../contexts/ShopContext';
import { FaStar } from 'react-icons/fa';

interface FeedbackInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  cashierId: string;
}

const FeedbackInputModal: React.FC<FeedbackInputModalProps> = ({ isOpen, onClose, orderId, cashierId }) => {
  const { addFeedback } = useShop();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  const handleSubmitFeedback = () => {
    addFeedback({
      orderId,
      rating: rating > 0 ? rating : undefined,
      comment: comment.trim() || undefined,
      givenByUserId: cashierId,
    });
    setRating(0);
    setHoverRating(0);
    setComment('');
    onClose();
  };

  const handleSkip = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      title="Customer Feedback"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Feedback
          </Button>
          <Button onClick={handleSubmitFeedback}>
            Submit Feedback
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Overall Rating (Optional)
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                size={28}
                className={`cursor-pointer transition-colors ${
                  (hoverRating || rating) >= star
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              />
            ))}
          </div>
        </div>

        <Textarea
          id="feedbackComment"
          label="Comments (Optional)"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter any customer comments here..."
        />
      </div>
    </Modal>
  );
};

export default FeedbackInputModal;