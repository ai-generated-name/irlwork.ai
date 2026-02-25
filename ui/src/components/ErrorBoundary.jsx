import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error';
      const errorStack = this.state.error?.stack || '';

      return (
        <div style={{
          minHeight: '100vh',
          background: '#FAFAF8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 560,
            background: 'white',
            borderRadius: 16,
            padding: 48,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(224,122,95,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 28,
            }}>
              !
            </div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#1A1A1A',
              marginBottom: 12,
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: 15,
              color: '#333333',
              lineHeight: 1.6,
              marginBottom: 16,
            }}>
              An unexpected error occurred. Please go back to the homepage or refresh the page.
            </p>

            {/* Show error details for debugging */}
            <details style={{ textAlign: 'left', marginBottom: 24 }}>
              <summary style={{
                cursor: 'pointer',
                fontSize: 13,
                color: '#888888',
                marginBottom: 8,
              }}>
                Error details
              </summary>
              <div style={{
                background: '#F5F3F0',
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#333333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflow: 'auto',
              }}>
                {errorMessage}
                {errorStack && '\n\n' + errorStack.split('\n').slice(0, 5).join('\n')}
              </div>
            </details>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '14px 32px',
                  background: '#E8853D',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#D4703A'}
                onMouseOut={(e) => e.currentTarget.style.background = '#E8853D'}
              >
                Go to Homepage
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '14px 32px',
                  background: 'transparent',
                  color: '#333333',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 12,
                  border: '2px solid rgba(0,0,0,0.12)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F5F3F0'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)' }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
