import './App.css'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'
import RegisterModal from './components/RegisterModal.tsx'
import FeedbackWidget from './components/FeedbackWidget.tsx'

interface Benefit {
  id: number
  slug: string
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

function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { eligibleBenefits: Benefit[]; answers?: unknown } | null
  const eligibleBenefits: Benefit[] | null = state?.eligibleBenefits ?? null
  const answers: unknown = state?.answers ?? null
  const { user } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!eligibleBenefits) navigate('/')
  }, [eligibleBenefits, navigate])

  if (!eligibleBenefits) return null

  const siteHeader = <SiteHeader />

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
                  <Link
                    key={benefit.id}
                    to={`/benefits/${benefit.slug}`}
                    className="benefit-tile"
                  >
                    <span className="benefit-tile__name">{benefit.name}</span>
                    {benefit.short_description && (
                      <span className="benefit-tile__desc">{benefit.short_description}</span>
                    )}
                  </Link>
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
