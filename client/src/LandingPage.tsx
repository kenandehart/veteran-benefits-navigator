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
            Answer a few questions about your service. We'll find which
            benefits you might be eligible for, with links to apply at VA.gov.
          </p>
          <button className="cta-button" onClick={() => navigate('/questionnaire')}>Find my benefits →</button>
        </section>

        <section className="features">
          <div className="feature">
            <h2>Based on your answers</h2>
            <p>
              We show the benefits you may be eligible for, not the full
              list of every VA benefit.
            </p>
          </div>
          <div className="feature">
            <h2>Where to apply</h2>
            <p>
              Each benefit page summarizes who's eligible and links to
              VA.gov to apply. The VA decides every claim.
            </p>
          </div>
          <div className="feature">
            <h2>No personal information required</h2>
            <p>
              The questionnaire doesn't ask for your name or address. You
              don't need to create an account.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage
