import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#FAF8F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 480,
            background: 'white',
            borderRadius: 16,
            padding: 48,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid rgba(26,26,26,0.06)',
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
              color: '#525252',
              lineHeight: 1.6,
              marginBottom: 32,
            }}>
              An unexpected error occurred. Please try again or refresh the page.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '14px 32px',
                background: '#E07A5F',
                color: 'white',
                fontWeight: 600,
                fontSize: 15,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#c45f4a'}
              onMouseOut={(e) => e.currentTarget.style.background = '#E07A5F'}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
