import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
    fontSize: 'small' | 'medium' | 'large' | 'x-large';
    setFontSize: (size: 'small' | 'medium' | 'large' | 'x-large') => void;
    highContrast: boolean;
    toggleHighContrast: () => void;
    language: 'en' | 'km';
    setLanguage: (lang: 'en' | 'km') => void;
    announceToScreenReader: (message: string) => void;
    virtualKeyboardEnabled: boolean;
    toggleVirtualKeyboard: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large' | 'x-large'>('medium');
    const [highContrast, setHighContrast] = useState(false);
    const [language, setLanguageState] = useState<'en' | 'km'>('en');
    const [virtualKeyboardEnabled, setVirtualKeyboardEnabled] = useState(false);

    // Load preferences from localStorage
    useEffect(() => {
        const savedFontSize = localStorage.getItem('accessibility-fontSize');
        const savedHighContrast = localStorage.getItem('accessibility-highContrast');
        const savedLanguage = localStorage.getItem('accessibility-language');
        const savedKeyboard = localStorage.getItem('accessibility-virtualKeyboardEnabled');

        if (savedFontSize) setFontSizeState(savedFontSize as any);
        if (savedHighContrast) setHighContrast(savedHighContrast === 'true');
        if (savedLanguage) setLanguageState(savedLanguage as 'en' | 'km');
        if (savedKeyboard) setVirtualKeyboardEnabled(savedKeyboard === 'true');
    }, []);

    // Apply font size to document
    useEffect(() => {
        const fontSizeMap = {
            small: '14px',
            medium: '16px',
            large: '18px',
            'x-large': '20px'
        };
        document.documentElement.style.fontSize = fontSizeMap[fontSize];
    }, [fontSize]);

    // Apply high contrast mode
    useEffect(() => {
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }, [highContrast]);

    const setFontSize = (size: 'small' | 'medium' | 'large' | 'x-large') => {
        setFontSizeState(size);
        localStorage.setItem('accessibility-fontSize', size);
    };

    const toggleHighContrast = () => {
        const newValue = !highContrast;
        setHighContrast(newValue);
        localStorage.setItem('accessibility-highContrast', String(newValue));
    };

    const setLanguage = (lang: 'en' | 'km') => {
        setLanguageState(lang);
        localStorage.setItem('accessibility-language', lang);
        document.documentElement.lang = lang;
    };

    const toggleVirtualKeyboard = () => {
        const newValue = !virtualKeyboardEnabled;
        setVirtualKeyboardEnabled(newValue);
        localStorage.setItem('accessibility-virtualKeyboardEnabled', String(newValue));
    };

    const announceToScreenReader = (message: string) => {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
    };

    return (
        <AccessibilityContext.Provider
            value={{
                fontSize,
                setFontSize,
                highContrast,
                toggleHighContrast,
                language,
                setLanguage,
                announceToScreenReader,
                virtualKeyboardEnabled,
                toggleVirtualKeyboard
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within AccessibilityProvider');
    }
    return context;
};
