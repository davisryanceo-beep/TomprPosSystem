import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10 text-center border border-emerald-100">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <span className="text-4xl">☕</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Something went wrong</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We've encountered an unexpected error. Your data is safe—please reload to continue brewing.
            </p>
            {this.state.error && (
              <details className="text-xs text-left bg-gray-50 p-4 rounded-xl mb-8 overflow-auto max-h-40 font-mono text-gray-400 border border-gray-100">
                <summary className="cursor-pointer hover:text-emerald-600 transition-colors mb-2 font-semibold">Error technical details</summary>
                {this.state.error.message}
              </details>
            )}
            <button
              onClick={this.handleReload}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-4 font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-emerald-200/50"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
