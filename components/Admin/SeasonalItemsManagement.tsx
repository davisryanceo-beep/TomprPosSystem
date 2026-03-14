import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import { Product } from '../../types';
import { FaCalendarAlt, FaEdit, FaSave, FaTimes, FaSnowflake, FaSun, FaLeaf } from 'react-icons/fa';

const SeasonalItemsManagement: React.FC = () => {
    const { products, updateProduct, currentStoreId } = useShop();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        isSeasonal: false,
        startDate: '',
        endDate: '',
        badge: ''
    });

    const seasonalProducts = products.filter(p => p.isSeasonal);
    const nonSeasonalProducts = products.filter(p => !p.isSeasonal);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            isSeasonal: product.isSeasonal || false,
            startDate: product.seasonalInfo?.startDate ? new Date(product.seasonalInfo.startDate).toISOString().split('T')[0] : '',
            endDate: product.seasonalInfo?.endDate ? new Date(product.seasonalInfo.endDate).toISOString().split('T')[0] : '',
            badge: product.seasonalInfo?.badge || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingProduct) return;

        const updatedProduct: Product = {
            ...editingProduct,
            isSeasonal: formData.isSeasonal,
            seasonalInfo: formData.isSeasonal ? {
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate),
                badge: formData.badge
            } : undefined
        };

        await updateProduct(updatedProduct);
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light">Seasonal Menu Items</h2>
                <p className="text-sm text-charcoal-light italic">Mark products as seasonal to show special badges and auto-hide off-season.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Seasonal Items */}
                <div className="bg-white dark:bg-charcoal-dark p-4 rounded-xl shadow">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald">
                        <FaLeaf /> Active Seasonal Items
                    </h3>
                    <div className="space-y-3">
                        {seasonalProducts.length === 0 && <p className="text-sm text-gray-400 py-4 text-center italic">No seasonal items marked.</p>}
                        {seasonalProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg hover:border-emerald/50 transition-colors bg-white/50 dark:bg-black/10">
                                <div>
                                    <p className="font-bold text-charcoal-dark dark:text-cream-light">{p.name}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">{p.seasonalInfo?.badge}</span>
                                        <span className="text-[10px] text-gray-500 font-medium">{p.seasonalInfo?.startDate ? new Date(p.seasonalInfo.startDate).toLocaleDateString() : ''} to {p.seasonalInfo?.endDate ? new Date(p.seasonalInfo.endDate).toLocaleDateString() : ''}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleEdit(p)} className="text-emerald hover:text-emerald-dark p-2">
                                    <FaEdit />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Regular Items to Mark as Seasonal */}
                <div className="bg-white dark:bg-charcoal-dark p-4 rounded-xl shadow">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-charcoal-dark dark:text-cream-light">
                        <FaCalendarAlt /> All Products
                    </h3>
                    <div className="space-y-2 h-[400px] overflow-y-auto pr-2">
                        {nonSeasonalProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-2 border-b last:border-0 border-gray-100 dark:border-gray-800">
                                <span className="text-sm text-charcoal-dark dark:text-cream-light font-medium">{p.name}</span>
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(p)}>Mark Seasonal</Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Seasonal Settings: ${editingProduct?.name}`}
            >
                <div className="space-y-4">
                    <label className="flex items-center gap-3 p-3 bg-cream dark:bg-charcoal-dark/50 rounded-lg cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isSeasonal}
                            onChange={(e) => setFormData({ ...formData, isSeasonal: e.target.checked })}
                            className="w-5 h-5"
                        />
                        <span className="font-bold text-charcoal-dark">Enable Seasonal Status</span>
                    </label>

                    {formData.isSeasonal && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-charcoal-dark dark:text-cream-light">Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-charcoal-dark dark:text-cream-light">End Date</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full p-2 bg-charcoal-light border-none rounded text-white shadow-inner focus:ring-2 focus:ring-emerald font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-charcoal-dark dark:text-cream-light">Badge Text (e.g., Summer Special, Holiday)</label>
                                <input
                                    type="text"
                                    value={formData.badge}
                                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                    className="w-full p-2 bg-charcoal-light border-none rounded text-white placeholder-cream/50 shadow-inner focus:ring-2 focus:ring-emerald"
                                    placeholder="e.g. SUMMER SPECIAL"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFormData({ ...formData, badge: 'SUMMER SPECIAL' })}
                                    className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded"
                                >
                                    <span className="inline mr-1"><FaSun /></span> Summer
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, badge: 'WINTER SPECIAL' })}
                                    className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded"
                                >
                                    <span className="inline mr-1"><FaSnowflake /></span> Winter
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, badge: 'HOLIDAY FAVORITE' })}
                                    className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded"
                                >
                                    <span className="inline mr-1"><FaCalendarAlt /></span> Holiday
                                </button>
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 pt-4">
                        <Button onClick={handleSave} leftIcon={<FaSave />} className="flex-1">Save Settings</Button>
                        <Button onClick={() => setIsModalOpen(false)} variant="secondary" leftIcon={<FaTimes />}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SeasonalItemsManagement;
