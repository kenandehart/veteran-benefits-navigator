import './App.css'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

function CataloguePage() {
  const [benefits, setBenefits] = useState<Benefit[]>([])

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
      </main>
      <Footer />
    </div>
  )
}

export default CataloguePage
