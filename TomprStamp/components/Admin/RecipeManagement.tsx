import React, { useState, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Recipe, RecipeIngredient, Product, SupplyItem } from '../../types'; // Added SupplyItem
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { FaPlus, FaEdit, FaTrash, FaBookOpen, FaTimes, FaLink } from 'react-icons/fa';

const RecipeManagement: React.FC = () => {
  const { products, recipes, addRecipe, updateRecipe, deleteRecipe, supplyItems } = useShop();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Partial<Recipe> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const productOptions = useMemo(() =>
    products.map(p => ({ value: p.id, label: p.name })),
    [products]);

  const supplyItemOptions = useMemo(() =>
    [{ value: '', label: 'Select Supply Item (Required for Stock Tracking)' },
    ...supplyItems.map(s => ({ value: s.id, label: `${s.name} (${s.unit})` }))]
    , [supplyItems]);

  const openModalForCreate = () => {
    setCurrentRecipe({
      productId: productOptions[0]?.value || '',
      productName: productOptions[0]?.label || '',
      ingredients: [{ id: `ing-${Date.now()}`, name: '', quantity: '', unit: '', supplyItemId: '' }],
      instructions: [''],
      notes: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentRecipe(null);
  };

  const handleSaveRecipe = async () => {
    if (
      currentRecipe &&
      currentRecipe.productId &&
      currentRecipe.ingredients && currentRecipe.ingredients.every(ing => ing.name && ing.quantity && ing.unit && ing.supplyItemId) && // supplyItemId now required
      currentRecipe.instructions && currentRecipe.instructions.every(inst => inst.trim() !== '')
    ) {
      const product = products.find(p => p.id === currentRecipe.productId);
      const recipeToSave: Recipe = {
        ...currentRecipe,
        productName: product?.name || 'Unknown Product',
        ingredients: currentRecipe.ingredients.filter(ing => ing.name.trim() !== '').map(ing => {
          const linkedSupply = supplyItems.find(s => s.id === ing.supplyItemId);
          return {
            ...ing,
            supplyItemName: linkedSupply?.name,
            supplyItemUnit: linkedSupply?.unit,
          };
        }),
        instructions: currentRecipe.instructions.filter(inst => inst.trim() !== ''),
      } as Recipe;

      if (isEditing && currentRecipe.id) {
        await updateRecipe(recipeToSave);
      } else {
        const { id, storeId, ...recipeDataWithoutIdAndStoreId } = recipeToSave;
        await addRecipe(recipeDataWithoutIdAndStoreId as Omit<Recipe, 'id' | 'storeId'>);
      }
      closeModal();
    } else {
      alert("Please fill in all required fields: link to a product, and ensure all ingredients (name, quantity, unit, linked supply item) and instructions are complete.");
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      await deleteRecipe(recipeId);
    }
  };

  const handleIngredientChange = (index: number, field: keyof RecipeIngredient | 'supplyItemLink', value: string) => {
    setCurrentRecipe(prev => {
      if (!prev || !prev.ingredients) return prev;
      const newIngredients = [...prev.ingredients];
      if (field === 'supplyItemLink') {
        const selectedSupply = supplyItems.find(s => s.id === value);
        newIngredients[index] = {
          ...newIngredients[index],
          supplyItemId: value,
          supplyItemName: selectedSupply?.name,
          supplyItemUnit: selectedSupply?.unit
        };
      } else {
        newIngredients[index] = { ...newIngredients[index], [field as keyof RecipeIngredient]: value };
      }
      return { ...prev, ingredients: newIngredients };
    });
  };

  const handleAddIngredient = () => {
    setCurrentRecipe(prev => {
      if (!prev || !prev.ingredients) return prev;
      return {
        ...prev,
        ingredients: [...prev.ingredients, { id: `ing-${Date.now()}`, name: '', quantity: '', unit: '', supplyItemId: '' }]
      };
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setCurrentRecipe(prev => {
      if (!prev || !prev.ingredients) return prev;
      const newIngredients = prev.ingredients.filter((_, i) => i !== index);
      return { ...prev, ingredients: newIngredients };
    });
  };

  const handleInstructionChange = (index: number, value: string) => {
    setCurrentRecipe(prev => {
      if (!prev || !prev.instructions) return prev;
      const newInstructions = [...prev.instructions];
      newInstructions[index] = value;
      return { ...prev, instructions: newInstructions };
    });
  };

  const handleAddInstruction = () => {
    setCurrentRecipe(prev => {
      if (!prev || !prev.instructions) return prev;
      return {
        ...prev,
        instructions: [...prev.instructions, '']
      };
    });
  };

  const handleRemoveInstruction = (index: number) => {
    setCurrentRecipe(prev => {
      if (!prev || !prev.instructions) return prev;
      const newInstructions = prev.instructions.filter((_, i) => i !== index);
      return { ...prev, instructions: newInstructions };
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <FaBookOpen className="mr-2 text-emerald" />Recipe Management
        </h2>
        <Button onClick={openModalForCreate} leftIcon={<FaPlus />} disabled={products.length === 0}>
          Add Recipe
        </Button>
      </div>
      {products.length === 0 && <p className="text-sm text-terracotta">Add products first to create recipes for them.</p>}

      <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream dark:bg-charcoal-dark/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Ingredients Count</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {recipes.map(recipe => (
              <tr key={recipe.id} className="hover:bg-cream dark:hover:bg-charcoal-dark/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{recipe.productName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light">{recipe.ingredients.length}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openModalForEdit(recipe)} leftIcon={<FaEdit />}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteRecipe(recipe.id)} leftIcon={<FaTrash />}>Delete</Button>
                </td>
              </tr>
            ))}
            {recipes.length === 0 && (
              <tr><td colSpan={3} className="text-center py-4 text-charcoal-light">No recipes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Recipe' : 'Add Recipe'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSaveRecipe}>Save Recipe</Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <Select
            label="Product to link recipe to"
            options={productOptions}
            value={currentRecipe?.productId || ''}
            onChange={e => setCurrentRecipe(prev => ({ ...prev, productId: e.target.value }))}
            disabled={products.length === 0}
          />

          <div>
            <h4 className="text-md font-bold text-charcoal dark:text-cream-light mb-2">Ingredients</h4>
            {currentRecipe?.ingredients?.map((ing, index) => (
              <div key={ing.id || index} className="grid grid-cols-12 gap-2 mb-2 p-2 border border-charcoal/10 dark:border-cream-light/10 rounded-md">
                <Input className="col-span-3" placeholder="Name" value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} />
                <Input className="col-span-2" placeholder="Qty" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', e.target.value)} />
                <Input className="col-span-2" placeholder="Unit" value={ing.unit} onChange={e => handleIngredientChange(index, 'unit', e.target.value)} />
                <Select className="col-span-4" options={supplyItemOptions} value={ing.supplyItemId} onChange={e => handleIngredientChange(index, 'supplyItemLink', e.target.value)} />
                <Button variant="ghost" className="col-span-1 !p-2 text-terracotta" onClick={() => handleRemoveIngredient(index)}><FaTimes /></Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={handleAddIngredient} leftIcon={<FaPlus />}>Add Ingredient</Button>
          </div>

          <div>
            <h4 className="text-md font-bold text-charcoal dark:text-cream-light mb-2">Instructions</h4>
            {currentRecipe?.instructions?.map((inst, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <span className="font-bold">{index + 1}.</span>
                <Input className="flex-grow" placeholder={`Step ${index + 1}`} value={inst} onChange={e => handleInstructionChange(index, e.target.value)} />
                <Button variant="ghost" className="!p-2 text-terracotta" onClick={() => handleRemoveInstruction(index)}><FaTimes /></Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={handleAddInstruction} leftIcon={<FaPlus />}>Add Instruction Step</Button>
          </div>

          <Textarea label="Notes (Optional)" rows={2} value={currentRecipe?.notes || ''} onChange={e => setCurrentRecipe(prev => ({ ...prev, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default RecipeManagement;