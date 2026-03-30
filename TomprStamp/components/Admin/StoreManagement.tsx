import React, { useState } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Store } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Textarea from '../Shared/Textarea';
import { FaStore, FaPlus, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';

interface StoreManagementProps {
  onSelectStore?: () => void;
}

const StoreManagement: React.FC<StoreManagementProps> = ({ onSelectStore }) => {
  const { stores, addStore, updateStore, deleteStore, setCurrentStoreId } = useShop();
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Store> | null>(null);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null); // New state for delete confirmation


  const openStoreModalForCreate = () => {
    setCurrentStore({
      name: '',
      address: '',
      contactInfo: '',
      currencyCode: 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      logoUrl: '',
      backgroundImageUrl: '',
      accentColor: '#10b981',
      welcomeMessage: 'Welcome! Your order will appear here.'
    });
    setIsEditingStore(false);
    setIsStoreModalOpen(true);
  };

  const openStoreModalForEdit = (store: Store) => {
    const { licenseExpiryDate, ...storeDetails } = store;
    setCurrentStore(storeDetails);
    setIsEditingStore(true);
    setIsStoreModalOpen(true);
  };

  const closeStoreModal = () => {
    setIsStoreModalOpen(false);
    setCurrentStore(null);
  };

  const handleSaveStore = () => {
    if (currentStore && currentStore.name) {
      if (isEditingStore && currentStore.id) {
        const originalStore = stores.find(s => s.id === currentStore.id);
        if (originalStore) {
          updateStore({ ...originalStore, ...currentStore } as Store);
        } else {
          alert("Original store not found. Cannot update.");
          return;
        }
      } else {
        addStore(currentStore as Omit<Store, 'id' | 'createdAt' | 'licenseExpiryDate'>);
      }
      closeStoreModal();
    } else {
      alert("Store name is required.");
    }
  };

  // Opens the confirmation modal
  const handleDeleteStore = (store: Store) => {
    setStoreToDelete(store);
  };

  // Executes the deletion from the modal
  const executeDelete = () => {
    if (storeToDelete) {
      deleteStore(storeToDelete.id);
      setStoreToDelete(null); // Close modal and reset state
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <span className="mr-2 text-emerald"><FaStore /></span>Manage Stores
        </h2>
        <Button onClick={openStoreModalForCreate} leftIcon={<FaPlus />}>Add New Store</Button>
      </div>

      <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream dark:bg-charcoal-dark/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Address</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {stores.map(store => (
              <tr key={store.id} className="hover:bg-cream dark:hover:bg-charcoal-dark/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{store.name}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light">{store.address || '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal-light">{store.contactInfo || '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                  <Button variant="primary" size="sm" onClick={() => { setCurrentStoreId(store.id); onSelectStore?.(); }} leftIcon={<FaStore />}>Manage</Button>
                  <Button variant="ghost" size="sm" onClick={() => openStoreModalForEdit(store)} leftIcon={<FaEdit />}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteStore(store)} leftIcon={<FaTrash />}>Delete</Button>
                </td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr><td colSpan={4} className="text-center py-4 text-charcoal-light">No stores found. Add a store to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isStoreModalOpen}
        onClose={closeStoreModal}
        title={isEditingStore ? 'Edit Store Details' : 'Add New Store'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeStoreModal}>Cancel</Button>
            <Button onClick={handleSaveStore}>{isEditingStore ? 'Save Changes' : 'Add Store'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Store Name" value={currentStore?.name || ''} onChange={e => setCurrentStore(prev => ({ ...prev, name: e.target.value }))} required />
          <Textarea label="Address (Optional)" rows={2} value={currentStore?.address || ''} onChange={e => setCurrentStore(prev => ({ ...prev, address: e.target.value }))} />
          <Input label="Contact Info (Optional)" value={currentStore?.contactInfo || ''} onChange={e => setCurrentStore(prev => ({ ...prev, contactInfo: e.target.value }))} placeholder="e.g., Phone number or email" />
          <Input label="Default Currency Code (Optional)" value={currentStore?.currencyCode || 'USD'} onChange={e => setCurrentStore(prev => ({ ...prev, currencyCode: e.target.value }))} placeholder="e.g., USD, KHR" />
          <Input label="Timezone (Optional)" value={currentStore?.timezone || ''} onChange={e => setCurrentStore(prev => ({ ...prev, timezone: e.target.value }))} placeholder="e.g., America/New_York, Asia/Phnom_Penh" />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!storeToDelete}
        onClose={() => setStoreToDelete(null)}
        title="Confirm Store Deletion"
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setStoreToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={executeDelete}>Confirm Delete</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-lg text-charcoal-dark dark:text-cream-light">
            Are you absolutely sure you want to delete the store: <strong>{storeToDelete?.name}</strong>?
          </p>
          <div className="p-3 bg-terracotta/10 border-l-4 border-terracotta text-terracotta-dark dark:text-terracotta rounded-lg text-sm">
            <p className="font-bold flex items-center"><span className="mr-2"><FaExclamationTriangle /></span>This action is irreversible.</p>
            <p className="mt-2 text-charcoal-dark dark:text-cream-light">All associated data will be permanently deleted, including:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Products</li>
              <li>Orders</li>
              <li>Supply Items</li>
              <li>Recipes</li>
              <li>Shifts</li>
              <li>User accounts assigned to this store (except Global Admins)</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StoreManagement;
