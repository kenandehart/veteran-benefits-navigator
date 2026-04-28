import './App.css'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'

type Status = 'idle' | 'submitting' | 'submitted' | 'error'

const pageMainStyle: React.CSSProperties = {
  flex: 1,
  padding: '48px 32px 80px',
  maxWidth: '400px',
  margin: '0 auto',
  width: '100%',
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const navigate = useNavigate()

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
      <SiteHeader />

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
          <h1 className="modal-title">Forgot your password?</h1>
        </div>

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
      </main>
      <Footer />
    </div>
  )
}

export default ForgotPasswordPage
