import './App.css'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'
import RegisterModal from './components/RegisterModal.tsx'
import FeedbackWidget from './components/FeedbackWidget.tsx'

interface Benefit {
  id: number
  name: string
  category: string
  short_description: string
  description: string
  eligibility_summary: string
  url: string
}

function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { eligibleBenefits: Benefit[]; answers?: unknown } | null
  const eligibleBenefits: Benefit[] | null = state?.eligibleBenefits ?? null
  const answers: unknown = state?.answers ?? null
  const { user } = useAuth()
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!eligibleBenefits) navigate('/')
  }, [eligibleBenefits, navigate])

  if (!eligibleBenefits) return null

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
        {eligibleBenefits.length === 0 ? (
          <div className="no-results">
            <p>We weren't able to find any matching benefits based on your answers.</p>
            <p>Your situation may still qualify you for benefits not yet covered by this tool. Consider reaching out to a VA-accredited representative for a full review.</p>
            <button className="cta-button" onClick={() => navigate('/')}>Return to home page</button>
          </div>
        ) : (
          <>
            <h1 className="results-heading">Benefits you may be eligible for</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal', margin: '0.25rem 0 1rem', textAlign: 'center' }}>
              These results are based on the information you provided and may not reflect your full eligibility. You may qualify for benefits not shown here. For an official determination, contact the VA or a VA-accredited representative.
            </p>
            <div className="benefits-grid">
              {[...eligibleBenefits]
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
            {!user && (
              <div className="results-save-cta">
                <p className="results-save-cta__text">
                  Create an account to save your results and access them anytime.
                </p>
                <button className="cta-button" onClick={() => setShowRegister(true)}>
                  Save my results
                </button>
              </div>
            )}
            <section className="results-feedback">
              <h2 className="results-feedback__heading">Help us improve</h2>
              {/* Logged-in users already have their questionnaire answers stored on
                  their account — attaching them again as feedback metadata would
                  duplicate the data and give the feedback row a longer retention
                  tail than the account itself. Send only the matched benefit IDs
                  for context. Anonymous submissions still include the full answers
                  because there's no account-side copy to reference. */}
              <FeedbackWidget
                pageContext="results"
                metadata={
                  user
                    ? { matched_benefit_ids: eligibleBenefits.map((b) => b.id) }
                    : ((answers ?? undefined) as object | undefined)
                }
              />
            </section>
            {showRegister && (
              <RegisterModal
                onClose={() => setShowRegister(false)}
                answers={answers}
                matchedBenefitIds={eligibleBenefits.map(b => b.id)}
                onSuccess={() => navigate('/dashboard')}
              />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default ResultsPage
