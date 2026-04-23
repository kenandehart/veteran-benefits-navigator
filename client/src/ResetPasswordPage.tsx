import './App.css'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import AuthButtons from './components/AuthButtons.tsx'
import AuthMenuItems from './components/AuthMenuItems.tsx'

type Status = 'idle' | 'submitting' | 'success' | 'invalidToken' | 'networkError'

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

const inlineLinkStyle: React.CSSProperties = {
  color: 'var(--navy)',
  textDecoration: 'underline',
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 10) {
      setValidationError('Password must be at least 10 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.')
      return
    }
    setValidationError('')
    setStatus('submitting')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      })
      if (res.ok) {
        setStatus('success')
        return
      }
      if (res.status === 400) {
        setStatus('invalidToken')
        return
      }
      setStatus('networkError')
    } catch {
      setStatus('networkError')
    }
  }

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

  if (!token) {
    return (
      <div className="page">
        {siteHeader}
        <main style={pageMainStyle}>
          <h1 className="modal-title">Invalid link</h1>
          <p className="modal-helper" aria-live="polite" style={{ marginBottom: '24px' }}>
            This link is invalid. Please request a new password reset.
          </p>
          <button
            className="cta-button"
            type="button"
            onClick={() => navigate('/forgot-password')}
          >
            Request a new reset link
          </button>
          <Link to="/" style={linkStyle}>Back to homepage</Link>
        </main>
        <Footer />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="page">
        {siteHeader}
        <main style={{ ...pageMainStyle, textAlign: 'center' }}>
          <h1 className="modal-title">Password reset</h1>
          <p className="modal-helper" aria-live="polite" style={{ marginBottom: '24px' }}>
            Your password has been reset. Click 'Log in' in the top-right to
            sign in with your new password.
          </p>
          <button
            className="cta-button"
            type="button"
            onClick={() => navigate('/')}
          >
            Go to homepage
          </button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="page">
      {siteHeader}
      <main style={pageMainStyle}>
        <h1 className="modal-title">Reset your password</h1>
        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <label className="modal-label" htmlFor="reset-new-password">
            New password
            <input
              id="reset-new-password"
              className="q-input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={10}
              autoComplete="new-password"
              autoFocus
              required
            />
          </label>
          <label className="modal-label" htmlFor="reset-confirm-password">
            Confirm new password
            <input
              id="reset-confirm-password"
              className="q-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              minLength={10}
              autoComplete="new-password"
              required
            />
          </label>

          {validationError && (
            <p className="modal-error" aria-live="polite">{validationError}</p>
          )}

          {status === 'invalidToken' && (
            <p className="modal-error" aria-live="polite">
              This reset link is invalid or has expired.{' '}
              <Link to="/forgot-password" style={inlineLinkStyle}>
                Please request a new one.
              </Link>
            </p>
          )}

          {status === 'networkError' && (
            <p className="modal-error" aria-live="polite">
              Something went wrong. Please try again later.
            </p>
          )}

          <button
            className="cta-button"
            type="submit"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        <Link to="/" style={linkStyle}>Back to homepage</Link>
      </main>
      <Footer />
    </div>
  )
}

export default ResetPasswordPage
