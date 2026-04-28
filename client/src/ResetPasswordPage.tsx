import './App.css'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'

type Status = 'idle' | 'submitting' | 'success' | 'invalidToken' | 'networkError'

const pageMainStyle: React.CSSProperties = {
  flex: 1,
  padding: '48px 32px 80px',
  maxWidth: '400px',
  margin: '0 auto',
  width: '100%',
}

const inlineLinkStyle: React.CSSProperties = {
  color: 'var(--navy)',
  textDecoration: 'underline',
}

function ResetPasswordPage() {
  const navigate = useNavigate()
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

  const siteHeader = <SiteHeader />

  if (!token) {
    return (
      <div className="page">
        {siteHeader}
        <main style={pageMainStyle}>
          <div className="benefit-detail__header">
            <button
              className="benefit-detail__back"
              onClick={() => {
                window.scrollTo(0, 0)
                if (window.history.length <= 1) {
                  navigate('/')
                } else {
                  navigate(-1)
                }
              }}
            >
              ← Back
            </button>
            <h1 className="modal-title">Invalid link</h1>
          </div>
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
          <div className="benefit-detail__header">
            <button
              className="benefit-detail__back"
              onClick={() => {
                window.scrollTo(0, 0)
                if (window.history.length <= 1) {
                  navigate('/')
                } else {
                  navigate(-1)
                }
              }}
            >
              ← Back
            </button>
            <h1 className="modal-title">Password reset</h1>
          </div>
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
        <div className="benefit-detail__header">
          <button
            className="benefit-detail__back"
            onClick={() => {
              window.scrollTo(0, 0)
              if (window.history.length <= 1) {
                navigate('/')
              } else {
                navigate(-1)
              }
            }}
          >
            ← Back
          </button>
          <h1 className="modal-title">Reset your password</h1>
        </div>
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
      </main>
      <Footer />
    </div>
  )
}

export default ResetPasswordPage
