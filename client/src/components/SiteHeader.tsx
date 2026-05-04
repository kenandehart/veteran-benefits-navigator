import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import AuthButtons from './AuthButtons.tsx'
import AuthMenuItems from './AuthMenuItems.tsx'
import { hasAnonResults } from '../anonResults'

interface SiteHeaderProps {
  /**
   * Optional override for in-app navigation triggered from the header menu.
   * Receives the destination path. When provided, the caller is responsible
   * for performing the actual navigation (e.g., after a confirmation dialog).
   */
  onNavigate?: (path: string) => void
  /**
   * Optional override for sign-out triggered from the header menu.
   * When provided, called instead of the default logout flow.
   */
  onSignOut?: () => void
}

export default function SiteHeader({ onNavigate, onSignOut }: SiteHeaderProps = {}) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  function goTo(path: string) {
    setShowMenu(false)
    if (onNavigate) {
      onNavigate(path)
    } else {
      navigate(path)
    }
  }

  function handleHome() {
    let path = '/'
    if (user) path = '/dashboard'
    else if (hasAnonResults()) path = '/results'
    goTo(path)
  }

  function handleSignOut() {
    setShowMenu(false)
    if (onSignOut) {
      onSignOut()
    } else {
      logout().then(() => navigate('/'))
    }
  }

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
                onClick={handleHome}
              >
                Home
              </button>
              <button
                className="nav-dropdown__item"
                role="menuitem"
                onClick={() => goTo('/benefits')}
              >
                Benefits
              </button>
              {user && (
                <button
                  className="nav-dropdown__item"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              )}
              <AuthMenuItems onNavigate={() => setShowMenu(false)} />
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />
              <button
                className="nav-dropdown__item"
                role="menuitem"
                onClick={() => goTo('/about')}
              >
                About
              </button>
              <button
                className="nav-dropdown__item"
                role="menuitem"
                onClick={() => goTo('/resources')}
              >
                Resources
              </button>
            </div>
          )}
        </div>
        <span className="brand">
          <svg
            className="brand__emblem"
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
          >
            <rect className="brand__emblem-bg" width="32" height="32" rx="2" />
            <polygon
              className="brand__emblem-star"
              points="16,5 18.5,12.6 26.5,12.6 20,17.3 22.5,24.9 16,20.2 9.5,24.9 12,17.3 5.5,12.6 13.5,12.6"
            />
          </svg>
          <span className="wordmark">Benefits Navigator</span>
        </span>
        <AuthButtons />
      </header>
    </>
  )
}
