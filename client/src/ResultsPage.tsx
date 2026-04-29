import './App.css'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'
import RegisterModal from './components/RegisterModal.tsx'
import FeedbackWidget from './components/FeedbackWidget.tsx'
import { clearAnonResults, readAnonResults } from './anonResults'

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
  const { user } = useAuth()
  const initialState = location.state as {
    eligibleBenefits?: Benefit[]
    answers?: unknown
    fromAnonSnapshot?: boolean
  } | null
  const [eligibleBenefits, setEligibleBenefits] = useState<Benefit[] | null>(
    initialState?.eligibleBenefits ?? null,
  )
  const [answers, setAnswers] = useState<unknown>(initialState?.answers ?? null)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (eligibleBenefits !== null) return
    if (user) {
      navigate('/')
      return
    }
    const snapshot = readAnonResults()
    if (!snapshot) {
      navigate('/')
      return
    }
    let cancelled = false
    fetch('/api/questionnaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot.answers),
    })
      .then(res => {
        if (!res.ok) throw new Error(`status ${res.status}`)
        return res.json()
      })
      .then((data: { eligibleBenefits: Benefit[] }) => {
        if (cancelled) return
        setEligibleBenefits(data.eligibleBenefits)
        setAnswers(snapshot.answers)
      })
      .catch(() => {
        if (cancelled) return
        clearAnonResults()
        navigate('/')
      })
    return () => { cancelled = true }
  }, [eligibleBenefits, user, navigate])

  if (eligibleBenefits === null) {
    return (
      <div className="page">
        <SiteHeader />
        <main className="results-main">
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading your results...</p>
        </main>
        <Footer />
      </div>
    )
  }

  const siteHeader = <SiteHeader />

  // Show a discharge-upgrade pointer when every service period the user
  // entered is stricter than General. Those veterans are excluded from every
  // benefit in the app per the false-hope principle, so without this nudge
  // they hit a results page with no matches and no path forward.
  const a = answers as { servicePeriods?: Array<{ dischargeLevel?: number }> } | null
  const showDischargeUpgradeMessage =
    !!a &&
    Array.isArray(a.servicePeriods) &&
    a.servicePeriods.length > 0 &&
    a.servicePeriods.every(p => typeof p?.dischargeLevel === 'number' && p.dischargeLevel >= 3)

  return (
    <div className="page">
      {siteHeader}
      <main className="results-main">
        {showDischargeUpgradeMessage && (
          <p style={{
            background: 'var(--bg)',
            borderLeft: '3px solid #b8860b',
            borderRadius: '2px',
            padding: '14px 18px 14px 20px',
            fontSize: '0.88rem',
            lineHeight: 1.55,
            color: 'var(--text)',
          }}>
            Some VA benefits may require a different discharge characterization. If you received an Other Than Honorable, Bad Conduct, or Dishonorable discharge, you may be able to apply for a discharge upgrade or request a Character of Discharge review.{' '}
            <a
              href="https://www.va.gov/discharge-upgrade-instructions/introduction/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more at VA.gov
            </a>.
          </p>
        )}
        {eligibleBenefits.length === 0 ? (
          <div className="no-results" style={showDischargeUpgradeMessage ? { paddingTop: '24px' } : undefined}>
            <p>We weren't able to find any matching benefits based on your answers.</p>
            <p>Your situation may still qualify you for benefits not yet covered by this tool. Consider reaching out to a VA-accredited representative for a full review.</p>
            <button
              className="results-retake-btn"
              onClick={() => {
                clearAnonResults()
                navigate('/questionnaire')
              }}
            >
              Retake questionnaire
            </button>
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
              <div className="results-retake-row">
                <button
                  className="results-retake-btn"
                  onClick={() => {
                    clearAnonResults()
                    navigate('/questionnaire')
                  }}
                >
                  Retake questionnaire
                </button>
              </div>
            )}
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
