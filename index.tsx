import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ShopProvider } from './contexts/ShopContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { KeyboardProvider } from './contexts/KeyboardContext';

import { AccessibilityProvider } from './contexts/AccessibilityContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AccessibilityProvider>
      <ThemeProvider>
        <ShopProvider>
          <AuthProvider>
            <KeyboardProvider>
              <App />
            </KeyboardProvider>
          </AuthProvider>
        </ShopProvider>
      </ThemeProvider>
    </AccessibilityProvider>
  </React.StrictMode>
);