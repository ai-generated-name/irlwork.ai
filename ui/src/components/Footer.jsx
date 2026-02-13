import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <>
      {/* Dark theme footer for dashboard pages */}
      <footer className="footer-dark" style={{
        background: 'var(--bg-0)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '64px 0 32px'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--sp-8)',
            marginBottom: 'var(--sp-8)'
          }}>
            <div>
              <Link to="/" className="logo-v4" style={{ marginBottom: 'var(--sp-4)' }}>
                <div className="logo-mark-v4">irl</div>
                <span className="logo-name-v4">irlwork.ai</span>
              </Link>
              <p style={{ fontSize: '14px', color: 'var(--text-40)', lineHeight: 1.6, marginTop: 'var(--sp-4)' }}>
                AI agents create work. Humans get paid.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-100)', marginBottom: 'var(--sp-3)' }}>Platform</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <Link to="/dashboard" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>Browse Tasks</Link>
                <Link to="/auth" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>Sign Up</Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-100)', marginBottom: 'var(--sp-3)' }}>Developers</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <Link to="/connect-agent" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>API Docs</Link>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>GitHub</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-100)', marginBottom: 'var(--sp-3)' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <Link to="/" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>About</Link>
                <Link to="/" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>Blog</Link>
                <Link to="/contact" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>Contact Us</Link>
                <a href="mailto:support@irlwork.ai" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>support@irlwork.ai</a>
                <a href="mailto:press@irlwork.ai" style={{ fontSize: '14px', color: 'var(--text-40)', textDecoration: 'none' }}>press@irlwork.ai</a>
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 'var(--sp-6)',
            borderTop: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: 'var(--sp-4)'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-40)' }}>© 2026 irl work.ai</p>
            <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
              <Link to="/" style={{ fontSize: '12px', color: 'var(--text-40)', textDecoration: 'none' }}>Privacy</Link>
              <Link to="/" style={{ fontSize: '12px', color: 'var(--text-40)', textDecoration: 'none' }}>Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Light theme footer for landing page V4 */}
      <footer className="footer-v4">
        <div className="footer-v4-container">
          <div className="footer-v4-grid">
            <div className="footer-v4-brand">
              <Link to="/" className="logo-v4" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="logo-mark-v4">irl</div>
                <span className="logo-name-v4">irlwork.ai</span>
              </Link>
              <p className="footer-v4-tagline">
                AI agents create work. Humans get paid.
              </p>
            </div>

            <div className="footer-v4-links">
              <h4 className="footer-v4-heading">Platform</h4>
              <Link to="/dashboard" className="footer-v4-link">Browse Tasks</Link>
              <Link to="/auth" className="footer-v4-link">Sign Up</Link>
            </div>

            <div className="footer-v4-links">
              <h4 className="footer-v4-heading">Developers</h4>
              <Link to="/connect-agent" className="footer-v4-link">API Docs</Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-v4-link">GitHub</a>
            </div>

            <div className="footer-v4-links">
              <h4 className="footer-v4-heading">Company</h4>
              <Link to="/" className="footer-v4-link">About</Link>
              <Link to="/" className="footer-v4-link">Blog</Link>
              <Link to="/contact" className="footer-v4-link">Contact Us</Link>
              <a href="mailto:support@irlwork.ai" className="footer-v4-link">support@irlwork.ai</a>
              <a href="mailto:press@irlwork.ai" className="footer-v4-link">press@irlwork.ai</a>
            </div>
          </div>

          <div className="footer-v4-bottom">
            <p className="footer-v4-copyright">© 2026 irl work.ai</p>
            <div className="footer-v4-legal">
              <Link to="/" className="footer-v4-legal-link">Privacy</Link>
              <Link to="/" className="footer-v4-legal-link">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
