import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { ComboProduct, ComboItem, Product } from '../../types';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

const ComboManagement: React.FC = () => {
    const { currentStoreId } = useShop();
    const { token } = useAuth();
    const [combos, setCombos] = useState<ComboProduct[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCombo, setEditingCombo] = useState<ComboProduct | null>(null);
    const [formData, setFormData] = useState<Partial<ComboProduct>>({
        name: '',
        description: '',
        imageUrl: '',
        comboItems: [],
        comboPrice: 0,
        category: 'Combos',
        isActive: true
    });

    useEffect(() => {
        if (currentStoreId) {
            fetchCombos();
            fetchProducts();
        }
    }, [currentStoreId]);

    const fetchCombos = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/combos?storeId=${currentStoreId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setCombos(data);
        } catch (err) {
            console.error('Error fetching combos:', err);
        }
    };

    const fetchProducts = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/products?storeId=${currentStoreId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const calculateRegularPrice = (items: ComboItem[]): number => {
        return items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + (product ? product.price * item.quantity : 0);
        }, 0);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.comboItems || formData.comboItems.length === 0) {
            alert('Please fill in all required fields and add at least one item');
            return;
        }

        const regularPrice = calculateRegularPrice(formData.comboItems);
        const savings = regularPrice - (formData.comboPrice || 0);

        const combo: ComboProduct = {
            id: editingCombo?.id || `combo-${Date.now()}`,
            name: formData.name!,
            description: formData.description || '',
            imageUrl: formData.imageUrl || '',
            comboItems: formData.comboItems,
            comboPrice: formData.comboPrice || 0,
            regularPrice,
            savings,
            category: formData.category || 'Combos',
            storeId: currentStoreId!,
            isActive: formData.isActive !== false
        };

        try {
            const url = editingCombo ? `/api/combos/${combo.id}` : '/api/combos';
            const method = editingCombo ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(combo)
            });

            fetchCombos();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving combo:', err);
            alert('Failed to save combo');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this combo?')) return;

        try {
            await fetch(`/api/combos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchCombos();
        } catch (err) {
            console.error('Error deleting combo:', err);
        }
    };

    const handleEdit = (combo: ComboProduct) => {
        setEditingCombo(combo);
        setFormData(combo);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCombo(null);
        setFormData({
            name: '',
            description: '',
            imageUrl: '',
            comboItems: [],
            comboPrice: 0,
            category: 'Combos',
            isActive: true
        });
    };

    const addComboItem = () => {
        setFormData({
            ...formData,
            comboItems: [
                ...(formData.comboItems || []),
                { productId: '', quantity: 1, allowModifiers: false }
            ]
        });
    };

    const updateComboItem = (index: number, field: keyof ComboItem, value: any) => {
        const items = [...(formData.comboItems || [])];
        items[index] = { ...items[index], [field]: value };
        setFormData({ ...formData, comboItems: items });
    };

    const removeComboItem = (index: number) => {
        const items = [...(formData.comboItems || [])];
        items.splice(index, 1);
        setFormData({ ...formData, comboItems: items });
    };

    const regularPrice = calculateRegularPrice(formData.comboItems || []);
    const savings = regularPrice - (formData.comboPrice || 0);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Meal Combos</h2>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<FaPlus />}>
                    Create Combo
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {combos.map(combo => (
                    <div key={combo.id} className="bg-white dark:bg-charcoal-dark rounded-lg shadow p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-charcoal-dark dark:text-cream-light">{combo.name}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(combo)} className="text-blue-500 hover:text-blue-700">
                                    <FaEdit />
                                </button>
                                <button onClick={() => handleDelete(combo.id)} className="text-red-500 hover:text-red-700">
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{combo.description}</p>
                        <div className="text-sm mb-2">
                            <div className="font-semibold">Items: {combo.comboItems.length}</div>
                            <div className="text-gray-600">Regular: ${combo.regularPrice.toFixed(2)}</div>
                            <div className="text-emerald font-bold">Combo: ${combo.comboPrice.toFixed(2)}</div>
                            <div className="text-emerald text-xs">Save ${combo.savings.toFixed(2)}</div>
                        </div>
                        <div className={`text-xs ${combo.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {combo.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCombo ? 'Edit Combo' : 'Create Combo'}
                size="lg"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-charcoal-dark dark:text-cream-light">Combo Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 bg-charcoal-light border-none rounded text-white placeholder-cream/50 shadow-inner focus:ring-2 focus:ring-emerald"
                            placeholder="e.g., Breakfast Combo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-charcoal-dark dark:text-cream-light">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-2 bg-charcoal-light border-none rounded text-white placeholder-cream/50 shadow-inner focus:ring-2 focus:ring-emerald"
                            rows={2}
                            placeholder="Describe the combo..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-charcoal-dark dark:text-cream-light">Combo Price *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.comboPrice}
                            onChange={(e) => setFormData({ ...formData, comboPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald font-bold"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold">Combo Items *</label>
                            <Button onClick={addComboItem} size="sm" leftIcon={<FaPlus />}>Add Item</Button>
                        </div>

                        {(formData.comboItems || []).map((item, index) => (
                            <div key={index} className="flex gap-2 mb-2 items-center">
                                <select
                                    value={item.productId}
                                    onChange={(e) => updateComboItem(index, 'productId', e.target.value)}
                                    className="flex-1 p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald"
                                >
                                    <option value="" className="text-charcoal-dark">Select Product</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id} className="text-charcoal-dark font-medium">{p.name} (${p.price})</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateComboItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                    className="w-20 p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald text-center font-bold"
                                    placeholder="Qty"
                                />
                                <button onClick={() => removeComboItem(index)} className="text-red-500">
                                    <FaTimes />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-emerald/10 p-3 rounded text-charcoal-dark font-medium">
                        <div className="text-sm">
                            <div>Regular Price: ${regularPrice.toFixed(2)}</div>
                            <div className="font-bold text-emerald">Combo Price: ${(formData.comboPrice || 0).toFixed(2)}</div>
                            <div className="text-emerald">Savings: ${savings.toFixed(2)} ({savings > 0 ? ((savings / regularPrice) * 100).toFixed(0) : 0}% off)</div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSave} leftIcon={<FaSave />} className="flex-1">Save Combo</Button>
                        <Button onClick={handleCloseModal} variant="secondary" leftIcon={<FaTimes />}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ComboManagement;
