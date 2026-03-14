import React from 'react';
import { Recipe } from '../../types';
import Modal from './Modal';
import Button from './Button';

interface RecipeDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
}

const RecipeDisplayModal: React.FC<RecipeDisplayModalProps> = ({ isOpen, onClose, recipe }) => {
  if (!isOpen || !recipe) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Recipe: ${recipe.productName}`}
      size="lg"
      footer={
        <div className="flex justify-end space-x-2">
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div>
          <h4 className="text-md font-semibold text-coffee-dark dark:text-coffee-light mb-1">Ingredients:</h4>
          {recipe.ingredients.length > 0 ? (
            <ul className="list-disc list-inside pl-4 text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
              {recipe.ingredients.map((ing, index) => (
                <li key={ing.id || index}>
                  {ing.quantity} {ing.unit} - {ing.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No ingredients listed.</p>
          )}
        </div>

        <div>
          <h4 className="text-md font-semibold text-coffee-dark dark:text-coffee-light mb-1">Instructions:</h4>
          {recipe.instructions.length > 0 ? (
            <ol className="list-decimal list-inside pl-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              {recipe.instructions.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          ) : (
             <p className="text-sm text-gray-500 dark:text-gray-400">No instructions provided.</p>
          )}
        </div>

        {recipe.notes && (
          <div>
            <h4 className="text-md font-semibold text-coffee-dark dark:text-coffee-light mb-1">Notes:</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{recipe.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RecipeDisplayModal;