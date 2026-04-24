import './App.css'
import { useEffect, useState } from 'react'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'

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
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    fetch('/api/benefits')
      .then(res => res.json())
      .then(data => setBenefits(data))
      .catch(err => console.error('Failed to fetch benefits:', err))
  }, [])

  const siteHeader = <SiteHeader />

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
