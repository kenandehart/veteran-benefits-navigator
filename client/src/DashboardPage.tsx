import './App.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import AuthButtons from './components/AuthButtons.tsx'

function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="page">
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
              <button className="nav-dropdown__item" role="menuitem" onClick={() => setShowMenu(false)}>
                Home
              </button>
              <button className="nav-dropdown__item" role="menuitem" onClick={() => { setShowMenu(false); navigate('/benefits') }}>
                Benefits
              </button>
              {user && (
                <button className="nav-dropdown__item" role="menuitem" onClick={() => { setShowMenu(false); logout().then(() => navigate('/')) }}>
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
        <span className="wordmark">Benefits Navigator</span>
        <AuthButtons />
      </header>

      <main className="dashboard-main">
        <button className="cta-button dashboard-signout" onClick={() => logout().then(() => navigate('/'))}>
          Sign out
        </button>
      </main>

      <Footer />
    </div>
  )
}

export default DashboardPage
