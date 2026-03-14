import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { TimeLog, User, Role } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { FaClock, FaPlus, FaEdit, FaTrash, FaFilePdf } from 'react-icons/fa';
import { generateAttendanceReportPDF } from '../../services/pdfService';
import { ROLES } from '../../constants'; // Import ROLES
import { useAuth } from '../../contexts/AuthContext';

const calculateDuration = (clockInTime?: string, clockOutTime?: string): string => {
  if (!clockInTime || !clockOutTime) return '-';
  const inTime = new Date(clockInTime);
  const outTime = new Date(clockOutTime);
  const diffMs = outTime.getTime() - inTime.getTime();
  if (diffMs < 0) return 'Invalid';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const AttendanceTracking: React.FC = () => {
  const { timeLogs, allUsers, addManualTimeLog, updateTimeLog, deleteTimeLog, currentStoreId } = useShop();
  const { currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTimeLog, setCurrentTimeLog] = useState<Partial<TimeLog> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
  });

  const contextUsers = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === ROLES.ADMIN) {
      if (!currentStoreId) return allUsers;
      return allUsers.filter(u => u.storeId === currentStoreId || (u.role === ROLES.ADMIN && !u.storeId));
    }
    if (currentUser.role === ROLES.STORE_ADMIN) {
      return allUsers.filter(u => u.storeId === currentUser.storeId);
    }
    return [];
  }, [allUsers, currentUser, currentStoreId]);

  // Filter users to exclude Admins (Global and Store) for selection in filters and manual log creation
  const staffUsersForAttendance = useMemo(() => 
    contextUsers.filter(user => user.role !== ROLES.ADMIN && user.role !== ROLES.STORE_ADMIN)
  , [contextUsers]);

  const staffUsersOptions = useMemo(() => 
    [{ value: '', label: 'All Staff (Operational)' }, 
     ...staffUsersForAttendance.map(user => ({ value: user.id, label: `${user.firstName || ''} ${user.lastName || ''} (${user.username})`.trim() }))]
  , [staffUsersForAttendance]);


  const filteredTimeLogs = useMemo(() => {
    let logs = [...timeLogs].sort((a,b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    } else {
      // If no specific user is filtered, show logs for all non-admin, non-store-admin users
      const operationalUserIds = staffUsersForAttendance.map(u => u.id);
      logs = logs.filter(log => operationalUserIds.includes(log.userId));
    }
    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.clockInTime) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Include whole end day
      logs = logs.filter(log => new Date(log.clockInTime) <= endDate);
    }
    return logs;
  }, [timeLogs, filters, staffUsersForAttendance]);

  const totalHoursSummary = useMemo(() => {
    const summary: { [userName: string]: { totalMs: number, logs: number } } = {};
    filteredTimeLogs.forEach(log => {
      if (log.clockInTime && log.clockOutTime) {
        if (!summary[log.userName]) {
          summary[log.userName] = { totalMs: 0, logs: 0 };
        }
        const durationMs = new Date(log.clockOutTime).getTime() - new Date(log.clockInTime).getTime();
        if (durationMs > 0) {
            summary[log.userName].totalMs += durationMs;
            summary[log.userName].logs +=1;
        }
      }
    });
    return Object.entries(summary).map(([userName, data]) => ({
      userName,
      totalHours: (data.totalMs / (1000 * 60 * 60)).toFixed(2),
      logCount: data.logs
    }));
  }, [filteredTimeLogs]);


  const openModalForCreate = () => {
    const defaultUser = staffUsersForAttendance.length > 0 ? staffUsersForAttendance[0] : null;
    setCurrentTimeLog({
      userId: defaultUser?.id || '',
      userName: defaultUser ? `${defaultUser.firstName || ''} ${defaultUser.lastName || ''} (${defaultUser.username})`.trim() : '',
      role: defaultUser?.role || Role.CASHIER, // Default to Cashier if no user or role found
      clockInTime: new Date().toISOString().substring(0, 16), // YYYY-MM-DDTHH:MM
      clockOutTime: new Date().toISOString().substring(0, 16),
      notes: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (log: TimeLog) => {
    setCurrentTimeLog({
        ...log,
        clockInTime: new Date(log.clockInTime).toISOString().substring(0,16),
        clockOutTime: log.clockOutTime ? new Date(log.clockOutTime).toISOString().substring(0,16) : undefined
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTimeLog(null);
  };

  const handleSaveTimeLog = () => {
    if (
      currentTimeLog &&
      currentTimeLog.userId &&
      currentTimeLog.clockInTime
    ) {
      if (currentTimeLog.clockOutTime && currentTimeLog.clockInTime >= currentTimeLog.clockOutTime) {
        alert("Clock out time must be after clock in time.");
        return;
      }
      
      const selectedUser = allUsers.find(u => u.id === currentTimeLog.userId);
      // Ensure the role being logged is an operational role
      if (selectedUser && (selectedUser.role === ROLES.ADMIN || selectedUser.role === ROLES.STORE_ADMIN)) {
        alert("Attendance logs are typically for operational staff, not Admins or Store Admins.");
        return;
      }

      const logToSave = {
        ...currentTimeLog,
        userName: selectedUser ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''} (${selectedUser.username})`.trim() : 'Unknown',
        role: selectedUser?.role || Role.CASHIER,
        clockInTime: new Date(currentTimeLog.clockInTime).toISOString(),
        clockOutTime: currentTimeLog.clockOutTime ? new Date(currentTimeLog.clockOutTime).toISOString() : undefined,
      };

      if (isEditing && currentTimeLog.id) {
        updateTimeLog(logToSave as TimeLog);
      } else {
        addManualTimeLog(logToSave as Omit<TimeLog, 'id'>);
      }
      closeModal();
    } else {
      alert("Please fill in User and Clock In Time.");
    }
  };

  const handleDeleteTimeLog = (logId: string) => {
    if (window.confirm('Are you sure you want to delete this time log?')) {
      deleteTimeLog(logId);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDownloadReport = async () => {
    setIsGeneratingPDF(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50)); 
      // Pass staffUsersForAttendance instead of all users for PDF, if needed for cashier name lookup there
      generateAttendanceReportPDF(filteredTimeLogs, filters, totalHoursSummary);
    } catch (error) {
      console.error("Error generating attendance PDF:", error);
      alert("Failed to generate PDF report. See console for details.");
    }
    setIsGeneratingPDF(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <FaClock className="mr-2 text-emerald" />Staff Attendance Tracking
        </h2>
        <div className="flex space-x-2">
            <Button 
                onClick={handleDownloadReport} 
                disabled={isGeneratingPDF || filteredTimeLogs.length === 0} 
                leftIcon={<FaFilePdf/>}
                variant="secondary"
            >
                {isGeneratingPDF ? 'Generating PDF...' : "Attendance PDF"}
            </Button>
            <Button onClick={openModalForCreate} leftIcon={<FaPlus />} disabled={staffUsersForAttendance.length === 0}>Add Log Manually</Button>
        </div>
      </div>
       {staffUsersForAttendance.length === 0 && <p className="text-sm text-terracotta">Add operational staff (Cashiers, Baristas, etc.) first to manage attendance.</p>}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-cream dark:bg-charcoal-900/50 rounded-lg shadow">
        <Select label="Staff Member" name="userId" options={staffUsersOptions} value={filters.userId} onChange={handleFilterChange} />
        <Input type="date" label="Start Date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
        <Input type="date" label="End Date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
      </div>

      {/* Summary of Hours */}
      {totalHoursSummary.length > 0 && (
        <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-bold text-charcoal-dark dark:text-cream-light mb-2">Total Hours (Filtered)</h3>
            <ul className="space-y-1 text-sm">
                {totalHoursSummary.map(summary => (
                    <li key={summary.userName} className="flex justify-between text-charcoal dark:text-cream-light">
                        <span>{summary.userName}:</span>
                        <span className="font-medium">{summary.totalHours} hours ({summary.logCount} logs)</span>
                    </li>
                ))}
            </ul>
        </div>
      )}

      {/* Time Logs Table */}
      <div className="overflow-x-auto bg-cream dark:bg-charcoal-dark/50 p-3 rounded-lg">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream-light dark:bg-charcoal-dark/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Clock In</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Clock Out</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Notes</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {filteredTimeLogs.map(log => (
              <tr key={log.id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal dark:text-cream-light">{log.userName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal-light">{log.role}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal-light">{new Date(log.clockInTime).toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal-light">{log.clockOutTime ? new Date(log.clockOutTime).toLocaleString() : 'Active'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal-light font-semibold">{calculateDuration(log.clockInTime, log.clockOutTime)}</td>
                <td className="px-4 py-3 text-sm text-charcoal-light truncate max-w-xs">{log.notes || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openModalForEdit(log)} leftIcon={<FaEdit/>}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteTimeLog(log.id)} leftIcon={<FaTrash/>}>Delete</Button>
                </td>
              </tr>
            ))}
            {filteredTimeLogs.length === 0 && (
                <tr><td colSpan={7} className="text-center py-4 text-charcoal-light">No time logs found for current selection.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Time Log Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Time Log' : 'Add Manual Time Log'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSaveTimeLog}>Save Log</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Staff Member"
            options={staffUsersOptions.filter(opt => opt.value !== '')} // Exclude 'All Staff'
            value={currentTimeLog?.userId || ''}
            onChange={e => {
                const selectedUser = allUsers.find(u => u.id === e.target.value);
                setCurrentTimeLog(prev => ({ 
                    ...prev, 
                    userId: e.target.value,
                    userName: selectedUser ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''} (${selectedUser.username})`.trim() : '',
                    role: selectedUser?.role || Role.CASHIER,
                }));
            }}
            disabled={staffUsersForAttendance.length === 0}
          />
          <Input
            label="Clock In Time"
            type="datetime-local"
            value={currentTimeLog?.clockInTime || ''}
            onChange={e => setCurrentTimeLog(prev => ({ ...prev, clockInTime: e.target.value }))}
            required
          />
          <Input
            label="Clock Out Time (Optional)"
            type="datetime-local"
            value={currentTimeLog?.clockOutTime || ''}
            onChange={e => setCurrentTimeLog(prev => ({ ...prev, clockOutTime: e.target.value }))}
          />
          <Textarea
            label="Notes (Optional)"
            rows={2}
            value={currentTimeLog?.notes || ''}
            onChange={e => setCurrentTimeLog(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AttendanceTracking;