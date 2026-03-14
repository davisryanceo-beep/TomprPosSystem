import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { useShop } from './ShopContext';
import { loginUser, verifyPin as apiVerifyPin } from '../services/api';
import { supabase } from '../supabaseClient';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password_raw: string) => Promise<boolean>;
  logout: () => void;
  verifyPin: (userId: string, pin: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { getUserForAuth, verifyPinForAuth, reloadData } = useShop();

  useEffect(() => {
    setLoading(true); // Ensure loading is true while checking storage
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem('currentUser'); // Clear corrupted data
        localStorage.removeItem('token');
      }
    }
    setLoading(false); // Make sure to set loading to false after checking
  }, []);

  const login = async (username: string, password_raw: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await loginUser({ username, password: password_raw });
      if (response.data.success && response.data.token && response.data.user) {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        setCurrentUser(response.data.user);
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));

        // Trigger data fetch now that we have a token
        await reloadData();

        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (error: any) {
      console.error("Login failed:", error.response?.data?.error || error.message);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setLoading(true); // Optional: set loading during logout process
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    supabase.auth.signOut(); // Ensure Supabase session is cleared too
    setLoading(false); // Optional: clear loading after logout
  };

  const verifyPin = async (userId: string, pin: string): Promise<boolean> => {
    try {
      const response = await apiVerifyPin(userId, pin);
      return response.data.success === true;
    } catch (error) {
      console.error("PIN verification failed:", error);
      return false;
    }
  };
  return (
    <AuthContext.Provider value={{ currentUser, token, loading, login, logout, verifyPin, loginWithGoogle: async () => { }, reloadData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};