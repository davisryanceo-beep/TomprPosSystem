import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import { FaSignOutAlt, FaCoffee, FaUserCircle, FaUserEdit, FaStore, FaClock, FaSignInAlt, FaBars, FaCalculator, FaChevronDown, FaCheckCircle } from 'react-icons/fa';
import UserProfileModal from './UserProfileModal';
import PinEntryModal from './PinEntryModal';
import { ROLES } from '../../constants';
import { TimeLog } from '../../types';
import DeclareCashModal from '../Cashier/DeclareCashModal';
import EndOfDayReportModal from '../Cashier/EndOfDayReportModal';
import AccessibilitySettings from './AccessibilitySettings';
import { FaUniversalAccess, FaFileInvoiceDollar, FaGlobe } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const STAMP_ONLY = import.meta.env.VITE_STAMP_ONLY === 'true';

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  return <>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>;
};

const Navbar: React.FC = () => {
  const { currentUser, logout, verifyPin } = useAuth();
  const {
    stores, currentStoreId, getStoreById,
    clockIn, clockOut, getActiveTimeLogForUser, timeLogs,
    cashDrawerLogs, addCashDrawerLog, getExpectedCash
  } = useShop();
  const { t, i18n } = useTranslation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeTimeLog, setActiveTimeLog] = useState<TimeLog | undefined>(undefined);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [clockAction, setClockAction] = useState<'in' | 'out' | null>(null);
  const [showDeclareCashModal, setShowDeclareCashModal] = useState(false);
  const [forcedDeclareType, setForcedDeclareType] = useState<'OPEN' | 'CLOSE' | 'DROP' | 'PAYOUT' | null>(null);
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);


  const isOperationalRole = currentUser &&
    (currentUser.role === ROLES.CASHIER ||
      currentUser.role === ROLES.BARISTA ||
      currentUser.role === ROLES.STOCK_MANAGER);

  useEffect(() => {
    if (currentUser && isOperationalRole) {
      setActiveTimeLog(getActiveTimeLogForUser(currentUser.id));
    } else {
      setActiveTimeLog(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, getActiveTimeLogForUser, timeLogs, isOperationalRole]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleClockInOut = () => {
    if (!currentUser || !isOperationalRole) return;
    const action = activeTimeLog ? 'out' : 'in';
    setClockAction(action);
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const handlePinConfirm = async (pin: string) => {
    if (!currentUser || !clockAction) return;

    setPinError(null);
    setIsVerifyingPin(true);

    const isPinValid = await verifyPin(currentUser.id, pin);

    if (isPinValid) {
      if (clockAction === 'in') {
        clockIn(currentUser.id, currentUser.username, currentUser.role);
      } else {
        clockOut(currentUser.id);
      }
      setIsPinModalOpen(false);
      setClockAction(null);
    } else {
      setPinError('Invalid PIN. Please try again.');
    }

    setIsVerifyingPin(false);
  };

  const handleClosePinModal = () => {
    setIsPinModalOpen(false);
    setPinError(null);
    setClockAction(null);
  };

  const getDisplayName = () => {
    if (!currentUser) return '';
    return currentUser.firstName || currentUser.username;
  };

  const isGlobalAdmin = currentUser?.role === ROLES.ADMIN;
  const isStoreSpecificRole = currentUser && currentUser.role !== ROLES.ADMIN && !!currentUser.storeId;

  return (
    <>
      <nav className="bg-cream-light dark:bg-charcoal-dark shadow-md sticky top-0 z-40 border-b border-charcoal/5 dark:border-cream-light/5">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="h-8 w-8 text-emerald mr-2"><FaCoffee size={32} /></span>
              <div className="flex flex-col">
                <span className="font-black text-xl text-charcoal-dark dark:text-cream-light tracking-tighter leading-none">FlowsPOS</span>
                <div className="flex items-center text-charcoal-light dark:text-charcoal-light text-[10px] mt-0.5">
                  {isGlobalAdmin && currentStoreId && getStoreById(currentStoreId) ? (
                    <><span className="mr-1"><FaStore /></span>{getStoreById(currentStoreId)?.name}</>
                  ) : isStoreSpecificRole && currentUser?.storeId && getStoreById(currentUser.storeId) ? (
                    <><span className="mr-1"><FaStore /></span>{getStoreById(currentUser.storeId)?.name}</>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center gap-2 text-charcoal dark:text-cream-light text-lg font-bold">
                <FaClock /> <Clock />
              </div>

              {currentUser && (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2 text-charcoal-dark dark:text-cream-light p-1.5 rounded-lg hover:bg-cream dark:hover:bg-charcoal transition-colors">
                    {currentUser.profilePictureUrl ? (
                      <img src={currentUser.profilePictureUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-emerald/20" />
                    ) : (
                      <span className="h-8 w-8 text-charcoal-light opacity-50"><FaUserCircle size={32} /></span>
                    )}
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="font-bold">{getDisplayName()}</span>
                      <span className="text-xs opacity-80">{currentUser.role}</span>
                    </div>
                    <span className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}><FaChevronDown /></span>
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-cream-light dark:bg-charcoal-dark rounded-xl shadow-2xl p-2 space-y-1 fade-in">
                      {isOperationalRole && !STAMP_ONLY && (
                        <>
                          <div className="px-2 py-1 text-xs font-bold text-charcoal-light uppercase tracking-widest mt-2">Time & Cash</div>
                          
                          <button onClick={() => { handleClockInOut(); setIsMenuOpen(false); }} className={`w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-cream dark:hover:bg-charcoal ${activeTimeLog ? 'text-terracotta' : 'text-emerald'}`}>
                            {activeTimeLog ? <FaSignOutAlt /> : <FaSignInAlt />}
                            <span className="font-bold">{activeTimeLog ? "Clock Out" : "Clock In"}</span>
                          </button>

                          {currentUser.role === ROLES.CASHIER && (
                            <>
                              {(() => {
                                const todayStr = new Date().toLocaleDateString('en-CA');
                                const dailyLogs = (cashDrawerLogs || []).filter(l => 
                                  l.cashierId === currentUser.id && l.shiftDate === todayStr
                                );
                                const hasOpened = dailyLogs.some(l => l.type === 'OPEN');
                                const hasClosed = dailyLogs.some(l => l.type === 'CLOSE');

                                if (!hasOpened) {
                                  const currentStore = getStoreById(currentStoreId || '');
                                  const isDeclarationRequired = currentStore?.cashDeclarationRequired !== false;

                                  return (
                                    <button 
                                      onClick={async () => { 
                                        if (isDeclarationRequired) {
                                          setForcedDeclareType('OPEN'); 
                                          setShowDeclareCashModal(true); 
                                        } else {
                                          // Auto-open drawer without modal
                                          await addCashDrawerLog({
                                            type: 'OPEN',
                                            declaredAmount: 0,
                                            cashierId: currentUser!.id,
                                            cashierName: currentUser!.username,
                                            shiftDate: todayStr
                                          });
                                        }
                                        setIsMenuOpen(false); 
                                      }}
                                      disabled={!activeTimeLog}
                                      className="w-full text-left flex items-center gap-3 p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 disabled:opacity-50 transition-all font-bold mt-1"
                                    >
                                      <FaCalculator /><span>Open Cash Drawer</span>
                                    </button>
                                  );
                                } else if (!hasClosed) {
                                  const currentStore = getStoreById(currentStoreId || '');
                                  const isDeclarationRequired = currentStore?.cashDeclarationRequired !== false;
                                  return (
                                    <>
                                      <button 
                                        onClick={() => { setShowEndOfDayModal(true); setIsMenuOpen(false); }} 
                                        disabled={!activeTimeLog}
                                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-cream dark:hover:bg-charcoal disabled:opacity-50 text-xs text-charcoal-light font-bold"
                                      >
                                        <FaFileInvoiceDollar /><span>View Shift Summary</span>
                                      </button>
                                      <div className="flex gap-2 w-full mt-1 mb-1">
                                        <button 
                                          onClick={() => { setForcedDeclareType('DROP'); setShowDeclareCashModal(true); setIsMenuOpen(false); }} 
                                          disabled={!activeTimeLog}
                                          className="flex-1 flex justify-center items-center gap-1 p-2 rounded-lg bg-emerald/10 text-emerald hover:bg-emerald/20 disabled:opacity-50 transition-all font-bold text-xs"
                                        >
                                          <FaCalculator /> Drop
                                        </button>
                                        <button 
                                          onClick={() => { setForcedDeclareType('PAYOUT'); setShowDeclareCashModal(true); setIsMenuOpen(false); }} 
                                          disabled={!activeTimeLog}
                                          className="flex-1 flex justify-center items-center gap-1 p-2 rounded-lg bg-terracotta/10 text-terracotta hover:bg-terracotta/20 disabled:opacity-50 transition-all font-bold text-xs"
                                        >
                                          <FaCalculator /> Payout
                                        </button>
                                      </div>
                                      <button 
                                        onClick={async () => { 
                                          if (isDeclarationRequired) {
                                            setForcedDeclareType('CLOSE'); 
                                            setShowDeclareCashModal(true); 
                                          } else {
                                            // Auto-close drawer with balanced declaration
                                            await addCashDrawerLog({
                                              type: 'CLOSE',
                                              declaredAmount: getExpectedCash(currentUser!.id, 'CLOSE'),
                                              cashierId: currentUser!.id,
                                              cashierName: currentUser!.username,
                                              shiftDate: todayStr,
                                              cashierNotes: 'Auto-balanced (Declaration Disabled)'
                                            });
                                          }
                                          setIsMenuOpen(false); 
                                        }} 
                                        disabled={!activeTimeLog}
                                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 disabled:opacity-50 transition-all font-bold mt-1"
                                      >
                                        <FaCalculator /><span>Close Cash Drawer</span>
                                      </button>
                                    </>
                                  );
                                }
                                return (
                                  <div className="p-2 text-[10px] font-bold text-emerald bg-emerald/10 rounded-lg text-center mt-1">
                                    <FaCheckCircle className="inline mr-1" /> Shift Completed & Reconciled
                                  </div>
                                );
                              })()}
                            </>
                          )}
                          <hr className="my-2 border-charcoal/10 dark:border-cream-light/10" />
                        </>
                      )}
                      <div className="px-2 py-1 text-xs font-bold text-charcoal-light">Account</div>
                      <button onClick={() => { setIsProfileModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-cream dark:hover:bg-charcoal">
                        <FaUserEdit /><span>My Profile</span>
                      </button>
                      <button onClick={() => { setShowAccessibilitySettings(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-cream dark:hover:bg-charcoal">
                        <FaUniversalAccess /><span>Accessibility</span>
                      </button>
                      <ThemeToggle />
                      
                      <div className="px-2 py-1 text-xs font-bold text-charcoal-light border-t border-charcoal/10 dark:border-cream-light/10 mt-1 pt-1">Language</div>
                      <div className="flex gap-1 p-1">
                        <button 
                          onClick={() => i18n.changeLanguage('en')}
                          className={`flex-1 text-xs py-1 rounded-lg ${i18n.language === 'en' ? 'bg-emerald text-white' : 'bg-cream dark:bg-charcoal hover:bg-emerald/20'}`}
                        >
                          English
                        </button>
                        <button 
                          onClick={() => i18n.changeLanguage('km')}
                          className={`flex-1 text-xs py-1 rounded-lg ${i18n.language === 'km' ? 'bg-emerald text-white' : 'bg-cream dark:bg-charcoal hover:bg-emerald/20'}`}
                        >
                          ភាសាខ្មែរ
                        </button>
                      </div>

                      <button onClick={logout} className="w-full text-left flex items-center gap-3 p-2 rounded-lg text-terracotta hover:bg-terracotta/10">
                        <FaSignOutAlt /><span>{t('common.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {currentUser && <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}

      <PinEntryModal
        isOpen={isPinModalOpen}
        onClose={handleClosePinModal}
        onConfirm={handlePinConfirm}
        title={`Enter PIN to Clock ${clockAction === 'in' ? 'In' : 'Out'}`}
        isVerifying={isVerifyingPin}
        error={pinError}
      />

      {currentUser && (
        <>
          <DeclareCashModal 
            isOpen={showDeclareCashModal} 
            onClose={() => setShowDeclareCashModal(false)} 
            cashierId={currentUser.id} 
            cashierName={currentUser.username} 
            forcedType={forcedDeclareType}
          />
          {activeTimeLog && (
            <EndOfDayReportModal
              isOpen={showEndOfDayModal}
              onClose={() => setShowEndOfDayModal(false)}
              cashierId={currentUser.id}
              cashierName={currentUser.username}
              shiftStartTime={new Date(activeTimeLog.clockInTime)}
            />
          )}
        </>
      )}

      <AccessibilitySettings isOpen={showAccessibilitySettings} onClose={() => setShowAccessibilitySettings(false)} />
    </>
  );
};

export default Navbar;