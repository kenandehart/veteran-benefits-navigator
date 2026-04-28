import './App.css'
import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'

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

function BenefitDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [benefit, setBenefit] = useState<Benefit | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  useEffect(() => {
    if (!slug) return
    setStatus('loading')
    setBenefit(null)
    fetch(`/api/benefits/${slug}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setBenefit(data)
          setStatus('ok')
        } else if (res.status === 404) {
          setStatus('notfound')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [slug])

  const siteHeader = <SiteHeader />

  return (
    <div className="page">
      {siteHeader}
      <main className="detail-main">
        {status === 'notfound' && (
          <div className="no-results">
            <p>We couldn't find a benefit at that address.</p>
            <Link to="/benefits" className="cta-button benefit-detail__link">Browse catalogue →</Link>
          </div>
        )}
        {status === 'error' && (
          <div className="no-results">
            <p>Something went wrong loading this benefit. Please try again later.</p>
            <Link to="/benefits" className="cta-button benefit-detail__link">Browse catalogue →</Link>
          </div>
        )}
        {status === 'ok' && benefit && (
          <div className="benefit-detail">
            <div className="benefit-detail__header">
              <button
                className="benefit-detail__back"
                onClick={() => {
                  window.scrollTo(0, 0)
                  if (window.history.length <= 1) {
                    navigate('/benefits')
                  } else {
                    navigate(-1)
                  }
                }}
              >
                ← Back
              </button>
              <h1 className="benefit-detail__name">{benefit.name}</h1>
            </div>
            {benefit.id === 5 && (
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
            <div className="benefit-detail__section" style={benefit.id === 5 ? { borderTop: 'none', paddingTop: 0 } : undefined}>
              <h2 className="benefit-detail__section-label">About this benefit</h2>
              <p className="benefit-detail__section-text">{benefit.description}</p>
            </div>
            <div className="benefit-detail__section">
              <h2 className="benefit-detail__section-label">Who may be eligible</h2>
              <p className="benefit-detail__section-text">{benefit.eligibility_summary}</p>
            </div>
            <a
              href={benefit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-button benefit-detail__link"
            >
              Visit official resource →
            </a>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default BenefitDetailPage
