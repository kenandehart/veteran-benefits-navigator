import './App.css'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'
import SkipLink from './components/SkipLink'

function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="page">
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="privacy-page">
        <h1 className="privacy-page__title">About</h1>

        <p style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <img
            src="/service-photo.jpg"
            alt="Kenan DeHart in U.S. Air Force uniform"
            style={{ width: '175px', maxWidth: '100%', height: 'auto' }}
          />
        </p>
        <p style={{ textAlign: 'center', fontStyle: 'italic', opacity: 0.7, fontSize: '0.9em', marginTop: 0 }}>
          U.S. Air Force, 2014-2018
        </p>

        <p>I'm Kenan DeHart. At 18, I enlisted in the U.S. Air Force as an airborne cryptologic language analyst. I graduated with honors from the Modern Standard Arabic program at the Defense Language Institute, and completed aircrew fundamentals, intelligence fundamentals, and various survival trainings.</p>

        <p>Shortly after arriving to my first duty station, I developed a severe mental health disorder and was ultimately discharged. Treating my health conditions while finding stability and direction in life proved to be a significant challenge. The path to connecting with VA benefits was not obvious, and at times intimidating. My goal with vabenefits.app is to provide a tool to other veterans who might be facing similar challenges.</p>

        <p>
          The application guides a user through a short questionnaire, and performs eligibility checks to determine which benefits they might be eligible for. Each benefit includes a description, eligibility summary, broad application guidance, and links to official{' '}
          <a href="https://www.va.gov" target="_blank" rel="noopener noreferrer">va.gov</a>
          {' '}resources. A veteran can start their questionnaire just one click from the home page, with an optional sign-up to save results.
        </p>

        <p>
          I'm now studying software engineering as part of my participation in the{' '}
          <Link to="/benefits/veteran-readiness-employment">Chapter 31 Veteran Readiness and Employment program</Link>
          . Post graduation, I will be looking for software development and engineering opportunities. To contact me in this regard, or for anything else, I can be reached at the email below. All code and development history can be found in the GitHub repository.
        </p>

        <p style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', marginTop: '18px' }}>
          <code>contact@vabenefits.app</code>
          <a
            href="https://github.com/kenandehart/veteran-benefits-navigator"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2c-3.2.69-3.87-1.35-3.87-1.35-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.77 1.06.77 2.13v3.16c0 .31.21.67.8.56C20.22 21.37 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
            GitHub
          </a>
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default AboutPage
