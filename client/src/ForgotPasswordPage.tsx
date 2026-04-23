import './App.css'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import AuthButtons from './components/AuthButtons.tsx'
import AuthMenuItems from './components/AuthMenuItems.tsx'

type Status = 'idle' | 'submitting' | 'submitted' | 'error'

const pageMainStyle: React.CSSProperties = {
  flex: 1,
  padding: '48px 32px 80px',
  maxWidth: '400px',
  margin: '0 auto',
  width: '100%',
}

const linkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '24px',
  color: 'var(--navy)',
  textDecoration: 'underline',
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  fontSize: '0.9rem',
}

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        setStatus('error')
        return
      }
      setStatus('submitted')
    } catch {
      setStatus('error')
    }
  }

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

      <main style={pageMainStyle}>
        <h1 className="modal-title">Forgot your password?</h1>

        {status === 'submitted' ? (
          <p className="modal-helper" aria-live="polite">
            If an account exists for that email, we've sent a reset link. Check
            your inbox. Check your spam folder if you don't see it within a few
            minutes.
          </p>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit} noValidate>
            <label className="modal-label" htmlFor="forgot-email">
              Email
              <input
                id="forgot-email"
                className="q-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </label>
            {status === 'error' && (
              <p className="modal-error" aria-live="polite">
                Something went wrong. Please try again later.
              </p>
            )}
            <button
              className="cta-button"
              type="submit"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link to="/" style={linkStyle}>Back to homepage</Link>
      </main>
      <Footer />
    </div>
  )
}

export default ForgotPasswordPage
