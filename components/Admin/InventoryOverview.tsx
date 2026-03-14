import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Product, ProductCategory, ModifierGroup } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { generateProductInventoryReportPDF } from '../../services/pdfService';
import { FaPlus, FaEdit, FaTrash, FaBoxOpen, FaExclamationTriangle, FaMagic, FaTags, FaBrain, FaSync, FaFilePdf, FaImage } from 'react-icons/fa';
import { LOW_STOCK_THRESHOLD, ROLES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

interface CategoryEditInfo {
  oldName: string;
  newName: string;
}

// Helper component for Image Upload and Preview
const ImageUploadControl: React.FC<{
  currentImageUrl: string;
  onImageUrlChange: (url: string) => void;
}> = ({ currentImageUrl, onImageUrlChange }) => {

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("Image size should not exceed 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = (e) => {
        // Auto-compress image to ensure it fits in database
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 800; // Resize to max 800px

          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG 70% quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            onImageUrlChange(dataUrl);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-charcoal dark:text-cream-light mb-2">Product Image</label>
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 bg-cream dark:bg-charcoal-dark/50 rounded-lg flex items-center justify-center overflow-hidden border border-charcoal/10 dark:border-cream-light/10">
          {currentImageUrl ? (
            <img src={currentImageUrl} alt="Product Preview" className="w-full h-full object-cover" />
          ) : (
            <span className="w-12 h-12 text-charcoal-light/50"><FaImage /></span>
          )}
        </div>
        <div className="flex-grow space-y-2">
          <Input
            label="Image URL"
            value={currentImageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            placeholder="https://... or upload an image"
          />
          <label htmlFor="imageUpload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-charcoal/20 dark:border-charcoal-light/20 text-sm font-bold rounded-lg text-charcoal dark:text-cream-light bg-cream-light dark:bg-charcoal-dark hover:bg-cream dark:hover:bg-charcoal">
            Upload Image
          </label>
          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
};


const InventoryOverview: React.FC = () => {
  const {
    products, addProduct, updateProduct, deleteProduct,
    knownCategories, addCategory, updateCategoryName, deleteCategory,
    currentStoreId
  } = useShop();
  const { currentUser } = useAuth();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [editingCategoryInfo, setEditingCategoryInfo] = useState<CategoryEditInfo | null>(null);

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);

  useEffect(() => {
    if (currentStoreId) {
      fetch(`/api/modifiers?storeId=${currentStoreId}`)
        .then(res => res.json())
        .then(data => setModifierGroups(data))
        .catch(err => console.error('Error fetching modifiers:', err));
    }
  }, [currentStoreId]);

  const canManageInventory = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === ROLES.ADMIN && !currentUser.storeId) {
      return !!currentStoreId;
    }
    if (currentUser.role === ROLES.STORE_ADMIN && currentUser.storeId) {
      return currentUser.storeId === currentStoreId;
    }
    return false;
  }, [currentUser, currentStoreId]);

  const dynamicCategoryOptions = useMemo(() => {
    return knownCategories.map(cat => ({ value: cat, label: cat }));
  }, [knownCategories]);

  const openProductModalForCreate = () => {
    if (!canManageInventory) { alert("Please select a store or ensure you have management permissions."); return; }
    setCurrentProduct({
      name: '',
      price: 0,
      category: dynamicCategoryOptions[0]?.value || ProductCategory.UNCATEGORIZED,
      stock: 0,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
      description: ''
    });
    setIsEditingProduct(false);
    setIsProductModalOpen(true);
  };

  const openProductModalForEdit = (product: Product) => {
    if (!canManageInventory) { alert("Please select a store or ensure you have management permissions."); return; }
    setCurrentProduct(product);
    setIsEditingProduct(true);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => setIsProductModalOpen(false);

  const handleSaveProduct = () => {
    if (!canManageInventory) { alert("No store selected or no permission. Cannot save product."); return; }
    if (currentProduct && currentProduct.name && typeof currentProduct.price === 'number' && currentProduct.price >= 0 && currentProduct.category && typeof currentProduct.stock === 'number' && currentProduct.stock >= 0) {
      if (isEditingProduct && currentProduct.id) {
        updateProduct(currentProduct as Product);
      } else {
        addProduct(currentProduct as Omit<Product, 'id' | 'storeId'>);
      }
      closeProductModal();
    } else {
      alert("Please fill in all required fields with valid values.");
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (!canManageInventory) { alert("No store selected or no permission."); return; }
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(productId);
    }
  };

  const lowStockProducts = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);

  const openEditCategoryModal = (categoryName: string) => {
    if (!canManageInventory) { alert("Please select a store or ensure you have management permissions."); return; }
    setEditingCategoryInfo({ oldName: categoryName, newName: categoryName });
    setIsEditCategoryModalOpen(true);
  };
  const closeEditCategoryModal = () => { setIsEditCategoryModalOpen(false); setEditingCategoryInfo(null); };
  const handleSaveCategoryName = async () => {
    if (!canManageInventory) return;
    if (editingCategoryInfo && editingCategoryInfo.newName.trim() !== '') {
      if (await updateCategoryName(editingCategoryInfo.oldName, editingCategoryInfo.newName.trim())) {
        closeEditCategoryModal();
      }
    } else { alert("New category name cannot be empty."); }
  };
  const openAddCategoryModal = () => {
    if (!canManageInventory) { alert("Please select a store or ensure you have management permissions."); return; }
    setNewCategoryName(''); setIsAddCategoryModalOpen(true);
  };
  const handleAddCategory = async () => {
    if (!canManageInventory) return;
    if (await addCategory(newCategoryName)) {
      setIsAddCategoryModalOpen(false); setNewCategoryName('');
    }
  };
  const confirmDeleteCategory = (categoryName: string) => { if (!canManageInventory) { alert("Select store or ensure permission."); return; } setCategoryToDelete(categoryName); };
  const executeDeleteCategory = async () => {
    if (!canManageInventory || !categoryToDelete) return;
    if (await deleteCategory(categoryToDelete)) {
      if (currentProduct && currentProduct.category === categoryToDelete) {
        setCurrentProduct(prev => prev ? { ...prev, category: dynamicCategoryOptions[0]?.value || ProductCategory.UNCATEGORIZED } : null);
      }
    }
    setCategoryToDelete(null);
  };

  const handleDownloadInventoryReport = async () => {
    if (!canManageInventory || products.length === 0) { alert("No inventory data for selected store or no store/permission."); return; }
    setIsGeneratingPDF(true);
    try { await new Promise(resolve => setTimeout(resolve, 50)); generateProductInventoryReportPDF(products); }
    catch (error) { console.error("Error generating inventory PDF:", error); alert("Failed to generate PDF report."); }
    setIsGeneratingPDF(false);
  };

  if (!canManageInventory) {
    if (currentUser?.role === ROLES.ADMIN && !currentUser.storeId && !currentStoreId) {
      return <p className="text-center py-10 text-lg">Please select a store from the Navbar to manage its product inventory.</p>;
    }
    return <p className="text-center py-10 text-lg">Inventory cannot be accessed. Ensure a store is selected and you have appropriate permissions.</p>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center"><span className="mr-2 text-emerald"><FaBoxOpen /></span>Product Inventory</h2>
        <div className="flex space-x-2">
          <Button onClick={handleDownloadInventoryReport} disabled={isGeneratingPDF || products.length === 0} leftIcon={<FaFilePdf />} variant="secondary">
            {isGeneratingPDF ? 'Generating...' : "PDF Report"}
          </Button>
          <Button onClick={openProductModalForCreate} leftIcon={<FaPlus />}>Add Product</Button>
        </div>
      </div>

      <div className="space-y-4">
        {lowStockProducts.length > 0 && (
          <div className="p-4 bg-terracotta/10 border-l-4 border-terracotta text-terracotta-dark dark:text-terracotta rounded-lg">
            <h3 className="font-bold flex items-center"><span className="mr-2"><FaExclamationTriangle /></span>Low Stock Alert!</h3>
            <p className="text-sm">({LOW_STOCK_THRESHOLD} or fewer units): {lowStockProducts.map(p => p.name).join(', ')}</p>
          </div>
        )}

        <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
            <thead className="bg-cream dark:bg-charcoal-dark/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
              {products.map(product => (
                <tr key={product.id} className={`${product.stock <= LOW_STOCK_THRESHOLD ? 'bg-terracotta/10' : ''} hover:bg-cream dark:hover:bg-charcoal-dark/50`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light font-bold">{product.stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openProductModalForEdit(product)} leftIcon={<FaEdit />}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteProduct(product.id)} leftIcon={<FaTrash />}>Delete</Button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-charcoal-light">No products found for the selected store.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-charcoal/10 dark:border-cream-light/10 bg-cream dark:bg-charcoal-dark/30 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-charcoal-dark dark:text-cream-light flex items-center"><span className="mr-2 text-emerald"><FaTags /></span>Manage Product Categories</h2>
          <Button onClick={openAddCategoryModal} leftIcon={<FaPlus />}>Add Category</Button>
        </div>
        {knownCategories.length > 0 ? (
          <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
              <thead className="bg-cream dark:bg-charcoal-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Category Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
                {knownCategories.map(category => (
                  <tr key={category} className="hover:bg-cream dark:hover:bg-charcoal-dark/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditCategoryModal(category)} leftIcon={<FaEdit />}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => confirmDeleteCategory(category)} leftIcon={<FaTrash />}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-charcoal-light text-center py-4">No categories found for this store.</p>
        )}
      </div>

      <Modal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        title={isEditingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeProductModal}>Cancel</Button>
            <Button onClick={handleSaveProduct}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Product Name" value={currentProduct?.name || ''} onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })} />
          <Select label="Category" options={dynamicCategoryOptions} value={currentProduct?.category || ''} onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })} />
          <Input label="Price" type="number" step="0.01" value={currentProduct?.price === undefined ? '' : currentProduct.price} onChange={e => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })} />
          <Input label="Stock Quantity" type="number" value={currentProduct?.stock === undefined ? '' : currentProduct.stock} onChange={e => setCurrentProduct({ ...currentProduct, stock: parseInt(e.target.value) || 0 })} />
          <ImageUploadControl
            currentImageUrl={currentProduct?.imageUrl || ''}
            onImageUrlChange={(url) => setCurrentProduct(prev => prev ? { ...prev, imageUrl: url } : null)}
          />
          <div>
            <Textarea label="Description" rows={3} value={currentProduct?.description || ''} onChange={e => setCurrentProduct(prev => prev ? { ...prev, description: e.target.value } : null)} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-charcoal dark:text-cream-light">Applicable Modifiers</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-cream-light dark:bg-charcoal/20 rounded-lg border border-charcoal/5">
              {modifierGroups.map(group => (
                <label key={group.id} className="flex items-center gap-2 cursor-pointer hover:bg-emerald/5 p-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={currentProduct?.modifierGroups?.includes(group.id) || false}
                    onChange={(e) => {
                      const current = currentProduct?.modifierGroups || [];
                      const updated = e.target.checked
                        ? [...current, group.id]
                        : current.filter(id => id !== group.id);
                      setCurrentProduct({ ...currentProduct, modifierGroups: updated });
                    }}
                    className="accent-emerald"
                  />
                  <span className="text-sm dark:text-cream-light">{group.name}</span>
                </label>
              ))}
              {modifierGroups.length === 0 && (
                <p className="text-xs text-charcoal-light italic p-2 col-span-2">No modifier groups found for this store.</p>
              )}
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isEditCategoryModalOpen}
        onClose={closeEditCategoryModal}
        title="Edit Category Name"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeEditCategoryModal}>Cancel</Button>
            <Button onClick={handleSaveCategoryName}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Current Name" value={editingCategoryInfo?.oldName || ''} disabled />
          <Input label="New Name" value={editingCategoryInfo?.newName || ''} onChange={e => setEditingCategoryInfo(prev => prev ? { ...prev, newName: e.target.value } : null)} />
        </div>
      </Modal>
      <Modal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        title="Add Category"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsAddCategoryModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory}>Add</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Category Name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
        </div>
      </Modal>
      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title="Confirm Delete Category"
        size="sm"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={executeDeleteCategory}>Delete</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p>Delete "<strong>{categoryToDelete}</strong>"?</p>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryOverview;