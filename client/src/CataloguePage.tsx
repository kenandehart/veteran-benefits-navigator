import './App.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import AuthButtons from './components/AuthButtons.tsx'
import AuthMenuItems from './components/AuthMenuItems.tsx'

interface Benefit {
  id: number
  name: string
  category: string
  short_description: string
  description: string
  eligibility_summary: string
  url: string
}

function CataloguePage() {
  const navigate = useNavigate()
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const { user, logout } = useAuth()
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    fetch('/api/benefits')
      .then(res => res.json())
      .then(data => setBenefits(data))
      .catch(err => console.error('Failed to fetch benefits:', err))
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
              <button className="nav-dropdown__item" role="menuitem" onClick={() => { setShowMenu(false); navigate(user ? '/dashboard' : '/') }}>
                Home
              </button>
              <button className="nav-dropdown__item" role="menuitem" onClick={() => setShowMenu(false)}>
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
    </>
  )

  if (selectedBenefit !== null) {
    return (
      <div className="page">
        {siteHeader}
        <main className="detail-main">
          <div className="benefit-detail">
            <div className="benefit-detail__header">
              <button className="benefit-detail__back" onClick={() => { setSelectedBenefit(null); window.scrollTo(0, 0); }}>
                ← Back
              </button>
              <h1 className="benefit-detail__name">{selectedBenefit.name}</h1>
            </div>
            {selectedBenefit.id === 5 && (
              <p style={{
                background: 'var(--bg)',
                borderLeft: '3px solid #b8860b',
                borderRadius: '2px',
                padding: '14px 18px 14px 20px',
                marginTop: '-24px',
                fontSize: '0.88rem',
                lineHeight: 1.55,
                color: 'var(--text)',
              }}>
                If you're eligible for both Veterans Pension and VA Disability Compensation, you can't receive both at the same time. The VA will pay whichever benefit amount is higher.
              </p>
            )}
            <div className="benefit-detail__section" style={selectedBenefit.id === 5 ? { borderTop: 'none', paddingTop: 0 } : undefined}>
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
      <main className="results-main">
        <h1 className="results-heading">Benefits</h1>
        <p style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          margin: '0 0 32px',
        }}>
          This is not an exhaustive list of benefits available to veterans. For complete information, visit <a href="https://www.va.gov/" target="_blank" rel="noopener noreferrer">va.gov</a>.
        </p>
        <div className="benefits-grid">
          {[...benefits]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(benefit => (
              <button
                key={benefit.id}
                className="benefit-tile"
                onClick={() => { setSelectedBenefit(benefit); window.scrollTo(0, 0); }}
              >
                <span className="benefit-tile__name">{benefit.name}</span>
                {benefit.short_description && (
                  <span className="benefit-tile__desc">{benefit.short_description}</span>
                )}
              </button>
            ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default CataloguePage
