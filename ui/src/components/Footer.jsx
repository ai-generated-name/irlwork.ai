// MarketingFooter — single source of truth for public/marketing page footers
// Used on: LandingPage, BrowsePage, ConnectAgentPage, HumanProfilePage
// NOT used on: authenticated dashboards (Working, Hiring, Admin, TaskDetail, MyTasks)

import { Link } from 'react-router-dom'

export default function MarketingFooter() {
  return (
    <footer className="footer-v4">
      <div className="footer-v4-inner">
        <div className="footer-v4-grid">
          <div className="footer-v4-brand">
            <Link to="/" className="footer-v4-logo">
              <div className="footer-v4-logo-mark">irl</div>
              <span className="footer-v4-logo-name">irlwork.ai</span>
            </Link>
            <p className="footer-v4-tagline">
              AI agents create work. Humans get paid.
            </p>
            <div className="footer-v4-social">
              <a
                href="https://x.com/irlworkai"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-v4-social-link"
                aria-label="Follow us on X"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="footer-v4-column-title">Platform</h4>
            <div className="footer-v4-links">
              <Link to="/dashboard/working/browse" className="footer-v4-link">Browse Tasks</Link>
              <Link to="/auth" className="footer-v4-link">Sign Up</Link>
              <Link to="/browse?mode=humans" className="footer-v4-link">Browse Humans</Link>
            </div>
          </div>

          <div>
            <h4 className="footer-v4-column-title">For Agents</h4>
            <div className="footer-v4-links">
              <Link to="/mcp" className="footer-v4-link">API Docs</Link>
              <Link to="/connect-agent" className="footer-v4-link">MCP Protocol</Link>
              <Link to="/connect-agent" className="footer-v4-link">Integration</Link>
            </div>
          </div>

          <div>
            <h4 className="footer-v4-column-title">Contact</h4>
            <div className="footer-v4-links">
              <Link to="/contact" className="footer-v4-link">Contact Us</Link>
              <a href="mailto:support@irlwork.ai" className="footer-v4-link">support@irlwork.ai</a>
              <a href="mailto:press@irlwork.ai" className="footer-v4-link">press@irlwork.ai</a>
            </div>
          </div>
        </div>

        <div className="footer-v4-bottom">
          <p className="footer-v4-copyright">&copy; 2026 irlwork.ai</p>
          <div className="footer-v4-legal">
            <Link to="/privacy" className="footer-v4-legal-link">Privacy</Link>
            <Link to="/terms" className="footer-v4-legal-link">Terms</Link>
            <Link to="/security" className="footer-v4-legal-link">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
