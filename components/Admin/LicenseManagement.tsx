import React, { useState } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Store } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import { FaCertificate, FaCalendarAlt } from 'react-icons/fa';

const LicenseManagement: React.FC = () => {
  const { stores, updateStore } = useShop();
  
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [storeForLicense, setStoreForLicense] = useState<Store | null>(null);
  const [licenseAction, setLicenseAction] = useState<'extend' | 'custom'>('extend');
  const [licenseDuration, setLicenseDuration] = useState<string>('1m'); // 1m, 3m, 6m, 1y
  const [customLicenseDate, setCustomLicenseDate] = useState<string>('');

  const openLicenseModal = (store: Store) => {
    setStoreForLicense(store);
    setLicenseAction('extend');
    setLicenseDuration('1m'); // Default to 1 month extension
    const todayStr = new Date().toISOString().split('T')[0];
    const currentExpiry = store.licenseExpiryDate ? new Date(store.licenseExpiryDate) : new Date(0);
    const currentExpiryStr = store.licenseExpiryDate || todayStr;

    setCustomLicenseDate(currentExpiry > new Date() ? currentExpiryStr : todayStr);
    setIsLicenseModalOpen(true);
  };

  const closeLicenseModal = () => {
    setIsLicenseModalOpen(false);
    setStoreForLicense(null);
  };

  const handleSaveLicense = () => {
    if (!storeForLicense) return;

    let newExpiryDate: Date;
    const currentExpiry = storeForLicense.licenseExpiryDate ? new Date(storeForLicense.licenseExpiryDate) : null;
    const today = new Date();
    today.setHours(0,0,0,0); 

    let baseDate = (currentExpiry && currentExpiry > today) ? currentExpiry : today;


    if (licenseAction === 'custom') {
      if (!customLicenseDate) {
        alert("Please select a custom expiry date.");
        return;
      }
      newExpiryDate = new Date(customLicenseDate + 'T00:00:00');
       if (newExpiryDate < today) {
        alert("Custom license date cannot be in the past.");
        return;
      }
    } else { // 'extend'
      newExpiryDate = new Date(baseDate);
      switch (licenseDuration) {
        case '1m': newExpiryDate.setMonth(newExpiryDate.getMonth() + 1); break;
        case '3m': newExpiryDate.setMonth(newExpiryDate.getMonth() + 3); break;
        case '6m': newExpiryDate.setMonth(newExpiryDate.getMonth() + 6); break;
        case '1y': newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1); break;
        default: alert("Invalid duration"); return;
      }
    }
    
    updateStore({ ...storeForLicense, licenseExpiryDate: newExpiryDate.toISOString().split('T')[0] });
    closeLicenseModal();
  };
  
  const licenseDurationOptions = [
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '1y', label: '1 Year' },
  ];

  const formatDate = (isoDate?: string): string => {
    if (!isoDate) return 'Not Set';
    const dateParts = isoDate.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    return new Date(year, month, day).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };


  const getLicenseStatus = (isoDate?: string): { text: string; color: string } => {
    if (!isoDate) return { text: 'Not Set', color: 'text-charcoal-light' };
    
    const dateParts = isoDate.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; 
    const day = parseInt(dateParts[2], 10);
    const expiry = new Date(year, month, day);

    const today = new Date();
    today.setHours(0,0,0,0); 
    
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiry < today) return { text: 'Expired', color: 'text-terracotta font-bold' };
    if (expiry <= thirtyDaysFromNow) return { text: 'Expires Soon', color: 'text-yellow-500' };
    return { text: 'Active', color: 'text-emerald' };
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <FaCertificate className="mr-2 text-emerald" />Store License Management
        </h2>
      </div>

      <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream dark:bg-charcoal-dark/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Store Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">License Expiry</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {stores.map(store => {
              const status = getLicenseStatus(store.licenseExpiryDate);
              return (
                <tr key={store.id} className="hover:bg-cream dark:hover:bg-charcoal-dark/50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{store.name}</td>
                  <td className={`px-4 py-4 whitespace-nowrap text-sm ${status.color}`}>{formatDate(store.licenseExpiryDate)}</td>
                  <td className={`px-4 py-4 whitespace-nowrap text-sm ${status.color}`}>{status.text}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => openLicenseModal(store)} leftIcon={<FaCalendarAlt/>}>
                      Manage License
                    </Button>
                  </td>
                </tr>
              );
            })}
            {stores.length === 0 && (
              <tr><td colSpan={4} className="text-center py-4 text-charcoal-light">No stores found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isLicenseModalOpen}
        onClose={closeLicenseModal}
        title={`Manage License for ${storeForLicense?.name}`}
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeLicenseModal}>Cancel</Button>
            <Button onClick={handleSaveLicense}>Update License</Button>
          </div>
        }
      >
        <div className="space-y-4">
            <p>Current Expiry Date: <strong className={getLicenseStatus(storeForLicense?.licenseExpiryDate).color}>{formatDate(storeForLicense?.licenseExpiryDate)}</strong></p>
            
            <div className="flex space-x-2">
                <Button variant={licenseAction === 'extend' ? 'primary' : 'ghost'} onClick={() => setLicenseAction('extend')} className="w-full">Extend License</Button>
                <Button variant={licenseAction === 'custom' ? 'primary' : 'ghost'} onClick={() => setLicenseAction('custom')} className="w-full">Set Custom Date</Button>
            </div>

            {licenseAction === 'extend' && (
                <Select
                    label="Extend By"
                    options={licenseDurationOptions}
                    value={licenseDuration}
                    onChange={e => setLicenseDuration(e.target.value)}
                />
            )}
            {licenseAction === 'custom' && (
                <Input
                    label="New Expiry Date"
                    type="date"
                    value={customLicenseDate}
                    onChange={e => setCustomLicenseDate(e.target.value)}
                />
            )}
        </div>
      </Modal>
    </div>
  );
};

export default LicenseManagement;