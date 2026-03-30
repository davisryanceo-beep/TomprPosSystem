import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Shift, User, Role } from '../../types';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import Textarea from '../Shared/Textarea';
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt } from 'react-icons/fa';
import { ROLES } from '../../constants'; // Import ROLES
import { useAuth } from '../../contexts/AuthContext';

const ShiftManagement: React.FC = () => {
  const { allUsers, shifts, addShift, updateShift, deleteShift, currentStoreId } = useShop();
  const { currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Partial<Shift> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const contextUsers = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === ROLES.ADMIN) {
      if (!currentStoreId) return []; // GA must select a store to manage shifts
      return allUsers.filter(u => u.storeId === currentStoreId);
    }

    if (currentUser.role === ROLES.STORE_ADMIN) {
      return allUsers.filter(u => u.storeId === currentUser.storeId);
    }

    return [];
  }, [allUsers, currentUser, currentStoreId]);

  // Filter users to exclude Admins (Global and Store) for shift assignment
  const staffUsersForShiftAssignment = useMemo(() =>
    contextUsers.filter(user => user.role !== ROLES.ADMIN && user.role !== ROLES.STORE_ADMIN)
      .map(user => ({ value: user.id, label: `${user.firstName || ''} ${user.lastName || ''} (${user.username}) - ${user.role}`.trim() })),
    [contextUsers]);

  const openModalForCreate = () => {
    const defaultUser = staffUsersForShiftAssignment.length > 0 ? allUsers.find(u => u.id === staffUsersForShiftAssignment[0].value) : null;
    setCurrentShift({
      userId: staffUsersForShiftAssignment[0]?.value || '',
      userName: defaultUser ? `${defaultUser.firstName || ''} ${defaultUser.lastName || ''} (${defaultUser.username})`.trim() : '',
      role: defaultUser?.role, // This will be Cashier, Barista etc.
      date: new Date().toISOString().split('T')[0], // Default to today
      startTime: '09:00',
      endTime: '17:00',
      notes: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (shift: Shift) => {
    setCurrentShift(shift);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentShift(null);
  };

  const handleSaveShift = async () => {
    if (
      currentShift &&
      currentShift.userId &&
      currentShift.date &&
      currentShift.startTime &&
      currentShift.endTime
    ) {
      if (currentShift.startTime >= currentShift.endTime) {
        alert("End time must be after start time.");
        return;
      }

      const selectedUser = allUsers.find(u => u.id === currentShift.userId);
      // Ensure the role is one of the operational roles.
      // The user selection dropdown is already filtered to only show operational staff,
      // so an admin or store admin cannot be selected. This check is redundant but acts as a safeguard.
      // The check for ROLES.ADMIN was removed because it caused a TypeScript error for Store Admins,
      // as they cannot see Global Admins in their user list, making the comparison invalid.
      if (selectedUser && selectedUser.role === ROLES.STORE_ADMIN) {
        alert("Admins and Store Admins cannot be assigned to shifts directly through this interface.");
        return;
      }

      const shiftToSave: Shift = {
        ...currentShift,
        userName: selectedUser ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''} (${selectedUser.username})`.trim() : 'Unknown User',
        role: selectedUser?.role || Role.CASHIER,
      } as Shift;


      if (isEditing && currentShift.id) {
        await updateShift(shiftToSave);
      } else {
        const { id, storeId, ...shiftDataWithoutIdAndStoreId } = shiftToSave;
        await addShift(shiftDataWithoutIdAndStoreId as Omit<Shift, 'id' | 'storeId'>);
      }
      closeModal();
    } else {
      alert("Please fill in all required fields (User, Date, Start Time, End Time).");
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      await deleteShift(shiftId);
    }
  };

  // Group shifts by date
  const groupedShifts = useMemo(() => {
    const groups: { [date: string]: Shift[] } = {};
    shifts
      .sort((a, b) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime()) // Sort by date then start time
      .forEach(shift => {
        const dateKey = shift.date;
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(shift);
      });
    // Sort groups by date (keys)
    return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
  }, [shifts]);


  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          <span className="mr-2 text-emerald"><FaCalendarAlt /></span>Staff Shift Scheduling
        </h2>
        <Button onClick={openModalForCreate} leftIcon={<FaPlus />} disabled={staffUsersForShiftAssignment.length === 0}>
          Add Shift
        </Button>
      </div>
      {staffUsersForShiftAssignment.length === 0 && <p className="text-sm text-terracotta">Add non-admin staff (Cashiers, Baristas, etc.) first to schedule shifts.</p>}


      {groupedShifts.length === 0 ? (
        <p className="text-center text-charcoal-light py-6">No shifts scheduled yet.</p>
      ) : (
        <div className="space-y-4">
          {groupedShifts.map(([date, shiftsOnDate]) => (
            <div key={date} className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-bold text-charcoal-dark dark:text-cream-light mb-2">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
                  <thead className="bg-cream-light dark:bg-charcoal-dark/30">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Staff</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Time</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-charcoal-light uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
                    {shiftsOnDate.map(shift => (
                      <tr key={shift.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal dark:text-cream-light">{shift.userName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal-light">{shift.role}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-charcoal-light">{shift.startTime} - {shift.endTime}</td>
                        <td className="px-4 py-3 text-sm text-charcoal-light truncate max-w-xs">{shift.notes || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openModalForEdit(shift)} leftIcon={<FaEdit />}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteShift(shift.id)} leftIcon={<FaTrash />}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Shift' : 'Add New Shift'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSaveShift}>Save Shift</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Staff Member"
            options={staffUsersForShiftAssignment}
            value={currentShift?.userId || ''}
            onChange={e => {
              const selectedUser = allUsers.find(u => u.id === e.target.value);
              setCurrentShift({
                ...currentShift,
                userId: e.target.value,
                userName: selectedUser ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''} (${selectedUser.username})`.trim() : '',
                role: selectedUser?.role
              });
            }}
            disabled={staffUsersForShiftAssignment.length === 0}
          />
          <Input
            label="Date"
            type="date"
            value={currentShift?.date || ''}
            onChange={e => setCurrentShift({ ...currentShift, date: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={currentShift?.startTime || ''}
              onChange={e => setCurrentShift({ ...currentShift, startTime: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              value={currentShift?.endTime || ''}
              onChange={e => setCurrentShift({ ...currentShift, endTime: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes (Optional)"
            rows={2}
            value={currentShift?.notes || ''}
            onChange={e => setCurrentShift({ ...currentShift, notes: e.target.value })}
            placeholder="e.g., Opening shift, Cover for Jane"
          />
        </div>
      </Modal>
    </div>
  );
};

export default ShiftManagement;