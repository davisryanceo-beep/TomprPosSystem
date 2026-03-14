import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { AddOn, ProductCategory } from '../../types';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

const AddOnManagement: React.FC = () => {
    const { currentStoreId } = useShop();
    const { token } = useAuth();
    const [addons, setAddons] = useState<AddOn[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddOn, setEditingAddOn] = useState<AddOn | null>(null);
    const [formData, setFormData] = useState<Partial<AddOn>>({
        name: '',
        price: 0,
        category: 'Extras',
        applicableCategories: [],
        isActive: true
    });

    const categories = Object.values(ProductCategory);
    const addonCategories = ['Toppings', 'Extras', 'Sides', 'Sauces'];

    useEffect(() => {
        if (currentStoreId) fetchAddOns();
    }, [currentStoreId]);

    const fetchAddOns = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/addons?storeId=${currentStoreId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAddons(data);
        } catch (err) {
            console.error('Error fetching add-ons:', err);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            alert('Please fill in all required fields');
            return;
        }

        const addon: AddOn = {
            id: editingAddOn?.id || `addon-${Date.now()}`,
            name: formData.name!,
            price: formData.price!,
            category: formData.category || 'Extras',
            applicableCategories: formData.applicableCategories || [],
            storeId: currentStoreId!,
            isActive: formData.isActive !== false
        };

        try {
            const url = editingAddOn ? `/api/addons/${addon.id}` : '/api/addons';
            const method = editingAddOn ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addon)
            });

            fetchAddOns();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving add-on:', err);
            alert('Failed to save add-on');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this add-on?')) return;

        try {
            await fetch(`/api/addons/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchAddOns();
        } catch (err) {
            console.error('Error deleting add-on:', err);
        }
    };

    const handleEdit = (addon: AddOn) => {
        setEditingAddOn(addon);
        setFormData(addon);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAddOn(null);
        setFormData({
            name: '',
            price: 0,
            category: 'Extras',
            applicableCategories: [],
            isActive: true
        });
    };

    const toggleCategory = (category: string) => {
        const current = formData.applicableCategories || [];
        const updated = current.includes(category)
            ? current.filter(c => c !== category)
            : [...current, category];
        setFormData({ ...formData, applicableCategories: updated });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add-ons & Extras</h2>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<FaPlus />}>
                    Create Add-on
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {addons.map(addon => (
                    <div key={addon.id} className="bg-white dark:bg-charcoal-dark rounded-lg shadow p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-charcoal-dark dark:text-cream-light">{addon.name}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(addon)} className="text-blue-500 hover:text-blue-700">
                                    <FaEdit />
                                </button>
                                <button onClick={() => handleDelete(addon.id)} className="text-red-500 hover:text-red-700">
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                        <div className="text-emerald font-bold mb-2">+${addon.price.toFixed(2)}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Category: {addon.category}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            Applies to: {addon.applicableCategories.length > 0 ? addon.applicableCategories.join(', ') : 'All'}
                        </div>
                        <div className={`text-xs ${addon.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {addon.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingAddOn ? 'Edit Add-on' : 'Create Add-on'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-charcoal-dark dark:text-cream-light">Add-on Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 bg-charcoal-light border-none rounded text-white placeholder-cream/50 shadow-inner focus:ring-2 focus:ring-emerald"
                            placeholder="e.g., Extra Shot, Whipped Cream"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-charcoal-dark dark:text-cream-light">Price *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald font-bold"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-charcoal-dark dark:text-cream-light">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald"
                        >
                            {addonCategories.map(cat => (
                                <option key={cat} value={cat} className="text-charcoal-dark font-medium">{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-charcoal-dark dark:text-cream-light">Applicable to Products</label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map(category => (
                                <label key={category} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={(formData.applicableCategories || []).includes(category)}
                                        onChange={() => toggleCategory(category)}
                                        className="accent-emerald w-4 h-4"
                                    />
                                    <span className="text-sm text-charcoal-dark dark:text-cream-light font-medium group-hover:text-emerald transition-colors">{category}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 italic">Leave empty to apply to all products</p>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSave} leftIcon={<FaSave />} className="flex-1">Save Add-on</Button>
                        <Button onClick={handleCloseModal} variant="secondary" leftIcon={<FaTimes />}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AddOnManagement;
