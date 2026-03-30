import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Feedback } from '../../types';
import Button from '../Shared/Button';
import Select from '../Shared/Select';
import { FaStar, FaCommentDots, FaSync, FaBrain } from 'react-icons/fa';
import LoadingSpinner from '../Shared/LoadingSpinner';

const StarRatingDisplay: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((star) => (
      <FaStar
        key={star}
        className={star <= rating ? 'text-yellow-400' : 'text-charcoal/20 dark:text-charcoal-light/20'}
      />
    ))}
  </div>
);

const CustomerFeedbackView: React.FC = () => {
  const { feedbackList } = useShop();
  const [filterRating, setFilterRating] = useState<number>(0); // 0 for all ratings

  const filteredFeedback = useMemo(() => {
    if (filterRating === 0) {
      return feedbackList;
    }
    return feedbackList.filter(fb => fb.rating === filterRating);
  }, [feedbackList, filterRating]);

  const averageRating = useMemo(() => {
    const ratedFeedback = feedbackList.filter(fb => typeof fb.rating === 'number' && fb.rating > 0);
    if (ratedFeedback.length === 0) return 0;
    const sum = ratedFeedback.reduce((acc, fb) => acc + (fb.rating || 0), 0);
    return sum / ratedFeedback.length;
  }, [feedbackList]);

  const ratingOptions = [
    { value: 0, label: 'All Ratings' },
    { value: 5, label: '5 Stars' },
    { value: 4, label: '4 Stars' },
    { value: 3, label: '3 Stars' },
    { value: 2, label: '2 Stars' },
    { value: 1, label: '1 Star' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <FaStar className="mr-2 text-emerald" />Customer Feedback
        </h2>
        <div className="mt-2 sm:mt-0">
          <Select
            options={ratingOptions}
            value={filterRating}
            onChange={(e) => setFilterRating(parseInt(e.target.value))}
            label="Filter by Rating:"
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-bold text-charcoal-dark dark:text-cream-light">Average Rating</h3>
          <div className="flex items-center justify-center mt-1">
            <StarRatingDisplay rating={averageRating} />
            <span className="ml-2 text-2xl font-bold text-emerald">{averageRating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-charcoal-light">({feedbackList.filter(fb => fb.rating).length} ratings)</p>
        </div>
      </div>
      
      <div className="bg-cream dark:bg-charcoal-dark/50 p-3 rounded-lg shadow">
        <h3 className="text-xl font-bold text-charcoal-dark dark:text-cream-light mb-3">Feedback Entries ({filteredFeedback.length})</h3>
        {filteredFeedback.length === 0 ? (
          <p className="text-center text-charcoal-light py-6">No feedback entries match your filter.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {filteredFeedback.map(fb => (
              <div key={fb.id} className="p-3 bg-cream-light dark:bg-charcoal-dark rounded-md shadow-sm border border-charcoal/10 dark:border-cream-light/10">
                <div className="flex justify-between items-start mb-1">
                  {fb.rating && <StarRatingDisplay rating={fb.rating} />}
                  <span className="text-xs text-charcoal-light/80">{new Date(fb.timestamp).toLocaleString()}</span>
                </div>
                {fb.comment && (
                  <p className="text-sm text-charcoal dark:text-cream-light mt-1 whitespace-pre-wrap">{fb.comment}</p>
                )}
                {!fb.rating && !fb.comment && (
                    <p className="text-sm text-charcoal-light italic">No rating or comment provided.</p>
                )}
                <p className="text-xs text-charcoal-light/80 mt-2">
                  Order ID: {fb.orderId ? fb.orderId.slice(-6) : 'N/A'} | Logged by: Staff {fb.givenByUserId ? fb.givenByUserId.slice(-4) : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerFeedbackView;