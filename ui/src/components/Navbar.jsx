import { useNavigate, Link } from 'react-router-dom'
import { Logo } from './Logo'

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <>
      {/* Dark theme navbar for dashboard pages */}
      <nav className="navbar">
        <Link to="/" className="logo-v4" style={{ textDecoration: 'none' }}>
          <Logo variant="header" theme="light" />
        </Link>
        <div className="nav-right">
          <Link to="/connect-agent" className="nav-link">API Docs</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <button className="btn btn-primary" onClick={() => navigate('/auth')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Light theme navbar for landing page V4 */}
      <nav className="navbar-v4">
        <Link to="/" className="logo-v4" style={{ textDecoration: 'none' }}>
          <Logo variant="header" theme="light" />
        </Link>
        <div className="nav-links-v4">
          <Link to="/connect-agent" className="nav-link-v4">API Docs</Link>
          <Link to="/dashboard" className="nav-link-v4">Dashboard</Link>
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>
            Get Started
          </button>
        </div>
      </nav>
    </>
  )
}
