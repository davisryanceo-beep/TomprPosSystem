import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ShopProvider } from './contexts/ShopContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { KeyboardProvider } from './contexts/KeyboardContext';
import './i18n';

import { AccessibilityProvider } from './contexts/AccessibilityContext';
import ErrorBoundary from './components/Shared/ErrorBoundary';
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
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
    </ErrorBoundary>
  </React.StrictMode>
);