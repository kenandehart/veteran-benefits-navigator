import './App.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'
import SkipLink from './components/SkipLink'
import {
  hasInProgressQuestionnaire,
  clearInProgressQuestionnaire,
} from './questionnaireProgress'

function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Lazy init: read once at mount. The page gets remounted on every visit to
  // `/`, so this is the right life cycle for catching changes between visits.
  const [inProgress, setInProgress] = useState(() => hasInProgressQuestionnaire())

  function handleStartOver() {
    clearInProgressQuestionnaire()
    setInProgress(false)
    navigate('/questionnaire')
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return

    const cards = document.querySelectorAll('.feature')
    if (cards.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('feature--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.35 }
    )

    cards.forEach((card) => observer.observe(card))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="page">
      <SkipLink />
      <SiteHeader />

      <main id="main" tabIndex={-1}>
        <section className="hero">
          {user && (
            <p className="hero-greeting">Welcome back, {user.username}.</p>
          )}
          <h1 className="hero-headline">
            Find out which VA benefits you may qualify for in minutes.
          </h1>
          <p className="hero-body">
            Answer a few questions about your service. We'll suggest benefits you might be eligible for, with links to learn more and apply at VA.gov.
          </p>
          <button className="cta-button" onClick={() => navigate('/questionnaire')}>
            {inProgress ? 'Continue questionnaire' : 'Find my benefits'}{' '}
            <span className="button-arrow" aria-hidden="true">→</span>
          </button>
          {inProgress && (
            <button className="hero-restart" onClick={handleStartOver}>
              Start over
            </button>
          )}
        </section>

        <section className="features">
          <div className="feature">
            <div className="feature__head">
              <svg
                className="feature__icon"
                viewBox="0 0 256 256"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="104" cy="80" r="24" />
                <circle cx="168" cy="176" r="24" />
                <line x1="128" y1="80" x2="216" y2="80" />
                <line x1="40" y1="80" x2="80" y2="80" />
                <line x1="192" y1="176" x2="216" y2="176" />
                <line x1="40" y1="176" x2="144" y2="176" />
              </svg>
              <h2>Personalized results</h2>
            </div>
            <p>
              We show the VA benefits relevant to your service history, not a list of every state and federal benefit.
            </p>
          </div>
          <div className="feature">
            <div className="feature__head">
              <svg
                className="feature__icon"
                viewBox="0 0 256 256"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M200,224H56a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h96l56,56V216A8,8,0,0,1,200,224Z" />
                <polyline points="152 32 152 88 208 88" />
              </svg>
              <h2>Official references</h2>
            </div>
            <p>
              Every benefit links to the official VA eligibility and application pages.
            </p>
          </div>
          <div className="feature">
            <div className="feature__head">
              <svg
                className="feature__icon"
                viewBox="0 0 256 256"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M93.17,122.83A71.68,71.68,0,0,1,88,95.91c0-38.58,31.08-70.64,69.64-71.87A72,72,0,0,1,232,98.36C230.73,136.92,198.67,168,160.09,168a71.68,71.68,0,0,1-26.92-5.17h0L120,176H96v24H72v24H40a8,8,0,0,1-8-8V187.31a8,8,0,0,1,2.34-5.65l58.83-58.83Z" />
                <circle cx="180" cy="76" r="12" fill="currentColor" stroke="none" />
              </svg>
              <h2>Privacy focused</h2>
            </div>
            <p>
              We'll never ask your name, address, or phone number. Account creation optional.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage
