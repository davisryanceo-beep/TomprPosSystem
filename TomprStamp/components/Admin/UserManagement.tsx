import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { User, Role, Store } from '../../types';
import { ROLES } from '../../constants';
import Button from '../Shared/Button';
import Modal from '../Shared/Modal';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import { FaPlus, FaEdit, FaTrash, FaUserShield, FaBrain, FaSync, FaUsersCog, FaUserPlus } from 'react-icons/fa';
import LoadingSpinner from '../Shared/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

const UserManagement: React.FC = () => {
  const {
    allUsers,
    addUser, updateUser, deleteUser,
    currentStoreId: contextStoreId, // Navbar selected store for GA
    stores, getStoreById
  } = useShop();
  const { currentUser: authUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserFormData, setCurrentUserFormData] = useState<Partial<User> & { password?: string, pin?: string }>({});
  const [isEditing, setIsEditing] = useState(false);

  const isGlobalAdmin = authUser?.role === ROLES.ADMIN;
  const isStoreAdmin = authUser?.role === ROLES.STORE_ADMIN && !!authUser?.storeId;

  const displayedUsersFromContext = useMemo(() => {
    if (!authUser) return [];

    if (isGlobalAdmin) {
      if (!contextStoreId) {
        return allUsers;
      } else {
        return allUsers.filter(u => u.storeId === contextStoreId || (u.role === ROLES.ADMIN && !u.storeId));
      }
    } else if (isStoreAdmin) {
      return allUsers.filter(u => u.storeId === authUser.storeId);
    } else if (authUser.storeId) {
      return contextStoreId === authUser.storeId ? allUsers.filter(u => u.storeId === authUser.storeId) : [];
    }
    return [];
  }, [allUsers, contextStoreId, authUser, isGlobalAdmin, isStoreAdmin]);

  const openModalForCreate = () => {
    let initialStoreIdForForm: string | undefined;
    let initialRole: Role = ROLES.CASHIER; // Default for SA creating staff

    if (isGlobalAdmin) {
      initialRole = ROLES.STORE_ADMIN; // GA defaults to creating Store Admin
      initialStoreIdForForm = contextStoreId || undefined;
    } else if (isStoreAdmin && authUser.storeId) {
      initialStoreIdForForm = authUser.storeId; // Restricted to their store
    }

    setCurrentUserFormData({
      username: '',
      role: initialRole,
      password: '',
      pin: '',
      firstName: '',
      lastName: '',
      storeId: initialStoreIdForForm
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (user: User) => {
    setCurrentUserFormData({ ...user, password: '', pin: '' });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentUserFormData({});
  };

  const handleSaveUser = async () => {
    if (!authUser) { alert("Authentication error."); return; }
    const { id, password: formPassword, pin: formPin, ...userDataFromForm } = currentUserFormData;

    if (!userDataFromForm.username || !userDataFromForm.role) {
      alert("Username and Role are required."); return;
    }
    if (!isEditing && !formPassword) {
      alert("Password is required for new users."); return;
    }

    const role = userDataFromForm.role;
    const isOperationalRole = role === ROLES.CASHIER || role === ROLES.BARISTA || role === ROLES.STOCK_MANAGER;

    if (!isEditing && isOperationalRole && !formPin) {
      alert("A 4-digit PIN is required for new operational staff.");
      return;
    }
    if (formPin && !/^\d{4}$/.test(formPin)) {
      alert("PIN must be exactly 4 digits.");
      return;
    }

    let storeIdToSave = userDataFromForm.storeId;
    let roleToSave: Role = userDataFromForm.role!; // Role should be set
    const originalUserBeingEdited = isEditing ? displayedUsersFromContext.find(u => u.id === currentUserFormData.id) : null;


    // Apply role-based logic for saving
    if (isGlobalAdmin) {
      switch (roleToSave) {
        case ROLES.ADMIN:
          storeIdToSave = undefined;
          break;
        case ROLES.STORE_ADMIN:
          if (!storeIdToSave) { alert("Store Admins must be assigned to a specific store. Select one from Navbar first, or choose one in the form."); return; }
          break;
        default: // CASHIER, BARISTA, STOCK_MANAGER
          if (!storeIdToSave) { alert("Operational staff must be assigned to a store. Select one from Navbar or the form."); return; }
          break;
      }
    } else if (isStoreAdmin && authUser.storeId) {
      roleToSave = userDataFromForm.role!; // Role from form.
      storeIdToSave = authUser.storeId; // Force Store Admin's store
    }

    const userToSave: User = {
      id: id || `temp-${Date.now()}`,
      ...userDataFromForm,
      role: roleToSave,
      storeId: storeIdToSave,
      ...(formPassword && { password: formPassword }),
      ...(formPin && { pin: formPin }),
    } as User;

    let success;
    if (isEditing && id) {
      success = await updateUser(userToSave, authUser);
    } else {
      const { id: tempId, ...restOfUser } = userToSave;
      success = await addUser(restOfUser, authUser);
    }

    if (success) { closeModal(); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!authUser) { alert("Authentication error."); return; }
    await deleteUser(userId, authUser);
  };

  const getRoleOptionsForForm = () => {
    if (isGlobalAdmin) {
      return Object.values(ROLES).map((r: Role) => ({ value: r, label: r }));
    }
    if (isStoreAdmin) {
      const operationalRoles = [ROLES.CASHIER, ROLES.BARISTA, ROLES.STOCK_MANAGER].map(r => ({ value: r, label: r }));
      // When a Store Admin edits their own profile, their role must be in the options list for the Select component
      // to render correctly, even if it's disabled.
      if (isEditing && currentUserFormData.id === authUser?.id && currentUserFormData.role === ROLES.STORE_ADMIN) {
        return [{ value: ROLES.STORE_ADMIN, label: ROLES.STORE_ADMIN }];
      }
      return operationalRoles;
    }
    return [];
  };
  const roleOptionsForForm = getRoleOptionsForForm();

  const availableStoresForSelection = stores.map(s => ({ value: s.id, label: s.name }));
  const selectedRoleInForm = currentUserFormData?.role;
  const isOperationalRoleSelected = selectedRoleInForm ? (selectedRoleInForm === ROLES.CASHIER || selectedRoleInForm === ROLES.BARISTA || selectedRoleInForm === ROLES.STOCK_MANAGER) : false;

  // Store selection UI logic
  // FIX: Rewritten to be more explicit for the linter to avoid a false positive.
  // The linter may incorrectly infer that selectedRoleInForm cannot be ADMIN in the isGlobalAdmin context.
  const showStoreSelectionInForm = useMemo(() => {
    if (isGlobalAdmin) {
      return selectedRoleInForm !== ROLES.ADMIN;
    }
    return false;
  }, [isGlobalAdmin, selectedRoleInForm]);

  const isStoreSelectionRequired = showStoreSelectionInForm && (selectedRoleInForm === ROLES.STORE_ADMIN || (selectedRoleInForm !== ROLES.ADMIN && !currentUserFormData?.storeId));

  // Determine title and add button text
  let pageTitle = "User Account Management";
  let addButtonText = "Add User";
  let titleIcon = <FaUsersCog className="mr-3 text-emerald" />;

  if (isStoreAdmin) {
    pageTitle = `Manage Staff for "${getStoreById(authUser!.storeId!)?.name || 'Your Store'}"`;
    addButtonText = "Add Staff Member";
    titleIcon = <FaUserPlus className="mr-3 text-emerald" />;
  } else if (isGlobalAdmin && contextStoreId) {
    pageTitle = `Users in "${getStoreById(contextStoreId)?.name}" & Global Admins`;
  } else if (isGlobalAdmin && !contextStoreId) {
    pageTitle = "All User Accounts (Global View)";
  }

  const originalUserBeingEditedForRoleSelect = useMemo(() => {
    if (isEditing && currentUserFormData?.id) {
      return displayedUsersFromContext.find(u => u.id === currentUserFormData.id);
    }
    return null;
  }, [isEditing, currentUserFormData, displayedUsersFromContext]);


  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
          {titleIcon}{pageTitle}
        </h2>
        <Button onClick={openModalForCreate} leftIcon={<FaPlus />} disabled={isStoreAdmin && roleOptionsForForm.length === 0}>
          {addButtonText}
        </Button>
      </div>
      {isStoreAdmin && roleOptionsForForm.length === 0 && <p className="text-sm text-terracotta dark:text-terracotta">No operational roles (Cashier, Barista, Stock Manager) can be created by Store Admins currently. This might be a configuration issue.</p>}

      <div className="overflow-x-auto bg-cream-light dark:bg-charcoal-dark p-3 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-charcoal/10 dark:divide-cream-light/10">
          <thead className="bg-cream dark:bg-charcoal-dark/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Store</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-cream-light dark:bg-charcoal-dark divide-y divide-charcoal/10 dark:divide-cream-light/10">
            {displayedUsersFromContext.map(user => (
              <tr key={user.id} className="hover:bg-cream dark:hover:bg-charcoal-dark/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal-dark dark:text-cream-light">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light dark:text-charcoal-light">{user.firstName || ''} {user.lastName || ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light dark:text-charcoal-light">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-light dark:text-charcoal-light">
                  {user.role === ROLES.ADMIN ? 'Global' : (user.storeId ? getStoreById(user.storeId)?.name || 'Unknown Store' : 'N/A')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {(isGlobalAdmin || (isStoreAdmin && user.storeId === authUser.storeId && (user.role !== ROLES.STORE_ADMIN || user.id === authUser.id))) &&
                    <Button variant="ghost" size="sm" onClick={() => openModalForEdit(user)} leftIcon={<FaEdit />}>Edit</Button>
                  }
                  {user.id !== authUser?.id && (isGlobalAdmin || (isStoreAdmin && user.storeId === authUser.storeId && user.role !== ROLES.STORE_ADMIN)) &&
                    <Button variant="danger" size="sm" onClick={() => handleDeleteUser(user.id)} leftIcon={<FaTrash />}>Delete</Button>
                  }
                </td>
              </tr>
            ))}
            {displayedUsersFromContext.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-charcoal-light dark:text-charcoal-light">No users found for the current selection.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit User' : addButtonText}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSaveUser}>Save User</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Username" value={currentUserFormData?.username || ''} onChange={e => setCurrentUserFormData({ ...currentUserFormData, username: e.target.value })} required />
          <Input label="First Name" value={currentUserFormData?.firstName || ''} onChange={e => setCurrentUserFormData({ ...currentUserFormData, firstName: e.target.value })} />
          <Input label="Last Name" value={currentUserFormData?.lastName || ''} onChange={e => setCurrentUserFormData({ ...currentUserFormData, lastName: e.target.value })} />
          <Input
            label="Password"
            type="password"
            value={currentUserFormData?.password || ''}
            onChange={e => setCurrentUserFormData({ ...currentUserFormData, password: e.target.value })}
            placeholder={isEditing ? "Leave blank to keep current" : "Required"}
            required={!isEditing}
          />
          <Input
            label="4-Digit PIN"
            type="password"
            value={currentUserFormData?.pin || ''}
            onChange={e => setCurrentUserFormData({ ...currentUserFormData, pin: e.target.value })}
            placeholder={isEditing ? "Leave blank to keep current" : "Required for Staff"}
            maxLength={4}
            pattern="\d{4}"
            required={!isEditing && isOperationalRoleSelected}
            disabled={!isOperationalRoleSelected}
          />
          <Select
            label="Role"
            options={roleOptionsForForm}
            value={selectedRoleInForm || (isGlobalAdmin ? ROLES.STORE_ADMIN : ROLES.CASHIER)}
            onChange={e => setCurrentUserFormData({ ...currentUserFormData, role: e.target.value as Role })}
            disabled={(isStoreAdmin && isEditing && (originalUserBeingEditedForRoleSelect?.role === ROLES.STORE_ADMIN)) || (!isGlobalAdmin && isEditing && currentUserFormData.id === authUser?.id) || roleOptionsForForm.length === 0}
          />

          {showStoreSelectionInForm && (
            <Select
              label="Assign to Store"
              options={[{ value: '', label: '-- Select Store --' }, ...availableStoresForSelection]}
              value={currentUserFormData?.storeId || ''}
              onChange={e => setCurrentUserFormData({ ...currentUserFormData, storeId: e.target.value || undefined })}
              required={isStoreSelectionRequired}
              disabled={availableStoresForSelection.length === 0}
            />
          )}
          {isStoreAdmin && (
            <Input label="Store" value={getStoreById(authUser!.storeId!)?.name || 'Unknown'} disabled />
          )}

          {isGlobalAdmin && selectedRoleInForm === ROLES.ADMIN && (
            <p className="text-xs text-terracotta dark:text-terracotta">Global Administrator (no store assignment).</p>
          )}
          {isStoreSelectionRequired && !currentUserFormData?.storeId && (
            <p className="text-xs text-terracotta dark:text-terracotta">A store assignment is required for this role.</p>
          )}
          {showStoreSelectionInForm && availableStoresForSelection.length === 0 && (
            <p className="text-xs text-terracotta dark:text-terracotta">No stores available to assign. Please create a store first.</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
