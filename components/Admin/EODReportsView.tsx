import React, { useState, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { CashDrawerLog, User } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { FaCalculator, FaEdit, FaFilePdf, FaSun, FaMoon, FaCheckCircle, FaExclamationTriangle, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { generateEODReportPDF } from '../../services/pdfService';
import { useAuth } from '../../contexts/AuthContext';

const EODReportsView: React.FC = () => {
  const { cashDrawerLogs, allUsers, updateCashDrawerLogAdminNotes, currentStoreId } = useShop();
  const { currentUser } = useAuth();

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CashDrawerLog | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const [filters, setFilters] = useState({
    cashierId: '',
    date: '',
  });

  const contextUsers = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === 'Admin') {
      if (!currentStoreId) return allUsers;
      return allUsers.filter(u => u.storeId === currentStoreId || !u.storeId);
    }
    if (currentUser.role === 'Store Admin') {
      return allUsers.filter(u => u.storeId === currentUser.storeId);
    }
    return [];
  }, [allUsers, currentUser, currentStoreId]);

  const cashierOptions = useMemo(() => 
    [{ value: '', label: 'All Cashiers' }, 
     ...contextUsers.filter(u => u.role === 'Cashier' || u.role === 'Admin' || u.role === 'Store Admin').map(user => ({ value: user.id, label: `${user.firstName || ''} ${user.lastName || ''} (${user.username})`.trim() }))]
  , [contextUsers]);

  const filteredLogs = useMemo(() => {
    return cashDrawerLogs
      .filter(log => {
        if (filters.cashierId && log.cashierId !== filters.cashierId) return false;
        if (filters.date && log.shiftDate !== filters.date) return false;
        return true;
      })
      .sort((a, b) => new Date(b.logTimestamp).getTime() - new Date(a.logTimestamp).getTime());
  }, [cashDrawerLogs, filters]);

  // Daily Summary Statistics
  const summary = useMemo(() => {
    const totalExpected = filteredLogs.reduce((sum, l) => sum + (l.expectedAmount || 0), 0);
    const totalDeclared = filteredLogs.reduce((sum, l) => sum + (l.declaredAmount || 0), 0);
    const totalDiscrepancy = totalDeclared - totalExpected;
    const shortCount = filteredLogs.filter(l => (l.discrepancy || 0) < -1).length;
    const overCount = filteredLogs.filter(l => (l.discrepancy || 0) > 1).length;
    const balancedCount = filteredLogs.filter(l => Math.abs(l.discrepancy || 0) <= 1).length;

    return { totalExpected, totalDeclared, totalDiscrepancy, shortCount, overCount, balancedCount };
  }, [filteredLogs]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString() + '៛';
  };

  const openNotesModal = (log: CashDrawerLog) => {
    setSelectedLog(log);
    setAdminNotes(log.adminNotes || '');
    setIsNotesModalOpen(true);
  };

  const handleSaveAdminNotes = () => {
    if (selectedLog) {
      updateCashDrawerLogAdminNotes(selectedLog.id, adminNotes.trim());
      setIsNotesModalOpen(false);
      setSelectedLog(null);
      setAdminNotes('');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDownloadReport = async () => {
    setIsGeneratingPDF(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50)); 
      generateEODReportPDF(filteredLogs, filters, allUsers);
    } catch (error) {
      console.error("Error generating EOD PDF:", error);
      alert("Failed to generate PDF report. See console for details.");
    }
    setIsGeneratingPDF(false);
  };

  const getStatusBadge = (discrepancy: number) => {
    if (Math.abs(discrepancy) <= 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald/10 text-emerald">
          <FaCheckCircle className="mr-1" /> Balanced
        </span>
      );
    }
    if (discrepancy > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-600">
          <FaArrowUp className="mr-1" /> Over
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-terracotta/10 text-terracotta">
        <FaArrowDown className="mr-1" /> Short
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h2 className="text-2xl font-black text-charcoal-dark dark:text-cream-light flex items-center">
          <FaCalculator className="mr-3 text-emerald" /> End-of-Day Cash Reports
        </h2>
        <Button 
            onClick={handleDownloadReport} 
            disabled={isGeneratingPDF || filteredLogs.length === 0} 
            leftIcon={<FaFilePdf/>}
            variant="secondary"
            className="shadow-lg shadow-charcoal/5"
        >
            {isGeneratingPDF ? 'Generating...' : "Download EOD PDF"}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-charcoal p-4 rounded-2xl border border-charcoal/5 shadow-sm">
          <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest mb-1">Total Expected</p>
          <p className="text-lg font-black text-charcoal-dark dark:text-cream-light">{formatCurrency(summary.totalExpected)}</p>
        </div>
        <div className="bg-white dark:bg-charcoal p-4 rounded-2xl border border-charcoal/5 shadow-sm">
          <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest mb-1">Total Counted</p>
          <p className="text-lg font-black text-emerald">{formatCurrency(summary.totalDeclared)}</p>
        </div>
        <div className="bg-white dark:bg-charcoal p-4 rounded-2xl border border-charcoal/5 shadow-sm">
          <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest mb-1">Total Variance</p>
          <p className={`text-lg font-black ${summary.totalDiscrepancy >= 0 ? 'text-emerald' : 'text-terracotta'}`}>
            {summary.totalDiscrepancy > 0 ? '+' : ''}{formatCurrency(summary.totalDiscrepancy)}
          </p>
        </div>
        <div className="bg-white dark:bg-charcoal p-4 rounded-2xl border border-charcoal/5 shadow-sm flex flex-col justify-center">
          <div className="flex gap-2">
             <span className="text-[10px] font-black text-emerald bg-emerald/10 px-1.5 rounded">{summary.balancedCount} OK</span>
             <span className="text-[10px] font-black text-terracotta bg-terracotta/10 px-1.5 rounded">{summary.shortCount + summary.overCount} ERR</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-5 bg-cream/50 dark:bg-charcoal-dark/30 rounded-2xl border border-charcoal/5">
        <div className="flex-1">
          <Select label="Filter Cashier" name="cashierId" options={cashierOptions} value={filters.cashierId} onChange={handleFilterChange} />
        </div>
        <div className="flex-1">
          <Input type="date" label="Filter Date" name="date" value={filters.date} onChange={handleFilterChange} />
        </div>
      </div>
      
      <div className="overflow-hidden bg-white dark:bg-charcoal border border-charcoal/5 rounded-2xl shadow-sm">
        <table className="min-w-full divide-y divide-charcoal/5">
          <thead className="bg-cream/30 dark:bg-charcoal-dark/50">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-black text-charcoal-light uppercase tracking-widest">Type</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-charcoal-light uppercase tracking-widest">Date / Time</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-charcoal-light uppercase tracking-widest">Cashier</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-charcoal-light uppercase tracking-widest">Expected</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-charcoal-light uppercase tracking-widest">Declared</th>
              <th className="px-4 py-3 text-center text-[10px] font-black text-charcoal-light uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-charcoal-light uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-cream/10 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                   {log.type === 'OPEN' ? (
                     <span className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                       <FaSun /> OPEN
                     </span>
                   ) : (
                     <span className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs">
                       <FaMoon /> CLOSE
                     </span>
                   )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-xs font-bold text-charcoal-dark dark:text-cream-light">{log.shiftDate}</div>
                  <div className="text-[10px] text-charcoal-light">{new Date(log.logTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-charcoal dark:text-cream-light">{log.cashierName}</td>
                <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-charcoal-light text-right">{formatCurrency(log.expectedAmount || 0)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-xs font-black text-charcoal-dark dark:text-cream-light text-right">{formatCurrency(log.declaredAmount)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(log.discrepancy || 0)}
                  {Math.abs(log.discrepancy || 0) > 1 && (
                    <div className="text-[9px] font-bold text-charcoal-light mt-1">
                      {log.discrepancy > 0 ? '+' : ''}{formatCurrency(log.discrepancy)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => openNotesModal(log)} iconOnly><FaEdit/></Button>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-charcoal-light font-bold">No EOD logs match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Notes Modal */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title={`Review Log - ${selectedLog?.cashierName}`}
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsNotesModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAdminNotes}>Update Review</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="p-4 bg-charcoal/5 dark:bg-white/5 rounded-2xl grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest">Expected</p>
              <p className="text-sm font-bold">{formatCurrency(selectedLog?.expectedAmount || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest">Declared</p>
              <p className="text-sm font-bold">{formatCurrency(selectedLog?.declaredAmount || 0)}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-charcoal/10">
              <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest">Variance</p>
              <p className={`text-lg font-black ${selectedLog && selectedLog.discrepancy >= 0 ? 'text-emerald' : 'text-terracotta'}`}>
                {selectedLog && selectedLog.discrepancy > 0 ? '+' : ''}{formatCurrency(selectedLog?.discrepancy || 0)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest">Cashier Notes</p>
            <div className="p-3 bg-cream/30 dark:bg-charcoal-dark border border-charcoal/5 rounded-xl text-xs italic">
              {selectedLog?.cashierNotes || 'No notes provided by cashier.'}
            </div>
          </div>

          <Textarea
            label="Internal Admin Review"
            id="adminNotes"
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add internal reconciliation notes..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default EODReportsView;