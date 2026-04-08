import './App.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import AuthButtons from './components/AuthButtons.tsx'
import AuthMenuItems from './components/AuthMenuItems.tsx'

function LandingPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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
              <button className="nav-dropdown__item" role="menuitem" onClick={() => { setShowMenu(false); if (user) navigate('/dashboard') }}>
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
              <AuthMenuItems onNavigate={() => setShowMenu(false)} />
            </div>
          )}
        </div>
        <span className="wordmark">Benefits Navigator</span>
        <AuthButtons />
      </header>

      <main>
        <section className="hero">
          <h1 className="hero-headline">
            You've earned these benefits.<br />
            Let's make sure you get them.
          </h1>
          <p className="hero-body">
            Benefits Navigator helps veterans find the benefits they qualify for
            and walks them through the process of actually claiming them —
            step by step, at their own pace.
          </p>
          <button className="cta-button" onClick={() => navigate('/questionnaire')}>Get Started</button>
        </section>

        <section className="features">
          <div className="feature">
            <h2>Personalized to you</h2>
            <p>
              A short questionnaire builds your profile. We use it to surface
              the benefits most relevant to your situation — not an overwhelming
              list of everything that exists.
            </p>
          </div>
          <div className="feature">
            <h2>From discovery to claim</h2>
            <p>
              Knowing a benefit exists and knowing how to claim it are two
              different problems. This app addresses both. Each benefit comes
              with clear, plain-English next steps.
            </p>
          </div>
          <div className="feature">
            <h2>Your information, your control</h2>
            <p>
              No personally identifiable information required. We collect only
              what we need to help you, and nothing more.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage
