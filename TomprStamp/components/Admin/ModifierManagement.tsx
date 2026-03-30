import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { ModifierGroup, Modifier } from '../../types';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaLayerGroup } from 'react-icons/fa';

const ModifierManagement: React.FC = () => {
    const { currentStoreId } = useShop();
    const { token } = useAuth();
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
    const [formData, setFormData] = useState<Partial<ModifierGroup>>({
        name: '',
        type: 'single',
        required: false,
        modifiers: []
    });

    useEffect(() => {
        if (currentStoreId) fetchModifierGroups();
    }, [currentStoreId]);

    const fetchModifierGroups = async () => {
        try {
            const res = await fetch(`/api/modifiers?storeId=${currentStoreId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setModifierGroups(data);
            } else {
                console.error('Modifiers API did not return an array:', data);
                setModifierGroups([]);
            }
        } catch (err) {
            console.error('Error fetching modifier groups:', err);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.modifiers || formData.modifiers.length === 0) {
            alert('Please fill in required fields and add at least one modifier option');
            return;
        }

        const group: ModifierGroup = {
            id: editingGroup?.id || `modgroup-${Date.now()}`,
            name: formData.name!,
            type: formData.type || 'single',
            required: formData.required || false,
            modifiers: formData.modifiers as Modifier[],
            storeId: currentStoreId!
        };

        try {
            const url = editingGroup ? `/api/modifiers/${group.id}` : '/api/modifiers';
            const method = editingGroup ? 'PUT' : 'POST';

            // DEBUG: Check token
            if (!token) {
                alert("DEBUG ERROR: No authentication token found! Please log out and log in again.");
                return;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(group)
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Server Error:", errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    alert(`Save Failed: ${errorJson.error}\nDetails: ${errorJson.details}`);
                } catch (e) {
                    alert(`Save Failed (Status ${res.status}): ${errorText.substring(0, 100)}`);
                }
                return;
            }

            fetchModifierGroups();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving modifier group:', err);
            alert(`Failed to save modifier group: ${err}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this modifier group? This may affect products using it.')) return;

        try {
            await fetch(`/api/modifiers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchModifierGroups();
        } catch (err) {
            console.error('Error deleting modifier group:', err);
        }
    };

    const handleEdit = (group: ModifierGroup) => {
        setEditingGroup(group);
        setFormData(group);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingGroup(null);
        setFormData({
            name: '',
            type: 'single',
            required: false,
            modifiers: []
        });
    };

    const addModifierOption = () => {
        const newMod: Modifier = {
            id: `mod-${Date.now()}`,
            name: '',
            priceAdjustment: 0,
            available: true
        };
        setFormData({
            ...formData,
            modifiers: [...(formData.modifiers || []), newMod]
        });
    };

    const removeModifierOption = (index: number) => {
        const updated = [...(formData.modifiers || [])];
        updated.splice(index, 1);
        setFormData({ ...formData, modifiers: updated });
    };

    const updateModifierOption = (index: number, field: keyof Modifier, value: any) => {
        const updated = [...(formData.modifiers || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, modifiers: updated });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
                    <span className="mr-2 text-emerald"><FaLayerGroup /></span>Product Modifiers
                </h2>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<FaPlus />}>
                    Create Modifier Group
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modifierGroups?.map(group => (
                    <div key={group.id} className="bg-white dark:bg-charcoal-dark rounded-xl shadow-lg border border-charcoal/5 overflow-hidden">
                        <div className="p-4 bg-cream/50 dark:bg-charcoal-dark/50 border-b border-charcoal/5 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-charcoal-dark dark:text-cream-light">{group.name}</h3>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald/10 text-emerald">
                                        {group.type === 'single' ? 'Single Choice' : 'Multi-Select'}
                                    </span>
                                    {group.required && (
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta">
                                            Required
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(group)} className="!p-2">
                                    <span className="text-blue-500"><FaEdit /></span>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)} className="!p-2">
                                    <span className="text-terracotta"><FaTrash /></span>
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
                            {group.modifiers?.map(mod => (
                                <div key={mod.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-cream-light/50 dark:bg-charcoal-light/10">
                                    <span className="font-medium text-charcoal-dark dark:text-cream-light">{mod.name}</span>
                                    <span className={`font-bold ${mod.priceAdjustment > 0 ? 'text-emerald' : mod.priceAdjustment < 0 ? 'text-terracotta' : 'text-charcoal-light'}`}>
                                        {mod.priceAdjustment > 0 ? `+$${mod.priceAdjustment.toFixed(2)}` : mod.priceAdjustment < 0 ? `-$${Math.abs(mod.priceAdjustment).toFixed(2)}` : 'Free'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingGroup ? 'Edit Modifier Group' : 'Create Modifier Group'}
                size="lg"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-charcoal-light mb-1">Group Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald font-medium"
                                placeholder="e.g., Sugar Level, Milk Choice"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-charcoal-light mb-1">Selection Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'single' | 'multiple' })}
                                className="w-full p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald font-medium"
                            >
                                <option value="single" className="text-charcoal-dark">Single Choice</option>
                                <option value="multiple" className="text-charcoal-dark">Multiple Selections</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_required"
                            checked={formData.required}
                            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                            className="w-5 h-5 accent-emerald rounded border-none shadow-inner"
                        />
                        <label htmlFor="is_required" className="text-sm font-bold text-charcoal-dark dark:text-cream-light cursor-pointer">
                            Required (Customer must choose)
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-black uppercase tracking-widest text-charcoal-light">Modifier Options *</label>
                            <Button size="sm" variant="ghost" onClick={addModifierOption} leftIcon={<FaPlus />}>Add Option</Button>
                        </div>
                        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                            {formData.modifiers?.map((mod, index) => (
                                <div key={mod.id} className="grid grid-cols-12 gap-2 items-center bg-cream-light/50 dark:bg-charcoal/20 p-2 rounded-xl border border-charcoal/5">
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={mod.name}
                                            onChange={(e) => updateModifierOption(index, 'name', e.target.value)}
                                            placeholder="Option Name (e.g., Oat Milk)"
                                            className="w-full p-2 bg-white dark:bg-charcoal-light border-none rounded-lg text-charcoal-dark dark:text-white shadow-sm focus:ring-2 focus:ring-emerald"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={mod.priceAdjustment}
                                                onChange={(e) => updateModifierOption(index, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-6 pr-2 py-2 bg-white dark:bg-charcoal-light border-none rounded-lg text-charcoal-dark dark:text-white shadow-sm focus:ring-2 focus:ring-emerald font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        <Button variant="danger" size="sm" onClick={() => removeModifierOption(index)} className="!p-2 rounded-full">
                                            <FaTrash />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {(!formData.modifiers || formData.modifiers.length === 0) && (
                            <div className="text-center py-6 border-2 border-dashed border-charcoal/10 rounded-xl text-charcoal-light italic text-sm">
                                Press "Add Option" to create choices for this group.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="secondary" onClick={handleCloseModal} leftIcon={<FaTimes />}>Cancel</Button>
                        <Button onClick={handleSave} leftIcon={<FaSave />} className="min-w-[140px]">Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ModifierManagement;
