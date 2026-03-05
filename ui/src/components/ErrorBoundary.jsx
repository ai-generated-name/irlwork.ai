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
          fontFamily: "'Sora', sans-serif",
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 560,
            background: 'white',
            borderRadius: 20,
            padding: 48,
            boxShadow: '0 4px 24px rgba(200,150,100,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
            border: '1px solid rgba(220,200,180,0.35)',
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
              color: '#1A1410',
              marginBottom: 12,
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: 15,
              color: 'rgba(26,20,16,0.65)',
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
                color: 'rgba(26,20,16,0.40)',
                marginBottom: 8,
              }}>
                Error details
              </summary>
              <div style={{
                background: 'rgba(220,200,180,0.15)',
                borderRadius: 11,
                padding: 12,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'rgba(26,20,16,0.65)',
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
                  background: 'linear-gradient(135deg, #F0905A 0%, #E8703D 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 15,
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'Sora', sans-serif",
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(200,150,100,0.08)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                Go to Homepage
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '14px 32px',
                  background: 'transparent',
                  color: 'rgba(26,20,16,0.65)',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 20,
                  border: '2px solid rgba(220,200,180,0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'Sora', sans-serif",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(220,200,180,0.15)'; e.currentTarget.style.borderColor = 'rgba(220,200,180,0.50)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(220,200,180,0.40)' }}
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
