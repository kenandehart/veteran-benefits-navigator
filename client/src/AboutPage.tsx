import './App.css'
import { useEffect } from 'react'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'

function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="page">
      <SiteHeader />
      <main className="privacy-page">
        <h1 className="privacy-page__title">About</h1>

        <h2 className="privacy-page__heading">What is this?</h2>
        <p>vabenefits.app is a tool that helps veterans discover which VA benefits they might be eligible for. The site aims to guide veterans through a short questionnaire, compare their answers to benefit eligibility requirements, and present matched benefits. The application was designed to be frictionless, allowing veterans to access the site, answer questions, and see matched benefits with as few obstacles as possible. The benefits catalogue scope is intentionally limited to benefits managed by the Department of Veterans Affairs.</p>

        <h2 className="privacy-page__heading">How was it built?</h2>
        <p>The website was built by a solo developer leveraging the help of an AI coding assistant, Claude. An Express server and Postgres database handle backend operations, while UI interactivity is made possible using React with TypeScript. Development decisions were made with a focus on user privacy, acknowledging the sensitivity of a veteran's service history and disability status. The website is self hosted and maintained on a virtual private server. Code and development history can be seen in the project's GitHub repository.</p>

        <h2 className="privacy-page__heading">Who built it?</h2>
        <p>
          Hello, my name is Kenan, I'm a 100% totally and permanently disabled US veteran studying software engineering as part of my participation in the{' '}
          <a
            href="https://www.va.gov/careers-employment/vocational-rehabilitation/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chapter 31 Veteran Readiness and Employment
          </a>{' '}
          program. When I was discharged from the Air Force, I was lost, and struggling with severe mental health issues. I wanted to build something that would've been helpful to me in this state, and got started with vabenefits.app.
        </p>

        <h2 className="privacy-page__heading">Contact</h2>
        <p>My current professional goal is a career in software development / engineering. Are you hiring? Want to get ahold of me for anything else? Contact me at the email below.</p>
        <p style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', marginTop: '18px' }}>
          <a href="mailto:contact@vabenefits.app">contact@vabenefits.app</a>
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
