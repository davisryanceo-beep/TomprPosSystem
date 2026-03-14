import React, { useState, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { CashDrawerLog, User } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { FaCalculator, FaEdit, FaFilePdf } from 'react-icons/fa';
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
     ...contextUsers.filter(u => u.role === 'Cashier').map(user => ({ value: user.id, label: `${user.firstName || ''} ${user.lastName || ''} (${user.username})`.trim() }))]
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

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <FaCalculator className="mr-2 text-emerald" />End-of-Day Cash Reports
        </h2>
        <Button 
            onClick={handleDownloadReport} 
            disabled={isGeneratingPDF || filteredLogs.length === 0} 
            leftIcon={<FaFilePdf/>}
            variant="secondary"
        >
            {isGeneratingPDF ? 'Generating PDF...' : "EOD Report PDF"}
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-cream dark:bg-charcoal-900/50 rounded-lg shadow">
        <Select label="Cashier" name="cashierId" options={cashierOptions} value={filters.cashierId} onChange={handleFilterChange} />
        <Input type="date" label="Shift Date" name="date" value={filters.date} onChange={handleFilterChange} />
      </div>
      
      <div className="overflow-x-auto bg-cream dark:bg-charcoal-dark/50 p-3 rounded-lg">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream-light dark:bg-charcoal-dark/30">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Date</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Cashier</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-charcoal-light uppercase tracking-wider">Expected (USD)</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-charcoal-light uppercase tracking-wider">Declared (USD)</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-charcoal-light uppercase tracking-wider">Discrepancy</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Cashier Notes</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Admin Notes</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {filteredLogs.map(log => (
              <tr key={log.id} className={log.discrepancy !== 0 ? (log.discrepancy > 0 ? 'bg-emerald/10' : 'bg-terracotta/10') : ''}>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-charcoal-light">{log.shiftDate}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-charcoal dark:text-cream-light">{log.cashierName}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-charcoal-light text-right">${log.expectedAmount.toFixed(2)}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-charcoal-light text-right">${log.declaredAmount.toFixed(2)}</td>
                <td className={`px-3 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                  log.discrepancy === 0 ? 'text-charcoal-light' : 
                  log.discrepancy > 0 ? 'text-emerald' : 'text-terracotta'
                }`}>
                  {log.discrepancy > 0 ? '+' : ''}${log.discrepancy.toFixed(2)}
                </td>
                <td className="px-3 py-4 text-xs text-charcoal-light max-w-xs truncate" title={log.cashierNotes}>{log.cashierNotes || '-'}</td>
                <td className="px-3 py-4 text-xs text-charcoal-light max-w-xs truncate" title={log.adminNotes}>{log.adminNotes || '-'}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                  <Button variant="ghost" size="sm" onClick={() => openNotesModal(log)} leftIcon={<FaEdit/>}>Notes</Button>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr><td colSpan={8} className="text-center py-4 text-charcoal-light">No EOD logs match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Notes Modal */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title={`Admin Notes for Log - ${selectedLog?.cashierName} (${selectedLog?.shiftDate})`}
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsNotesModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAdminNotes}>Save Notes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm">
            Expected: <span className="font-semibold">${selectedLog?.expectedAmount.toFixed(2)}</span> | 
            Declared: <span className="font-semibold">${selectedLog?.declaredAmount.toFixed(2)}</span> | 
            Discrepancy: <span className={`font-semibold ${selectedLog && selectedLog.discrepancy !== 0 ? (selectedLog.discrepancy > 0 ? 'text-emerald' : 'text-terracotta') : ''}`}>
              {selectedLog && selectedLog.discrepancy > 0 ? '+' : ''}{selectedLog?.discrepancy.toFixed(2)}
            </span>
          </p>
          <p className="text-sm text-charcoal-light">
            <span className="font-medium">Cashier Notes:</span> {selectedLog?.cashierNotes || 'None'}
          </p>
          <Textarea
            label="Administrator Notes"
            id="adminNotes"
            rows={4}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Explain discrepancy, reconciliation steps, etc."
          />
        </div>
      </Modal>
    </div>
  );
};

export default EODReportsView;