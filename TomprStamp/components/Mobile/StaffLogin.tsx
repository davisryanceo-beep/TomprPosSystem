
import React, { useState, useEffect } from 'react';
import MobileLayout from './MobileLayout';
import api, { loginUser } from '../../services/api'; // Correct import
import { User, Role } from '../../types';
import { useShop } from '../../contexts/ShopContext';
import { FaUserCircle, FaLock, FaStore } from 'react-icons/fa';

const StaffLogin: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const res = await loginUser({ username, password });

            if (res.data.token) {
                // Store Token
                localStorage.setItem('token', res.data.token);
                sessionStorage.setItem('token', res.data.token); // For redundancy or specific staff session
                // Also store user info
                sessionStorage.setItem('staffUserId', res.data.user.id);
                sessionStorage.setItem('staffPin', res.data.user.pin); // Still useful for verification if needed, but not for auth

                window.location.hash = `#/mobile/dashboard?userId=${res.data.user.id}`;
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout title="Staff Portal" showStatusBar={true}>
            <div className="p-6 flex flex-col items-center justify-center min-h-[80vh] gap-6">

                <div className="text-center mb-4">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-4xl mx-auto mb-4">
                        <FaStore />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Tompr Stamp</h2>
                    <p className="text-gray-500 text-sm">Staff Check-in</p>
                </div>

                <div className="w-full space-y-4">

                    {/* Username Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full p-3 pl-10 rounded-xl border border-gray-300"
                                placeholder="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                            <div className="absolute left-3 top-3.5 text-gray-400 text-lg">
                                <FaUserCircle />
                            </div>
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                className="w-full p-3 pl-10 rounded-xl border border-gray-300"
                                placeholder="••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <div className="absolute left-3 top-4 text-gray-400">
                                <FaLock />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all mt-4"
                    >
                        {loading ? 'Logging In...' : 'Login'}
                    </button>


                    <div className="text-center mt-4">
                        <a href="#/" className="text-sm text-gray-400 hover:text-gray-600">Back to Main Site</a>
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
};

export default StaffLogin;
