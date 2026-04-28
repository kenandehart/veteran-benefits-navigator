import './App.css'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'

function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="page">
      <SiteHeader />

      <main>
        <section className="hero">
          <h1 className="hero-headline">
            Find out which VA benefits you may qualify for in minutes.
          </h1>
          <p className="hero-body">
            Answer a few questions about your service. We'll suggest benefits you might be eligible for, with links to learn more and apply at VA.gov.
          </p>
          <button className="cta-button" onClick={() => navigate('/questionnaire')}>Find my benefits →</button>
        </section>

        <section className="features">
          <div className="feature">
            <h2>Personalized results</h2>
            <p>
              We show the VA benefits relevant to your service history, not a list of every state and federal benefit.
            </p>
          </div>
          <div className="feature">
            <h2>Official references</h2>
            <p>
              Every benefit links to the official VA eligibility and application pages.
            </p>
          </div>
          <div className="feature">
            <h2>Privacy focused</h2>
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
