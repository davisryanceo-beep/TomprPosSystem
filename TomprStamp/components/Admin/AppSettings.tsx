
import React from 'react';
import { useShop } from '../../contexts/ShopContext';
import { FaToggleOn, FaToggleOff } from 'react-icons/fa';

const AppSettings: React.FC = () => {
    const { appSettings, updateAppSettings } = useShop();

    const toggleRegistration = () => {
        updateAppSettings({ registrationEnabled: !appSettings.registrationEnabled });
    };

    return (
        <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light">
                Global Application Settings
            </h2>
            <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-charcoal-dark dark:text-cream-light">Public Registration</h3>
                    <p className="text-sm text-charcoal-light">
                        Allow new users to register for an account from the login page.
                    </p>
                </div>
                <button onClick={toggleRegistration} className="flex items-center space-x-2">
                    <span className={`font-bold ${appSettings.registrationEnabled ? 'text-emerald' : 'text-charcoal-light'}`}>
                        {appSettings.registrationEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {appSettings.registrationEnabled
                        ? <FaToggleOn size={32} className="text-emerald" />
                        : <FaToggleOff size={32} className="text-charcoal-light" />}
                </button>
            </div>


        </div>
    );
};

export default AppSettings;
