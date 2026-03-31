
import React, { useState, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants';
import { User, Role } from '../../types';
import Input from '../Shared/Input';
import Button from '../Shared/Button';
import Select from '../Shared/Select';
import { FaCoffee, FaUserPlus, FaGoogle } from 'react-icons/fa';

const RegisterScreen: React.FC = () => {
    const { stores, registerUser } = useShop();
    const { loginWithGoogle } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: ROLES.CASHIER,
        storeId: stores.length > 0 ? stores[0].id : ''
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const roleOptions = Object.values(ROLES).map(role => ({ value: role, label: role }));
    const storeOptions = stores.map(store => ({ value: store.id, label: store.name }));

    const isStoreRequired = useMemo(() => {
        return formData.role !== ROLES.ADMIN;
    }, [formData.role]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        if (isStoreRequired && !formData.storeId) {
            setError("Please select a store for this role.");
            return;
        }

        setIsLoading(true);

        const userData: Omit<User, 'id'> = {
            username: formData.username,
            password: formData.password,
            role: formData.role,
            firstName: formData.firstName,
            lastName: formData.lastName,
            storeId: isStoreRequired ? formData.storeId : undefined,
        };

        const result = await registerUser(userData);

        if (result.success) {
            setSuccess(`Registration successful for ${result.user?.username}! You can now log in.`);
            // Reset form
            setFormData({
                username: '',
                password: '',
                confirmPassword: '',
                firstName: '',
                lastName: '',
                role: ROLES.CASHIER,
                storeId: stores.length > 0 ? stores[0].id : ''
            });
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-cream dark:bg-charcoal-900 p-4 fade-in">
            <div className="w-full max-w-md bg-cream-light dark:bg-charcoal-dark shadow-2xl rounded-2xl p-8 space-y-6">
                <div className="text-center">
                    <FaCoffee className="mx-auto h-16 w-16 text-emerald" />
                    <h2 className="mt-4 text-3xl font-extrabold text-charcoal-dark dark:text-cream-light">
                        Create an Account
                    </h2>
                    <p className="mt-2 text-base text-charcoal-light dark:text-charcoal-light">
                        Join the FlowsPOS team
                    </p>
                </div>

                {success ? (
                    <div className="text-center space-y-4">
                        <p className="text-emerald font-semibold">{success}</p>
                        <button
                            type="button"
                            onClick={() => window.location.hash = ''}
                            className="font-medium text-emerald hover:text-emerald-dark underline bg-transparent border-none p-0 cursor-pointer"
                        >
                            Click here to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <Input
                            name="username" label="Username" type="text" value={formData.username}
                            onChange={handleInputChange} required autoComplete="username"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                name="firstName" label="First Name" type="text" value={formData.firstName}
                                onChange={handleInputChange} autoComplete="given-name"
                            />
                            <Input
                                name="lastName" label="Last Name" type="text" value={formData.lastName}
                                onChange={handleInputChange} autoComplete="family-name"
                            />
                        </div>
                        <Input
                            name="password" label="Password" type="password" value={formData.password}
                            onChange={handleInputChange} required autoComplete="new-password"
                        />
                        <Input
                            name="confirmPassword" label="Confirm Password" type="password" value={formData.confirmPassword}
                            onChange={handleInputChange} required autoComplete="new-password"
                        />
                        <Select
                            name="role" label="Role" options={roleOptions} value={formData.role}
                            onChange={handleInputChange}
                        />
                        {isStoreRequired && (
                            <Select
                                name="storeId" label="Store" options={storeOptions} value={formData.storeId}
                                onChange={handleInputChange} disabled={storeOptions.length === 0}
                            />
                        )}

                        {error && <p className="text-sm text-terracotta text-center">{error}</p>}

                        <Button type="submit" variant="primary" size="lg" className="w-full !py-3" disabled={isLoading} leftIcon={<FaUserPlus />}>
                            {isLoading ? 'Registering...' : 'Register'}
                        </Button>
                    </form>
                )}

                <p className="mt-4 text-center text-sm text-charcoal-light dark:text-charcoal-light">
                    Already have an account?{' '}
                    <button
                        type="button"
                        onClick={() => window.location.hash = ''}
                        className="font-medium text-emerald hover:text-emerald-dark underline bg-transparent border-none p-0 cursor-pointer"
                    >
                        Login here
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegisterScreen;
