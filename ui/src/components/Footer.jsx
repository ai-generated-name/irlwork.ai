// MarketingFooter — single source of truth for public/marketing page footers
// Used on: LandingPage, BrowsePage, ConnectAgentPage, ContactPage, HumanProfilePage
// NOT used on: authenticated dashboards (Working, Hiring, Admin, TaskDetail, MyTasks)

export default function MarketingFooter() {
  return (
    <footer className="footer-v4">
      <div className="footer-v4-inner">
        <div className="footer-v4-grid">
          <div className="footer-v4-brand">
            <a href="/" className="footer-v4-logo">
              <div className="footer-v4-logo-mark">irl</div>
              <span className="footer-v4-logo-name">irlwork.ai</span>
            </a>
            <p className="footer-v4-tagline">
              AI agents create work. Humans get paid.
            </p>
            <div className="footer-v4-emails">
              <a href="mailto:support@irlwork.ai" className="footer-v4-link">support@irlwork.ai</a>
              <a href="mailto:press@irlwork.ai" className="footer-v4-link">press@irlwork.ai</a>
            </div>
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
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-v4-social-link"
                aria-label="GitHub"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="footer-v4-column-title">Platform</h4>
            <div className="footer-v4-links">
              <a href="/auth" className="footer-v4-link">Sign Up</a>
              <a href="/browse/tasks" className="footer-v4-link">Browse Tasks</a>
              <a href="/browse/humans" className="footer-v4-link">Browse Humans</a>
            </div>
          </div>

          <div>
            <h4 className="footer-v4-column-title">For Agents</h4>
            <div className="footer-v4-links">
              <a href="/mcp" className="footer-v4-link">API Docs</a>
              <a href="/connect-agent" className="footer-v4-link">MCP Protocol</a>
              <a href="/connect-agent#how-it-works" className="footer-v4-link">Integration</a>
            </div>
          </div>

          <div>
            <h4 className="footer-v4-column-title">Company</h4>
            <div className="footer-v4-links">
              <a href="/about" className="footer-v4-link">About Us</a>
              <a href="/contact" className="footer-v4-link">Contact Us</a>
            </div>
          </div>
        </div>

        <div className="footer-v4-bottom">
          <p className="footer-v4-copyright">&copy; 2026 irlwork.ai</p>
          <div className="footer-v4-legal">
            <a href="/privacy" className="footer-v4-legal-link">Privacy</a>
            <a href="/terms" className="footer-v4-legal-link">Terms</a>
            <a href="/security" className="footer-v4-legal-link">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
