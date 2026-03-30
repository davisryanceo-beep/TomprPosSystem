
import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import SalesDashboard from './SalesDashboard';
import InventoryOverview from './InventoryOverview';
import SupplyManagement from './SupplyManagement';
import RecipeManagement from './RecipeManagement';
import ShiftManagement from './ShiftManagement';
import PromotionManagement from './PromotionManagement';
import AttendanceTracking from './AttendanceTracking';
import EODReportsView from './EODReportsView';
import StoreManagement from './StoreManagement';
import ModifierManagement from './ModifierManagement';
import LicenseManagement from './LicenseManagement';
import AIInsightsView from './AIInsightsView';
import CustomerDisplayEditor from './CustomerDisplaySettings';
import StoreSettings from './StoreSettings';
import AppSettings from './AppSettings';
import CustomerFeedbackView from './CustomerFeedbackView';
import ComboManagement from './ComboManagement';
import AddOnManagement from './AddOnManagement';
import SeasonalItemsManagement from './SeasonalItemsManagement';
import OrderManagement from './OrderManagement';
import LeaveManagement from './LeaveManagement';
import LoyaltyManagement from './LoyaltyManagement';
import ExpenseManagement from './ExpenseManagement';
import {
  FaUsers, FaChartLine, FaBoxes, FaConciergeBell, FaArchive, FaBookOpen,
  FaCalendarAlt, FaTags, FaClock, FaCalculator, FaStore,
  FaCertificate, FaUserShield, FaBrain, FaDesktop, FaStar, FaCogs, FaReceipt,
  FaCalendarTimes, FaStamp, FaMoneyBillWave
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants';
import { useShop } from '../../contexts/ShopContext';

const STAMP_ONLY = import.meta.env.VITE_STAMP_ONLY === 'true' || window.location.hostname.includes('tompr-stamp');

// Define specific tab sets for each admin type
type GlobalAdminTab = 'stores' | 'licenses' | 'users' | 'store-settings' | 'loyalty' | 'settings';
type StoreAdminTab = 'users' | 'orders' | 'loyalty' | 'sales' | 'expenses' | 'inventory' | 'modifiers' | 'supplies' | 'recipes' | 'combos' | 'addons' | 'seasonal' | 'shifts' | 'promotions' | 'attendance' | 'leave' | 'eod' | 'display' | 'feedback' | 'settings';

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { stores, currentStoreId } = useShop();

  const isGlobalAdmin = currentUser?.role === ROLES.ADMIN;
  const isStoreAdmin = currentUser?.role === ROLES.STORE_ADMIN;

  // Determine initial active tab based on role and store availability
  const getInitialActiveTab = (): GlobalAdminTab | StoreAdminTab => {
    if (STAMP_ONLY) return 'loyalty';
    if (isGlobalAdmin) {
      return 'stores';
    }
    if (isStoreAdmin) {
      return 'users'; // Default Store Admin to the users tab
    }
    return 'users'; // Fallback
  };

  const [activeTab, setActiveTab] = useState<GlobalAdminTab | StoreAdminTab>(getInitialActiveTab());

  // Effect to reset tab if role changes or context becomes invalid for current tab
  useEffect(() => {
    if (isGlobalAdmin && !['stores', 'licenses', 'users', 'settings'].includes(activeTab as GlobalAdminTab)) {
      setActiveTab('stores');
    } else if (isStoreAdmin && ['stores', 'licenses'].includes(activeTab as GlobalAdminTab)) {
      setActiveTab('users');
    }
  }, [isGlobalAdmin, isStoreAdmin, activeTab, currentStoreId]);


  const renderTabContent = () => {
    if (isGlobalAdmin) {
      switch (activeTab as GlobalAdminTab) {
        case 'stores': return <StoreManagement onSelectStore={() => setActiveTab('store-settings')} />;
        case 'licenses': return <LicenseManagement />;
        case 'users': return <UserManagement />;
        case 'store-settings': return <StoreSettings />;
        case 'loyalty': return <LoyaltyManagement />;
        case 'settings': return <AppSettings />;
        default: return <p className="text-center py-10">Select a management area.</p>;
      }
    }
    if (isStoreAdmin) {
      if (!currentStoreId) {
        return <p className="text-center py-10">Your assigned store context is missing. Please contact support.</p>;
      }

      switch (activeTab as StoreAdminTab) {
        case 'users': return <UserManagement />;
        case 'orders': return <OrderManagement />;
        case 'loyalty': return <LoyaltyManagement />;
        case 'sales': return <SalesDashboard />;
        case 'expenses': return <ExpenseManagement />;
        case 'inventory': return <InventoryOverview />;
        case 'modifiers': return <ModifierManagement />;
        case 'supplies': return <SupplyManagement />;
        case 'recipes': return <RecipeManagement />;
        case 'combos': return <ComboManagement />;
        case 'addons': return <AddOnManagement />;
        case 'seasonal': return <SeasonalItemsManagement />;
        case 'shifts': return <ShiftManagement />;
        case 'promotions': return <PromotionManagement />;
        case 'attendance': return <AttendanceTracking />;
        case 'leave': return <LeaveManagement />;
        case 'eod': return <EODReportsView />;
        case 'display': return <CustomerDisplayEditor />;
        case 'settings': return <StoreSettings />;
        case 'feedback': return <CustomerFeedbackView />;
        default: return <p className="text-center py-10">Select a management area.</p>;
      }
    }
    return <p className="text-center py-10">Access denied or invalid role configuration.</p>;
  };

  const TabButton: React.FC<{ tabName: GlobalAdminTab | StoreAdminTab, label: string, icon: React.ReactNode }> = ({ tabName, label, icon }) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => setActiveTab(tabName)}
        className={`flex items-center space-x-3 px-4 py-3 text-base font-bold rounded-lg transition-all duration-200 flex-grow sm:flex-grow-0 justify-center transform active:scale-95 ${isActive
          ? 'bg-cream-light dark:bg-charcoal-dark text-emerald shadow-lg'
          : 'text-charcoal-light dark:text-charcoal-light hover:bg-cream dark:hover:bg-charcoal-dark'
          }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  const adminTitle = isGlobalAdmin ? 'Global Admin Dashboard' : (isStoreAdmin ? 'Store Admin Dashboard' : 'Admin Dashboard');
  const adminIcon = isGlobalAdmin ? <span className="mr-3 text-emerald"><FaConciergeBell /></span> : <span className="mr-3 text-emerald"><FaUserShield /></span>;


  return (
    <div className="space-y-8 fade-in">
      <header className="bg-cream-light dark:bg-charcoal-dark shadow-xl rounded-xl p-6">
        <h1 className="text-4xl font-extrabold text-charcoal-dark dark:text-cream-light flex items-center">
          {adminIcon}
          {adminTitle}
        </h1>
        {isStoreAdmin && currentUser?.storeId && (
          <p className="text-base text-charcoal-light dark:text-charcoal-light mt-1">
            Managing: {stores.find(s => s.id === currentUser.storeId)?.name || 'Your Store'}
          </p>
        )}
      </header>

      <div className="flex flex-wrap gap-3 mb-6 p-3 bg-cream dark:bg-charcoal-dark/50 rounded-xl shadow-inner">
        {STAMP_ONLY ? (
          <TabButton tabName="loyalty" label="Stamps" icon={<FaStamp />} />
        ) : isGlobalAdmin ? (
          <>
            <TabButton tabName="stores" label="Stores" icon={<FaStore />} />
            {currentStoreId && <TabButton tabName="store-settings" label="Store Settings" icon={<FaCogs />} />}
            <TabButton tabName="licenses" label="Licenses" icon={<FaCertificate />} />
            <TabButton tabName="users" label="User Accounts" icon={<FaUsers />} />
            <TabButton tabName="settings" label="App Settings" icon={<FaCogs />} />
          </>
        ) : isStoreAdmin && (
          <>
            <TabButton tabName="users" label="Staff" icon={<FaUsers />} />
            <TabButton tabName="orders" label="Orders" icon={<FaReceipt />} />
            <TabButton tabName="loyalty" label="Stamps" icon={<FaStamp />} />
            <TabButton tabName="sales" label="Sales" icon={<FaChartLine />} />
            <TabButton tabName="expenses" label="Expenses" icon={<FaMoneyBillWave />} />
            <TabButton tabName="inventory" label="Products" icon={<FaBoxes />} />
            <TabButton tabName="modifiers" label="Modifiers" icon={<FaArchive />} />
            <TabButton tabName="supplies" label="Supplies" icon={<FaArchive />} />
            <TabButton tabName="recipes" label="Recipes" icon={<FaBookOpen />} />
            <TabButton tabName="combos" label="Combos" icon={<FaArchive />} />
            <TabButton tabName="addons" label="Add-ons" icon={<FaTags />} />
            <TabButton tabName="seasonal" label="Seasonal" icon={<FaCalendarAlt />} />
            <TabButton tabName="shifts" label="Shifts" icon={< FaCalendarAlt />} />
            <TabButton tabName="promotions" label="Promos" icon={<FaTags />} />
            <TabButton tabName="attendance" label="Attendance" icon={<FaClock />} />
            <TabButton tabName="leave" label="Leave" icon={<FaCalendarTimes />} />
            <TabButton tabName="eod" label="Cash Drawer" icon={<FaMoneyBillWave />} />
            <TabButton tabName="display" label="Display" icon={<FaDesktop />} />
            <TabButton tabName="settings" label="Settings" icon={<FaCogs />} />
            <TabButton tabName="feedback" label="Feedback" icon={<FaStar />} />
          </>
        )}
      </div>

      <div className="bg-cream-light dark:bg-charcoal-dark shadow-xl rounded-xl p-0 sm:p-0 min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
