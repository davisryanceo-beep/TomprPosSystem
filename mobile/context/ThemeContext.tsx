import React, { createContext, useState, useContext, useEffect } from 'react';
import { storage } from '../utils/storage';
import { useColorScheme } from 'react-native';

// Premium "Antigravity" Palette
export const Colors = {
    light: {
        background: '#f0fdfa', // Very light emerald
        text: '#111827',
        textSecondary: '#4b5563',
        card: '#ffffff',
        border: '#e2e8f0',
        primary: '#059669',
        secondary: '#4f46e5', // Indigo
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        // Gradients
        bgGradient: ['#f0fdfa', '#ccfbf1'] as const,
        primaryGradient: ['#059669', '#10b981'] as const,
        cardGradient: ['#ffffff', '#f8fafc'] as const,
        accentGradient: ['#4f46e5', '#818cf8'] as const,
    },
    dark: {
        background: '#111827', // Gray 900
        text: '#f9fafb',
        textSecondary: '#9ca3af',
        card: '#1f2937', // Gray 800
        border: '#374151',
        primary: '#34d399',
        secondary: '#818cf8',
        success: '#34d399',
        danger: '#f87171',
        warning: '#fbbf24',
        info: '#60a5fa',
        // Gradients
        bgGradient: ['#111827', '#0f172a'] as const,
        primaryGradient: ['#059669', '#34d399'] as const,
        cardGradient: ['#1f2937', '#111827'] as const,
        accentGradient: ['#4f46e5', '#6366f1'] as const,
    }
};

type ColorTheme = {
    background: string;
    text: string;
    textSecondary: string;
    card: string;
    border: string;
    primary: string;
    secondary: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
    bgGradient: readonly [string, string, ...string[]];
    primaryGradient: readonly [string, string, ...string[]];
    cardGradient: readonly [string, string, ...string[]];
    accentGradient: readonly [string, string, ...string[]];
};

type ThemeContextType = {
    theme: 'light' | 'dark';
    colors: ColorTheme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    colors: Colors.light,
    toggleTheme: () => { }
});

export const ThemeProvider = ({ children }: any) => {
    const systemScheme = useColorScheme();
    const [theme, setTheme] = useState<'light' | 'dark'>(systemScheme || 'light');

    useEffect(() => {
        storage.getItem('theme').then(t => {
            if (t === 'dark' || t === 'light') setTheme(t);
        });
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        storage.setItem('theme', newTheme);
    };

    const colors = Colors[theme];

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
