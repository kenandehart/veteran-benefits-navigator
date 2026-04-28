import './App.css'
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'
import LoginModal from './components/LoginModal.tsx'

interface Benefit {
  id: number
  name: string
  category: string
  short_description: string
  description: string
  eligibility_summary: string
  url: string
  application_guidance: string
  application_url: string
  eligibility_url: string
}

interface SavedResults {
  matchedBenefits: Benefit[]
  updatedAt: string
}

function DashboardPage() {
  const navigate = useNavigate()
  const { user, isLoading, clearUser } = useAuth()
  const [results, setResults] = useState<SavedResults | null>(null)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    fetch('/api/user/results', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json()
        return null
      })
      .then((data: SavedResults | null) => setResults(data))
      .catch(() => setResults(null))
      .finally(() => setResultsLoading(false))
  }, [])

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setEmailError('')
    if (!/^.+@.+\..+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailSaving(true)
    try {
      const res = await fetch('/api/auth/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to save email')
      }
      setEmailSaved(true)
      setShowEmailForm(false)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to save email')
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleDeleteAccount() {
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to delete account')
      }
      clearUser()
      navigate('/')
    } catch (err) {
      console.error('Failed to delete account:', err)
      setShowDeleteConfirm(false)
    }
  }

  const siteHeader = <SiteHeader />

  // Auth gate: once auth state has resolved and there's no user, show a
  // minimal prompt instead of the dashboard UI. Guarding on !isLoading
  // prevents the prompt from flashing for logged-in users during the brief
  // session-hydration window.
  if (!isLoading && !user) {
    return (
      <div className="page">
        {siteHeader}
        <main className="dashboard-main">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            padding: '80px 20px',
            textAlign: 'center',
          }}>
            <p>Please log in to view your dashboard</p>
            <button className="cta-button" onClick={() => setShowLoginModal(true)}>
              Log in
            </button>
          </div>
        </main>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
        <Footer />
      </div>
    )
  }

  if (selectedBenefit !== null) {
    return (
      <div className="page">
        {siteHeader}
        <main className="detail-main">
          <div className="benefit-detail">
            <div className="benefit-detail__header">
              <button className="benefit-detail__back" onClick={() => { setSelectedBenefit(null); window.scrollTo(0, 0) }}>
                ← Back
              </button>
              <h1 className="benefit-detail__name">{selectedBenefit.name}</h1>
            </div>
            <div className="benefit-detail__section">
              <h2 className="benefit-detail__section-label">About this benefit</h2>
              <p className="benefit-detail__section-text">{selectedBenefit.description}</p>
            </div>
            <div className="benefit-detail__section">
              <h2 className="benefit-detail__section-label">Who may be eligible</h2>
              <p className="benefit-detail__section-text">{selectedBenefit.eligibility_summary}</p>
            </div>
            <a
              href={selectedBenefit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-button benefit-detail__link"
            >
              Visit official resource →
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="page">
      {siteHeader}
      <main className="dashboard-main">
        <h1 className="dashboard-greeting">
          Welcome back, {user?.username}
        </h1>

        <section className="dashboard-benefits">
          <h2 className="dashboard-benefits__title">Your Benefits</h2>
          {resultsLoading ? (
            <p className="dashboard-meta">Loading your results...</p>
          ) : results ? (
            <>
              <div className="benefits-grid">
                {[...results.matchedBenefits]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(benefit => (
                    <button
                      key={benefit.id}
                      className="benefit-tile"
                      onClick={() => { setSelectedBenefit(benefit); window.scrollTo(0, 0) }}
                    >
                      <span className="benefit-tile__name">{benefit.name}</span>
                      {benefit.short_description && (
                        <span className="benefit-tile__desc">{benefit.short_description}</span>
                      )}
                    </button>
                  ))}
              </div>
              <button className="cta-button dashboard-retake" onClick={() => navigate('/questionnaire')}>
                Retake Questionnaire
              </button>
              <p className="dashboard-meta">
                Questionnaire completed {new Date(results.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </>
          ) : (
            <div className="dashboard-empty">
              <p>You haven't taken the questionnaire yet.</p>
              <button className="cta-button" onClick={() => navigate('/questionnaire')}>
                Take Questionnaire
              </button>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <button
            className="dashboard-collapsible"
            onClick={() => setSettingsOpen(v => !v)}
            aria-expanded={settingsOpen}
          >
            <span className={`dashboard-collapsible__arrow${settingsOpen ? ' dashboard-collapsible__arrow--open' : ''}`}>&#x25B8;</span>
            Account Settings
          </button>
          {settingsOpen && (
            <div className="dashboard-settings">
              <div className="dashboard-settings__field">
                <h3 className="dashboard-settings__label">Email</h3>
                {user?.email || emailSaved ? (
                  <>
                    <p className="dashboard-section__text">
                      {emailSaved ? email : user?.email}
                    </p>
                    {!showEmailForm && (
                      <button className="dashboard-change-btn" onClick={() => { setShowEmailForm(true); setEmail(''); setEmailError(''); setEmailSaved(false) }}>
                        Change
                      </button>
                    )}
                  </>
                ) : (
                  <p className="dashboard-section__text">
                    Adding an email lets you recover your account if you forget your password.
                  </p>
                )}
                {(showEmailForm || (user && !user.email && !emailSaved)) && (
                  <>
                    <form className="dashboard-email-form" onSubmit={handleEmailSubmit}>
                      <input
                        className="q-input"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                      <button className="cta-button" type="submit" disabled={emailSaving}>
                        {emailSaving ? 'Saving...' : 'Save'}
                      </button>
                    </form>
                    {emailError && <p className="modal-error">{emailError}</p>}
                  </>
                )}
              </div>
              <button className="dashboard-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                Delete account
              </button>
            </div>
          )}
        </section>
      </main>

      {showDeleteConfirm && (
        <div className="dialog-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h2 className="dialog__title">Delete account?</h2>
            <p className="dialog__body">
              This will permanently delete your account and all saved data. This action cannot be undone.
            </p>
            <div className="dialog__actions">
              <button className="dialog__cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="cta-button" onClick={handleDeleteAccount}>
                Delete my account
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default DashboardPage
