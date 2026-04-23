import './App.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import AuthButtons from './components/AuthButtons.tsx'
import AuthMenuItems from './components/AuthMenuItems.tsx'

function PrivacyPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const siteHeader = (
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
                onClick={() => { setShowMenu(false); navigate(user ? '/dashboard' : '/') }}
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
            </div>
          )}
        </div>
        <span className="wordmark">Benefits Navigator</span>
        <AuthButtons />
      </header>
    </>
  )

  return (
    <div className="page">
      {siteHeader}
      <main className="privacy-page">
        <h1 className="privacy-page__title">Privacy Policy</h1>
        <p className="privacy-page__meta">Last updated: April 23, 2026</p>

        <p>Veteran Benefits Navigator is not affiliated with the U.S. Department of Veterans Affairs.</p>

        <h2 className="privacy-page__heading">What is collected</h2>
        <p>Without an account, questionnaire answers are processed to compute benefit matches and are not stored on the server. Answers are held temporarily in your browser's local storage so you can navigate the questionnaire, and are cleared when you finish or leave.</p>
        <p>With an account, the following are stored: username, hashed password, optional email, your saved questionnaire answers, and the matched benefit IDs.</p>
        <p>When you submit feedback, the following are stored: your comment, the page you submitted from, your browser's user-agent string, a timestamp, and (if you provided them) your email and account ID.</p>
        <p>IP addresses are read briefly in memory to prevent spam but are not stored or logged.</p>

        <h2 className="privacy-page__heading">How it is used</h2>
        <p>To operate the Service. Data is not sold, shared, or used for advertising.</p>

        <h2 className="privacy-page__heading">Third parties</h2>
        <p>The Service uses Better Stack to check whether the site is reachable. No user data is sent to Better Stack.</p>

        <h2 className="privacy-page__heading">Security</h2>
        <p>HTTPS in transit. Passwords are hashed with bcrypt. Session cookies are HTTP-only and secure in production.</p>

        <h2 className="privacy-page__heading">Your choices</h2>
        <p>You can change your email or delete your account from your dashboard. Deleting your account removes your account record and saved questionnaire answers. Previously submitted feedback is retained but disassociated from your account.</p>
        <p>To request deletion of specific feedback you submitted, contact <code>privacy@vabenefits.app</code>.</p>

        <h2 className="privacy-page__heading">Retention</h2>
        <p>Account data is kept until you delete your account. Feedback is kept indefinitely.</p>

        <h2 className="privacy-page__heading">Children</h2>
        <p>The Service is intended for adult U.S. military veterans and is not directed to children under 13.</p>

        <h2 className="privacy-page__heading">Contact</h2>
        <p><code>privacy@vabenefits.app</code></p>

        <h2 className="privacy-page__heading">Changes</h2>
        <p>If this policy changes materially, the "Last updated" date will change.</p>
      </main>
      <Footer />
    </div>
  )
}

export default PrivacyPage
