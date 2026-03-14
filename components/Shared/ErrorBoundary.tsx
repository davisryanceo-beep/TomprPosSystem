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
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          fontFamily: "'Nunito', sans-serif",
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1.5rem',
            padding: '3rem 2.5rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            maxWidth: '480px',
            width: '100%',
          }}>
            {/* Icon */}
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#1f2937',
              marginBottom: '0.75rem',
            }}>
              Something went wrong
            </h1>

            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>
              The application ran into an unexpected error. Your data is safe — please refresh to try again.
            </p>

            {/* Show error in development */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}>
                <summary style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}>
                  Error details
                </summary>
                <pre style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#7f1d1d',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '0.875rem',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              🔄 Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
