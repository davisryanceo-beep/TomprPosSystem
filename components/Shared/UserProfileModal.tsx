import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import { User, Role } from '../../types';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { FaUserCircle, FaCamera } from 'react-icons/fa';
import { ROLES } from '../../constants';

const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { updateUser, verifyCurrentUserPassword } = useShop();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>(undefined);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isOperationalRole = currentUser && [ROLES.CASHIER, ROLES.BARISTA, ROLES.STOCK_MANAGER].includes(currentUser.role);

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setProfilePictureUrl(currentUser.profilePictureUrl);
      // Reset password fields on modal open/user change
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setNewPin('');
      setConfirmNewPin('');
      setError(null);
      setSuccessMessage(null);
    }
  }, [currentUser, isOpen]);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limit to 2MB for dataURL in localStorage
        setError("Image size should be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePictureUrl(reader.result as string);
        setError(null);
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
      }
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!currentUser) return;

    const wantsToChangePassword = newPassword.length > 0;
    const wantsToChangePin = isOperationalRole && newPin.length > 0;

    // If no security changes are being made, just update profile info.
    if (!wantsToChangePassword && !wantsToChangePin) {
      const updatedUserDetails: Partial<User> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        profilePictureUrl: profilePictureUrl,
      };
      await updateUser({ ...currentUser, ...updatedUserDetails } as User, currentUser);
      setSuccessMessage("Profile details updated successfully!");
      return;
    }

    // If security changes are requested, we need the current password.
    if (!currentPassword) {
      setError("Please enter your current password to update security settings.");
      return;
    }

    const isPasswordCorrect = verifyCurrentUserPassword(currentUser.id, currentPassword);
    if (!isPasswordCorrect) {
      setError("Incorrect current password.");
      return;
    }

    // Validate new password if provided
    if (wantsToChangePassword) {
      if (newPassword !== confirmNewPassword) {
        setError("New passwords do not match.");
        return;
      }
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters long.");
        return;
      }
    }

    // Validate new PIN if provided
    if (wantsToChangePin) {
      if (newPin !== confirmNewPin) {
        setError("New PINs do not match.");
        return;
      }
      if (!/^\d{4}$/.test(newPin)) {
        setError("New PIN must be exactly 4 digits.");
        return;
      }
    }

    // All validations passed, prepare the update object
    const updatedUserDetails: Partial<User> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      profilePictureUrl: profilePictureUrl,
    };
    if (wantsToChangePassword) {
      (updatedUserDetails as User).password = newPassword;
    }
    if (wantsToChangePin) {
      (updatedUserDetails as User).pin = newPin;
    }

    // Perform the update
    const success = await updateUser({ ...currentUser, ...updatedUserDetails } as User, currentUser);

    if (success) {
      setSuccessMessage("Profile updated successfully!");

      // Clear the sensitive fields
      setCurrentPassword('');
      if (wantsToChangePassword) {
        setNewPassword('');
        setConfirmNewPassword('');
      }
      if (wantsToChangePin) {
        setNewPin('');
        setConfirmNewPin('');
      }
    } else {
      setError("Failed to update profile. An error occurred.");
    }
  };

  if (!currentUser) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Profile"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center space-y-3">
          {profilePictureUrl ? (
            <img src={profilePictureUrl} alt="Profile" className="h-28 w-28 rounded-full object-cover border-4 border-emerald" />
          ) : (
            <FaUserCircle className="h-28 w-28 text-charcoal/20 dark:text-charcoal-light/20" />
          )}
          <label htmlFor="profilePictureInput" className="cursor-pointer inline-flex items-center px-4 py-2 border border-charcoal/20 dark:border-charcoal-light/20 text-sm font-bold rounded-lg text-charcoal dark:text-cream-light bg-cream-light dark:bg-charcoal-dark hover:bg-cream dark:hover:bg-charcoal">
            <FaCamera className="mr-2" /> Change Picture
          </label>
          <input
            id="profilePictureInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePictureChange}
          />
        </div>

        <Input
          label="Username"
          id="profileUsername"
          value={currentUser.username}
          disabled
          className="bg-cream dark:bg-charcoal-900/40"
        />
        <Input
          label="Role"
          id="profileRole"
          value={currentUser.role}
          disabled
          className="bg-cream dark:bg-charcoal-900/40"
        />
        <Input
          label="First Name"
          id="profileFirstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter your first name"
        />
        <Input
          label="Last Name"
          id="profileLastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter your last name"
        />

        <hr className="my-6 border-charcoal/10 dark:border-cream-light/10" />
        <h4 className="text-lg font-bold text-charcoal-dark dark:text-cream-light">Security</h4>
        <Input
          label="Current Password"
          id="profileCurrentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password to make changes"
        />
        <Input
          label="New Password (Optional)"
          id="profileNewPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password (min. 6 chars)"
        />
        <Input
          label="Confirm New Password"
          id="profileConfirmNewPassword"
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Confirm new password"
        />

        {isOperationalRole && (
          <>
            <hr className="my-6 border-charcoal/10 dark:border-cream-light/10" />
            <h4 className="text-lg font-bold text-charcoal-dark dark:text-cream-light">Change 4-Digit PIN (optional)</h4>
            <Input
              label="New PIN"
              id="profileNewPin"
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Enter new 4-digit PIN"
              maxLength={4}
            />
            <Input
              label="Confirm New PIN"
              id="profileConfirmNewPin"
              type="password"
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value)}
              placeholder="Confirm new PIN"
              maxLength={4}
            />
          </>
        )}


        {error && <p className="text-sm text-terracotta">{error}</p>}
        {successMessage && <p className="text-sm text-emerald">{successMessage}</p>}
      </div>
    </Modal>
  );
};

export default UserProfileModal;