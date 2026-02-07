import { useNavigate, Link } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <>
      {/* Dark theme navbar for dashboard pages */}
      <nav className="navbar">
        <Link to="/" className="logo">
          <div className="logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <g transform="translate(3,3)">
                <path d="M8,11 L8,6 L6,6 L6,11" fill="#050507" stroke="#050507" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M11,10 L11,4 L9,4 L9,10" fill="#050507" stroke="#050507" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M14,9 L14,3 L12,3 L12,9" fill="#050507" stroke="#050507" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M17,8 L17,4 L15,4 L15,8" fill="#050507" stroke="#050507" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M5,11 L5,14 C5,15 6,16 7,16 L14,16 C15,16 16,15 16,14 L16,11" fill="#050507" stroke="#050507" strokeWidth="0.5" strokeLinejoin="round"/>
                <rect x="4" y="10" width="13" height="2" fill="#050507" rx="1"/>
              </g>
            </svg>
          </div>
          <span className="logo-name">irlwork.ai</span>
        </Link>
        <div className="nav-right">
          <Link to="/mcp" className="nav-link">API Docs</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <button className="btn btn-primary" onClick={() => navigate('/auth')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Light theme navbar for landing page V4 */}
      <nav className="navbar-v4">
        <Link to="/" className="logo-v4">
          <div className="logo-mark-v4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <g transform="translate(3,3)">
                <path d="M8,11 L8,6 L6,6 L6,11" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M11,10 L11,4 L9,4 L9,10" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M14,9 L14,3 L12,3 L12,9" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M17,8 L17,4 L15,4 L15,8" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                <path d="M5,11 L5,14 C5,15 6,16 7,16 L14,16 C15,16 16,15 16,14 L16,11" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                <rect x="4" y="10" width="13" height="2" fill="white" rx="1"/>
              </g>
            </svg>
          </div>
          <span className="logo-name-v4">irlwork.ai</span>
        </Link>
        <div className="nav-links-v4">
          <Link to="/mcp" className="nav-link-v4">API Docs</Link>
          <Link to="/dashboard" className="nav-link-v4">Dashboard</Link>
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>
            Get Started
          </button>
        </div>
      </nav>
    </>
  )
}
