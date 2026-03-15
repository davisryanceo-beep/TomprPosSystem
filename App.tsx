
import React, { useState, useEffect } from 'react';
import GlobalErrorBoundary from './components/Common/GlobalErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ROLES } from './constants';
import LoginScreen from './components/Auth/LoginScreen';
import AdminDashboard from './components/Admin/AdminDashboard';
import CashierInterface from './components/Cashier/CashierInterface';
import BaristaPanel from './components/Barista/BaristaPanel';
import StockManagerPanel from './components/StockManager/StockManagerPanel';
import Navbar from './components/Shared/Navbar';
import { useShop } from './contexts/ShopContext';
import CustomerDisplay from './components/Customer/CustomerDisplay';
import RegisterScreen from './components/Auth/RegisterScreen';
import HomePage from './pages/HomePage';
import StaffLogin from './components/Mobile/StaffLogin';
import StaffDashboard from './components/Mobile/StaffDashboard';
import LoyaltyPortal from './components/Loyalty/LoyaltyPortal';
import LoyaltyHome from './components/Loyalty/LoyaltyHome';
import LoyaltyRegister from './components/Loyalty/LoyaltyRegister';
import LoyaltyLogin from './components/Loyalty/LoyaltyLogin';
import ClaimStamps from './components/Loyalty/ClaimStamps';


import { CartProvider } from './contexts/CartContext';
import PublicLayout from './layouts/PublicLayout';
import OnlineMenu from './pages/OnlineMenu';
import Checkout from './pages/Checkout';
import POSAlerts from './components/Shared/POSAlerts';

// ... (imports remain)

export const STAMP_ONLY = import.meta.env.VITE_STAMP_ONLY === 'true' || window.location.hostname.includes('tompr-stamp');
const PRIMARY_DOMAIN = 'poscafesystem.vercel.app';
const LOYALTY_DOMAIN = 'tompr-stamp.vercel.app';
const LOYALTY_URL = `https://${LOYALTY_DOMAIN}`;

// --- EARLY STORE LOCK DETECTION ---
// Capture as soon as possible, before any redirects or state changes
// Use localStorage (not sessionStorage) so the lock persists across PWA sessions
if (STAMP_ONLY) {
  const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
  const earlyStoreId = urlParams.get('storeId');
  if (earlyStoreId) {
    localStorage.setItem('lockedStoreId', earlyStoreId);
  }
}

const App: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const {
    currentStoreId: shopCurrentStoreId,
    setCurrentStoreId,
    stores,
    appSettings,
    loading: shopLoading,
  } = useShop();
  const [locationHash, setLocationHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setLocationHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Domain-specific Redirect for Customer Portal
  useEffect(() => {
    const hostname = window.location.hostname;
    const isLoyaltyRoute = locationHash.startsWith('#/loyalty') || locationHash.startsWith('#/claim');

    // 1. If we are on the PRIMARY domain and try to access LOYALTY routes, redirect to LOYALTY domain
    if (hostname.includes(PRIMARY_DOMAIN) && isLoyaltyRoute) {
      window.location.href = `${LOYALTY_URL}/${locationHash}`;
      return;
    }

    // 2. If we are on the LOYALTY domain, ensure we are in the portal
    if (hostname.includes(LOYALTY_DOMAIN) && (window.location.hash === '' || window.location.hash === '#/')) {
      const currentQuery = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
      window.location.hash = `#/loyalty${currentQuery}`;
    }
  }, [locationHash]);


  useEffect(() => {
    if (locationHash.startsWith('#/customer-display')) {
      return;
    }

    if (authLoading || shopLoading) return;

    if (currentUser) {
      if (currentUser.role === ROLES.ADMIN) { // Global Admin
        // If GA logs in and no store is selected OR the selected store is invalid (e.g. deleted while GA was logged in with it selected),
        // default to the first available store or null.
        // This allows GA to pick a store from Navbar.
        if (!shopCurrentStoreId || !stores.find(s => s.id === shopCurrentStoreId)) {
          if (stores.length > 0) {
            setCurrentStoreId(stores[0].id);
          } else {
            setCurrentStoreId(null);
          }
        }
        // If a valid store is already selected by Global Admin in Navbar, keep it.
      } else if (currentUser.storeId) { // Store Admin, Cashier, Barista, Stock Manager
        // For these roles, their store context is fixed to their assigned storeId.
        const assignedStoreExists = stores.some(s => s.id === currentUser.storeId);
        if (assignedStoreExists) {
          if (currentUser.storeId !== shopCurrentStoreId) { // If context is not already set or differs
            setCurrentStoreId(currentUser.storeId);
          }
        } else { // Assigned store doesn't exist (e.g. deleted)
          if (shopCurrentStoreId !== null) { // If a store context was somehow set, clear it
            setCurrentStoreId(null);
          }
        }
      } else { // User with no storeId and not a global admin (should be rare, indicates data issue)
        if (shopCurrentStoreId !== null) {
          setCurrentStoreId(null);
        }
      }
    } else { // User logged out
      if (shopCurrentStoreId !== null) {
        setCurrentStoreId(null); // Clear store context on logout
      }
    }
  }, [currentUser, authLoading, shopLoading, setCurrentStoreId, stores, locationHash]);


  // --- PUBLIC ROUTES (No Auth Required) ---
  if (STAMP_ONLY) {
    const isLoyaltyRegister = locationHash.startsWith('#/loyalty/register');
    const isLoyaltyLogin = locationHash.startsWith('#/loyalty/login');
    const isClaim = locationHash.startsWith('#/claim/');
    const isLoyaltyPortal = locationHash.startsWith('#/loyalty/');
    const isLoyaltyHome = locationHash.startsWith('#/loyalty');

    if (locationHash.startsWith('#/customer-display')) return <CustomerDisplay />;
    if (isLoyaltyRegister) return <LoyaltyRegister />;
    if (isLoyaltyLogin) return <LoyaltyLogin />;
    if (isClaim) return <ClaimStamps />;
    if (isLoyaltyPortal) return <LoyaltyPortal />;

    // If not matching any allowed STAMP_ONLY routes, force to loyalty home
    // BUT preserve the query parameters if they exist
    if (!isLoyaltyHome) {
      const currentQuery = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
      window.location.hash = `#/loyalty${currentQuery}`;
    }
    return <LoyaltyHome />;
  }

  if (locationHash.startsWith('#/menu')) {
    // Expected format: #/menu/:storeId or #/menu/:storeId/checkout
    return (
      <CartProvider>
        <PublicLayout>
          {locationHash.endsWith('/checkout') ? (
            <Checkout />
          ) : (
            <OnlineMenu />
          )}
        </PublicLayout>
      </CartProvider>
    );
  }

  if (locationHash.startsWith('#/customer-display')) {
    return <CustomerDisplay />;
  }

  if (locationHash === '#/loyalty') {
    return <LoyaltyHome />;
  }

  if (locationHash === '#/loyalty/register') {
    return <LoyaltyRegister />;
  }

  if (locationHash === '#/loyalty/login') {
    return <LoyaltyLogin />;
  }

  if (locationHash.startsWith('#/claim/')) {
    return <ClaimStamps />;
  }

  if (locationHash.startsWith('#/loyalty/')) {
    return <LoyaltyPortal />;
  }



  // ... (mobile routes)

  if (authLoading || shopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-charcoal-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald"></div>
      </div>
    );
  }

  const renderDashboard = () => {
    if (!currentUser) {
      if (locationHash === '#/register' && appSettings.registrationEnabled) {
        return <RegisterScreen />;
      }
      if (locationHash === '#/login') {
        return <LoginScreen />;
      }
      // Show loyalty login by default if STAMP_ONLY
      if (STAMP_ONLY) {
        return <LoyaltyHome />;
      }
      // Default to POS login screen for the main domain
      return <LoginScreen />;
    }

    // --- LOGGED IN FLOW ---

    const containerClasses = "container mx-auto p-4 sm:p-6 lg:p-8";

    // Global Admin (ROLES.ADMIN, no storeId implicitly handled by role check)
    if (currentUser.role === ROLES.ADMIN) {
      return <div className={containerClasses}><AdminDashboard /></div>;
    }

    // Store-specific roles (Store Admin, Cashier, Barista, Stock Manager)
    // These roles MUST have a storeId to function.
    if (!currentUser.storeId) {
      return (
        <div className={`text-center p-10 ${containerClasses}`}>
          <h2 className="text-xl font-semibold mb-4">Configuration Error</h2>
          <p className="mb-6">Your user account (Role: {currentUser.role}) requires a store assignment to function. Please contact an administrator.</p>
        </div>
      );
    }

    // Check if the assigned store for the user actually exists in the stores list
    const assignedStoreExists = stores.some(s => s.id === currentUser.storeId);
    if (!assignedStoreExists) {
      return (
        <div className={`text-center p-10 ${containerClasses}`}>
          <h2 className="text-xl font-semibold mb-4">Store Assignment Error</h2>
          <p className="mb-6">Your assigned store (ID: {currentUser.storeId}) does not exist or could not be loaded. Please contact an administrator.</p>
        </div>
      );
    }

    // For roles tied to a store, shopCurrentStoreId should match currentUser.storeId due to useEffect.
    // If shopCurrentStoreId is not set to their store, it's an access issue.
    if (shopCurrentStoreId !== currentUser.storeId) {
      return <div className={containerClasses}><StoreAccessError message={`The context for your assigned store (ID: ${currentUser.storeId}) could not be established or does not match your assignment. It might have been recently deleted or there's a configuration issue.`} /></div>;
    }


    switch (currentUser.role) {
      case ROLES.STORE_ADMIN: // Store Admins
        return <div className={containerClasses}><AdminDashboard /></div>; // AdminDashboard will show store-specific views for Store Admins
      case ROLES.CASHIER:
        return STAMP_ONLY ? <StoreAccessError message="Cashier terminal is disabled in Stamp-Only mode." /> : <CashierInterface />; // Cashier interface is edge-to-edge, so no container here
      case ROLES.BARISTA:
        return STAMP_ONLY ? <StoreAccessError message="Barista panel is disabled in Stamp-Only mode." /> : <div className={containerClasses}><BaristaPanel /></div>;
      case ROLES.STOCK_MANAGER:
        return STAMP_ONLY ? <StoreAccessError message="Stock Manager panel is disabled in Stamp-Only mode." /> : <div className={containerClasses}><StockManagerPanel /></div>;
      default:
        return (
          <div className={`text-center p-10 ${containerClasses}`}>
            <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
            <p>No dashboard available for your role: {currentUser.role}.</p>
          </div>
        );
    }
  };

  const StoreAccessError: React.FC<{ message?: string }> = ({ message }) => (
    <div className="text-center p-10">
      <h2 className="text-xl font-semibold mb-4">Store Access Error</h2>
      <p className="mb-6">
        {message || "A store context is required to access this panel. Your assigned store might not be available or an error occurred."}
        <br />Please contact an administrator.
      </p>
    </div>
  );

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        {currentUser && <POSAlerts />}
        {currentUser && <Navbar />}
        <main className="flex-grow">
          {renderDashboard()}
        </main>
        <footer className="text-center p-2 text-xs text-charcoal-light dark:text-charcoal-light border-t border-charcoal-dark/10 dark:border-charcoal-light/10 bg-cream dark:bg-charcoal-900">
          Tompr Stamp &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </CartProvider>
  );
};

export default App;
