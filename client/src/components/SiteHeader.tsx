import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import AuthButtons from './AuthButtons.tsx'
import AuthMenuItems from './AuthMenuItems.tsx'
import { hasAnonResults } from '../anonResults'

export default function SiteHeader() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <>
      {showMenu && <div className="menu-backdrop" onClick={() => setShowMenu(false)} />}
      <header className="header">
        <div className="header-menu">
          <button
            className="menu-btn"
            onClick={() => setShowMenu(v => !v)}
            aria-label="Open navigation menu"
            aria-expanded={showMenu}
          >
            <span className="menu-btn__bar" />
            <span className="menu-btn__bar" />
            <span className="menu-btn__bar" />
          </button>
          {showMenu && (
            <div className="nav-dropdown" role="menu">
              <button
                className="nav-dropdown__item"
                role="menuitem"
                onClick={() => {
                  setShowMenu(false)
                  if (user) navigate('/dashboard')
                  else if (hasAnonResults()) navigate('/results')
                  else navigate('/')
                }}
              >
                Home
              </button>
              <button
                className="nav-dropdown__item"
                role="menuitem"
                onClick={() => { setShowMenu(false); navigate('/benefits') }}
              >
                Benefits
              </button>
              {user && (
                <button
                  className="nav-dropdown__item"
                  role="menuitem"
                  onClick={() => { setShowMenu(false); logout().then(() => navigate('/')) }}
                >
                  Sign out
                </button>
              )}
              <AuthMenuItems onNavigate={() => setShowMenu(false)} />
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />
              <Link
                to="/about"
                role="menuitem"
                className="nav-dropdown__item"
                style={{ textDecoration: 'none' }}
                onClick={() => setShowMenu(false)}
              >
                About
              </Link>
              <Link
                to="/resources"
                role="menuitem"
                className="nav-dropdown__item"
                style={{ textDecoration: 'none' }}
                onClick={() => setShowMenu(false)}
              >
                Resources
              </Link>
            </div>
          )}
        </div>
        <span className="wordmark">Benefits Navigator</span>
        <AuthButtons />
      </header>
    </>
  )
}
